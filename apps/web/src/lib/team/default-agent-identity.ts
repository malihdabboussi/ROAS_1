/** Default primary agent key seeded for every org. */
export const DEFAULT_AGENT_KEY = 'vibey'
/** User-facing name for the default agent. */
export const DEFAULT_AGENT_DISPLAY_NAME = 'Pixel'
/** Lamp avatar used for the default agent when the org has not customized it. */
export const DEFAULT_AGENT_AVATAR_URL = '/pixel-avatar.png'

/** Legacy default names we still swap to {@link DEFAULT_AGENT_DISPLAY_NAME}. */
const DEFAULT_AGENT_LEGACY_NAMES = new Set(['vibey', 'roas', 'pixel'])

/**
 * Presents the default agent as "Pixel" with the lamp avatar, but only when the
 * org is still on the seeded default identity. Orgs that renamed or re-avatared
 * their agent are left untouched.
 */
export function normalizeDefaultAgentIdentity<
  T extends { agent_key: string | null; display_name: string; avatar_url: string | null },
>(entry: T): T {
  if (entry.agent_key !== DEFAULT_AGENT_KEY) return entry
  if (!DEFAULT_AGENT_LEGACY_NAMES.has(entry.display_name.trim().toLowerCase())) return entry
  return {
    ...entry,
    display_name: DEFAULT_AGENT_DISPLAY_NAME,
    avatar_url: DEFAULT_AGENT_AVATAR_URL,
  }
}
