/**
 * The locked 90-day story arc for the Foundry Creative YC demo.
 *
 * Every timestamped row in the seed routes through one of the exported
 * Dates / helpers in this file so the entire demo reads as 90 days of real
 * activity, not a one-shot seed dump.
 *
 * Week 1 = D-90..D-84 (oldest). Week 13 = D-6..D-0 (today).
 */
import { dayOffset } from '../lib/timeline'

// ─── Anchors ─────────────────────────────────────────────────────────────

/** The first day of Week 1 — Foundry Creative officially founded. */
export const AGENCY_FOUNDED_AT = dayOffset(90, 9, 0)

/** Founder profile.created_at — same as founding. */
export const FOUNDER_JOINED_AT = AGENCY_FOUNDED_AT

/** When Nico (Head of Strategy) joined as the 2nd human seat. */
export const NICO_JOINED_AT = dayOffset(88, 10, 30)

/** When Jules (Head of Delivery) joined as the 3rd human seat. */
export const JULES_JOINED_AT = dayOffset(82, 11, 15)

/** When cortex_max was flipped on the user brain. */
export const CORTEX_MAX_ENABLED_AT = dayOffset(56, 16, 45)

/** When Company Cortex daily-dream was turned on. */
export const COMPANY_CORTEX_ENABLED_AT = dayOffset(35, 8, 15)

/** Today, midnight UTC — the latest day in the arc. */
export const TODAY = dayOffset(0, 0, 0)

// ─── Week structure ──────────────────────────────────────────────────────

export interface WeekBeat {
  weekNumber: number
  startDate: Date
  endDate: Date
  /** Human-readable name for this week's storyline. */
  headline: string
  /** Bullet points describing what happened. */
  beats: string[]
}

/**
 * Returns the start Date (day-of-week = Monday, 00:00 UTC) for the given
 * week number 1..13, where Week 1 starts at D-90 (rounded back to its Monday).
 */
function weekStart(weekNumber: number): Date {
  const daysAgo = 90 - (weekNumber - 1) * 7
  return dayOffset(daysAgo, 0, 0)
}

function weekEnd(weekNumber: number): Date {
  const daysAgo = 90 - weekNumber * 7 + 1
  return dayOffset(daysAgo, 23, 59, 59)
}

