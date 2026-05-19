import type { FileDebtResult, DebtArchetype } from '../types.js'

interface ArchetypeRule {
  archetype: DebtArchetype
  score: (f: FileDebtResult) => number
}

const RULES: ArchetypeRule[] = [
  {
    archetype: 'ghost',
    score: (f) => {
      if (!f.meta.isOrphan) return 0
      return Math.min(60 + f.meta.deadExports * 5, 100)
    },
  },
  {
    archetype: 'time-bomb',
    score: (f) => {
      if (f.signals.churn > 60 && f.signals.knowledge > 60 && f.signals.coverage > 50) {
        return (f.signals.churn + f.signals.knowledge + f.signals.coverage) / 3
      }
      return 0
    },
  },
  {
    archetype: 'load-bearing-wall',
    score: (f) => {
      const fanInScore = Math.min(f.meta.fanIn / 10, 1) * 100
      if (f.signals.complexity > 50 && fanInScore > 60 && f.signals.knowledge > 40) {
        return (f.signals.complexity + fanInScore + f.signals.knowledge) / 3
      }
      return 0
    },
  },
  {
    archetype: 'revolving-door',
    score: (f) => {
      if (f.signals.churn > 55 && f.meta.refactorCount >= 3) {
        return 50 + Math.min(f.meta.refactorCount * 10, 50)
      }
      return 0
    },
  },
  {
    archetype: 'black-box',
    score: (f) => {
      if (f.signals.coverage > 60 && f.signals.complexity > 50 && f.signals.docs > 60) {
        return (f.signals.coverage + f.signals.complexity + f.signals.docs) / 3
      }
      return 0
    },
  },
  {
    archetype: 'spaghetti',
    score: (f) => {
      const strongCouples = f.meta.temporalCoupling.filter((c) => c.pct >= 60).length
      const couplingScore = Math.min(strongCouples * 33, 100)
      if (couplingScore > 50 && f.meta.circularDeps > 0) {
        return (couplingScore + Math.min(f.meta.circularDeps * 20, 100)) / 2
      }
      return 0
    },
  },
  {
    archetype: 'fossil',
    score: (f) => {
      if (f.meta.survivalPct > 70 && f.meta.knowledgeCliff) {
        return 50 + (f.meta.survivalPct - 70)
      }
      return 0
    },
  },
]

export function classifyArchetype(file: FileDebtResult): DebtArchetype {
  if (file.level === 'clear') return 'healthy'

  let best: DebtArchetype = 'healthy'
  let bestScore = 0

  for (const rule of RULES) {
    const s = rule.score(file)
    if (s > bestScore) {
      bestScore = s
      best = rule.archetype
    }
  }

  return best
}

export const ARCHETYPE_LABELS: Record<DebtArchetype, { name: string; summary: string }> = {
  'time-bomb': {
    name: 'The Time Bomb',
    summary: 'Changes constantly. One person knows it. Untested.',
  },
  'load-bearing-wall': {
    name: 'The Load-Bearing Wall',
    summary: 'Everything depends on it. Nobody dares touch it.',
  },
  'revolving-door': {
    name: 'The Revolving Door',
    summary: 'Rewritten repeatedly. Never quite right.',
  },
  'black-box': {
    name: 'The Black Box',
    summary: "Nobody knows what it does. Nobody tested it.",
  },
  'spaghetti': {
    name: 'The Spaghetti',
    summary: 'Tangled with everything around it.',
  },
  'fossil': {
    name: 'The Fossil',
    summary: 'Original author gone. Ancient code survives unchanged.',
  },
  'ghost': {
    name: 'The Ghost',
    summary: 'Still in the codebase. Nothing calls it.',
  },
  'healthy': { name: '', summary: '' },
}
