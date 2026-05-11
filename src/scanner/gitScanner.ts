import { simpleGit } from 'simple-git'
import type { ExcavateConfig } from '../types.js'

export interface GitScanResult {
  churnScore: number
  knowledgeScore: number
  commitCount: number
  authors: string[]
  lastModified: Date
}

export async function scanGit(
  filePath: string,
  repoRoot: string,
  config: ExcavateConfig,
): Promise<GitScanResult> {
  const git = simpleGit(repoRoot)

  const [recentLog, allLog, shortlog] = await Promise.all([
    git.log({ file: filePath, '--since': `${config.gitDays}.days` }),
    git.log({ file: filePath, maxCount: 1 }),
    git.raw(['shortlog', '-sn', '--no-merges', 'HEAD', '--', filePath]),
  ])

  const commitCount = recentLog.all.length
  const churnScore = Math.min(commitCount / 20, 1) * 100

  const latestDate = allLog.latest?.date
  const lastModified = latestDate ? new Date(latestDate) : new Date(0)

  const authorLines = shortlog.trim().split('\n').filter(Boolean)
  const authorCount = authorLines.length
  const authors = authorLines.map((line) => line.replace(/^\s*\d+\s+/, '').trim())

  const knowledgeScore =
    authorCount === 0 ? 0 :
    authorCount === 1 ? 100 :
    authorCount === 2 ? 60 :
    authorCount <= 4  ? 20 : 0

  return { churnScore, knowledgeScore, commitCount, authors, lastModified }
}
