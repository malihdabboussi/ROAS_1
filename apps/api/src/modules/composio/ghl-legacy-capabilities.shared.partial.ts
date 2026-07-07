/**
 * Shared types and helpers for GoHighLevel legacy capability partials.
 */

export type GhlLegacyRow = {
  integration_id: 'gohighlevel'
  action_slug: string
  execution_mode: 'legacy'
  display_name: string
  description: string
  parameters: Record<string, unknown>
  examples: Array<Record<string, unknown>>
  metadata: Record<string, unknown>
  domains: string[]
}

export const p = (o: Record<string, unknown>) => o
