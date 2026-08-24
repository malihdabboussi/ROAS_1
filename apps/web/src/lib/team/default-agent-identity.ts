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
 * Presents the default agent as "Pixel" with the lamp mark. The lamp is the canonical
 * brand identity for the default agent on every surface — it always replaces a stored
 * portrait (onboarding used to generate human portraits into agents_registry.image_url,
 * which made chat show a person while previews showed the lamp). Orgs that renamed
 * their agent keep their custom name.
 */
export function normalizeDefaultAgentIdentity<
  T extends { agent_key: string | null; display_name: string; avatar_url: string | null },
>(entry: T): T {
  if (entry.agent_key !== DEFAULT_AGENT_KEY) return entry
  return {
    ...entry,
    display_name: isLegacyDefaultDisplayName(entry.display_name)
      ? DEFAULT_AGENT_DISPLAY_NAME
      : entry.display_name,
    avatar_url: DEFAULT_AGENT_AVATAR_URL,
  }
}
