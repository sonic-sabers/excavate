import { simpleGit } from 'simple-git'
import type { ExcavateConfig } from '../types.js'

export type SimpleGitClient = ReturnType<typeof simpleGit>

export interface GitScanResult {
  churnScore: number
  knowledgeScore: number
  commitCount: number
  authors: string[]
  recentAuthors: string[]
  knowledgeCliff: boolean
  lastModified: Date
  survivalPct: number
  refactorCount: number
}

export async function scanGit(
  filePath: string,
  repoRoot: string,
  config: ExcavateConfig,
  gitClient?: SimpleGitClient,
): Promise<GitScanResult> {
  const git = gitClient ?? simpleGit(repoRoot)

  const [recentLog, allLog, shortlog, recentShortlog] = await Promise.all([
    git.log({ file: filePath, '--since': `${config.gitDays}.days` }),
    git.log({ file: filePath, maxCount: 1 }),
    git.raw(['shortlog', '-sn', '--no-merges', 'HEAD', '--', filePath]),
    git.raw(['shortlog', '-sn', '--no-merges', `--since=${config.gitDays}.days.ago`, 'HEAD', '--', filePath]),
  ])

  const commitCount = recentLog.all.length
  const churnScore = Math.min(commitCount / 20, 1) * 100

  const latestDate = allLog.latest?.date
  const lastModified = latestDate ? new Date(latestDate) : new Date(0)

  const authorLines = shortlog.trim().split('\n').filter(Boolean)
  const authorCount = authorLines.length
  const authors = authorLines.map((line) => line.replace(/^\s*\d+\s+/, '').trim())

  const recentAuthorLines = recentShortlog.trim().split('\n').filter(Boolean)
  const recentAuthors = recentAuthorLines.map((line) => line.replace(/^\s*\d+\s+/, '').trim())

  const knowledgeCliff = recentAuthors.length <= 1 && authorCount >= 3

  const knowledgeScore =
    authorCount === 0 ? 0 :
    authorCount === 1 ? 100 :
    authorCount === 2 ? 60 :
    authorCount <= 4  ? 20 : 0

  const [survivalPct, refactorCount] = await Promise.all([
    computeSurvivalPct(git, filePath),
    countRefactors(git, filePath, config.gitDays),
  ])

  return {
    churnScore,
    knowledgeScore,
    commitCount,
    authors,
    recentAuthors,
    knowledgeCliff,
    lastModified,
    survivalPct,
    refactorCount,
  }
}

async function computeSurvivalPct(git: ReturnType<typeof simpleGit>, filePath: string): Promise<number> {
  try {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    const cutoff = twoYearsAgo.getTime()

    const blame = await git.raw(['blame', '--porcelain', '--', filePath])
    const lines = blame.split('\n')
    let total = 0
    let old = 0

    for (const line of lines) {
      if (line.startsWith('author-time ')) {
        const ts = parseInt(line.slice('author-time '.length), 10) * 1000
        total++
        if (ts < cutoff) old++
      }
    }

    return total === 0 ? 0 : Math.round((old / total) * 100)
  } catch {
    return 0
  }
}

async function countRefactors(
  git: ReturnType<typeof simpleGit>,
  filePath: string,
  gitDays: number,
): Promise<number> {
  try {
    const log = await git.raw([
      'log',
      `--since=${gitDays}.days.ago`,
      '--numstat',
      '--pretty=format:COMMIT',
      '--',
      filePath,
    ])

    let count = 0
    let additionsInCommit = 0
    let deletionsInCommit = 0

    const finalizeCommit = () => {
      const touched = additionsInCommit + deletionsInCommit
      const hasBoth = additionsInCommit > 0 && deletionsInCommit > 0
      const meaningfulMixedChange = hasBoth && touched >= 4
      const balancedRewrite =
        meaningfulMixedChange &&
        touched >= 8 &&
        (
          (deletionsInCommit >= additionsInCommit * 0.5 &&
            additionsInCommit >= deletionsInCommit * 0.5) ||
          (Math.min(additionsInCommit, deletionsInCommit) >= 4)
        )
      const deleteHeavyRewrite =
        hasBoth &&
        deletionsInCommit > additionsInCommit * 1.5

      if (meaningfulMixedChange || balancedRewrite || deleteHeavyRewrite) count++
      additionsInCommit = 0
      deletionsInCommit = 0
    }

    for (const line of log.split('\n')) {
      if (line.startsWith('COMMIT')) {
        finalizeCommit()
        continue
      }
      if (!line.trim()) continue
      const parts = line.split('\t')
      const additions = parseInt(parts[0] ?? '', 10)
      const deletions = parseInt(parts[1] ?? '', 10)
      if (!isNaN(additions) && !isNaN(deletions)) {
        additionsInCommit += additions
        deletionsInCommit += deletions
      }
    }
    finalizeCommit()
    return count
  } catch {
    return 0
  }
}
