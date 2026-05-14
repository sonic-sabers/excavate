# Excavate

**Dig up what is buried in your codebase.**

Every codebase has files nobody wants to touch. The ones where a small bug fix turns into a week of archaeology. The ones that keep showing up in post-mortems. Excavate finds them — in seconds, with no setup.

```bash
npx excavate
```

> Requires Node.js ≥ 18 and a git repository.

<!-- ![excavate demo](assets/demo.gif) -->

---

## What you get

```
  ████
  ███          Excavate v1.0.1
  ██
  █            your codebase, laid bare

  scanning ./src  ⠸

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

Each file gets a debt score from 0–100. Excavate uses geological language — because debt accumulates in layers, oldest and most compressed at the bottom.

| Level       | Score  | What it means                      |
| ----------- | ------ | ---------------------------------- |
| **bedrock** | 70–100 | ancient, untouchable, nobody dares |
| **deep**    | 40–70  | accumulated over years             |
| **surface** | 20–40  | recent deposits, still manageable  |
| **clear**   | 0–20   | no significant accumulation        |

---

## How the score is calculated

Excavate combines six signals into a single weighted score per file:

| Signal       | Weight | What it's measuring                                  |
| ------------ | ------ | ---------------------------------------------------- |
| `churn`      | 25%    | How often this file changes — instability indicator  |
| `coverage`   | 25%    | How much of it is untested — risk with no safety net |
| `complexity` | 20%    | Cyclomatic complexity — how hard it is to follow     |
| `knowledge`  | 15%    | Bus factor — only one person has ever touched this   |
| `docs`       | 10%    | Comment density + TODO/FIXME/HACK count              |
| `deps`       | 5%     | Circular dependencies, stale packages, CVEs          |

All signals are normalised to 0–100 before weighting. No magic — just git history, your AST, and your coverage report.

---

## Getting started

```bash
# Run instantly with no install
npx excavate

# Or install globally
npm install -g excavate
```

Then point it at any JS/TS repo:

```bash
# Scan current directory
npx excavate

# Scan a specific path
npx excavate /path/to/repo

# Generate a shareable HTML report
npx excavate --report
open excavate-report/index.html

# Show only the worst 10 files
npx excavate --top 10

# Use only the last 30 days of git history
npx excavate --since 30
```

---

## The HTML report

Pass `--report` to get a self-contained HTML file you can share with your team or management — no server, no external deps, just open it in a browser. Excavate bundles everything inline.

It includes:

- A **D3 treemap** where box size = lines of code, colour = debt level
- **Click any file** to see its full signal breakdown with plain-English explanations
- A **sortable table** of every scanned file
- Summary counts and an estimated cleanup hours figure
- A **debt trend chart** showing avg score over time (appears after 2+ scans)
- A **comparison toggle** — switch between Latest, vs Base (first-ever scan), and vs Last (previous scan) to see which files improved or worsened

```bash
npx excavate --report
open excavate-report/index.html
```

---

## Trend tracking (automatic)

Every scan automatically saves a snapshot to `excavate-report/history/`. The first scan becomes your permanent base. Subsequent scans show a delta vs that base in the terminal:

```
  baseline → today    52 → 46   avg delta  −6  ✓
```

The HTML report (`--report`) shows a trend line chart and a toggle to compare files vs base or vs the previous scan.

History is kept at **5 snapshots by default** (base always preserved + last 4). Configure with `historyLimit`. Disable entirely with `history: false` (useful in CI where `reportDir` is ephemeral).

## Comparing scans (manual diff)

For ad-hoc comparison between any two saved JSON reports:

```bash
excavate . --output json
cp excavate-report/excavate-report.json baseline.json

# ... make code changes ...

excavate . --output json
excavate diff baseline.json excavate-report/excavate-report.json
```

Output shows which files got better or worse, with colour-coded deltas.

---

## GitHub Action

Post a debt summary comment on every pull request automatically:

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

Use `--fail-above` to gate your CI pipeline on debt score:

```bash
npx excavate --fail-above 70 --json
```

Exits with code `1` if the average score across all files exceeds the threshold. Pair with `--json` for machine-readable output.

```yaml
# .github/workflows/debt.yml
- name: Check technical debt
  run: npx excavate --fail-above 70 --json
```

---

## Configuration

Excavate works out of the box with zero config. When you're ready to tune it, drop a `.excavaterc` in your repo root (or add an `excavate` key to `package.json`):

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
  "history": true,
  "historyLimit": 5
}
```

