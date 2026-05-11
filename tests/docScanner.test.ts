import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { scanDoc } from '../src/scanner/docScanner.js'
import { DEFAULT_CONFIG } from '../src/types.js'

let FIXTURE: string

beforeAll(async () => {
  FIXTURE = await mkdtemp(path.join(tmpdir(), 'excavate-doc-'))
  await mkdir(path.join(FIXTURE, 'src'), { recursive: true })
  await writeFile(path.join(FIXTURE, 'src/a.ts'), 'export const a = 1\n')
  await writeFile(
    path.join(FIXTURE, 'src/dirty.ts'),
    '// TODO: fix this\n// FIXME: broken\nconst x = 1 // HACK\n',
  )
})

afterAll(async () => {
  await rm(FIXTURE, { recursive: true, force: true })
})

describe('scanDoc', () => {
  it('returns docsScore 0–100', async () => {
    const result = await scanDoc('src/a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.docsScore).toBeGreaterThanOrEqual(0)
    expect(result.docsScore).toBeLessThanOrEqual(100)
  })

  it('returns satdCount 0 for clean file', async () => {
    const result = await scanDoc('src/a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.satdCount).toBe(0)
  })

  it('detects SATD keywords', async () => {
    const result = await scanDoc('src/dirty.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.satdCount).toBe(3)
  })

  it('no-comment file → docsScore >= 50', async () => {
    // src/a.ts: no comments → ratio=0 < 0.05 → ratioScore=100 → docsScore = 50 + 0 + penalty
    const result = await scanDoc('src/a.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.docsScore).toBeGreaterThanOrEqual(50)
  })

  it('missing file → 0,0 gracefully', async () => {
    const result = await scanDoc('src/nope.ts', FIXTURE, DEFAULT_CONFIG)
    expect(result.docsScore).toBe(0)
    expect(result.satdCount).toBe(0)
  })
})
