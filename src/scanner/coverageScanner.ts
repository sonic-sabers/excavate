import { readFile } from 'fs/promises'
import path from 'path'

export type CoverageMap = Map<string, number>

const COVERAGE_PATHS = [
  'coverage/coverage-summary.json',
  'coverage-summary.json',
]

export async function loadCoverageMap(repoRoot: string): Promise<CoverageMap | null> {
  for (const rel of COVERAGE_PATHS) {
    const absPath = path.join(repoRoot, rel)
    try {
      const raw = await readFile(absPath, 'utf8')
      const json = JSON.parse(raw) as Record<string, { statements: { pct: number } }>
      const map: CoverageMap = new Map()
      for (const [key, val] of Object.entries(json)) {
        if (key === 'total') continue
        const normalised = key.startsWith('/') ? path.relative(repoRoot, key) : key
        map.set(normalised, val.statements.pct)
      }
      return map
    } catch {
      // try next path
    }
  }
  return null
}

export function getCoverageScore(filePath: string, map: CoverageMap | null): number {
  if (map === null) return 0        // signal skipped — weight redistributed upstream
  const pct = map.get(filePath)
  if (pct === undefined) return 100 // file not in report = no tests
  return Math.max(0, 100 - pct)    // coverage gap
}
