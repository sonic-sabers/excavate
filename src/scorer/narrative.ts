import type { ScanResult } from "../types.js";

export function generateNarrative(result: ScanResult): string {
  const { summary, files, filesScanned } = result;
  const { bedrock, estimatedHours, knowledgeCliffFiles } = summary;

  if (filesScanned === 0) return 'No files were scanned.'
  const pct = Math.round((bedrock / filesScanned) * 100);
  const healthLine =
    bedrock === 0
      ? "Your codebase has no bedrock files - a healthy sign."
      : bedrock <= 5
        ? `Your codebase has ${bedrock} bedrock file${bedrock === 1 ? "" : "s"} that carry the highest accumulated debt.`
        : `Your codebase has ${bedrock} bedrock files. This is significant - ${pct}% of scanned files are in the most critical state.`;

  const dirCounts = new Map<string, number>();
  for (const f of files.filter((f) => f.level === "bedrock")) {
    const parts = f.path.split("/");
    const dir = parts.slice(0, 2).join("/");
    dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
  }
  const topDirs = [...dirCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([d]) => d);
  const dirLine = topDirs.length
    ? ` The concentration is in ${topDirs.join(" and ")}.`
    : "";

  const para1 = healthLine + dirLine;

  const knowledgeLine =
    knowledgeCliffFiles > 0
      ? `The most urgent risk is knowledge: ${knowledgeCliffFiles} ${knowledgeCliffFiles === 1 ? "file has" : "files have"} had only one active contributor in the past 90 days. If that person leaves, those files become effectively unserviceable.`
      : "";

  const worstCovFile = [...files]
    .filter((f) => f.level === "bedrock" || f.level === "deep")
    .sort((a, b) => a.meta.testCoverage - b.meta.testCoverage)[0];
  const coverageLine =
    worstCovFile && worstCovFile.meta.testCoverage < 30
      ? ` Test coverage is ${worstCovFile.meta.testCoverage}% on the highest-debt files - changes here carry significant regression risk.`
      : "";

  const para2 = knowledgeLine + coverageLine;

  const para3 =
    estimatedHours === 0
      ? "No significant cleanup effort is estimated - the codebase is in good shape."
      : `Based on the bedrock file count, we estimate ${estimatedHours} hours of focused work to reach a healthy baseline. Prioritise the files flagged as The Time Bomb or Load-Bearing Wall first - they carry the most risk per hour of change.`;

  return [para1, para2, para3].filter(Boolean).join("\n\n");
}
