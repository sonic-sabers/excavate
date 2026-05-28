# Changelog

All notable changes to excavate are documented here.

---

## v1.1.1

- Auto-update handoff for stale `npx` cache: CLI checks npm registry and re-execs latest `excavate@<version>` with a recursion guard
- Update check now skips in common CI environments to avoid network-dependent CI startup behavior
- Default run output now includes HTML report generation while preserving explicit output format lists

---

## v1.1.0

- `excavate explain <file>` subcommand — per-file archetype and playbook, no API key required
- `excavate blame` subcommand — ownership report listing sole authors and knowledge cliff warnings for every bedrock file
- `--interactive` flag — browse flagged files with arrow keys and open your $EDITOR directly
- God-file scanner — detects bedrock files (central exports like utils, constants, types) and applies debt penalties when they show risk signals
- Export kind classification — function, constant, class, interface, type, enum

---

## v1.0.4

- `CHANGELOG.md` added to track release history
- Publish workflow added for consistent releases
- Fixed complexity scoring: per-function cyclomatic complexity replaces file-level aggregate
- Fixed `--diff` and `--diff-only` to compare against the immediately preceding run, not oldest baseline
- Shared git client across scanners to reduce process spawning overhead
- Path normalization fix for orphan scanner module sources

---

## v1.0.3

- Health grade from `A` to `F`
- Trend state when scan history is available
- Debt archetypes: time bomb, load-bearing wall, revolving door, black box, spaghetti, fossil, ghost, healthy
- Temporal coupling between files that repeatedly change together with co-change percentages
- Orphan file detection
- Dead export counts when available
- Knowledge cliff metadata
- Recent authors, survival percentage, refactor count, single-owner risk
- Sticky report action drawer, file metadata, signal tooltips
- Copyable LLM refactor prompt per file
- Per-function cyclomatic complexity (replaces file-level aggregate)
- Shared git client across scanners to reduce process spawning overhead
- Separate `previous` vs `base` snapshot semantics for diff and trend tracking
- `--diff` and `--diff-only` now compare against the immediately preceding run
- Added `llms.txt` and comprehensive default config file

---

## v1.0.2

- Auto-open HTML report in the browser after generation
- Minor README formatting and version normalization

---

## v1.0.1

First stable `1.x` release. Rebranded and stabilized from the `0.x` series.

- HTML report generation with Handlebars templates
- `--diff` command for comparing scan runs
- AST complexity scanning via `@typescript-eslint/parser`
- Test coverage integration (JSON coverage format)
- `llms.txt` reference file for LLM/tooling consumers
- Fixed bin path format for correct `npx excavate` invocation

---

## v0.3.x

- Batched file processing and expanded default config patterns
- Simplified include patterns and expanded exclude list
- Initial `0.x` public releases
