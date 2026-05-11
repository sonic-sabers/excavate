#!/usr/bin/env node
import path from 'path'
import { program } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import { createRequire } from 'module'
import { loadConfig } from './scorer/weights.js'
import { scan } from './scanner/index.js'
import { printLogo, printResults } from './output/terminal.js'
import type { ScanResult } from './types.js'

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

program
  .name('excavate')
  .description('Dig up what is buried in your codebase.')
  .version(pkg.version)
  .argument('[path]', 'Path to scan', '.')
  .option('-o, --output <formats>', 'Output formats: terminal,html,json', 'terminal')
  .option('-r, --report', 'Shorthand for --output terminal,html')
  .option('--report-dir <dir>', 'Output directory', './excavate-report')
  .option('--fail-above <score>', 'Exit code 1 if avg score exceeds this')
  .option('--config <path>', 'Config file path')
  .option('--no-color', 'Disable colours')
  .option('--json', 'Shorthand for --output json')
  .option('--top <n>', 'Show only top N worst files')
  .option('--since <days>', 'Git history window in days')
  .action(async (scanPath: string, opts: {
    output: string
    report?: boolean
    reportDir: string
    failAbove?: string
    config?: string
    color: boolean
    json?: boolean
    top?: string
    since?: string
  }) => {
    if (!opts.color) {
      chalk.level = 0
    }

    const repoRoot = path.resolve(scanPath)
    const config = await loadConfig(opts.config)

    if (opts.since) {
      config.gitDays = parseInt(opts.since, 10)
    }

    if (opts.report) {
      config.output = ['terminal', 'html']
    } else if (opts.json) {
      config.output = ['json']
    } else {
      config.output = opts.output.split(',').filter(Boolean) as typeof config.output
    }

    if (opts.reportDir) {
      config.reportDir = opts.reportDir
    }

    if (opts.failAbove) {
      config.failAbove = parseFloat(opts.failAbove)
    }

    printLogo(pkg.version)

    const spinner = ora(`scanning ${scanPath}`).start()
    const result = await scan(repoRoot, config)
    spinner.stop()

    const top = opts.top ? parseInt(opts.top, 10) : undefined

    if (config.output.includes('terminal')) {
      printResults(result, top)
    }

    if (config.output.includes('html')) {
      const { writeHtmlReport } = await import('./output/htmlReport.js')
      const outPath = await writeHtmlReport(result, config.reportDir)
      console.log(`HTML report → ${outPath}`)
    }

    if (config.output.includes('json')) {
      if (opts.json) {
        // --json shorthand: stdout only, for piping
        console.log(JSON.stringify(result, null, 2))
      } else {
        // --output json or --output terminal,json: write to file
        const { writeJsonOutput } = await import('./output/jsonOutput.js')
        const outPath = await writeJsonOutput(result, config.reportDir)
        console.log(`JSON report → ${outPath}`)
      }
    }

    if (config.failAbove !== null && result.summary.avgScore >= config.failAbove) {
      process.exit(1)
    }
  })

program
  .command('diff <before> <after>')
  .description('Compare two excavate JSON reports and show debt delta')
  .action(async (beforePath: string, afterPath: string) => {
    const { readFile } = await import('fs/promises')
    const { computeDiff, formatDiff } = await import('./diff.js')

    let before: ScanResult, after: ScanResult
    try {
      before = JSON.parse(await readFile(path.resolve(beforePath), 'utf8')) as ScanResult
      after  = JSON.parse(await readFile(path.resolve(afterPath),  'utf8')) as ScanResult
    } catch (e) {
      console.error(`Error reading JSON files: ${(e as Error).message}`)
      process.exit(1)
    }

    const diff = computeDiff(before, after)
    console.log(formatDiff(diff))
  })

await program.parseAsync()