/** The locked 13-week narrative arc. */
export const WEEKS: readonly WeekBeat[] = [
  {
    weekNumber: 1,
    startDate: weekStart(1),
    endDate: weekEnd(1),
    headline: 'Foundry founded',
    beats: [
      'Sefy-archetype + Nico co-found Foundry Creative.',
      'Brand book v0 drafted in 48 hours.',
      'First brain dump: founding vision, principles, who we are not.',
      'Maya (Head of Brand agent) hired day 1.',
      'First 2 clients sign on the strength of the founders: Acme (SaaS) + Beta (DTC).',
    ],
  },
  {
    weekNumber: 2,
    startDate: weekStart(2),
    endDate: weekEnd(2),
    headline: 'GTM motion designed',
    beats: [
      'Leo (Performance Marketing agent) joins.',
      'Jules (Head of Delivery) signs on as 3rd human partner.',
      'First campaigns spun up for Acme + Beta.',
      'In-app channels created per client.',
    ],
  },
  {
    weekNumber: 3,
    startDate: weekStart(3),
    endDate: weekEnd(3),
    headline: 'Content engine launched',
    beats: [
      'Sara (Copywriter agent) hired.',
      'First voice-book snapshots crystallize from founder principles.',
      'Acme positioning workshop produces 8 anchor memories.',
    ],
  },
  {
    weekNumber: 4,
    startDate: weekStart(4),
    endDate: weekEnd(4),
    headline: 'First retro: positioning is muddier than expected',
    beats: [
      'First retro flags scope-creep tension with Beta.',
      'Belief "We are brand-only" gets marked challenged.',
      'Sara + Maya pair on a voice consistency rule.',
    ],
  },
  {
    weekNumber: 5,
    startDate: weekStart(5),
    endDate: weekEnd(5),
    headline: 'Cortex Max enabled',
    beats: [
      'cortex_max flipped ON for the user brain.',
      'First brain_library_sync runs successfully.',
      'Devon (Web Dev agent) joins.',
      'Atlas starts synthesizing narrative pages.',
    ],
  },
  {
    weekNumber: 6,
    startDate: weekStart(6),
    endDate: weekEnd(6),
    headline: 'Two more clients sign',
    beats: [
      'Casey (Designer agent) hired.',
      'Gamma (fintech) + Delta (healthtech) sign retainers.',
      'Customer brain starts forming — first ns_belief_patterns emerge.',
    ],
  },
  {
    weekNumber: 7,
    startDate: weekStart(7),
    endDate: weekEnd(7),
    headline: 'First customer avatar emerges',
    beats: [
      'Atlas clusters Beta + Delta primary contacts into "Boutique DTC operators".',
      'First customer_avatar.status = active.',
      'Maya proposes shared brand brief format.',
    ],
  },
  {
    weekNumber: 8,
    startDate: weekStart(8),
    endDate: weekEnd(8),
    headline: 'Company Cortex turned on',
    beats: [
      'company_cortex_settings.enabled = true, schedule = daily.',
      'First daily dream run completes — produces 3 signals.',
      'Beta scope-creep tension surfaces in the dream.',
    ],
  },
  {
    weekNumber: 9,
    startDate: weekStart(9),
    endDate: weekEnd(9),
    headline: 'First anti-pattern crystallizes',
    beats: [
      'company_cortex_object: "Async approvals burn trust" — first anti_pattern.',
      'Maya rewrites the brand approvals SOP in response.',
      'Acme rebrand work begins.',
    ],
  },
  {
    weekNumber: 10,
    startDate: weekStart(10),
    endDate: weekEnd(10),
    headline: 'Two more clients + Riley joins',
    beats: [
      'Epsilon (B2B services) + Zeta (edu) sign retainers.',
      'Riley (Account Manager agent) hired to handle growing client load.',
      'Customer brain now spans 18 contacts across 6 clients.',
    ],
  },
  {
    weekNumber: 11,
    startDate: weekStart(11),
    endDate: weekEnd(11),
    headline: 'Operating standards crystallize',
    beats: [
      '3 standard + 2 protocol cortex objects formed this week.',
      'Acme rebrand decision logged as cortex object type "decision".',
      'Casey + Sara collaboration peak — 4 missions completed together.',
    ],
  },
  {
    weekNumber: 12,
    startDate: weekStart(12),
    endDate: weekEnd(12),
    headline: 'Pricing review tension',
    beats: [
      'Owen (Ops agent) hired.',
      'Pricing review surfaces a tension object: "Retainer scope vs project scope".',
      'Sales pipeline tightens — 2 leads disqualified, 1 advances to proposal.',
    ],
  },
  {
    weekNumber: 13,
    startDate: weekStart(13),
    endDate: weekEnd(13),
    headline: 'This week — active and alive',
    beats: [
      'Mixed mission statuses across all 6 client campaigns.',
      'Channels active today.',
      "Yesterday's dream run is the latest.",
      '1-2 ns_pending_captures waiting for review (Atlas captured something yesterday).',
    ],
  },
]

/** Map week number to start/end for quick lookup. */
export function getWeek(weekNumber: number): WeekBeat {
  const w = WEEKS[weekNumber - 1]
  if (!w) throw new Error(`Invalid week number: ${weekNumber}`)
  return w
}

/**
 * Returns a Date inside the given week, at a deterministic offset based on
 * a seed string. Used for scattering memories / messages / log events
 * within a week without breaking idempotency.
 */
export function dateInWeek(
  weekNumber: number,
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  hour = 12,
  minute = 0,
): Date {
  const start = weekStart(weekNumber)
  const d = new Date(start.getTime())
  d.setUTCDate(d.getUTCDate() + dayOfWeek)
  d.setUTCHours(hour, minute, 0, 0)
  return d
}
