import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { scanDeps } from '../src/scanner/depScanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.resolve(__dirname, 'fixtures/fake-repo')

describe('scanDeps', () => {
  it('returns a Map', async () => {
    const result = await scanDeps(FIXTURE)
    expect(result).toBeInstanceOf(Map)
  })

  it('every file entry has depsScore 0–100', async () => {
    const result = await scanDeps(FIXTURE)
    for (const [key, val] of result) {
      if (key === '__repo__') continue
      expect(val.depsScore).toBeGreaterThanOrEqual(0)
      expect(val.depsScore).toBeLessThanOrEqual(100)
    }
  })

  it('every file entry has non-negative fanIn', async () => {
    const result = await scanDeps(FIXTURE)
    for (const [key, val] of result) {
      if (key === '__repo__') continue
      expect(val.fanIn).toBeGreaterThanOrEqual(0)
    }
  })

  it('every file entry has non-negative circularDeps', async () => {
    const result = await scanDeps(FIXTURE)
    for (const [key, val] of result) {
      if (key === '__repo__') continue
      expect(val.circularDeps).toBeGreaterThanOrEqual(0)
    }
  })

  it('__repo__ sentinel key present', async () => {
    const result = await scanDeps(FIXTURE)
    expect(result.has('__repo__')).toBe(true)
  })
})
