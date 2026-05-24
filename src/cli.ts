#!/usr/bin/env node
import path from 'path'
import { program } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import { createRequire } from 'module'
import { loadConfig } from './scorer/weights.js'
import { scan } from './scanner/index.js'
import { printLogo, printResults } from './output/terminal.js'
import { saveSnapshot, loadBase, loadPrevious, loadHistory } from './history.js'
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
  .option('--diff', 'Compare to the immediately preceding scan in history/')
  .option('--diff-only', 'Show only the diff vs preceding scan; exits with error if no prior scan exists')
  .option('--narrative', 'Print plain-English summary to stdout')
  .option('--orphans', 'Show orphan files section in terminal output')
  .option('--no-open', 'Do not auto-open HTML report in browser')
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
    diff?: boolean
    diffOnly?: boolean
    narrative?: boolean
    orphans?: boolean
    open: boolean
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

    // --no-open overrides config default
    if (opts.open === false) {
      config.autoOpen = false
    }

    printLogo(pkg.version)

    const spinner = ora(`scanning ${scanPath}`).start()
    const result = await scan(repoRoot, config, spinner)
    spinner.stop()

    // History: save snapshot, then load previous run (for diff) + full history (for HTML trend)
    let previous: ScanResult | null = null  // second-to-last snapshot — used by --diff
    let base: ScanResult | null = null      // oldest snapshot — used by HTML trend chart
    let history: ScanResult[] = []
    if (config.history) {
      try {
        await saveSnapshot(result, config.reportDir, config.historyLimit)
        previous = await loadPrevious(config.reportDir)
        base     = await loadBase(config.reportDir)
        history  = await loadHistory(config.reportDir)
      } catch {
        console.warn('  warning: could not save scan history')
      }
    }

    const top = opts.top ? parseInt(opts.top, 10) : undefined
    const showOrphans = opts.orphans ?? false
    const showDiff = opts.diff ?? opts.diffOnly ?? false

    if (opts.narrative) {
      console.log()
      console.log(result.summary.narrative)
      console.log()
    }

    if (opts.diffOnly) {
      if (!previous) {
        console.error('  error: --diff-only requires a prior scan in history. Run without --diff-only first.')
        process.exit(1)
      }
      const { computeDiff, printDiff } = await import('./output/diffOutput.js')
      const diff = computeDiff(previous, result)
      printDiff(diff)
    } else {
      if (config.output.includes('terminal')) {
        printResults(result, top, base, showOrphans)
      }

      if (showDiff && previous) {
        const { computeDiff, printDiff } = await import('./output/diffOutput.js')
        const diff = computeDiff(previous, result)
        printDiff(diff)
      }
    }

    if (config.output.includes('html')) {
      const { writeHtmlReport } = await import('./output/htmlReport.js')
      const outPath = await writeHtmlReport(result, config.reportDir, history)
      console.log(`HTML report → ${outPath}`)
      if (config.autoOpen) {
        const { default: open } = await import('open')
        await open(outPath)
      }
    }

    if (config.output.includes('json')) {
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2))
      } else {
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
    const { computeDiff, printDiff } = await import('./output/diffOutput.js')

    let before: ScanResult, after: ScanResult
    try {
      before = JSON.parse(await readFile(path.resolve(beforePath), 'utf8')) as ScanResult
      after  = JSON.parse(await readFile(path.resolve(afterPath),  'utf8')) as ScanResult
    } catch (e) {
      console.error(`Error reading JSON files: ${(e as Error).message}`)
      process.exit(1)
    }

    const diff = computeDiff(before, after)
    printDiff(diff)
  })

await program.parseAsync()
