export type DebtLevel = 'bedrock' | 'deep' | 'surface' | 'clear'

export interface FileDebtResult {
  path: string
  score: number
  level: DebtLevel
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
  }
  files: FileDebtResult[]
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
}
