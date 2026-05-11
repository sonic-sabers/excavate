import { execSync } from 'child_process'
import { readFile } from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'
import { cruise } from 'dependency-cruiser'

const require = createRequire(import.meta.url)

export interface DepFileResult {
  depsScore: number
  fanIn: number
  circularDeps: number
}

export async function scanDeps(repoRoot: string): Promise<Map<string, DepFileResult>> {
  const result = new Map<string, DepFileResult>()
  const fanInMap = new Map<string, number>()
  const circularMap = new Map<string, number>()

  // --- 1. Fan-in + circular via dependency-cruiser ---
  try {
    const srcDir = path.join(repoRoot, 'src')
    const cruiseResult = await cruise([srcDir], {
      ruleSet: {},
      baseDir: repoRoot,
      doNotFollow: { path: 'node_modules' },
    })
    const modules = (cruiseResult.output as { modules?: Array<{
      source: string
      dependencies?: Array<{ resolved?: string; module: string; circular?: boolean }>
    }> }).modules ?? []

    for (const mod of modules) {
      for (const dep of mod.dependencies ?? []) {
        const target = dep.resolved ?? dep.module
        fanInMap.set(target, (fanInMap.get(target) ?? 0) + 1)
        if (dep.circular) {
          circularMap.set(mod.source, (circularMap.get(mod.source) ?? 0) + 1)
        }
      }
    }
  } catch {
    // dep-cruiser failed — skip
  }

  // --- 2. Circular deps via madge ---
  const circularByFile = new Map<string, number>()
  try {
    const madge = require('madge') as typeof import('madge')
    const srcDir = path.join(repoRoot, 'src')
    const madgeResult = await madge(srcDir, {
      fileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    })
    const circular: string[][] = madgeResult.circular()
    for (const chain of circular) {
      for (const file of chain) {
        circularByFile.set(file, (circularByFile.get(file) ?? 0) + 1)
      }
    }
  } catch {
    // madge failed — skip
  }

  // --- 3. CVE score via npm audit ---
  let cveScore = 0
  try {
    const auditRaw = execSync('npm audit --json 2>/dev/null', {
      cwd: repoRoot,
      timeout: 15_000,
    }).toString()
    const audit = JSON.parse(auditRaw) as {
      metadata?: { vulnerabilities?: { critical?: number; high?: number; moderate?: number } }
    }
    const vulns = audit.metadata?.vulnerabilities ?? {}
    const critical = vulns.critical ?? 0
    const high = vulns.high ?? 0
    const moderate = vulns.moderate ?? 0
    cveScore = Math.min(critical * 40 + high * 20 + moderate * 10, 100)
  } catch {
    // npm audit failed — skip
  }

  // --- 4. Staleness via package-lock.json (sample up to 10 deps) ---
  let stalenessScore = 0
  try {
    const lockPath = path.join(repoRoot, 'package-lock.json')
    const lockRaw = await readFile(lockPath, 'utf8')
    const lock = JSON.parse(lockRaw) as {
      packages?: Record<string, { version?: string }>
    }
    const packages = lock.packages ?? {}
    const monthsOldList: number[] = []
    const now = new Date()

    for (const [pkgPath, pkg] of Object.entries(packages)) {
      if (!pkgPath || pkgPath === '') continue
      const pkgName = pkgPath.replace(/^node_modules\//, '')
      if (!pkg.version) continue
      try {
        const infoRaw = execSync(`npm show "${pkgName}" time --json 2>/dev/null`, {
          timeout: 5_000,
        }).toString()
        const times = JSON.parse(infoRaw) as Record<string, string>
        const installedTime = times[pkg.version]
        if (installedTime) {
          const months = (now.getTime() - new Date(installedTime).getTime()) / (1000 * 60 * 60 * 24 * 30)
          monthsOldList.push(months)
        }
      } catch {
        // skip this package
      }
      if (monthsOldList.length >= 10) break
    }

    if (monthsOldList.length > 0) {
      const avg = monthsOldList.reduce((a, b) => a + b, 0) / monthsOldList.length
      stalenessScore = Math.min(avg / 24, 1) * 100
    }
  } catch {
    // no package-lock.json — skip
  }

  // --- Combine per-file ---
  const allFiles = new Set([...fanInMap.keys(), ...circularByFile.keys(), ...circularMap.keys()])

  for (const file of allFiles) {
    const fanIn = fanInMap.get(file) ?? 0
    const circularDeps = (circularByFile.get(file) ?? 0) + (circularMap.get(file) ?? 0)
    const couplingScore = Math.min((fanIn / 10) * 100, 100)
    const circularScore = Math.min(circularDeps * 20, 100)
    const depsScore = Math.round(
      couplingScore  * 0.30 +
      circularScore  * 0.30 +
      stalenessScore * 0.25 +
      cveScore       * 0.15,
    )
    const relFile = path.isAbsolute(file) ? path.relative(repoRoot, file) : file
    result.set(relFile, { depsScore, fanIn, circularDeps })
  }

  // Repo-level baseline: CVE + staleness only (no per-file coupling/circular).
  // Weights 0.15 + 0.25 = 0.40 — rescale to 0–100 so files without dep-graph
  // data get a fair score rather than a deflated one.
  result.set('__repo__', {
    depsScore: Math.round((cveScore * 0.15 + stalenessScore * 0.25) / 0.40),
    fanIn: 0,
    circularDeps: 0,
  })

  return result
}
