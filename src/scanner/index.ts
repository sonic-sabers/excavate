import { glob } from "glob";
import pLimit from "p-limit";
import ora from "ora";
import path from "path";
import { simpleGit } from "simple-git";
import { computeScore, assignLevel } from "../scorer/score.js";
import { classifyArchetype } from "../scorer/archetype.js";
import { computeHealthGrade } from "../scorer/healthGrade.js";
import { generateNarrative } from "../scorer/narrative.js";
import {
  type ExcavateConfig,
  type FileDebtResult,
  type ScanResult,
} from "../types.js";
import { scanGit } from "./gitScanner.js";
import { scanAst } from "./astScanner.js";
import { loadCoverageMap, getCoverageScore } from "./coverageScanner.js";
import { scanDoc } from "./docScanner.js";
import { scanDeps } from "./depScanner.js";
import { buildCouplingMatrix } from "./couplingScanner.js";
import { detectOrphans } from "./orphanScanner.js";

export async function scan(
  repoRoot: string,
  config: ExcavateConfig,
  spinner?: ReturnType<typeof ora>,
): Promise<ScanResult> {
  const start = Date.now();

  const files = await glob(config.include, {
    cwd: repoRoot,
    ignore: config.exclude,
    absolute: false,
  });

  // Repo-level signals — run once in parallel
  const [coverageMap, depScan] = await Promise.all([
    loadCoverageMap(repoRoot),
    scanDeps(repoRoot),
  ]);

  const { fileMap: depMap, cruiseResult } = depScan;

  const coverageMissing = coverageMap === null;
  const repoDepBase = depMap.get("__repo__")?.depsScore ?? 0;

  // Redistribute coverage weight when no coverage file found
  const weights = { ...config.weights };
  if (coverageMissing) {
    const coverageWeight = weights.coverage;
    weights.coverage = 0;
    const remaining = [
      "churn",
      "complexity",
      "knowledge",
      "docs",
      "deps",
    ] as const;
    const total = remaining.reduce((s, k) => s + weights[k], 0);
    for (const k of remaining) {
      weights[k] += (weights[k] / total) * coverageWeight;
    }
  }

  // One shared simpleGit client — avoids spawning a new instance per file
  const git = simpleGit(repoRoot);

  // Temporal coupling matrix — run once over all files
  let couplingMatrix = new Map<string, Array<{ file: string; pct: number }>>();
  if (config.coupling.enabled) {
    try {
      couplingMatrix = await buildCouplingMatrix(
        repoRoot,
        files,
        config.gitDays,
        config.coupling.threshold,
        git,
      );
    } catch {
      // coupling scan failed — proceed without
    }
  }

  // Per-file scans — p-limit for concurrency control
  const limit = pLimit(50);
  let completed = 0;
  const total = files.length;

  const results: FileDebtResult[] = await Promise.all(
    files.map((filePath) =>
      limit(async (): Promise<FileDebtResult> => {
        const [gitResult, ast, doc] = await Promise.all([
          scanGit(filePath, repoRoot, config, git),
          scanAst(filePath, repoRoot),
          scanDoc(filePath, repoRoot, config),
        ]);

        const depResult = depMap.get(filePath);
        const depsScore =
          depResult !== undefined ? depResult.depsScore : repoDepBase;
        const fanIn = depResult?.fanIn ?? 0;
        const circularDeps = depResult?.circularDeps ?? 0;
        const coverageScore = getCoverageScore(filePath, coverageMap);
        const temporalCoupling = couplingMatrix.get(filePath) ?? [];

        const signals: FileDebtResult["signals"] = {
          churn: gitResult.churnScore,
          coverage: coverageScore,
          complexity: ast.complexityScore,
          knowledge: gitResult.knowledgeScore,
          docs: doc.docsScore,
          deps: depsScore,
        };

        const score = computeScore(signals, weights);
        const level = assignLevel(score, config.thresholds);

        const partial: Omit<FileDebtResult, "archetype"> = {
          path: filePath,
          score,
          level,
          signals,
          meta: {
            lastModified: gitResult.lastModified,
            authors: gitResult.authors,
            recentAuthors: gitResult.recentAuthors,
            knowledgeCliff: gitResult.knowledgeCliff,
            commitCount: gitResult.commitCount,
            refactorCount: gitResult.refactorCount,
            survivalPct: gitResult.survivalPct,
            testCoverage: coverageMissing ? 0 : 100 - coverageScore,
            linesOfCode: ast.linesOfCode,
            satdCount: doc.satdCount,
            circularDeps,
            fanIn,
            temporalCoupling,
            isOrphan: false,
            deadExports: 0,
            concernCount: 0,
            exportKinds: [],
          },
        };

        const archetype = classifyArchetype(partial as FileDebtResult);

        completed++;
        if (spinner) {
          spinner.text = `scanning ${path.relative(process.cwd(), repoRoot) || "."}   ${completed} / ${total} files…`;
        }

        return { ...partial, archetype };
      }),
    ),
  );

  // Orphan detection — reuse cruise result, build LOC map
  let orphanFiles: string[] = [];
  let deadExports = new Map<string, number>();

  if (config.orphans.enabled && cruiseResult) {
    const locMap = new Map(results.map((f) => [f.path, f.meta.linesOfCode]));
    const pkgJson = await import("fs/promises").then((fs) =>
      fs
        .readFile(path.join(repoRoot, "package.json"), "utf8")
        .then(
          (raw) =>
            JSON.parse(raw) as {
              main?: string;
              exports?: unknown;
              bin?: unknown;
            },
        )
        .catch(() => ({}) as Record<string, unknown>),
    );
    const rawEntryPoints = [
      pkgJson.main,
      ...(typeof pkgJson.exports === "string" ? [pkgJson.exports] : []),
      ...(typeof pkgJson.bin === "string"
        ? [pkgJson.bin]
        : (Object.values(pkgJson.bin ?? {}) as string[])),
    ].filter(Boolean) as string[];

    // Normalize dist paths → src paths so orphan checker matches mod.source
    // e.g. "./dist/cli.js" → "src/cli.ts", "dist/index.js" → "src/index.ts"
    const entryPoints = rawEntryPoints.map((p) =>
      p.replace(/^\.?\/?(dist|build|out)\//, "src/")
       .replace(/\.(js|mjs|cjs)$/, ".ts"),
    );

    const orphanResult = detectOrphans(
      cruiseResult,
      entryPoints,
      config.orphans.minLOC,
      locMap,
      repoRoot,
    );
    orphanFiles = orphanResult.orphanFiles;
    deadExports = orphanResult.deadExports;

    // Stamp isOrphan + deadExports onto file results
    const orphanSet = new Set(orphanFiles);
    for (const f of results) {
      if (orphanSet.has(f.path)) {
        f.meta.isOrphan = true;
        f.meta.deadExports = deadExports.get(f.path) ?? 0;
        f.archetype = "ghost";
      }
    }
  }

  results.sort((a, b) => b.score - a.score);

  const avgScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, f) => sum + f.score, 0) / results.length,
        )
      : 0;

  const counts = { bedrock: 0, deep: 0, surface: 0, clear: 0 };
  for (const f of results) counts[f.level]++;

  const orphanLOC = results
    .filter((f) => f.meta.isOrphan)
    .reduce((sum, f) => sum + f.meta.linesOfCode, 0);

  const knowledgeCliffFiles = results.filter(
    (f) => f.meta.knowledgeCliff,
  ).length;

  // Count unique temporally coupled pairs (each pair counted once)
  const coupledPairsSeen = new Set<string>();
  for (const f of results) {
    for (const c of f.meta.temporalCoupling) {
      const key = [f.path, c.file].sort().join("|");
      coupledPairsSeen.add(key);
    }
  }

  const partialResult: Omit<ScanResult, "summary"> & {
    summary: Omit<ScanResult["summary"], "healthGrade" | "narrative">;
  } = {
    repoRoot,
    scannedAt: new Date(),
    filesScanned: results.length,
    durationMs: Date.now() - start,
    summary: {
      avgScore,
      ...counts,
      estimatedHours: counts.bedrock * 10 + counts.deep * 3,
      orphanFiles: orphanFiles.length,
      orphanLOC,
      temporallyCoupledPairs: coupledPairsSeen.size,
      knowledgeCliffFiles,
    },
    files: results,
  };

  const fullResult = partialResult as ScanResult;
  fullResult.summary.healthGrade = computeHealthGrade(fullResult);
  fullResult.summary.narrative = generateNarrative(fullResult);

  return fullResult;
}
