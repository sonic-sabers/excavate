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

function walkAndCount(node: unknown, count: { value: number }): void {
  if (!node || typeof node !== 'object') return
  const obj = node as Record<string, unknown>

  if (typeof obj['type'] === 'string' && DECISION_NODES.has(obj['type'])) {
    count.value++
  }

  for (const key of Object.keys(obj)) {
    if (key === 'parent') continue
    const child = obj[key]
    if (Array.isArray(child)) {
      for (const item of child) walkAndCount(item, count)
    } else if (child && typeof child === 'object') {
      walkAndCount(child, count)
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

  const count = { value: 0 }
  walkAndCount(ast, count)

  // cyclomatic = 1 + decision points; normalise: 1→0, 20+→100
  const cyclomatic = 1 + count.value
  const complexityScore = Math.min((cyclomatic - 1) / 19, 1) * 100

  return { complexityScore, linesOfCode }
}
