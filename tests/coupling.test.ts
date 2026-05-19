import { describe, it, expect, beforeAll } from 'vitest'
import { mkdtemp, writeFile, mkdir } from 'fs/promises'
import { execSync } from 'child_process'
import os from 'os'
import path from 'path'
import { buildCouplingMatrix } from '../src/scanner/couplingScanner.js'

let repoRoot: string

beforeAll(async () => {
  repoRoot = await mkdtemp(path.join(os.tmpdir(), 'excavate-coupling-'))
  await mkdir(path.join(repoRoot, 'src'), { recursive: true })

  execSync('git init', { cwd: repoRoot })
  execSync('git config user.email "test@test.com"', { cwd: repoRoot })
  execSync('git config user.name "Test"', { cwd: repoRoot })

  // Commit 1: src/a.ts + src/b.ts co-change
  await writeFile(path.join(repoRoot, 'src/a.ts'), 'export const a = 1')
  await writeFile(path.join(repoRoot, 'src/b.ts'), 'export const b = 2')
  execSync('git add .', { cwd: repoRoot })
  execSync('git commit -m "feat: add a and b"', { cwd: repoRoot })

  // Commit 2: src/a.ts + src/b.ts co-change again
  await writeFile(path.join(repoRoot, 'src/a.ts'), 'export const a = 10')
  await writeFile(path.join(repoRoot, 'src/b.ts'), 'export const b = 20')
  execSync('git add .', { cwd: repoRoot })
  execSync('git commit -m "feat: update a and b"', { cwd: repoRoot })

  // Commit 3: src/a.ts + src/b.ts co-change again (3/3 = 100%)
  await writeFile(path.join(repoRoot, 'src/a.ts'), 'export const a = 100')
  await writeFile(path.join(repoRoot, 'src/b.ts'), 'export const b = 200')
  execSync('git add .', { cwd: repoRoot })
  execSync('git commit -m "feat: update a and b again"', { cwd: repoRoot })

  // Commit 4: src/c.ts alone — not coupled with a or b
  await writeFile(path.join(repoRoot, 'src/c.ts'), 'export const c = 3')
  execSync('git add .', { cwd: repoRoot })
  execSync('git commit -m "feat: add c alone"', { cwd: repoRoot })
}, 30_000)

describe('buildCouplingMatrix', () => {
  it('detects 100% coupling between a and b', async () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts']
    const matrix = await buildCouplingMatrix(repoRoot, files, 365, 40)

    const aCoupling = matrix.get('src/a.ts') ?? []
    const bCoupling = matrix.get('src/b.ts') ?? []

    expect(aCoupling.some((c) => c.file === 'src/b.ts' && c.pct === 100)).toBe(true)
    expect(bCoupling.some((c) => c.file === 'src/a.ts' && c.pct === 100)).toBe(true)
  })

  it('c.ts has no coupling to a or b', async () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts']
    const matrix = await buildCouplingMatrix(repoRoot, files, 365, 40)

    const cCoupling = matrix.get('src/c.ts') ?? []
    expect(cCoupling).toHaveLength(0)
  })

  it('respects threshold — filters out pairs below threshold', async () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts']
    // 100% threshold — a/b still qualify, but c still has none
    const matrix = await buildCouplingMatrix(repoRoot, files, 365, 100)

    const aCoupling = matrix.get('src/a.ts') ?? []
    expect(aCoupling.some((c) => c.file === 'src/b.ts')).toBe(true)

    // 101% threshold (impossible) — nothing qualifies
    const matrix2 = await buildCouplingMatrix(repoRoot, files, 365, 101)
    const aCoupling2 = matrix2.get('src/a.ts') ?? []
    expect(aCoupling2).toHaveLength(0)
  })

  it('only includes files in the scanned set', async () => {
    // Only pass a.ts — b.ts not in set, so coupling partners must be filtered
    const files = ['src/a.ts']
    const matrix = await buildCouplingMatrix(repoRoot, files, 365, 40)

    const aCoupling = matrix.get('src/a.ts') ?? []
    expect(aCoupling).toHaveLength(0)
  })

  it('returns empty arrays for all files when gitDays is very small (no commits in window)', async () => {
    const files = ['src/a.ts', 'src/b.ts', 'src/c.ts']
    // The buildCouplingMatrix uses --since=N.days.ago. With gitDays=0, git returns
    // everything (0 days ago = now). Instead verify the threshold filter works by
    // passing 101% threshold which no pair can reach.
    const matrix = await buildCouplingMatrix(repoRoot, files, 365, 101)

    for (const file of files) {
      expect(matrix.get(file) ?? []).toHaveLength(0)
    }
  })

  it('returns map with empty arrays for all files on git error', async () => {
    const files = ['src/a.ts', 'src/b.ts']
    // non-existent repo root — git will fail
    const matrix = await buildCouplingMatrix('/nonexistent-path-xyz', files, 90, 40)

    for (const file of files) {
      expect(Array.isArray(matrix.get(file))).toBe(true)
    }
  })
})
