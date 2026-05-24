# Excavate: Technical Debt Scanner for JavaScript & TypeScript

[![npm version](https://img.shields.io/npm/v/excavate.svg)](https://www.npmjs.com/package/excavate)
[![npm downloads](https://img.shields.io/npm/dm/excavate.svg)](https://www.npmjs.com/package/excavate)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

**Excavate is a zero-config technical debt scanner for JavaScript and TypeScript codebases.**

It analyzes git history, code complexity, coverage gaps, ownership risk, temporal coupling, orphan files, dead exports, and dependency signals to show which files are most risky to change.

```bash
npx excavate
```

No account. No server. No setup. Your code stays local.

> Requires Node.js 18+ and a git repository.

---

## Why use Excavate?

Most code quality tools show what your code looks like today.

Excavate shows what your codebase has been struggling with over time.

It helps engineering teams:

- Find the riskiest files in large JavaScript and TypeScript repositories
- Prioritize refactors using git history, not opinions
- Detect high-churn, low-coverage, high-complexity files
- Identify single-owner and knowledge-cliff risks
- Find files that repeatedly change together
- Surface orphaned files and dead exports
- Generate shareable HTML codebase health reports
- Add CI quality gates to prevent new debt from silently entering the codebase
- Track whether your codebase is actually improving over time

The goal is simple: make technical debt visible, measurable, and easier to improve.

---

## What Excavate detects

Excavate combines multiple engineering signals into one ranked technical debt score per file.

| Signal             | What it finds                                   |
| ------------------ | ----------------------------------------------- |
| Git churn          | Files that change too often                     |
| Coverage gaps      | Risky files with little or no test safety       |
| Complexity         | Code that is hard to reason about               |
| Knowledge risk     | Files owned by too few people                   |
| Documentation debt | TODO, FIXME, HACK, and low-comment areas        |
| Dependency risk    | Circular dependencies, stale packages, and CVEs |
| Temporal coupling  | Files that repeatedly change together           |
| Orphan files       | Files that appear unused                        |
| Dead exports       | Exported code that nothing imports              |

---

## Quick start

Run Excavate instantly in any JS or TS git repository:

```bash
npx excavate
```

Or install it globally:

```bash
npm install -g excavate
```

Then scan your current repo:

```bash
excavate
```

Scan a specific path:

```bash
npx excavate /path/to/repo
```

Generate a shareable HTML report:

```bash
npx excavate --report
```

Show only the worst 10 files:

```bash
npx excavate --top 10
```

Scan only recent git history:

```bash
npx excavate --since 30
```

---

## Example output

```txt
  ████
  ███          Excavate v1.0.3
  ██
  █            your codebase, laid bare

  scanning ./src  ⠸

  health grade   C   (71/100) → stable

  BEDROCK  src/auth/legacy-session.ts        91   churn ▲  coverage ▲  authors:1
  BEDROCK  src/payments/stripe-v1.ts         84   coverage ▲  knowledge ▲
  BEDROCK  src/utils/formatters.js           78   complexity ▲
  DEEP     src/api/users.ts                  62
  DEEP     src/components/DataTable.tsx      55
  SURFACE  src/hooks/useTheme.ts             34
  CLEAR    src/hooks/useAuth.ts              18

  ─────────────────────────────────────────────
  files scanned   847     duration      4.2s
  bedrock          34     deep           212
  surface         189     clear          412
  avg score        41     est. cleanup  ~340h
  ─────────────────────────────────────────────
```

Each file gets a debt score from 0 to 100.

Excavate uses geological language because technical debt builds up in layers. The oldest and most compressed debt usually sits deepest in the codebase.

| Level       | Score     | Meaning                        |
| ----------- | --------- | ------------------------------ |
| **bedrock** | 70 to 100 | Ancient, risky, hard to change |
| **deep**    | 40 to 70  | Accumulated over time          |
| **surface** | 20 to 40  | Recent and still manageable    |
| **clear**   | 0 to 20   | Low visible debt               |

---

## Improve codebase health over time

Excavate is not just a one-time scanner.

It helps teams continuously improve codebase health by turning technical debt into something measurable.

Use it to:

- Identify the files creating the most engineering drag
- Prioritize refactors based on risk, not opinions
- Track whether debt is going up or down after each scan
- Reduce single-owner and knowledge-cliff risks
- Find orphaned files and dead exports before they pile up
- Add CI gates so new debt does not silently enter the codebase
- Measure whether refactors are actually improving the repo

A codebase does not improve because someone says it feels cleaner.

It improves when risky files become safer, ownership spreads out, complexity drops, coverage improves, and repeated change hotspots start cooling down.

Excavate makes that visible.

---

## Supported projects

Excavate works best with:

- JavaScript repositories
- TypeScript repositories
- Node.js backends
- React applications
- Next.js applications
- Vite applications
- Frontend monorepos
- Backend services
- Full-stack JS and TS projects
- Repositories using Jest, Vitest, or c8 with `coverage/coverage-summary.json`

Requirements:

- Node.js 18+
- A git repository
- JS or TS source files

Coverage is optional. If no coverage report is found, Excavate skips that signal and redistributes the weights automatically.

---

## The HTML report

Pass `--report` to generate a self-contained HTML report:

```bash
npx excavate --report
```

Then open:

```bash
open excavate-report/index.html
```

The HTML report includes:

- A D3 treemap where box size represents lines of code
- Color-coded debt levels for each file
- A sortable table of every scanned file
- Debt archetypes per file
- Survival percentage
- Recent authors
- Temporal coupling metadata
- Orphan file status
- Dead export counts
- Signal-level tooltips
- A right-side file drawer
- A copyable LLM refactor prompt for each file
- Summary counts
- Estimated cleanup hours
- Health grade
- Plain-English repo narrative
- Orphan files section
- Debt trend chart after multiple scans
- Comparison toggle for latest, base, and previous scans

No server is required. The report is generated locally and can be shared with your team.

---

## Common workflows

### Find the worst files in a repo

```bash
npx excavate --top 10
```

### Generate an HTML report

```bash
npx excavate --report
```

### Fail CI if technical debt is too high

```bash
npx excavate --fail-above 70 --json
```

### Scan only the last 30 days of git history

```bash
npx excavate --since 30
```

### Show orphan files in terminal output

```bash
npx excavate --orphans
```

### Print a plain-English repo summary

```bash
npx excavate --narrative
```

### Compare against the previous scan

```bash
npx excavate --diff
```

### Output machine-readable JSON

```bash
npx excavate --json
```

---

## What is new in v1.0.3

Excavate now surfaces higher-level technical debt context in both terminal and HTML reports:

- Health grade from `A` to `F`
- Trend state when scan history is available
- Debt archetypes such as time bomb, load-bearing wall, revolving door, black box, spaghetti, fossil, ghost, and healthy
- Temporal coupling between files that repeatedly change together
- Co-change percentages
- Orphan file detection
- Dead export counts when available
- Knowledge cliff metadata
- Recent authors
- Survival percentage
- Refactor count
- Single-owner risk
- Sticky report action drawer
- File metadata
- Signal tooltips
- Copyable LLM refactor prompt per file

---

## How the score is calculated

Excavate combines six core signals into a single weighted score per file.

| Signal       | Weight | What it measures                                |
| ------------ | -----: | ----------------------------------------------- |
| `churn`      |    25% | How often a file changes                        |
| `coverage`   |    25% | How much risk exists without test safety        |
| `complexity` |    20% | How hard the file is to understand              |
| `knowledge`  |    15% | Whether too few people understand the file      |
| `docs`       |    10% | Comment density and TODO/FIXME/HACK markers     |
| `deps`       |     5% | Circular dependencies, stale packages, and CVEs |

All signals are normalized to 0 to 100 before weighting.

No magic. Just git history, AST analysis, coverage data, dependency signals, and repo metadata.

If a signal is unavailable, Excavate redistributes the weight across the remaining available signals.

---

## Debt archetypes

Excavate does not only give files a score. It also explains the type of risk.

| Archetype           | Meaning                                            |
| ------------------- | -------------------------------------------------- |
| `time bomb`         | High risk file likely to cause future issues       |
| `load-bearing wall` | Critical file many parts of the repo depend on     |
| `revolving door`    | Many people have touched it, often with high churn |
| `black box`         | Poorly understood or low-visibility file           |
| `spaghetti`         | Complexity and coupling are too high               |
| `fossil`            | Old code that may be stale or abandoned            |
| `ghost`             | File appears unused or disconnected                |
| `healthy`           | No significant risk detected                       |

These archetypes make reports easier to understand for engineering leaders, managers, and product teams.

---

## Trend tracking

Every scan automatically saves a snapshot to:

```txt
excavate-report/history/
```

The first snapshot becomes the permanent base for the HTML trend chart.

The terminal delta compares the latest scan against the immediately preceding scan:

```txt
  baseline → today    52 → 46   avg delta  −6  ✓
```

The HTML report shows:

- Debt trend over time
- Average score movement
- Latest scan view
- Base comparison
- Previous scan comparison
- Files that improved
- Files that worsened

History is kept at 5 snapshots by default.

The base snapshot is always preserved, along with the last 4 snapshots.

You can configure this with:

```json
{
  "history": true,
  "historyLimit": 5
}
```

Disable history entirely:

```json
{
  "history": false
}
```

This is useful in CI environments where the report directory is ephemeral.

---

## Comparing scans manually

You can compare any two saved JSON reports.

```bash
excavate . --output json
cp excavate-report/excavate-report.json baseline.json

# make code changes

excavate . --output json
excavate diff baseline.json excavate-report/excavate-report.json
```

The diff output shows which files improved or worsened, with color-coded deltas.

---

## GitHub Action

Post a technical debt summary comment on every pull request.

```yaml
# .github/workflows/excavate.yml
name: Debt Scan

on: [pull_request]

jobs:
  excavate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: sonic-sabers/excavate-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-above: "70"
```

See [sonic-sabers/excavate-action](https://github.com/sonic-sabers/excavate-action) for full docs.

---

## CI integration

Use `--fail-above` to fail a CI pipeline when the average technical debt score exceeds your threshold.

```bash
npx excavate --fail-above 70 --json
```

Excavate exits with code `1` if the average score across scanned files exceeds the threshold.

Example GitHub Actions step:

```yaml
- name: Check technical debt
  run: npx excavate --fail-above 70 --json
```

This lets teams prevent new codebase risk from silently entering the main branch.

---

## Configuration

Excavate works out of the box with zero config.

When you want more control, create a `.excavaterc` file in your repo root.

You can also add an `excavate` key to `package.json`.

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["**/*.test.ts", "**/node_modules/**"],
  "weights": {
    "churn": 0.25,
    "coverage": 0.25,
    "complexity": 0.2,
    "knowledge": 0.15,
    "docs": 0.1,
    "deps": 0.05
  },
  "thresholds": {
    "bedrock": 70,
    "deep": 40,
    "surface": 20
  },
  "output": ["terminal", "html"],
  "reportDir": "./excavate-report",
  "failAbove": null,
  "gitDays": 90,
  "history": true,
  "historyLimit": 5,
  "coupling": {
    "enabled": true,
    "threshold": 40
  },
  "orphans": {
    "enabled": true,
    "minLOC": 10
  },
  "autoOpen": true
}
```

Weights must sum to `1.0`.

See [`.excavaterc.example`](.excavaterc.example) for the full list of options.

---

## CLI options

```txt
excavate [path] [options]

Arguments:
  path                    Repo to scan. Defaults to current directory.

Options:
  -o, --output <formats>  Output formats: terminal, html, json
  -r, --report            Shorthand for --output terminal,html
  --report-dir <dir>      Where to write reports. Default: ./excavate-report
  --fail-above <score>    Exit 1 if average score exceeds this threshold
  --config <path>         Path to config file
  --no-color              Disable terminal colors
  --json                  Shorthand for --output json
  --top <n>               Show only the top N worst files
  --since <days>          Git history window in days. Default: 90
  --diff                  Compare this scan to the previous scan in history
  --diff-only             Show only the diff against the previous scan (errors if no prior scan exists)
  --narrative             Print plain-English repo summary to stdout
  --orphans               Show orphan files in terminal output
  --no-open               Do not auto-open HTML report in browser
  -v, --version           Show version
  -h, --help              Show help
```

---

## Programmatic API

You can also use Excavate from Node.js or TypeScript.

```typescript
import { scan } from "excavate";

const result = await scan("/path/to/repo", {
  output: [],
  failAbove: null,
});

console.log(result.summary.avgScore);
console.log(result.summary.healthGrade);
console.log(result.files.filter((file) => file.level === "bedrock"));
console.log(result.files[0].archetype);
console.log(result.files[0].meta.temporalCoupling);
```

Example use cases:

- Build custom dashboards
- Create internal code health reports
- Send summaries to Slack
- Track debt trends across multiple repos
- Generate engineering health metrics

---

## Privacy

Excavate runs locally on your machine.

- No source code is uploaded
- No account is required
- No hosted service is needed
- No server is required
- HTML reports are generated locally
- JSON reports are stored locally
- Your git history stays on your machine

The only optional network call is `npm audit` for dependency CVE data, which goes to the npm registry in the same way `npm audit` normally does.

---

## Why not just ask an LLM to review your code?

You can. But there are several things an LLM usually cannot do well by itself.

### 1. It cannot understand your git history

Technical debt is not only about how code looks today.

It is also about how the code behaves over time.

A file touched 60 times in 90 days by one person is a very different risk from a messy-looking file that has not changed in years.

LLMs see a snapshot.

Excavate sees the dig site.

### 2. It cannot tell you where to look first

Ask an LLM to find the worst file in a repo and it may pick something that looks messy.

Excavate ranks files using a weighted signal model across churn, coverage gaps, complexity, knowledge risk, dependency risk, and documentation debt.

The worst-looking file is not always the highest-risk file.

### 3. It cannot fit your whole repo in context

Large codebases do not fit cleanly in one context window.

Summaries lose signal.

Excavate runs locally against the full repository, including every file, every relevant commit in the selected window, and the import graph.

### 4. It gives you no durable process

An LLM gives you suggestions.

Excavate gives you:

- A score per file
- A ranked list
- A sortable table
- A D3 treemap
- A shareable HTML report
- A copyable file-specific LLM prompt
- A trend chart
- A CI quality gate

Use Excavate to find the files.

Use LLMs to help fix them.

---

## Excavate vs SonarQube, Code Climate, Plato, ESLint, and npm audit

| Tool             | Gap                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------- |
| **SonarQube**    | Requires server setup and administration. Not zero-config.                          |
| **Code Climate** | SaaS-based. Your code may leave your environment.                                   |
| **Plato**        | JavaScript-only, CommonJS-era, and unmaintained since 2018.                         |
| **ESLint**       | Great for syntax and style, but it has no model of time, ownership, or change risk. |
| **npm audit**    | CVEs only. One signal out of many.                                                  |

Excavate combines:

- Git history
- AST complexity
- Coverage gaps
- Bus factor
- Circular dependencies
- Temporal coupling
- Orphan files
- Dead exports
- Dependency risk
- Self-admitted technical debt markers

It runs with one `npx` command and produces reports your team can act on.

---

## FAQ

### Does Excavate need any setup?

No.

Run:

```bash
npx excavate
```

That is enough for most JS and TS git repositories.

### Does it send code anywhere?

No.

Excavate runs locally. Your source code and git history stay on your machine.

### Does it require coverage?

No.

Coverage is optional. If Excavate finds `coverage/coverage-summary.json` (or `coverage-summary.json`), it uses it. Otherwise, it skips the coverage signal and redistributes the weights.

### Does it work with monorepos?

Yes.

Pass the path to the package you want to scan:

```bash
npx excavate packages/api
```

### Does it work with Jest?

Yes.

If Jest outputs `coverage/coverage-summary.json` (or `coverage-summary.json`), Excavate can use it.

### Does it work with Vitest?

Yes.

Vitest works as long as coverage output is available in a supported format.

### Does it work with c8?

Yes.

Excavate can read summary coverage JSON (`coverage/coverage-summary.json` or `coverage-summary.json`).

### Can I use it in CI?

Yes.

Use:

```bash
npx excavate --fail-above 70 --json
```

### Can I share the report?

Yes.

Run:

```bash
npx excavate --report
```

The generated HTML report is self-contained and can be shared with your team.

---

## Using Excavate with AI assistants

Excavate includes an `llms.txt` file that describes its API, CLI flags, output schema, and configuration.

AI coding assistants can use this file to understand Excavate correctly without hallucinating flags or types.

Direct URL:

```txt
https://raw.githubusercontent.com/sonic-sabers/excavate/main/llms.txt
```

The HTML report also includes copyable LLM prompts for individual files, so you can send exact technical debt context to an AI coding assistant.

---

## Roadmap

Planned developer experience improvements:

- `excavate init` to generate a starter config
- `excavate doctor` to debug setup, git history, coverage, and config issues
- `excavate explain <file>` to explain why a file scored high
- Markdown output for PR comments and Slack summaries
- SARIF output for GitHub code scanning
- Changed-files-only mode for pull requests
- Better monorepo package detection
- More framework-aware analysis for React, Next.js, and Node.js projects

---

## License

MIT
