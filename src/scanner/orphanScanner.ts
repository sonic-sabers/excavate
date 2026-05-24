import { execSync } from "child_process";
import type { ICruiseResult } from "dependency-cruiser";

export function detectOrphans(
  cruiseResult: ICruiseResult,
  entryPoints: string[],
  minLOC: number,
  locMap: Map<string, number>,
  repoRoot: string,
): { orphanFiles: string[]; deadExports: Map<string, number> } {
  const orphanFiles: string[] = [];

  for (const mod of cruiseResult.modules) {
    if (mod.source.includes(".test.") || mod.source.includes(".spec."))
      continue;

    const isEntryPoint = entryPoints.some((e) => mod.source.endsWith(e));
    if (isEntryPoint) continue;

    const hasNoDependants = !cruiseResult.modules.some((m) =>
      m.dependencies.some((d) => d.resolved === mod.source),
    );
    if (!hasNoDependants) continue;

    const normalizedSource = mod.source.replace(/^\.\//, '')
    const loc = locMap.get(normalizedSource) ?? locMap.get(mod.source) ?? 0;
    if (loc < minLOC) continue;

    orphanFiles.push(normalizedSource);
  }

  const deadExports = orphanFiles.length > 0 ? runKnip(repoRoot) : new Map<string, number>();

  return { orphanFiles, deadExports };
}

function runKnip(repoRoot: string): Map<string, number> {
  try {
    const out = execSync("npx knip --reporter json 2>/dev/null", {
      cwd: repoRoot,
      timeout: 30_000,
    }).toString();
    const data = JSON.parse(out) as {
      files?: Array<{ path: string; unusedExports?: unknown[] }>;
    };
    const result = new Map<string, number>();
    for (const file of data.files ?? []) {
      result.set(file.path, (file.unusedExports ?? []).length);
    }
    return result;
  } catch {
    return new Map();
  }
}
