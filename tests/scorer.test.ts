import { describe, it, expect } from 'vitest'
import { computeScore, assignLevel, applyGodFilePenalty } from '../src/scorer/score.js'
import { DEFAULT_CONFIG } from '../src/types.js'

const W = DEFAULT_CONFIG.weights
const T = DEFAULT_CONFIG.thresholds

describe('computeScore', () => {
  it('all zeros → 0', () => {
    const s = { churn: 0, coverage: 0, complexity: 0, knowledge: 0, docs: 0, deps: 0 }
    expect(computeScore(s, W)).toBe(0)
  })

  it('all 100 → 100', () => {
    const s = { churn: 100, coverage: 100, complexity: 100, knowledge: 100, docs: 100, deps: 100 }
    expect(computeScore(s, W)).toBe(100)
  })

  it('churn only → 25', () => {
    const s = { churn: 100, coverage: 0, complexity: 0, knowledge: 0, docs: 0, deps: 0 }
    expect(computeScore(s, W)).toBe(25)
  })

  it('clamps to 100 with overweighted input', () => {
    const w = { churn: 0.5, coverage: 0.5, complexity: 0, knowledge: 0, docs: 0, deps: 0 }
    const s = { churn: 100, coverage: 100, complexity: 0, knowledge: 0, docs: 0, deps: 0 }
    expect(computeScore(s, w)).toBe(100)
  })
})

describe('assignLevel', () => {
  it('70 → bedrock', () => expect(assignLevel(70, T)).toBe('bedrock'))
  it('69 → deep',    () => expect(assignLevel(69, T)).toBe('deep'))
  it('40 → deep',    () => expect(assignLevel(40, T)).toBe('deep'))
  it('39 → surface', () => expect(assignLevel(39, T)).toBe('surface'))
  it('20 → surface', () => expect(assignLevel(20, T)).toBe('surface'))
  it('19 → clear',   () => expect(assignLevel(19, T)).toBe('clear'))
  it('0  → clear',   () => expect(assignLevel(0,  T)).toBe('clear'))
})

describe('applyGodFilePenalty', () => {
  it('returns score unchanged when concernCount <= 2', () => {
    expect(applyGodFilePenalty(50, 0)).toBe(50)
    expect(applyGodFilePenalty(50, 1)).toBe(50)
    expect(applyGodFilePenalty(50, 2)).toBe(50)
  })

  it('adds +10 per concern above 2', () => {
    expect(applyGodFilePenalty(50, 3)).toBe(60)
    expect(applyGodFilePenalty(50, 4)).toBe(70)
    expect(applyGodFilePenalty(50, 5)).toBe(80)
  })

  it('clamps to 100', () => {
    expect(applyGodFilePenalty(90, 5)).toBe(100)
  })
})
