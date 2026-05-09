# excavate

**Dig up what is buried in your codebase.**

Every codebase has files nobody wants to touch. The ones where a small bug fix turns into a week of archaeology. The ones that keep showing up in post-mortems. excavate finds them — in seconds, with no setup.

```bash
npx excavate
```

> Requires Node.js ≥ 18 and a git repository.

---

## What you get

```
  ████
  ███          excavate v0.1.0
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

Each file gets a debt score from 0–100. The scoring uses geological language — because debt accumulates in layers, oldest and most compressed at the bottom.

| Level       | Score  | What it means                      |
| ----------- | ------ | ---------------------------------- |
| **bedrock** | 70–100 | ancient, untouchable, nobody dares |
| **deep**    | 40–70  | accumulated over years             |
| **surface** | 20–40  | recent deposits, still manageable  |
| **clear**   | 0–20   | no significant accumulation        |

---

## How the score is calculated

excavate combines six signals into a single weighted score per file:

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

Pass `--report` to get a self-contained HTML file you can share with your team or management — no server, no external deps, just open it in a browser.

It includes:

- A **D3 treemap** where box size = lines of code, colour = debt level
- **Click any file** to see its full signal breakdown with plain-English explanations
- A **sortable table** of every scanned file
- Summary counts and an estimated cleanup hours figure

```bash
npx excavate --report
open excavate-report/index.html
```

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

excavate works out of the box with zero config. When you're ready to tune it, drop a `.excavaterc` in your repo root (or add an `excavate` key to `package.json`):

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
  "failAbove": null
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

## FAQ

**Does it need any setup?**
No. `npx excavate` works on any git repo with JS or TS files. Coverage signal is optional — if no coverage report is found, that signal is skipped and weights are redistributed automatically.

**Does it send any data anywhere?**
No. Everything runs locally. The only network call is `npm audit` for CVE data, which goes to the npm registry — the same call `npm audit` makes normally.

**What about monorepos?**
Pass the path to the sub-package: `npx excavate packages/api`.

**Can I use it with Vitest / Jest / c8?**
Yes — as long as your test runner outputs a `coverage/coverage-summary.json` or `lcov.info`, excavate will pick it up automatically.

---

## License

MIT
