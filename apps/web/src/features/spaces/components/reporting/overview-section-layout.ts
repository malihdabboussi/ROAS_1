import type { Layout, LayoutItem } from 'react-grid-layout'

/** Persisted overview dashboard layout (individual cards/widgets). */
export type OverviewSectionLayoutItem = Pick<LayoutItem, 'i' | 'x' | 'y' | 'w' | 'h'>

/** New tiles only — compact footprint for title/subtitle and note. */
export function defaultSizeForOverviewSectionId(id: string): { w: number; h: number } | undefined {
  if (id.startsWith('ovcw_h_')) return { w: 4, h: 4 }
  if (id.startsWith('ovcw_n_')) return { w: 4, h: 12 }
  return undefined
}

/** Caps persisted layout for notes; headings scale text to fill their cell so no cap needed. */
function applyOverviewCustomWidgetCaps(id: string, item: LayoutItem): LayoutItem {
  if (id.startsWith('ovcw_n_')) {
    return {
      ...item,
      w: Math.min(item.w, 6),
      h: Math.min(item.h, 24),
    }
  }
  return item
}

export function newOverviewCustomWidgetId(kind: 'heading' | 'note'): string {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
  return kind === 'heading' ? `ovcw_h_${suffix}` : `ovcw_n_${suffix}`
}

/**
 * Default vertical stack heights (grid rows @ rowHeight=10px).
 * w: 1..12 (12-column grid)
 */
const DEFAULT_HINTS: Record<string, { w: number; h: number }> = {
  ov_partial_banner: { w: 12, h: 6 },
  // Executive KPIs (usually 3 or 4 per row)
  kpi_leads: { w: 3, h: 14 },
  kpi_conversion: { w: 3, h: 14 },
  kpi_email_open: { w: 3, h: 14 },
  kpi_social_engagement: { w: 3, h: 14 },
  kpi_reach: { w: 3, h: 14 },
  kpi_visitors: { w: 3, h: 14 },
  kpi_bounce_rate: { w: 3, h: 14 },

  // Source Cards
  card_funnels: { w: 3, h: 22 },
  card_emails: { w: 3, h: 22 },
  card_ads: { w: 3, h: 22 },
  card_social: { w: 3, h: 22 },
  card_revenue: { w: 3, h: 22 },

  // Larger Feature Cards
  card_best_channel: { w: 4, h: 32 },
  card_revenue_trend: { w: 4, h: 32 },
  card_customer_journey: { w: 4, h: 32 },
  card_mission_status: { w: 12, h: 16 },
  card_best_post: { w: 6, h: 28 },
  card_sequence_performance: { w: 4, h: 24 },
  card_best_email: { w: 4, h: 24 },
  card_top_products: { w: 4, h: 32 },
  card_contacts_growth: { w: 12, h: 32 },
  card_deliverables_by_type: { w: 12, h: 32 },
  card_top_funnels: { w: 6, h: 40 },
  card_contact_sources: { w: 6, h: 24 },
  card_funnel_dropoff: { w: 12, h: 48 },
  card_roi_by_channel: { w: 6, h: 36 },
  card_campaign_leaderboard: { w: 6, h: 48 },
  card_unified_trend: { w: 6, h: 36 },
  card_contribution: { w: 6, h: 36 },
  card_alerts: { w: 12, h: 20 },

  // Missions/Social KPIs
  kpi_missions_active: { w: 3, h: 14 },
  kpi_mission_completion: { w: 3, h: 14 },
  kpi_missions_blocked: { w: 3, h: 14 },
  kpi_follower_growth: { w: 3, h: 14 },
  kpi_new_contacts: { w: 3, h: 14 },
  kpi_lead_customer: { w: 3, h: 14 },
}

function sortIdsBySavedPositions(
  saved: readonly OverviewSectionLayoutItem[] | undefined,
  visibleIds: string[],
): string[] {
  const visible = new Set(visibleIds)
  const sortedSaved = [...(saved ?? [])]
    .filter((l) => visible.has(l.i))
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
    .map((l) => l.i)
  const out: string[] = []
  for (const id of sortedSaved) {
    if (!out.includes(id)) out.push(id)
  }
  for (const id of visibleIds) {
    if (!out.includes(id)) out.push(id)
  }
  return out
}

/**
 * Merge persisted layout with currently visible widget ids.
 * Standardizes positions into a compact vertical flow if no layout exists.
 */
export function mergeOverviewSectionLayouts(
  saved: readonly OverviewSectionLayoutItem[] | undefined,
  visibleIds: string[],
): Layout {
  const ordered = sortIdsBySavedPositions(saved, visibleIds)
  const savedById = new Map((saved ?? []).map((l) => [l.i, { ...l }] as const))
  let cursorX = 0
  let cursorY = 0
  let maxHInRow = 0

  const result: LayoutItem[] = []
  for (const id of ordered) {
    const existing = savedById.get(id)
    if (existing) {
      result.push(applyOverviewCustomWidgetCaps(id, { ...existing, i: id }))
    } else {
      const hint = DEFAULT_HINTS[id] ?? defaultSizeForOverviewSectionId(id) ?? { w: 6, h: 14 }
      if (cursorX + hint.w > 12) {
        cursorX = 0
        cursorY += maxHInRow
        maxHInRow = 0
      }
      result.push({ i: id, x: cursorX, y: cursorY, w: hint.w, h: hint.h })
      cursorX += hint.w
      maxHInRow = Math.max(maxHInRow, hint.h)
    }
  }
  return result
}

export function layoutToPersistable(layout: Layout): OverviewSectionLayoutItem[] {
  return layout.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
}
