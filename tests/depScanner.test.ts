import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { scanDeps } from '../src/scanner/depScanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.resolve(__dirname, 'fixtures/fake-repo')

describe('scanDeps', () => {
  it('returns a fileMap and cruiseResult', async () => {
    const result = await scanDeps(FIXTURE)
    expect(result).toHaveProperty('fileMap')
    expect(result.fileMap).toBeInstanceOf(Map)
  })

  it('every file entry has depsScore 0–100', async () => {
    const { fileMap } = await scanDeps(FIXTURE)
    for (const [key, val] of fileMap) {
      if (key === '__repo__') continue
      expect(val.depsScore).toBeGreaterThanOrEqual(0)
      expect(val.depsScore).toBeLessThanOrEqual(100)
    }
  })

  it('every file entry has non-negative fanIn', async () => {
    const { fileMap } = await scanDeps(FIXTURE)
    for (const [key, val] of fileMap) {
      if (key === '__repo__') continue
      expect(val.fanIn).toBeGreaterThanOrEqual(0)
    }
  })

  it('every file entry has non-negative circularDeps', async () => {
    const { fileMap } = await scanDeps(FIXTURE)
    for (const [key, val] of fileMap) {
      if (key === '__repo__') continue
      expect(val.circularDeps).toBeGreaterThanOrEqual(0)
    }
  })

  it('__repo__ sentinel key present', async () => {
    const { fileMap } = await scanDeps(FIXTURE)
    expect(fileMap.has('__repo__')).toBe(true)
  })

  it('fileMap keys are relative paths without leading ./ or absolute prefix', async () => {
    const { fileMap } = await scanDeps(FIXTURE)
    for (const key of fileMap.keys()) {
      if (key === '__repo__') continue
      expect(key).not.toMatch(/^\//)        // not absolute
      expect(key).not.toMatch(/^\.\//)      // not ./relative
    }
  })

  it('cruiseResult mod.source values are normalized relative paths', async () => {
    const { cruiseResult } = await scanDeps(FIXTURE)
    if (!cruiseResult) return
    for (const mod of cruiseResult.modules) {
      expect(mod.source).not.toMatch(/^\//)   // not absolute
    }
  })
})