Weights must sum to `1.0`. See [`.excavaterc.example`](.excavaterc.example) for the full list of options.

---

## All options

```
excavate [path] [options]

Arguments:
  path                    Repo to scan (default: current directory)

Options:
  -o, --output <formats>  Output formats: terminal, html, json (comma-separated)
  -r, --report            Shorthand for --output terminal,html
  --report-dir <dir>      Where to write reports (default: ./excavate-report)
  --fail-above <score>    Exit 1 if avg score exceeds this — useful in CI
  --config <path>         Path to config file (default: auto-discover .excavaterc)
  --no-color              Disable terminal colours
  --json                  Shorthand for --output json
  --top <n>               Show only the top N worst files
  --since <days>          Git history window in days (default: 90)
  -v, --version           Show version
  -h, --help              Show help
```

---

## Programmatic API

```typescript
import { scan } from "excavate";

const result = await scan("/path/to/repo", {
  output: [],
  failAbove: null,
});

console.log(result.summary.avgScore);
console.log(result.files.filter((f) => f.level === "bedrock"));
```

---

## Why not just ask an LLM to review your code?

You can. But there are four things an LLM cannot do:

**1. It can't read your git history.**
Debt isn't just in how code looks — it's in how it _behaves over time_. A file that's been touched 60 times in 90 days by a single author is a risk that no static snapshot reveals. LLMs see one commit. Excavate sees the whole dig site.

**2. It can't tell you where to look first.**
Ask an LLM to "find the worst file in this repo" and it'll pick something that looks messy. Excavate ranks by a weighted signal model — churn, coverage gap, complexity, bus factor, circular deps, and SATD — built on the same empirical research that Code Maat and DebtViz are based on. The worst-looking file is rarely the highest-risk file.

**3. It can't fit your repo in context.**
A 50,000-line codebase won't fit in any context window. Summaries lose the signal. Excavate runs locally against the full repo — every file, every commit in the window, every import graph — and collapses it into a ranked list in seconds.

**4. It produces no artefact you can act on.**
An LLM gives you a paragraph. Excavate gives you a score per file, a sortable table, a D3 treemap you can share with your manager, and a `--fail-above` CI gate that enforces debt thresholds on every PR. The insight becomes process.

Use LLMs to fix the files Excavate surfaces. Use Excavate to find them.

---

## Why not SonarQube, Code Climate, or Plato?

| Tool             | The gap                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| **SonarQube**    | Requires a Java server, a running instance, and admin setup. Zero-config it is not. |
| **Code Climate** | SaaS. Your code leaves your network. Pricing starts at $10/seat.                    |
| **Plato**        | JS-only, CJS, unmaintained since 2018. No git signals, no coverage integration.     |
| **ESLint**       | Lints syntax and style. Has no model of time, history, or who knows the code.       |
| **npm audit**    | CVEs only. One signal out of six.                                                   |

Excavate is the only tool that combines **git history + AST complexity + coverage gaps + bus factor + circular deps + SATD** into a single ranked score, runs in one `npx` command with no server or account, and produces a report your manager can open in a browser.

---

## FAQ

**Does it need any setup?**
No. Excavate works on any git repo with JS or TS files — just run `npx excavate`. Coverage signal is optional — if no coverage report is found, that signal is skipped and weights are redistributed automatically.

**Does it send any data anywhere?**
No. Everything runs locally. The only network call is `npm audit` for CVE data, which goes to the npm registry — the same call `npm audit` makes normally.

**What about monorepos?**
Pass the path to the sub-package: `npx excavate packages/api`.

**Can I use it with Vitest / Jest / c8?**
Yes — as long as your test runner outputs a `coverage/coverage-summary.json` or `lcov.info`, Excavate will pick it up automatically.

---

## Using excavate with AI assistants

A machine-readable summary of excavate's API, CLI flags, output schema, and configuration is available at [`llms.txt`](llms.txt) — following the [llms.txt convention](https://llmstxt.org). AI assistants and coding tools can fetch this file to use excavate correctly without hallucinating flags or types.

```
npx excavate llms.txt   # not a real command — fetch from GitHub raw or npm package
```

Direct URL (raw):

```
https://raw.githubusercontent.com/sonic-sabers/excavate/main/llms.txt
```

---

## License

MIT
