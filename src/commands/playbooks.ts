import type { DebtArchetype } from '../types.js'

const RAW_PLAYBOOKS: Record<DebtArchetype, string[]> = {
  'time-bomb': [
    'Add integration tests before making any changes to this file.',
    'Pair-program the next 3 modifications — the knowledge needs to spread to at least one other person ({authors}).',
    'Break this file into smaller units, starting with the highest-complexity function.',
  ],
  'load-bearing-wall': [
    'Document every public interface before touching anything — future you will thank present you.',
    'Add contract tests for each of the {fanIn} files that import this one.',
    'Do not refactor yet. First reduce how many files depend on this one, then simplify.',
  ],
  'revolving-door': [
    'Hold a 30-minute session with the team to agree on what this file is actually supposed to do.',
    'Write a decision log comment at the top of the file explaining the current design intent.',
    'Freeze changes for 2 weeks while you add tests — then refactor from a stable base.',
  ],
  'black-box': [
    'Write a one-paragraph comment at the top of the file explaining what it does and why.',
    'Add tests for the 3 most-called exported functions before any feature work.',
    'Extract any utility logic into a separate well-named file so the responsibility is clear.',
  ],
  'spaghetti': [
    'Map the coupling web: list every file this one co-changes with and why.',
    'Break at least one circular dependency this sprint — pick the easiest one.',
    'Each future PR touching this file must reduce coupling by at least one edge.',
  ],
  'fossil': [
    'Schedule a knowledge transfer session with whoever originally wrote this.',
    'Add a CODEOWNERS entry so any future change requires a reviewer who understands the context.',
    'Write a README-style comment block explaining the historical context — why does this exist?',
  ],
  'ghost': [
    'Verify nothing calls this by running a full project search for its exported names.',
    'Delete it. Estimated saving: {linesOfCode} lines.',
    'If it cannot be deleted, add a comment explaining why it must exist despite {deadExports} dead exports.',
  ],
  'healthy': [],
}

export interface PlaybookMeta {
  linesOfCode: number
  authors: string[]
  deadExports: number
  fanIn: number
}

export function interpolatePlaybook(archetype: DebtArchetype, meta: PlaybookMeta): string[] {
  const templates = RAW_PLAYBOOKS[archetype]
  if (!templates.length) return []

  const authorsStr = meta.authors.join(', ') || 'unknown'

  return templates.map((t) =>
    t
      .replace('{linesOfCode}', String(meta.linesOfCode))
      .replace('{authors}', authorsStr)
      .replace('{deadExports}', String(meta.deadExports))
      .replace('{fanIn}', String(meta.fanIn)),
  )
}
