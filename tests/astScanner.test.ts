import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { scanAst } from '../src/scanner/astScanner.js'

const SIMPLE_SRC = 'export const a = 1\n'
const COMPLEX_SRC = `export function simple() { return 1 }

export function branchy(x: number): string {
  if (x > 10) {
    return 'big'
  } else if (x > 5) {
    return 'medium'
  } else {
    return 'small'
  }
}

export function loopy(arr: number[]): number {
  let sum = 0
  for (const n of arr) {
    if (n > 0) sum += n
    else if (n < 0) sum -= n
  }
  while (sum > 100) sum = sum / 2
  return sum
}
`

let FIXTURE: string

beforeAll(async () => {
  FIXTURE = await mkdtemp(path.join(tmpdir(), 'excavate-ast-'))
  await mkdir(path.join(FIXTURE, 'src'), { recursive: true })
  await writeFile(path.join(FIXTURE, 'src/a.ts'), SIMPLE_SRC)
  await writeFile(path.join(FIXTURE, 'src/complex.ts'), COMPLEX_SRC)
})

afterAll(async () => {
  await rm(FIXTURE, { recursive: true, force: true })
})

describe('scanAst', () => {
  it('simple file → complexity score 0', async () => {
    const result = await scanAst('src/a.ts', FIXTURE)
    expect(result.complexityScore).toBe(0)
  })

  it('returns linesOfCode > 0 for non-empty file', async () => {
    const result = await scanAst('src/a.ts', FIXTURE)
    expect(result.linesOfCode).toBeGreaterThan(0)
  })

  it('complex file → higher complexity score', async () => {
    const result = await scanAst('src/complex.ts', FIXTURE)
    expect(result.complexityScore).toBeGreaterThan(0)
  })

  it('complex file linesOfCode > 10', async () => {
    const result = await scanAst('src/complex.ts', FIXTURE)
    expect(result.linesOfCode).toBeGreaterThan(10)
  })

  it('missing file → 0,0 gracefully', async () => {
    const result = await scanAst('src/does-not-exist.ts', FIXTURE)
    expect(result.complexityScore).toBe(0)
    expect(result.linesOfCode).toBe(0)
  })
})
