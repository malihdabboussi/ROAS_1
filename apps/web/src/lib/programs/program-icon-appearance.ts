/** Non-gray IconPicker color ids for ClickUp-style program tiles when no color is stored. */
export const PROGRAM_DEFAULT_COLOR_IDS = [
  'purple',
  'blue',
  'green',
  'cyan',
  'orange',
  'red',
  'yellow',
] as const

export type ProgramDefaultColorId = (typeof PROGRAM_DEFAULT_COLOR_IDS)[number]

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Stable palette pick from a seed (program id). */
export function pickDefaultProgramColorId(seed: string): ProgramDefaultColorId {
  const index = hashSeed(seed) % PROGRAM_DEFAULT_COLOR_IDS.length
  return PROGRAM_DEFAULT_COLOR_IDS[index] ?? 'purple'
}

/**
 * Resolve which IconPicker color id a program row should use.
 * - Explicit user picks (including `default` / `muted`) are preserved.
 * - Missing / empty `icon_color` gets a deterministic non-gray palette color from `seed`.
 * - No seed (e.g. General) stays `muted`.
 */
export function resolveProgramIconColorId(
  seed: string | null | undefined,
  iconColor?: string | null,
): string {
  const trimmed = typeof iconColor === 'string' ? iconColor.trim() : ''
  if (trimmed.length > 0) return trimmed
  if (!seed) return 'muted'
  return pickDefaultProgramColorId(seed)
}

/** Random colorful default for new Program create modal (persisted on create). */
export function pickNewProgramColorId(): ProgramDefaultColorId {
  const index = Math.floor(Math.random() * PROGRAM_DEFAULT_COLOR_IDS.length)
  return PROGRAM_DEFAULT_COLOR_IDS[index] ?? 'purple'
}
