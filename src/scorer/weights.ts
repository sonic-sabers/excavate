import { cosmiconfig } from 'cosmiconfig'
import { DEFAULT_CONFIG, type ExcavateConfig } from '../types.js'

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(override) as Array<keyof T>) {
    const overrideVal = override[key]
    const baseVal = base[key]
    if (
      overrideVal !== null &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      ) as T[keyof T]
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[keyof T]
    }
  }
  return result
}

export async function loadConfig(configPath?: string): Promise<ExcavateConfig> {
  const explorer = cosmiconfig('excavate')

  const result = configPath
    ? await explorer.load(configPath)
    : await explorer.search()

  if (!result || result.isEmpty) {
    return DEFAULT_CONFIG
  }

  const merged = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, result.config as Record<string, unknown>)
  return merged as unknown as ExcavateConfig
}
