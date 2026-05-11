import chalk from 'chalk'
import { type FileDebtResult, type ScanResult } from '../types.js'

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

export function printLogo(version: string): void {
  console.log(chalk.hex('#BA7517')(LOGO))
  console.log()
  console.log(`  ${chalk.bold('excavate')} v${version}`)
  console.log(`  ${chalk.dim('your codebase, laid bare')}`)
  console.log()
}

export function printResults(result: ScanResult, top?: number, base?: ScanResult | null): void {
  const files = top ? result.files.slice(0, top) : result.files

  const maxPathLen = Math.min(
    60,
    Math.max(...files.map((f) => f.path.length), 10),
  )

  for (const file of files) {
    const colorize = LEVEL_COLOR[file.level]
    const label = pad(file.level.toUpperCase(), 8)
    const filePath = pad(file.path, maxPathLen)
    const score = String(file.score).padStart(3)
    const signals = topSignals(file.signals).join('  ')

    console.log(
      `  ${colorize(label)}  ${chalk.dim(filePath)}  ${chalk.bold(score)}${signals ? '   ' + chalk.dim(signals) : ''}`,
    )
  }

  const div = chalk.dim('  ' + '─'.repeat(60))
  console.log()
  console.log(div)

  const { filesScanned, durationMs, summary } = result
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
