import { describe, it, expect } from 'vitest'
import { classifyArchetype } from '../src/scorer/archetype.js'
import type { FileDebtResult } from '../src/types.js'

function makeFile(overrides: Partial<FileDebtResult> = {}): FileDebtResult {
  return {
    path: 'src/test.ts',
    score: 75,
    level: 'bedrock',
    archetype: 'healthy',
    signals: {
      churn: 0,
      coverage: 0,
      complexity: 0,
      knowledge: 0,
      docs: 0,
      deps: 0,
    },
    meta: {
      lastModified: new Date(),
      authors: ['alice'],
      recentAuthors: ['alice'],
      knowledgeCliff: false,
      commitCount: 5,
      refactorCount: 0,
      survivalPct: 0,
      testCoverage: 80,
      linesOfCode: 100,
      satdCount: 0,
      circularDeps: 0,
      fanIn: 0,
      temporalCoupling: [],
      isOrphan: false,
      deadExports: 0,
      concernCount: 0,
      exportKinds: [],
    },
    ...overrides,
  }
}

describe('classifyArchetype', () => {
  it('returns healthy for clear-level files regardless of signals', () => {
    const file = makeFile({
      level: 'clear',
      score: 10,
      signals: { churn: 90, coverage: 90, complexity: 90, knowledge: 90, docs: 90, deps: 90 },
    })
    expect(classifyArchetype(file)).toBe('healthy')
  })

  it('classifies ghost when isOrphan is true', () => {
    const file = makeFile({ meta: { ...makeFile().meta, isOrphan: true, deadExports: 3 } })
    expect(classifyArchetype(file)).toBe('ghost')
  })

  it('ghost score scales with dead exports', () => {
    const few = makeFile({ meta: { ...makeFile().meta, isOrphan: true, deadExports: 0 } })
    const many = makeFile({ meta: { ...makeFile().meta, isOrphan: true, deadExports: 8 } })
    expect(classifyArchetype(few)).toBe('ghost')
    expect(classifyArchetype(many)).toBe('ghost')
  })

  it('classifies time-bomb when churn + knowledge + coverage all high', () => {
    const file = makeFile({
      signals: { churn: 80, coverage: 75, complexity: 30, knowledge: 80, docs: 20, deps: 10 },
    })
    expect(classifyArchetype(file)).toBe('time-bomb')
  })

  it('does not classify time-bomb when any signal below threshold', () => {
    const file = makeFile({
      signals: { churn: 80, coverage: 75, complexity: 30, knowledge: 50, docs: 20, deps: 10 },
    })
    expect(classifyArchetype(file)).not.toBe('time-bomb')
  })

  it('classifies load-bearing-wall when complexity + fanIn + knowledge all high', () => {
    const file = makeFile({
      signals: { churn: 10, coverage: 20, complexity: 70, knowledge: 60, docs: 10, deps: 10 },
      meta: { ...makeFile().meta, fanIn: 8 },
    })
    expect(classifyArchetype(file)).toBe('load-bearing-wall')
  })

  it('classifies revolving-door when churn high and refactorCount >= 3', () => {
    const file = makeFile({
      signals: { churn: 70, coverage: 20, complexity: 20, knowledge: 20, docs: 20, deps: 10 },
      meta: { ...makeFile().meta, refactorCount: 4 },
    })
    expect(classifyArchetype(file)).toBe('revolving-door')
  })

  it('does not classify revolving-door with fewer than 3 refactors', () => {
    const file = makeFile({
      signals: { churn: 70, coverage: 20, complexity: 20, knowledge: 20, docs: 20, deps: 10 },
      meta: { ...makeFile().meta, refactorCount: 2 },
    })
    expect(classifyArchetype(file)).not.toBe('revolving-door')
  })

  it('classifies black-box when coverage + complexity + docs all high', () => {
    const file = makeFile({
      signals: { churn: 10, coverage: 80, complexity: 70, knowledge: 20, docs: 75, deps: 10 },
    })
    expect(classifyArchetype(file)).toBe('black-box')
  })

  it('classifies spaghetti when strong coupling + circular deps', () => {
    const file = makeFile({
      signals: { churn: 10, coverage: 20, complexity: 20, knowledge: 20, docs: 10, deps: 50 },
      meta: {
        ...makeFile().meta,
        circularDeps: 2,
        temporalCoupling: [
          { file: 'src/a.ts', pct: 75 },
          { file: 'src/b.ts', pct: 65 },
        ],
      },
    })
    expect(classifyArchetype(file)).toBe('spaghetti')
  })

  it('classifies fossil when survivalPct > 70 and knowledgeCliff true', () => {
    const file = makeFile({
      signals: { churn: 5, coverage: 20, complexity: 20, knowledge: 80, docs: 20, deps: 10 },
      meta: { ...makeFile().meta, survivalPct: 85, knowledgeCliff: true },
    })
    expect(classifyArchetype(file)).toBe('fossil')
  })

  it('does not classify fossil without knowledgeCliff', () => {
    const file = makeFile({
      meta: { ...makeFile().meta, survivalPct: 85, knowledgeCliff: false },
    })
    expect(classifyArchetype(file)).not.toBe('fossil')
  })

  it('returns healthy when no rule fires on bedrock file', () => {
    const file = makeFile({
      level: 'bedrock',
      score: 75,
      signals: { churn: 10, coverage: 10, complexity: 10, knowledge: 10, docs: 10, deps: 10 },
    })
    expect(classifyArchetype(file)).toBe('healthy')
  })

  it('ghost wins when ghost score exceeds time-bomb score', () => {
    // ghost score = min(60 + deadExports*5, 100). deadExports=8 → 100
    // time-bomb: churn=65, knowledge=65, coverage=55 → (65+65+55)/3 ≈ 61.7 — ghost wins
    const file = makeFile({
      signals: { churn: 65, coverage: 55, complexity: 30, knowledge: 65, docs: 20, deps: 10 },
      meta: { ...makeFile().meta, isOrphan: true, deadExports: 8 },
    })
    expect(classifyArchetype(file)).toBe('ghost')
  })
})
