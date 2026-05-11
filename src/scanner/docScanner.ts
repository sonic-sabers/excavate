import { readFile } from 'fs/promises'
import path from 'path'
import { simpleGit } from 'simple-git'
import type { ExcavateConfig } from '../types.js'

export interface DocScanResult {
  docsScore: number
  satdCount: number
}

const SATD_RE = /TODO|FIXME|HACK|XXX|WORKAROUND|TEMP|KLUDGE/gi
const COMMENT_RE = /^\s*(\/\/|\/\*|\*)/

function monthsBetween(dateStr: string | undefined, now: Date): number {
  if (!dateStr) return 999
  const then = new Date(dateStr)
  return (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24 * 30)
}

const readmePenaltyCache = new Map<string, number>()

async function getReadmePenalty(repoRoot: string): Promise<number> {
  const cached = readmePenaltyCache.get(repoRoot)
  if (cached !== undefined) return cached

  try {
    const git = simpleGit(repoRoot)
    const log = await git.log({ maxCount: 1, '--': null, file: 'README.md' })
    const months = monthsBetween(log.latest?.date, new Date())
    const penalty = months > 6 ? 20 : 0
    readmePenaltyCache.set(repoRoot, penalty)
    return penalty
  } catch {
    readmePenaltyCache.set(repoRoot, 0)
    return 0
  }
}

export async function scanDoc(
  filePath: string,
  repoRoot: string,
  _config: ExcavateConfig,
): Promise<DocScanResult> {
  const absPath = path.join(repoRoot, filePath)
  let source: string
  try {
    source = await readFile(absPath, 'utf8')
  } catch {
    return { docsScore: 0, satdCount: 0 }
  }

  const lines = source.split('\n')
  const totalLines = lines.length
  const commentLines = lines.filter((l) => COMMENT_RE.test(l)).length

  const ratio = totalLines > 0 ? commentLines / totalLines : 0
  const ratioScore =
    ratio < 0.05 ? 100 :
    ratio > 0.25 ? 0 :
    ((0.25 - ratio) / 0.20) * 100

  const satdHits = (source.match(SATD_RE) ?? []).length
  const satdScore = Math.min(satdHits * 10, 100)

  const readmePenalty = await getReadmePenalty(repoRoot)

  const docsScore = Math.min(ratioScore * 0.5 + satdScore * 0.5 + readmePenalty, 100)

  return { docsScore, satdCount: satdHits }
}
