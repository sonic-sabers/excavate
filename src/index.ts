/**
 * excavate — technical debt heatmap for JS/TS codebases.
 *
 * Combines six signals (churn, coverage gap, cyclomatic complexity, bus factor,
 * doc/SATD density, circular deps) into a weighted score (0–100) per file.
 *
 * @example
 * ```ts
 * import { scan } from 'excavate'
 *
 * const result = await scan('/path/to/repo', { output: [], failAbove: null })
 * const bedrock = result.files.filter(f => f.level === 'bedrock')
 * console.log(`${bedrock.length} files need urgent attention`)
 * ```
 *
 * @see https://github.com/sonic-sabers/excavate
 * @see https://raw.githubusercontent.com/sonic-sabers/excavate/main/llms.txt
 */
export type { FileDebtResult, ScanResult, ExcavateConfig, DebtLevel } from './types.js'
export { DEFAULT_CONFIG } from './types.js'
export { scan } from './scanner/index.js'
