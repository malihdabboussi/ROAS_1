/**
 * Bounded graph window.
 *
 * The Brain graph is a visualization, not an export. The largest production
 * brain (~3.1k memories) serialises to ~5.4 MB as full memory records, which is
 * over the serverless response cap and surfaces to the user as a bare 500.
 * Two rules keep every brain under that cap regardless of size:
 *
 * 1. `clampGraphLimit` — the memory window never exceeds `GRAPH_MAX_NODE_LIMIT`
 *    no matter what the client asks for.
 * 2. `slimGraphMemory` — graph nodes carry only what the canvas and the node
 *    panel read: content capped to the panel's own display length, and
 *    `metadata` reduced to the preview keys the web reads.
 *
 * Legend/stat totals still come from DB counts, so a capped window never
 * under-reports how big the brain is.
 */

export const GRAPH_MAX_NODE_LIMIT = 2000
export const GRAPH_NODE_CONTENT_MAX_CHARS = 1000
const GRAPH_NODE_METADATA_MAX_CHARS = 500

/** Metadata keys the web graph reads (knowledge-source preview + panel). */
const GRAPH_METADATA_KEYS = new Set([
  'body',
  'subject',
  'thumbnail_url',
  'image_url',
  'public_url',
  'url',
  'space_id',
])

export function clampGraphLimit(requested: number | undefined): {
  /** `undefined` keeps each graph path's own default window. */
  limit: number | undefined
  capped: boolean
} {
  if (requested == null || !Number.isFinite(requested) || requested <= 0) {
    return { limit: undefined, capped: false }
  }
  if (requested > GRAPH_MAX_NODE_LIMIT) return { limit: GRAPH_MAX_NODE_LIMIT, capped: true }
  return { limit: Math.floor(requested), capped: false }
}

export function slimGraphMemory(memory: Record<string, unknown>): Record<string, unknown> {
  const content =
    typeof memory.content === 'string' && memory.content.length > GRAPH_NODE_CONTENT_MAX_CHARS
      ? memory.content.slice(0, GRAPH_NODE_CONTENT_MAX_CHARS)
      : memory.content
  return { ...memory, content, metadata: slimMetadata(memory.metadata) }
}

function slimMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!GRAPH_METADATA_KEYS.has(key)) continue
    out[key] =
      typeof raw === 'string' && raw.length > GRAPH_NODE_METADATA_MAX_CHARS
        ? raw.slice(0, GRAPH_NODE_METADATA_MAX_CHARS)
        : raw
  }
  return Object.keys(out).length > 0 ? out : null
}
