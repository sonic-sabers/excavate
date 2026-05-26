import { describe, it, expect } from 'vitest'
import { classifyExportKinds } from '../src/scanner/godFileScanner.js'

describe('classifyExportKinds', () => {
  it('returns empty for a file with no exports', () => {
    const result = classifyExportKinds('const x = 1', 'src/foo.ts')
    expect(result.exportKinds).toEqual([])
    expect(result.concernCount).toBe(0)
  })

  it('classifies PascalCase export as component', () => {
    const src = `export function Button() { return null }`
    const result = classifyExportKinds(src, 'src/Button.tsx')
    expect(result.exportKinds).toContain('component')
  })

  it('classifies use-prefixed export as hook', () => {
    const src = `export function useTheme() { return {} }`
    const result = classifyExportKinds(src, 'src/useTheme.ts')
    expect(result.exportKinds).toContain('hook')
  })

  it('classifies interface as type', () => {
    const src = `export interface Config { host: string }`
    const result = classifyExportKinds(src, 'src/types.ts')
    expect(result.exportKinds).toContain('type')
  })

  it('classifies type alias as type', () => {
    const src = `export type ID = string`
    const result = classifyExportKinds(src, 'src/id.ts')
    expect(result.exportKinds).toContain('type')
  })

  it('classifies class declaration as class', () => {
    const src = `export class EventBus {}`
    const result = classifyExportKinds(src, 'src/bus.ts')
    expect(result.exportKinds).toContain('class')
  })

  it('classifies arrow function const as function', () => {
    const src = `export const parseDate = (s: string) => new Date(s)`
    const result = classifyExportKinds(src, 'src/utils.ts')
    expect(result.exportKinds).toContain('function')
  })

  it('counts distinct concerns correctly for a mixed file', () => {
    const src = `
      export interface Config { host: string }
      export function Button() { return null }
      export function useTheme() { return {} }
    `
    const result = classifyExportKinds(src, 'src/mixed.tsx')
    expect(result.concernCount).toBe(3)
  })

  it('deduplicates kinds — two components = 1 concern', () => {
    const src = `
      export function Header() { return null }
      export function Footer() { return null }
    `
    const result = classifyExportKinds(src, 'src/layout.tsx')
    expect(result.concernCount).toBe(1)
  })
})
