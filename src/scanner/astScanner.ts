import { readFile } from 'fs/promises'
import path from 'path'
import { parse as parseBabel } from '@babel/parser'
import { parse as parseTsEslint } from '@typescript-eslint/parser'

export interface AstScanResult {
  complexityScore: number
  linesOfCode: number
}

const DECISION_NODES = new Set([
  'IfStatement',
  'SwitchCase',
  'ConditionalExpression',
  'LogicalExpression',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'CatchClause',
])

const FUNCTION_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'MethodDefinition',
])

// Returns max cyclomatic complexity across all functions in the AST.
// Each function starts at 1 and gains +1 per decision node inside it.
function maxFunctionComplexity(node: unknown): number {
  if (!node || typeof node !== 'object') return 0
  const obj = node as Record<string, unknown>
  let max = 0

  if (typeof obj['type'] === 'string' && FUNCTION_NODES.has(obj['type'])) {
    const count = { value: 0 }
    countDecisions(obj, count)
    const cyclomatic = 1 + count.value
    if (cyclomatic > max) max = cyclomatic
  }

  for (const key of Object.keys(obj)) {
    if (key === 'parent') continue
    const child = obj[key]
    if (Array.isArray(child)) {
      for (const item of child) {
        const m = maxFunctionComplexity(item)
        if (m > max) max = m
      }
    } else if (child && typeof child === 'object') {
      const m = maxFunctionComplexity(child)
      if (m > max) max = m
    }
  }

  return max
}

function countDecisions(node: unknown, count: { value: number }): void {
  if (!node || typeof node !== 'object') return
  const obj = node as Record<string, unknown>

  if (typeof obj['type'] === 'string' && DECISION_NODES.has(obj['type'])) {
    count.value++
  }

  for (const key of Object.keys(obj)) {
    if (key === 'parent') continue
    const child = obj[key]
    if (Array.isArray(child)) {
      for (const item of child) countDecisions(item, count)
    } else if (child && typeof child === 'object') {
      countDecisions(child, count)
    }
  }
}

export async function scanAst(
  filePath: string,
  repoRoot: string,
): Promise<AstScanResult> {
  const absPath = path.join(repoRoot, filePath)
  let source: string
  try {
    source = await readFile(absPath, 'utf8')
  } catch {
    return { complexityScore: 0, linesOfCode: 0 }
  }

  const linesOfCode = source.split('\n').filter((l) => l.trim().length > 0).length
  const ext = path.extname(filePath).toLowerCase()
  let ast: unknown

  try {
    if (ext === '.ts' || ext === '.tsx') {
      ast = parseTsEslint(source, {
        jsx: ext === '.tsx',
        range: false,
        loc: false,
      })
    } else {
      ast = parseBabel(source, {
        sourceType: 'module',
        plugins: ext === '.jsx' ? ['jsx'] : [],
        errorRecovery: true,
      })
    }
  } catch {
    return { complexityScore: 0, linesOfCode }
  }

  // Max cyclomatic complexity across all functions: 1→0, 20→50, 40+→100
  // Industry baseline: >10 = high, >20 = very high, >40 = extreme.
  // Files with no functions (type declarations, constants) score 0.
  const maxComplexity = maxFunctionComplexity(ast)
  const complexityScore = maxComplexity <= 1 ? 0 : Math.min((maxComplexity - 1) / 39, 1) * 100

  return { complexityScore, linesOfCode }
}
