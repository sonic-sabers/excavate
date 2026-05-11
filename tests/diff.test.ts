import { describe, it, expect } from 'vitest'
import { computeDiff, formatDiff } from '../src/diff.js'
import type { ScanResult } from '../src/types.js'

function makeScan(files: Array<{ path: string; score: number; level: string }>): ScanResult {
  return {
    repoRoot: '/repo',
    scannedAt: new Date('2026-01-01'),
    filesScanned: files.length,
    durationMs: 1000,
    summary: {
      avgScore: files.reduce((s, f) => s + f.score, 0) / files.length,
      bedrock: files.filter(f => f.level === 'bedrock').length,
      deep: files.filter(f => f.level === 'deep').length,
      surface: files.filter(f => f.level === 'surface').length,
      clear: files.filter(f => f.level === 'clear').length,
      estimatedHours: 0,
    },
    files: files.map(f => ({
      path: f.path,
      score: f.score,
      level: f.level as 'bedrock' | 'deep' | 'surface' | 'clear',
      signals: { churn: 0, coverage: 0, complexity: 0, knowledge: 0, docs: 0, deps: 0 },
      meta: {
        lastModified: new Date(),
        authors: [],
        commitCount: 0,
        testCoverage: 0,
        linesOfCode: 0,
        satdCount: 0,
        circularDeps: 0,
        fanIn: 0,
      },
    })),
  }
}

describe('computeDiff', () => {
  it('detects score increase as regression', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 50, level: 'deep' }])
    const diff = computeDiff(before, after)
    expect(diff.changed[0]!.delta).toBe(20)
    expect(diff.changed[0]!.path).toBe('src/a.ts')
  })

  it('detects score decrease as improvement', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 50, level: 'deep' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 20, level: 'surface' }])
    const diff = computeDiff(before, after)
    expect(diff.changed[0]!.delta).toBe(-30)
  })

  it('tracks new files (only in after)', () => {
    const before = makeScan([])
    const after  = makeScan([{ path: 'src/new.ts', score: 40, level: 'deep' }])
    const diff = computeDiff(before, after)
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0]!.path).toBe('src/new.ts')
  })

  it('tracks removed files (only in before)', () => {
    const before = makeScan([{ path: 'src/old.ts', score: 40, level: 'deep' }])
    const after  = makeScan([])
    const diff = computeDiff(before, after)
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0]!.path).toBe('src/old.ts')
  })

  it('unchanged files not in changed list', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const diff = computeDiff(before, after)
    expect(diff.changed).toHaveLength(0)
  })

  it('avgDelta computed correctly', () => {
    const before = makeScan([
      { path: 'src/a.ts', score: 30, level: 'surface' },
      { path: 'src/b.ts', score: 50, level: 'deep' },
    ])
    const after = makeScan([
      { path: 'src/a.ts', score: 40, level: 'deep' },
      { path: 'src/b.ts', score: 40, level: 'deep' },
    ])
    const diff = computeDiff(before, after)
    // avg: ((40-30) + (40-50)) / 2 = 0
    expect(diff.avgDelta).toBe(0)
  })
})

describe('formatDiff', () => {
  it('returns a non-empty string', () => {
    const before = makeScan([{ path: 'src/a.ts', score: 30, level: 'surface' }])
    const after  = makeScan([{ path: 'src/a.ts', score: 50, level: 'deep' }])
    const diff = computeDiff(before, after)
    const out = formatDiff(diff)
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })
})
