import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import type { ScanResult } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);

function avgLevel(score: number): string {
  if (score >= 70) return "bedrock";
  if (score >= 40) return "deep";
  if (score >= 20) return "surface";
  return "clear";
}

export async function writeHtmlReport(
  result: ScanResult,
  reportDir: string,
  history: ScanResult[] = [],
): Promise<string> {
  await mkdir(reportDir, { recursive: true });

  const templatePath = path.resolve(__dirname, "../../templates/report.hbs");
  const templateSrc = await readFile(templatePath, "utf8");
  const template = Handlebars.compile(templateSrc);

  const escape = (s: string) => s.replace(/<\/script>/gi, "<\\/script>");

  const html = template({
    repoName: path.basename(result.repoRoot),
    scannedAt: new Date(result.scannedAt).toLocaleString(),
    filesScanned: result.filesScanned,
    durationMs: result.durationMs,
    avgScore: result.summary.avgScore,
    avgLevel: avgLevel(result.summary.avgScore),
    summary: result.summary,
    healthGrade: result.summary.healthGrade,
    narrative: escape(result.summary.narrative ?? ""),
    orphanFiles: result.summary.orphanFiles,
    orphanLOC: result.summary.orphanLOC,
    knowledgeCliffFiles: result.summary.knowledgeCliffFiles,
    temporallyCoupledPairs: result.summary.temporallyCoupledPairs,
    dataJson: escape(JSON.stringify(result)),
    historyJson: escape(JSON.stringify(history)),
  });

  const outPath = path.join(reportDir, "index.html");
  await writeFile(outPath, html, "utf8");
  return outPath;
}
