/** Default primary agent key seeded for every org. */
export const DEFAULT_AGENT_KEY = 'vibey'
/** User-facing name for the default agent. */
export const DEFAULT_AGENT_DISPLAY_NAME = 'Pixel'
/** Lamp avatar used for the default agent when the org has not customized it. */
export const DEFAULT_AGENT_AVATAR_URL = '/pixel-avatar.png'

/** Legacy default names we still swap to {@link DEFAULT_AGENT_DISPLAY_NAME}. */
const DEFAULT_AGENT_LEGACY_NAMES = new Set(['vibey', 'roas', 'pixel'])

function isLegacyDefaultDisplayName(displayName: string): boolean {
  const normalized = displayName.trim().toLowerCase()
  if (DEFAULT_AGENT_LEGACY_NAMES.has(normalized)) return true
  // Seeded defaults sometimes include a role suffix, e.g. "Vibey · CEO".
  const baseName = normalized.split(/\s*[·|-]\s*/)[0]?.trim() ?? normalized
  return DEFAULT_AGENT_LEGACY_NAMES.has(baseName)
}

/**
 * Presents the default agent as "Pixel", but only when the org is still on the
 * seeded default identity. Orgs that renamed their agent are left untouched, and
 * a custom avatar (e.g. an onboarding-generated portrait) always wins over the
 * lamp so chat matches the mission surfaces that read agents_registry.image_url.
 */
export function normalizeDefaultAgentIdentity<
  T extends { agent_key: string | null; display_name: string; avatar_url: string | null },
>(entry: T): T {
  if (entry.agent_key !== DEFAULT_AGENT_KEY) return entry
  if (!isLegacyDefaultDisplayName(entry.display_name)) return entry
  return {
    ...entry,
    display_name: DEFAULT_AGENT_DISPLAY_NAME,
    avatar_url: entry.avatar_url?.trim() ? entry.avatar_url : DEFAULT_AGENT_AVATAR_URL,
  }
}
