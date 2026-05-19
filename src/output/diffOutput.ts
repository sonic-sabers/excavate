import type { ScanResult, ScanDiff, HealthGrade } from '../types.js'
import { computeHealthGrade } from '../scorer/healthGrade.js'
import chalk from 'chalk'

export function computeDiff(previous: ScanResult, current: ScanResult): ScanDiff {
  const prevMap = new Map(previous.files.map((f) => [f.path, f]))
  const currMap = new Map(current.files.map((f) => [f.path, f]))

  const regressions: ScanDiff['regressions'] = []
  const improvements: ScanDiff['improvements'] = []
  const newBedrock: string[] = []
  const resolved: string[] = []

  for (const [path, curr] of currMap) {
    const prev = prevMap.get(path)
    if (!prev) continue
    const scoreDelta = curr.score - prev.score
    if (Math.abs(scoreDelta) < 3) continue

    if (scoreDelta > 0) {
      regressions.push({
        path,
        previousScore: prev.score,
        currentScore: curr.score,
        scoreDelta,
        previousLevel: prev.level,
        currentLevel: curr.level,
        levelChanged: prev.level !== curr.level,
        archetypeChanged: prev.archetype !== curr.archetype,
        previousArchetype: prev.archetype,
        currentArchetype: curr.archetype,
      })
      if (curr.level === 'bedrock' && prev.level !== 'bedrock') newBedrock.push(path)
    } else {
      improvements.push({
        path,
        previousScore: prev.score,
        currentScore: curr.score,
        scoreDelta,
        previousLevel: prev.level,
        currentLevel: curr.level,
        levelChanged: prev.level !== curr.level,
      })
      if (curr.level === 'clear' && prev.level !== 'clear') resolved.push(path)
    }
  }

  regressions.sort((a, b) => b.scoreDelta - a.scoreDelta)
  improvements.sort((a, b) => a.scoreDelta - b.scoreDelta)

  const previousGrade = computeHealthGrade(previous)
  const currentGrade = computeHealthGrade(current)

  const trend: HealthGrade['trend'] =
    currentGrade.score - previousGrade.score > 3 ? 'improving' :
    previousGrade.score - currentGrade.score > 3 ? 'degrading' :
    'stable'

  currentGrade.trend = trend

  return {
    previous,
    current,
    healthGrade: { previous: previousGrade, current: currentGrade },
    regressions,
    improvements,
    newBedrock,
    resolved,
  }
}

export function printDiff(diff: ScanDiff): void {
  const { healthGrade, regressions, improvements, newBedrock, resolved } = diff

  const prevScore = healthGrade.previous.score
  const currScore = healthGrade.current.score
  const gradeArrow =
    currScore > prevScore ? chalk.green('↑') :
    currScore < prevScore ? chalk.red('↓') :
    '→'

  console.log(
    `  health  ${healthGrade.previous.grade} → ${healthGrade.current.grade} ${gradeArrow}` +
    `  (${prevScore} → ${currScore})`,
  )

  if (newBedrock.length) {
    console.log(chalk.red.bold(`\n  ⚠ new bedrock files (${newBedrock.length})`))
    for (const f of newBedrock) console.log(chalk.red(`  ${f}`))
  }

  if (regressions.length) {
    console.log(chalk.yellow(`\n  regressions (${regressions.length})`))
    for (const r of regressions.slice(0, 10)) {
      const levels = r.levelChanged ? `${r.previousLevel} → ${r.currentLevel} ` : ''
      console.log(`  ${r.path}  ${levels}+${r.scoreDelta}`)
    }
  }

  if (improvements.length) {
    console.log(chalk.green(`\n  improvements (${improvements.length})`))
    for (const i of improvements.slice(0, 5)) {
      console.log(`  ${i.path}  ${i.scoreDelta}`)
    }
  }

  if (resolved.length) {
    console.log(chalk.green(`\n  resolved to clear (${resolved.length})`))
    for (const f of resolved) console.log(chalk.green(`  ${f}`))
  }
}
