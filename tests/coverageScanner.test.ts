import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCoverageMap, getCoverageScore } from '../src/scanner/coverageScanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = path.resolve(__dirname, 'fixtures')

describe('loadCoverageMap', () => {
  it('loads coverage-summary.json', async () => {
    const map = await loadCoverageMap(FIXTURE_DIR)
    expect(map).not.toBeNull()
    expect(map?.get('src/a.ts')).toBeDefined()
  })

  it('returns null when no coverage file found', async () => {
    const map = await loadCoverageMap('/tmp/nonexistent-dir-excavate-xyz')
    expect(map).toBeNull()
  })
})

describe('getCoverageScore', () => {
  it('high coverage → low gap score', async () => {
    const map = await loadCoverageMap(FIXTURE_DIR)
    // src/a.ts has 90% coverage → gap = 10
    const score = getCoverageScore('src/a.ts', map)
    expect(score).toBeCloseTo(10, 0)
  })

  it('low coverage → high gap score', async () => {
    const map = await loadCoverageMap(FIXTURE_DIR)
    // src/complex.ts has 20% coverage → gap = 80
    const score = getCoverageScore('src/complex.ts', map)
    expect(score).toBeCloseTo(80, 0)
  })

  it('file not in report → 100 gap', async () => {
    const map = await loadCoverageMap(FIXTURE_DIR)
    const score = getCoverageScore('src/missing.ts', map)
    expect(score).toBe(100)
  })

  it('null map → 0 (signal skipped)', () => {
    const score = getCoverageScore('src/a.ts', null)
    expect(score).toBe(0)
  })
})
