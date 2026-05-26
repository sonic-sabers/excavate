import chalk from 'chalk'
import { select, isCancel } from '@clack/prompts'
import { execFileSync } from 'child_process'
import { type FileDebtResult, type ScanResult, type DebtArchetype } from '../types.js'
import { ARCHETYPE_LABELS } from '../scorer/archetype.js'

const LOGO = [
  '  ████',
  '  ███',
  '  ██',
  '  █',
].join('\n')

const LEVEL_COLOR: Record<FileDebtResult['level'], (s: string) => string> = {
  bedrock: (s) => chalk.red.bold(s),
  deep:    (s) => chalk.yellow(s),
  surface: (s) => chalk.blue(s),
  clear:   (s) => chalk.green(s),
}

const GRADE_COLOR: Record<string, (s: string) => string> = {
  A: (s) => chalk.green.bold(s),
  B: (s) => chalk.cyan.bold(s),
  C: (s) => chalk.yellow.bold(s),
  D: (s) => chalk.hex('#FF8C00').bold(s),
  F: (s) => chalk.red.bold(s),
}

const SIGNAL_LABELS: Record<keyof FileDebtResult['signals'], string> = {
  churn:      'churn',
  coverage:   'coverage',
  complexity: 'complexity',
  knowledge:  'knowledge',
  docs:       'docs',
  deps:       'deps',
}

function topSignals(signals: FileDebtResult['signals']): string[] {
  return (Object.entries(signals) as Array<[keyof typeof signals, number]>)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .filter(([, v]) => v >= 40)
    .map(([k]) => `${SIGNAL_LABELS[k]} ▲`)
}

function pad(s: string, n: number): string {
  return s.padEnd(n)
}

function archetypeLabel(archetype: DebtArchetype): string {
  const label = ARCHETYPE_LABELS[archetype]
  if (!label?.name) return ''
  return label.name
}

export function printLogo(version: string): void {
  console.log(chalk.hex('#BA7517')(LOGO))
  console.log()
  console.log(`  ${chalk.bold('excavate')} v${version}`)
  console.log(`  ${chalk.dim('your codebase, laid bare')}`)
  console.log()
}

export function printHealthGrade(result: ScanResult): void {
  const { healthGrade } = result.summary
  if (!healthGrade) return

  const colorize = GRADE_COLOR[healthGrade.grade] ?? ((s: string) => s)
  const gradeStr = colorize(`${healthGrade.grade}`)
  const scoreStr = `(${healthGrade.score}/100)`

  let trendStr = ''
  if (healthGrade.trend === 'improving') trendStr = chalk.green(' ↑ improving')
  else if (healthGrade.trend === 'degrading') trendStr = chalk.red(' ↓ degrading')
  else if (healthGrade.trend === 'stable') trendStr = chalk.dim(' → stable')

  console.log(`  health grade   ${gradeStr}   ${chalk.dim(scoreStr)}${trendStr}`)
}

