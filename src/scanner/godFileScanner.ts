import path from 'path'
import { Project, Node, SyntaxKind } from 'ts-morph'

export type ExportKind = 'component' | 'hook' | 'class' | 'function' | 'type' | 'constant'

export interface GodFileResult {
  exportKinds: ExportKind[]
  concernCount: number
}

export function classifyExportKinds(source: string, filePath: string): GodFileResult {
  const project = new Project({ useInMemoryFileSystem: true, skipLoadingLibFiles: true })
  const sf = project.createSourceFile(filePath, source, { overwrite: true })

  const kinds = new Set<ExportKind>()

  for (const [name, declarations] of sf.getExportedDeclarations()) {
    for (const decl of declarations) {
      kinds.add(classifyDeclaration(name, decl))
    }
  }

  const exportKinds = [...kinds]
  return { exportKinds, concernCount: exportKinds.length }
}

function classifyDeclaration(name: string, decl: Node): ExportKind {
  const kind = decl.getKind()

  // Structural kinds take priority over name-based heuristics
  if (kind === SyntaxKind.ClassDeclaration) return 'class'
  if (kind === SyntaxKind.InterfaceDeclaration) return 'type'
  if (kind === SyntaxKind.TypeAliasDeclaration) return 'type'

  if (kind === SyntaxKind.VariableDeclaration) {
    const init = (decl as import('ts-morph').VariableDeclaration).getInitializer()
    if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)) {
      // Apply name heuristics for function-like variable declarations
      if (/^use[A-Z]/.test(name)) return 'hook'
      if (/^[A-Z]/.test(name)) return 'component'
      return 'function'
    }
    return 'constant'
  }

  // For FunctionDeclaration and other callables, apply name heuristics
  if (/^use[A-Z]/.test(name)) return 'hook'
  if (/^[A-Z]/.test(name)) return 'component'

  if (kind === SyntaxKind.FunctionDeclaration) return 'function'

  return 'constant'
}

export async function scanGodFiles(
  files: string[],
  repoRoot: string,
): Promise<Map<string, GodFileResult>> {
  const result = new Map<string, GodFileResult>()

  for (const file of files) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      result.set(file, { exportKinds: [], concernCount: 0 })
      continue
    }
    try {
      const { readFile } = await import('fs/promises')
      const source = await readFile(path.join(repoRoot, file), 'utf8')
      result.set(file, classifyExportKinds(source, file))
    } catch {
      result.set(file, { exportKinds: [], concernCount: 0 })
    }
  }

  return result
}
