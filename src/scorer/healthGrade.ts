import type { ScanResult, HealthGrade } from '../types.js'

export function computeHealthGrade(result: ScanResult): HealthGrade {
  if (result.filesScanned === 0) return { score: 100, grade: 'A' }

  const { bedrock, deep, surface } = result.summary
  const penalty = ((bedrock * 3 + deep * 1.2 + surface * 0.4) / result.filesScanned) * 100
  const score = Math.max(0, Math.round(100 - penalty))

  const grade =
    score >= 80 ? 'A' :
    score >= 60 ? 'B' :
    score >= 40 ? 'C' :
    score >= 20 ? 'D' : 'F'

  return { score, grade }
}