export function printResults(result: ScanResult, top?: number, base?: ScanResult | null, showOrphans = false): void {
  const { summary } = result

  // Health grade header
  if (summary.healthGrade) {
    printHealthGrade(result)
    console.log()
  }

  const nonOrphans = result.files.filter((f) => !f.meta.isOrphan)
  const orphans = result.files.filter((f) => f.meta.isOrphan)

  const displayFiles = top ? nonOrphans.slice(0, top) : nonOrphans

  const maxPathLen = Math.min(
    55,
    Math.max(...displayFiles.map((f) => f.path.length), 10),
  )

  for (const file of displayFiles) {
    const colorize = LEVEL_COLOR[file.level]
    const label = pad(file.level.toUpperCase(), 8)
    const filePath = pad(file.path, maxPathLen)
    const score = String(file.score).padStart(3)
    const arch = file.archetype !== 'healthy' ? chalk.dim(`  ${archetypeLabel(file.archetype)}`) : ''
    const signals = topSignals(file.signals).join('  ')
    const signalStr = signals ? `   ${chalk.dim(signals)}` : ''

    console.log(
      `  ${colorize(label)}  ${chalk.dim(filePath)}  ${chalk.bold(score)}${arch}${signalStr}`,
    )
  }

  // Orphans section
  if (showOrphans && orphans.length > 0) {
    console.log()
    const orphanLOC = orphans.reduce((sum, f) => sum + f.meta.linesOfCode, 0)
    console.log(chalk.dim(`  ORPHANS (${orphans.length} files, ${orphanLOC} lines — nothing imports these)`))
    for (const file of orphans) {
      const score = String(file.score).padStart(3)
      const filePath = pad(file.path, maxPathLen)
      const deadStr = file.meta.deadExports > 0 ? chalk.dim(`   dead exports: ${file.meta.deadExports}`) : ''
      console.log(`  ${chalk.dim('GHOST   ')}  ${chalk.dim(filePath)}  ${score}${deadStr}`)
    }
  }

  const div = chalk.dim('  ' + '─'.repeat(60))
  console.log()
  console.log(div)

  const { filesScanned, durationMs } = result
  const dur = (durationMs / 1000).toFixed(1) + 's'
  const hrs = summary.estimatedHours > 0 ? `~${summary.estimatedHours}h` : '—'

  console.log(
    `  files scanned   ${String(filesScanned).padStart(5)}     duration      ${dur}`,
  )
  console.log(
    `  ${chalk.red.bold('bedrock')}         ${String(summary.bedrock).padStart(4)}     ${chalk.yellow('deep')}          ${String(summary.deep).padStart(4)}`,
  )
  console.log(
    `  ${chalk.blue('surface')}         ${String(summary.surface).padStart(4)}     ${chalk.green('clear')}         ${String(summary.clear).padStart(4)}`,
  )
  console.log(
    `  avg score       ${String(summary.avgScore).padStart(5)}     est. cleanup  ${hrs}`,
  )

  if (summary.orphanFiles > 0) {
    console.log(
      `  orphan files    ${String(summary.orphanFiles).padStart(5)}     orphan LOC    ${String(summary.orphanLOC).padStart(4)}`,
    )
  }
  if (summary.knowledgeCliffFiles > 0) {
    console.log(
      `  knowledge cliff ${String(summary.knowledgeCliffFiles).padStart(4)}     coupled pairs ${String(summary.temporallyCoupledPairs).padStart(4)}`,
    )
  }

  console.log(div)

  // Delta line
  const isFirstScan = base == null

  if (isFirstScan) {
    console.log(`  ${chalk.dim('no baseline yet — this scan is your base')}`)
  } else {
    const baseScore = base!.summary.avgScore
    const nowScore  = result.summary.avgScore
    const delta     = nowScore - baseScore
    const sign      = delta > 0 ? '+' : ''
    const deltaStr  = `${sign}${delta}`
    const indicator = delta < 0 ? ' ✓' : delta > 0 ? ' ✗' : ''
    const deltaColored = delta < 0
      ? chalk.green(deltaStr + indicator)
      : delta > 0
        ? chalk.red(deltaStr + indicator)
        : chalk.gray(deltaStr)
    console.log(
      `  ${chalk.dim('baseline → today')}    ${baseScore} → ${nowScore}   avg delta  ${deltaColored}`,
    )
  }

  console.log()
}

export async function runInteractive(result: ScanResult): Promise<void> {
  const candidates = result.files
    .filter((f) => f.level !== 'clear')
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)

  if (candidates.length === 0) {
    console.log(chalk.green('  no non-clear files to inspect'))
    return
  }

  const choices = [
    ...candidates.map((f) => ({
      value: f.path,
      label: `${f.level.toUpperCase().padEnd(8)}  ${f.path.padEnd(55)}  ${f.score}`,
    })),
    { value: '__quit__', label: 'quit' },
  ]

  while (true) {
    const selected = await select({
      message: 'Select a file to inspect (↑↓ navigate, Enter select)',
      options: choices,
    })

    if (isCancel(selected) || selected === '__quit__') break

    const fileResult = result.files.find((f) => f.path === selected)
    if (!fileResult) continue

    const { explainFile } = await import('../commands/explain.js')
    explainFile(selected as string, fileResult)

    if (process.env['EDITOR']) {
      const openChoice = await select({
        message: 'Open in $EDITOR?',
        options: [
          { value: 'yes', label: `yes — open ${selected} in ${process.env['EDITOR']}` },
          { value: 'no',  label: 'no — back to list' },
        ],
      })
      if (!isCancel(openChoice) && openChoice === 'yes') {
        try {
          execFileSync(process.env['EDITOR']!, [selected as string], { stdio: 'inherit' })
        } catch {
          console.log(chalk.dim('  could not open editor'))
        }
      }
    }
  }
}
