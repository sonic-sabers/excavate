#!/usr/bin/env node
import { program } from 'commander'
import { createRequire } from 'module'

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
  .option('--since <days>', 'Git history window in days', '90')
  .action((_scanPath, _opts) => {
    console.log('excavate is coming soon. Stay tuned.')
  })

program.parse()
