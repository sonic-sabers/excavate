import { glob } from 'glob'
import { computeScore, assignLevel } from '../scorer/score.js'
import { type ExcavateConfig, type FileDebtResult, type ScanResult } from '../types.js'

function stubSignals(): FileDebtResult['signals'] {
  const rand = () => Math.floor(Math.random() * 100)
  return {
    churn: rand(),
    coverage: rand(),
    complexity: rand(),
    knowledge: rand(),
    docs: rand(),
    deps: rand(),
  }
}

function stubMeta(_filePath: string): FileDebtResult['meta'] {
  return {
    lastModified: new Date(),
    authors: ['unknown'],
    commitCount: 0,
    testCoverage: 0,
    linesOfCode: 0,
    satdCount: 0,
    circularDeps: 0,
    fanIn: 0,
  }
}

export async function scan(repoRoot: string, config: ExcavateConfig): Promise<ScanResult> {
  const start = Date.now()

  const files = await glob(config.include, {
    cwd: repoRoot,
    ignore: config.exclude,
    absolute: false,
  })

  const results: FileDebtResult[] = files.map((filePath) => {
    const signals = stubSignals()
    const score = computeScore(signals, config.weights)
    const level = assignLevel(score, config.thresholds)
    return {
      path: filePath,
      score,
      level,
      signals,
      meta: stubMeta(filePath),
    }
  })

  results.sort((a, b) => b.score - a.score)

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, f) => sum + f.score, 0) / results.length)
    : 0

  const counts = { bedrock: 0, deep: 0, surface: 0, clear: 0 }
  for (const f of results) counts[f.level]++

  return {
    repoRoot,
    scannedAt: new Date(),
    filesScanned: results.length,
    durationMs: Date.now() - start,
    summary: {
      avgScore,
      ...counts,
      estimatedHours: counts.bedrock * 10,
    },
    files: results,
  }
}
