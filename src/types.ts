export type DebtLevel = 'bedrock' | 'deep' | 'surface' | 'clear'

export type DebtArchetype =
  | 'time-bomb'
  | 'load-bearing-wall'
  | 'revolving-door'
  | 'black-box'
  | 'spaghetti'
  | 'fossil'
  | 'ghost'
  | 'healthy'

export interface HealthGrade {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  trend?: 'improving' | 'degrading' | 'stable'
}

export interface FileDebtResult {
  path: string
  score: number
  level: DebtLevel
  archetype: DebtArchetype
  signals: {
    churn: number
    coverage: number
    complexity: number
    knowledge: number
    docs: number
    deps: number
  }
  meta: {
    lastModified: Date
    authors: string[]
    commitCount: number
    testCoverage: number
    linesOfCode: number
    satdCount: number
    circularDeps: number
    fanIn: number
    // phase 4 additions
    survivalPct: number
    recentAuthors: string[]
    knowledgeCliff: boolean
    refactorCount: number
    temporalCoupling: Array<{ file: string; pct: number }>
    isOrphan: boolean
    deadExports: number
    concernCount: number
    exportKinds: string[]
  }
}

export interface ScanResult {
  repoRoot: string
  scannedAt: Date
  filesScanned: number
  durationMs: number
  summary: {
    avgScore: number
    bedrock: number
    deep: number
    surface: number
    clear: number
    estimatedHours: number
    // phase 4 additions
    healthGrade: HealthGrade
    orphanFiles: number
    orphanLOC: number
    temporallyCoupledPairs: number
    knowledgeCliffFiles: number
    narrative: string
  }
  files: FileDebtResult[]
}

export interface ScanDiff {
  previous: ScanResult
  current: ScanResult
  healthGrade: { previous: HealthGrade; current: HealthGrade }
  regressions: Array<{
    path: string
    previousScore: number
    currentScore: number
    scoreDelta: number
    previousLevel: DebtLevel
    currentLevel: DebtLevel
    levelChanged: boolean
    archetypeChanged: boolean
    previousArchetype: DebtArchetype
    currentArchetype: DebtArchetype
  }>
  improvements: Array<{
    path: string
    previousScore: number
    currentScore: number
    scoreDelta: number
    previousLevel: DebtLevel
    currentLevel: DebtLevel
    levelChanged: boolean
  }>
  newBedrock: string[]
  resolved: string[]
}

export interface ExcavateConfig {
  include: string[]
  exclude: string[]
  weights: {
    churn: number
    coverage: number
    complexity: number
    knowledge: number
    docs: number
    deps: number
  }
  thresholds: {
    bedrock: number
    deep: number
    surface: number
  }
  output: Array<'terminal' | 'html' | 'json'>
  reportDir: string
  failAbove: number | null
  gitDays: number
  history: boolean
  historyLimit: number
  // phase 4 additions
  coupling: {
    enabled: boolean
    threshold: number
  }
  orphans: {
    enabled: boolean
    minLOC: number
  }
  autoOpen: boolean
}

export const DEFAULT_CONFIG: ExcavateConfig = {
  include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/build/**',
    '**/coverage/**',
    '**/out/**',
    '**/.cache/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.test.js',
    '**/*.test.jsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.spec.js',
    '**/*.spec.jsx',
    '**/*.d.ts',
  ],
  weights: { churn: 0.25, coverage: 0.25, complexity: 0.20, knowledge: 0.15, docs: 0.10, deps: 0.05 },
  thresholds: { bedrock: 70, deep: 40, surface: 20 },
  output: ['terminal'],
  reportDir: './excavate-report',
  failAbove: null,
  gitDays: 90,
  history: true,
  historyLimit: 5,
  coupling: { enabled: true, threshold: 40 },
  orphans: { enabled: true, minLOC: 10 },
  autoOpen: true,
}
