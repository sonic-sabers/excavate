import chalk from 'chalk'
import type { FileDebtResult } from '../types.js'
import { ARCHETYPE_LABELS } from '../scorer/archetype.js'
import { interpolatePlaybook } from './playbooks.js'

const SIGNAL_ORDER: Array<keyof FileDebtResult['signals']> = [
  'churn', 'coverage', 'complexity', 'knowledge', 'docs', 'deps',
]

export function explainFile(filePath: string, result: FileDebtResult): void {
  const { level, score, archetype, signals, meta } = result
  const div = chalk.dim('─'.repeat(45))

  // Header
  console.log()
  console.log(
    chalk.red.bold(`■ ${level.toUpperCase()}  ${filePath}   score: ${score}`),
  )
  console.log(div)

  // Archetype
  if (archetype !== 'healthy') {
    const label = ARCHETYPE_LABELS[archetype]
    console.log(chalk.yellow.bold(`archetype: ${label.name}`))
    console.log(chalk.dim(label.summary))
    console.log(div)
  }

  // Signal bars
  console.log(chalk.white('signals'))
  for (const key of SIGNAL_ORDER) {
    const val = signals[key]
    const filled = Math.round(val / 10)
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
    const num = String(Math.round(val)).padStart(3)
    console.log(`  ${key.padEnd(12)} ${bar}  ${num}`)
  }
  console.log(div)

  // Temporal coupling
  if (meta.temporalCoupling.length > 0) {
    console.log(chalk.white('temporal coupling'))
    for (const c of meta.temporalCoupling.slice(0, 3)) {
      console.log(`  co-changes with ${c.file} ${c.pct}% of the time`)
    }
    console.log(div)
  }

  // Playbook
  const actions = interpolatePlaybook(archetype, {
    linesOfCode: meta.linesOfCode,
    authors: meta.recentAuthors,
    deadExports: meta.deadExports,
    fanIn: meta.fanIn,
  })
  if (actions.length > 0) {
    console.log(chalk.white('recommended actions'))
    actions.forEach((action, i) => {
      console.log(`  ${i + 1}. ${action}`)
    })
    console.log(div)
  }

  // API key tip — tier 2 hint
  if (!process.env['ANTHROPIC_API_KEY']) {
    console.log(
      chalk.dim('\n  tip: set ANTHROPIC_API_KEY for deep analysis with specific line references'),
    )
  }

  console.log()
}
