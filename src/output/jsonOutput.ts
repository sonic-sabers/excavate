import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import type { ScanResult } from '../types.js'

export async function writeJsonOutput(result: ScanResult, reportDir: string): Promise<string> {
  await mkdir(reportDir, { recursive: true })
  const outPath = path.join(reportDir, 'excavate-report.json')
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf8')
  return outPath
}
