import { type DebtLevel, type ExcavateConfig, type FileDebtResult } from '../types.js'

export function assignLevel(score: number, thresholds: ExcavateConfig['thresholds']): DebtLevel {
  if (score >= thresholds.bedrock) return 'bedrock'
  if (score >= thresholds.deep) return 'deep'
  if (score >= thresholds.surface) return 'surface'
  return 'clear'
}

export function computeScore(
  signals: FileDebtResult['signals'],
  weights: ExcavateConfig['weights'],
): number {
  const raw =
    signals.churn      * weights.churn      +
    signals.coverage   * weights.coverage   +
    signals.complexity * weights.complexity +
    signals.knowledge  * weights.knowledge  +
    signals.docs       * weights.docs       +
    signals.deps       * weights.deps

  return Math.round(Math.min(Math.max(raw, 0), 100))
}

export function applyGodFilePenalty(score: number, concernCount: number): number {
  const penalty = Math.max(0, concernCount - 2) * 10
  return Math.min(100, score + penalty)
}
