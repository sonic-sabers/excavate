import { glob } from 'glob'
import { computeScore, assignLevel } from '../scorer/score.js'
import { type ExcavateConfig, type FileDebtResult, type ScanResult } from '../types.js'
import { scanGit } from './gitScanner.js'
import { scanAst } from './astScanner.js'
import { loadCoverageMap, getCoverageScore } from './coverageScanner.js'
import { scanDoc } from './docScanner.js'
import { scanDeps } from './depScanner.js'

export async function scan(repoRoot: string, config: ExcavateConfig): Promise<ScanResult> {
  const start = Date.now()

  const files = await glob(config.include, {
    cwd: repoRoot,
    ignore: config.exclude,
    absolute: false,
  })

  // Repo-level signals — run once
  const [coverageMap, depMap] = await Promise.all([
    loadCoverageMap(repoRoot),
    scanDeps(repoRoot),
  ])

  const coverageMissing = coverageMap === null
  const repoDepBase = depMap.get('__repo__')?.depsScore ?? 0

  // Redistribute coverage weight when no coverage file found
  const weights = { ...config.weights }
  if (coverageMissing) {
    const coverageWeight = weights.coverage
    weights.coverage = 0
    const remaining = ['churn', 'complexity', 'knowledge', 'docs', 'deps'] as const
    const total = remaining.reduce((s, k) => s + weights[k], 0)
    for (const k of remaining) {
      weights[k] += (weights[k] / total) * coverageWeight
    }
  }

  const BATCH = 10
  const results: FileDebtResult[] = []
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH)
    const batchResults = await Promise.all(
      batch.map(async (filePath): Promise<FileDebtResult> => {
        const [git, ast, doc] = await Promise.all([
          scanGit(filePath, repoRoot, config),
          scanAst(filePath, repoRoot),
          scanDoc(filePath, repoRoot, config),
        ])

        const depResult = depMap.get(filePath)
        const depsScore = depResult !== undefined ? depResult.depsScore : repoDepBase
        const fanIn = depResult?.fanIn ?? 0
        const circularDeps = depResult?.circularDeps ?? 0
        const coverageScore = getCoverageScore(filePath, coverageMap)

        const signals: FileDebtResult['signals'] = {
          churn: git.churnScore,
          coverage: coverageScore,
          complexity: ast.complexityScore,
          knowledge: git.knowledgeScore,
          docs: doc.docsScore,
          deps: depsScore,
        }

        const score = computeScore(signals, weights)
        const level = assignLevel(score, config.thresholds)

        return {
          path: filePath,
          score,
          level,
          signals,
          meta: {
            lastModified: git.lastModified,
            authors: git.authors,
            commitCount: git.commitCount,
            testCoverage: coverageMissing ? 0 : 100 - coverageScore,
            linesOfCode: ast.linesOfCode,
            satdCount: doc.satdCount,
            circularDeps,
            fanIn,
          },
        }
      }),
    )
    results.push(...batchResults)
  }

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
