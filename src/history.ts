import { mkdir, readdir, readFile, writeFile, unlink } from 'fs/promises'
import path from 'path'
import type { ScanResult } from './types.js'

function historyDir(reportDir: string): string {
  return path.join(reportDir, 'history')
}

function toFilename(scannedAt: Date): string {
  return scannedAt.toISOString().replace(/:/g, '-') + '.json'
}

async function listSorted(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir)
    return files.filter(f => f.endsWith('.json')).sort()
  } catch {
    return []
  }
}

export async function saveSnapshot(
  result: ScanResult,
  reportDir: string,
  limit: number,
): Promise<string> {
  const dir = historyDir(reportDir)
  await mkdir(dir, { recursive: true })

  const filename = toFilename(result.scannedAt)
  const filePath = path.join(dir, filename)
  await writeFile(filePath, JSON.stringify(result), 'utf8')

  const all = await listSorted(dir)
  if (all.length > limit) {
    // keep index 0 (base) + last (limit-1) entries
    const keep = new Set([all[0], ...all.slice(-(limit - 1))])
    for (const f of all) {
      if (!keep.has(f)) await unlink(path.join(dir, f))
    }
  }

  return filePath
}

export async function loadBase(reportDir: string): Promise<ScanResult | null> {
  const dir = historyDir(reportDir)
  const all = await listSorted(dir)
  if (all.length === 0) return null
  const raw = await readFile(path.join(dir, all[0]!), 'utf8')
  return JSON.parse(raw) as ScanResult
}

export async function loadHistory(reportDir: string): Promise<ScanResult[]> {
  const dir = historyDir(reportDir)
  const all = await listSorted(dir)
  const results: ScanResult[] = []
  for (const f of all) {
    const raw = await readFile(path.join(dir, f), 'utf8')
    results.push(JSON.parse(raw) as ScanResult)
  }
  return results
}
