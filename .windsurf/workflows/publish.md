---
description: Publish excavate to npm with version bump and file sync
---

## Pre-publish checklist

Releases are patch bumps only (e.g. `1.0.3` → `1.0.4`).

### 0. Guard: ensure working tree is clean

```bash
git status --porcelain
```

Output must be empty. Stash or commit any changes before proceeding.

### 1. Bump version in `package.json`

```bash
npm version patch --no-git-tag-version
```

### 2. Update `CHANGELOG.md`

Add a new `## v<NEW_VERSION>` section at the top (above the previous release), listing what changed.

### 3. Update `README.md`

- Find the ASCII banner line: `  ███          Excavate v1.0.X` — change the version number
- Add a new `## What is new in v<NEW_VERSION>` section above the previous one, with the same bullet points from CHANGELOG.md

### 4. Update `llms.txt` line 5

`Current package version documented here: <NEW_VERSION>.`

### 5. Verify all files are in sync

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('pkg:', p.version)"
grep "Excavate v" README.md
grep "version documented" llms.txt
head -5 CHANGELOG.md
```

### 6. Run tests and typecheck

```bash
npm test && npm run typecheck
```

### 7. Dry-run publish (sanity check)

```bash
npm publish --dry-run
```

Confirm the file list includes `dist/`, `templates/`, `README.md`, `LICENSE`, `llms.txt`. Fix `files[]` in `package.json` if anything is missing or unexpected.

### 8. Commit, tag, and publish

```bash
git add package.json README.md llms.txt CHANGELOG.md
git commit -m "chore: release v<NEW_VERSION>"
git tag v<NEW_VERSION>
npm publish
git push && git push --tags
```

### 9. Create GitHub release

Requires `gh` CLI (`brew install gh`):

```bash
gh release create v<NEW_VERSION> \
  --title "v<NEW_VERSION>" \
  --notes-file CHANGELOG.md
```

If `gh` is not installed: https://github.com/sonic-sabers/excavate/releases/new — select tag `v<NEW_VERSION>` and paste the new section from `CHANGELOG.md` as the release body.
