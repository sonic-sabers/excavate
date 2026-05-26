import chalk from 'chalk'
import type { ScanResult } from '../types.js'

export function runBlame(result: ScanResult): void {
  const bedrockFiles = result.files
    .filter((f) => f.level === 'bedrock')
    .sort((a, b) => b.score - a.score)

  if (bedrockFiles.length === 0) {
    console.log(chalk.green('\n  no bedrock files — nothing to report\n'))
    return
  }

  console.log(chalk.bold('\n  responsibility report — bedrock files\n'))

  for (const f of bedrockFiles) {
    const owner = f.meta.recentAuthors[0] ?? f.meta.authors[0] ?? 'unknown'
    const sole  = f.meta.recentAuthors.length <= 1
    const cliff = f.meta.knowledgeCliff

    const flags = [
      sole  ? chalk.red('sole author')     : '',
      cliff ? chalk.red('knowledge cliff') : '',
    ].filter(Boolean).join('  ')

    console.log(
      `  ${chalk.red.bold('BEDROCK')}  ${f.path.padEnd(50)}  owner: ${owner.padEnd(30)}  ${flags}`,
    )
  }

  const soleCount = bedrockFiles.filter((f) => f.meta.recentAuthors.length <= 1).length
  if (soleCount > 0) {
    console.log(chalk.dim(`\n  ${soleCount} bedrock files have a single active contributor.`))
    console.log(chalk.dim('  If that person leaves, these files become unserviceable.'))
  }
  console.log()
}
