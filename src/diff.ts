import chalk from 'chalk'
import type { ScanResult, FileDebtResult } from './types.js'

export interface FileDelta {
  path: string
  before: number
  after: number
  delta: number
  levelBefore: FileDebtResult['level']
  levelAfter: FileDebtResult['level']
}

export interface DiffResult {
  changed: FileDelta[]
  added: FileDebtResult[]
  removed: FileDebtResult[]
  avgDelta: number
}

export function computeDiff(before: ScanResult, after: ScanResult): DiffResult {
  const beforeMap = new Map(before.files.map(f => [f.path, f]))
  const afterMap  = new Map(after.files.map(f => [f.path, f]))

  const changed: FileDelta[] = []
  const added: FileDebtResult[] = []
  const removed: FileDebtResult[] = []

  for (const [path, afterFile] of afterMap) {
    const beforeFile = beforeMap.get(path)
    if (!beforeFile) {
      added.push(afterFile)
    } else if (afterFile.score !== beforeFile.score) {
      changed.push({
        path,
        before: beforeFile.score,
        after: afterFile.score,
        delta: afterFile.score - beforeFile.score,
        levelBefore: beforeFile.level,
        levelAfter: afterFile.level,
      })
    }
  }

  for (const [path, beforeFile] of beforeMap) {
    if (!afterMap.has(path)) {
      removed.push(beforeFile)
    }
  }

  const allDeltas = [
    ...changed.map(f => f.delta),
    ...added.map(f => f.score),
    ...removed.map(f => -f.score),
  ]
  const avgDelta = allDeltas.length === 0
    ? 0
    : Math.round(allDeltas.reduce((s, d) => s + d, 0) / allDeltas.length)

  changed.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return { changed, added, removed, avgDelta }
}

type ChalkInstance = typeof chalk

function levelColor(level: FileDebtResult['level']): ChalkInstance {
  switch (level) {
    case 'bedrock': return chalk.red.bold
    case 'deep':    return chalk.yellow
    case 'surface': return chalk.blue
    case 'clear':   return chalk.green
    default: return chalk.white
  }
}

export function formatDiff(diff: DiffResult): string {
  const lines: string[] = []

  const sign = diff.avgDelta > 0 ? '+' : ''
  const avgColor = diff.avgDelta > 0 ? chalk.red : diff.avgDelta < 0 ? chalk.green : chalk.gray
  lines.push('')
  lines.push(`  avg debt delta  ${avgColor(`${sign}${diff.avgDelta}`)}`)
  lines.push('')

  if (diff.changed.length > 0) {
    lines.push('  CHANGED')
    for (const f of diff.changed) {
      const arrow = f.delta > 0 ? chalk.red(`+${f.delta}`) : chalk.green(`${f.delta}`)
      const lvl = levelColor(f.levelAfter)(f.levelAfter.toUpperCase().padEnd(7))
      lines.push(`  ${lvl}  ${f.path.padEnd(50)}  ${String(f.after).padStart(3)}  (${arrow})`)
    }
    lines.push('')
  }

  if (diff.added.length > 0) {
    lines.push('  NEW FILES')
    for (const f of diff.added) {
      const lvl = levelColor(f.level)(f.level.toUpperCase().padEnd(7))
      lines.push(`  ${lvl}  ${f.path.padEnd(50)}  ${String(f.score).padStart(3)}  (${chalk.red('new')})`)
    }
    lines.push('')
  }

  if (diff.removed.length > 0) {
    lines.push('  REMOVED FILES')
    for (const f of diff.removed) {
      lines.push(`  ${chalk.gray('REMOVED')}  ${f.path.padEnd(50)}  ${String(f.score).padStart(3)}  (${chalk.green('deleted')})`)
    }
    lines.push('')
  }

  if (diff.changed.length === 0 && diff.added.length === 0 && diff.removed.length === 0) {
    lines.push(chalk.green('  no changes detected'))
    lines.push('')
  }

  return lines.join('\n')
}
