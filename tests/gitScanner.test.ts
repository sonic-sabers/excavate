import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { simpleGit } from 'simple-git'
import { scanGit } from '../src/scanner/gitScanner.js'
import { DEFAULT_CONFIG } from '../src/types.js'

let FIXTURE: string

beforeAll(async () => {
  FIXTURE = await mkdtemp(path.join(tmpdir(), 'excavate-git-'))
  const git = simpleGit(FIXTURE)
  await git.init()
  await git.addConfig('user.email', 'test@example.com')
  await git.addConfig('user.name', 'Test User')
  await git.addConfig('commit.gpgsign', 'false')

  await writeFile(path.join(FIXTURE, 'a.ts'), 'export const a = 1\n')
  await git.add('a.ts')
  await git.raw(['commit', '-m', 'init', '--no-gpg-sign'])

  await writeFile(path.join(FIXTURE, 'a.ts'), 'export const a = 2\n')
  await git.add('a.ts')
  await git.raw(['commit', '-m', 'second', '--no-gpg-sign'])
}, 30_000)  // beforeAll timeout

afterAll(async () => {
  await rm(FIXTURE, { recursive: true, force: true })
})

describe('scanGit', () => {
  it('returns churnScore 0–100', async () => {
    const result = await scanGit('a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.churnScore).toBeGreaterThanOrEqual(0)
    expect(result.churnScore).toBeLessThanOrEqual(100)
  })

  it('returns knowledgeScore 100 for single-author file', async () => {
    const result = await scanGit('a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.knowledgeScore).toBe(100)
  })

  it('returns commitCount >= 2', async () => {
    const result = await scanGit('a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.commitCount).toBeGreaterThanOrEqual(2)
  })

  it('returns authors array with one entry', async () => {
    const result = await scanGit('a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.authors).toHaveLength(1)
  })

  it('returns lastModified as Date', async () => {
    const result = await scanGit('a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.lastModified).toBeInstanceOf(Date)
  })

  it('counts substantial balanced rewrites as refactors', async () => {
    const git = simpleGit(FIXTURE)
    const baseLarge = [
      'export function alpha() { return 1 }',
      'export function beta() { return 2 }',
      'export function gamma() { return 3 }',
      'export function delta() { return 4 }',
      'export function epsilon() { return 5 }',
      'export function zeta() { return 6 }',
      'export function eta() { return 7 }',
      'export function theta() { return 8 }',
      'export function iota() { return 9 }',
      'export function kappa() { return 10 }',
    ].join('\n') + '\n'
    await writeFile(path.join(FIXTURE, 'a.ts'), baseLarge)
    await git.add('a.ts')
    await git.raw(['commit', '-m', 'expand', '--no-gpg-sign'])

    const rewritten = [
      'export function alphaRefactored() { return 11 }',
      'export function betaRefactored() { return 12 }',
      'export function gammaRefactored() { return 13 }',
      'export function deltaRefactored() { return 14 }',
      'export function epsilonRefactored() { return 15 }',
      'export function zetaRefactored() { return 16 }',
      'export function etaRefactored() { return 17 }',
      'export function thetaRefactored() { return 18 }',
      'export function iotaRefactored() { return 19 }',
      'export function kappaRefactored() { return 20 }',
    ].join('\n') + '\n'
    await writeFile(path.join(FIXTURE, 'a.ts'), rewritten)
    await git.add('a.ts')
    await git.raw(['commit', '-m', 'rewrite', '--no-gpg-sign'])

    const result = await scanGit('a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.refactorCount).toBeGreaterThanOrEqual(1)
  })
})
