import { describe, it, expect } from 'vitest'
import { computeDiff } from '../src/output/diffOutput.js'
import type { ScanResult, FileDebtResult } from '../src/types.js'

function makeMeta(): FileDebtResult['meta'] {
  return {
    lastModified: new Date(),
    authors: [],
    recentAuthors: [],
    knowledgeCliff: false,
    commitCount: 0,
    refactorCount: 0,
    survivalPct: 0,
    testCoverage: 0,
    linesOfCode: 0,
    satdCount: 0,
    circularDeps: 0,
    fanIn: 0,
    temporalCoupling: [],
    isOrphan: false,
    deadExports: 0,
    concernCount: 0,
    exportKinds: [],
  }
}

function makeSummary(files: Array<{ score: number; level: string }>): ScanResult['summary'] {
  return {
    avgScore: files.length ? Math.round(files.reduce((s, f) => s + f.score, 0) / files.length) : 0,
    bedrock: files.filter((f) => f.level === 'bedrock').length,
    deep: files.filter((f) => f.level === 'deep').length,
    surface: files.filter((f) => f.level === 'surface').length,
    clear: files.filter((f) => f.level === 'clear').length,
    estimatedHours: 0,
    healthGrade: { score: 80, grade: 'A' },
    orphanFiles: 0,
    orphanLOC: 0,
    temporallyCoupledPairs: 0,
    knowledgeCliffFiles: 0,
    narrative: '',
  }
}

function makeScan(files: Array<{ path: string; score: number; level: string }>): ScanResult {
  return {
    repoRoot: '/repo',
    scannedAt: new Date('2026-01-01'),
    filesScanned: files.length,
    durationMs: 1000,
    summary: makeSummary(files),
    files: files.map((f) => ({
      path: f.path,
      score: f.score,
      level: f.level as FileDebtResult['level'],
      archetype: 'healthy' as const,
      signals: { churn: 0, coverage: 0, complexity: 0, knowledge: 0, docs: 0, deps: 0 },
      meta: makeMeta(),
    })),
  }
}

describe('computeDiff', () => {
  it('detects score increase as regression', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 50, level: 'deep' }])
    const diff = computeDiff(before, after)
    const reg = diff.regressions.find((r) => r.path === 'src/a.ts')
    expect(reg).toBeDefined()
    expect(reg!.scoreDelta).toBe(20)
  })

  it('detects score decrease as improvement', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 50, level: 'deep' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 20, level: 'surface' }])
    const diff = computeDiff(before, after)
    const imp = diff.improvements.find((i) => i.path === 'src/a.ts')
    expect(imp).toBeDefined()
    expect(imp!.scoreDelta).toBe(-30)
  })

  it('ignores changes below noise threshold (< 3 points)', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 32, level: 'surface' }])
    const diff = computeDiff(before, after)
    expect(diff.regressions).toHaveLength(0)
    expect(diff.improvements).toHaveLength(0)
  })

  it('tracks newBedrock when file crosses into bedrock', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 65, level: 'deep' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 75, level: 'bedrock' }])
    const diff = computeDiff(before, after)
    expect(diff.newBedrock).toContain('src/a.ts')
  })

  it('tracks resolved when file drops to clear', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 45, level: 'deep' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 10, level: 'clear' }])
    const diff = computeDiff(before, after)
    expect(diff.resolved).toContain('src/a.ts')
  })

  it('unchanged files not in regressions or improvements', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const diff = computeDiff(before, after)
    expect(diff.regressions).toHaveLength(0)
    expect(diff.improvements).toHaveLength(0)
  })

  it('regressions sorted descending by scoreDelta', () => {
    const before = makeScan([
      { path: 'src/a.ts', score: 10, level: 'clear' },
      { path: 'src/b.ts', score: 10, level: 'clear' },
    ])
    const after = makeScan([
      { path: 'src/a.ts', score: 50, level: 'deep' },
      { path: 'src/b.ts', score: 25, level: 'surface' },
    ])
    const diff = computeDiff(before, after)
    expect(diff.regressions[0]!.path).toBe('src/a.ts')
    expect(diff.regressions[1]!.path).toBe('src/b.ts')
  })

  it('files not in previous scan skipped (no prior baseline)', () => {
    const before = makeScan([])
    const after  = makeScan([{ path: 'src/new.ts', score: 60, level: 'deep' }])
    const diff = computeDiff(before, after)
    // new files have no previous — not in regressions or improvements
    expect(diff.regressions).toHaveLength(0)
  })

  it('diff with empty previous and empty current produces no regressions', () => {
    const before = makeScan([])
    const after  = makeScan([])
    const diff = computeDiff(before, after)
    expect(diff.regressions).toHaveLength(0)
    expect(diff.improvements).toHaveLength(0)
    expect(diff.newBedrock).toHaveLength(0)
    expect(diff.resolved).toHaveLength(0)
  })

  it('healthGrade trend is degrading when current score drops by more than 3', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 10, level: 'clear' }])
    const after  = makeScan([
      { path: 'src/a.ts', score: 75, level: 'bedrock' },
      { path: 'src/b.ts', score: 80, level: 'bedrock' },
      { path: 'src/c.ts', score: 80, level: 'bedrock' },
    ])
    const diff = computeDiff(before, after)
    expect(diff.healthGrade.current.trend).toBe('degrading')
  })

  it('healthGrade trend is improving when current score rises by more than 3', () => {
    const before = makeScan([
      { path: 'src/a.ts', score: 80, level: 'bedrock' },
      { path: 'src/b.ts', score: 80, level: 'bedrock' },
      { path: 'src/c.ts', score: 80, level: 'bedrock' },
    ])
    const after = makeScan([{ path: 'src/a.ts', score: 10, level: 'clear' }])
    const diff = computeDiff(before, after)
    expect(diff.healthGrade.current.trend).toBe('improving')
  })
})
