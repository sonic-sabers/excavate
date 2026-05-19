import { simpleGit } from 'simple-git'

export async function buildCouplingMatrix(
  repoRoot: string,
  files: string[],
  gitDays: number,
  threshold: number,
): Promise<Map<string, Array<{ file: string; pct: number }>>> {
  let git: ReturnType<typeof simpleGit>
  try {
    git = simpleGit(repoRoot)
  } catch {
    return new Map(files.map((f) => [f, []]))
  }

  let raw: string
  try {
    raw = await git.raw([
      'log',
      `--since=${gitDays}.days.ago`,
      '--name-only',
      '--pretty=format:COMMIT',
    ])
  } catch {
    return new Map(files.map((f) => [f, []]))
  }

  const commits: string[][] = []
  let current: string[] = []

  for (const line of raw.split('\n')) {
    if (line === 'COMMIT') {
      if (current.length) commits.push(current)
      current = []
    } else if (line.trim()) {
      current.push(line.trim())
    }
  }
  if (current.length) commits.push(current)

  const coChange = new Map<string, Map<string, number>>()
  const fileCommitCount = new Map<string, number>()

  for (const commit of commits) {
    for (const fileA of commit) {
      fileCommitCount.set(fileA, (fileCommitCount.get(fileA) ?? 0) + 1)
      if (!coChange.has(fileA)) coChange.set(fileA, new Map())
      for (const fileB of commit) {
        if (fileA === fileB) continue
        const inner = coChange.get(fileA)!
        inner.set(fileB, (inner.get(fileB) ?? 0) + 1)
      }
    }
  }

  const filesSet = new Set(files)
  const result = new Map<string, Array<{ file: string; pct: number }>>()

  for (const file of files) {
    const partners = coChange.get(file)
    if (!partners) {
      result.set(file, [])
      continue
    }
    const total = fileCommitCount.get(file) ?? 1
    const coupled = [...partners.entries()]
      .map(([f, count]) => ({ file: f, pct: Math.round((count / total) * 100) }))
      .filter(({ pct, file: f }) => pct >= threshold && filesSet.has(f))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)
    result.set(file, coupled)
  }

  return result
}
