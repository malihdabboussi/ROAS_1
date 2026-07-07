'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { fetchOffer } from '../../services/artifact-preview.service'
import type { Offer } from '../../types'
import { OFFER_STEPS } from '../../types'
import { isLongListItemText } from '../../utils/long-list-item'
import { normalizeEmDashToHyphen } from '../../utils/normalize-em-dash'

interface OfferStepPreviewProps {
  offerId: string
  stepNumber: number
  toolbarTrailing?: ReactNode
}

// ============================================================================
// Ordered field definitions per step — matches legacy OfferContentPreview
// ============================================================================

/** Convert snake_case key to Title Case label */
function keyToLabel(key: string): string {
  return key
    .replace(/^(step\d+_|icp_)/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Priority ordering for known fields — listed keys appear first, in this order */
const FIELD_PRIORITY: Record<number, string[]> = {
  1: ['product', 'what_we_sell', 'target_market', 'who_we_sell_to'],
  2: [
    'power_offer_statement',
    'major_benefit',
    'secondary_benefit',
    'tertiary_benefit',
    'vehicle',
    'common_objection',
    'call_to_action',
  ],
  3: [
    'demographic_foundation',
    'core_problem',
    'powerful_emotions',
    'biggest_fears',
    'fear_impact_on_relationships',
    'hurtful_comments',
    'past_attempts',
    'avoidance_behaviors',
    'perfect_outcomes',
    'transformation_impact',
    'success_markers',
    'secondary_gains',
    'blame_targets',
    'main_objections',
    'background_profile',
    'psychological_drivers',
    'internal_voice',
    'content_preferences',
    'comprehensive_summary',
  ],
  4: [
    'icp_company_profile',
    'icp_decision_makers',
    'icp_pain_points',
    'icp_buying_triggers',
    'icp_buying_process',
    'icp_budget_and_roi',
    'icp_messaging_angles',
    'icp_competitive_landscape',
  ],
  5: [
    'company_overview',
    'whats_included',
    'challenges_solved',
    'competitive_advantages',
    'key_differentiating_factors',
    'unique_mechanisms',
    'differential_mechanisms',
    'direct_competitors_analysis',
    'results_and_success_stories',
    'credibility_and_social_proof',
  ],
  6: ['unique_mechanisms', 'differential_mechanisms'],
}

/** Fields that should render as a highlighted statement (no bullets, even if array) */
const STATEMENT_FIELDS = new Set(['power_offer_statement'])

/**
 * Build display fields dynamically from the actual JSONB keys.
 * Uses priority ordering when available, appends unknown keys at the end.
 */
function getFieldsFromData(
  stepData: Record<string, unknown>,
  stepNumber: number,
): [string, string][] {
  const validKeys = Object.keys(stepData).filter((k) => {
    const v = stepData[k]
    if (v === null || v === undefined || v === '') return false
    if (typeof v === 'string' && v.trim() === '') return false
    return true
  })

  const priority = FIELD_PRIORITY[stepNumber] ?? []
  const ordered: string[] = []

  // Add priority keys first (in order)
  for (const pk of priority) {
    if (validKeys.includes(pk)) ordered.push(pk)
  }
  // Add remaining keys not in priority list
  for (const k of validKeys) {
    if (!ordered.includes(k)) ordered.push(k)
  }

  return ordered.map((k) => [k, keyToLabel(k)])
}

/** Flatten a value to a display string — handles nested objects/arrays */
function valueToString(item: unknown): string {
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (Array.isArray(item)) return item.map(valueToString).filter(Boolean).join(' · ')
  if (item && typeof item === 'object') {
    return Object.values(item as Record<string, unknown>)
      .map(valueToString)
      .filter(Boolean)
      .join(' · ')
  }
  return ''
}

/** Render a field value — arrays as bullet lists (deduplicated), objects as key-value blocks, strings as paragraphs */
function renderFieldValue(value: unknown, isStatement = false) {
  if (Array.isArray(value)) {
    const unique = [
      ...new Set(
        value
          .map((item) =>
            normalizeEmDashToHyphen(
              valueToString(item)
                .replace(/^[\s•\-–—*]+/, '')
                .trim(),
            ),
          )
          .filter(Boolean),
      ),
    ]
    if (isStatement || unique.length === 1) {
      return (
        <p className="body-2 whitespace-pre-wrap text-[var(--color-foreground)]">
          {unique.join('\n\n')}
        </p>
      )
    }
    return (
      <ul className="body-2 list-card-compact text-[var(--color-foreground)]">
        {unique.map((item, i) => (
          <li key={i} {...(isLongListItemText(item) ? { 'data-long-item': 'true' as const } : {})}>
            {item}
          </li>
        ))}
      </ul>
    )
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return (
      <div className="space-y-2">
        {Object.entries(obj).map(([k, v]) => {
          if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) return null
          return (
            <div key={k}>
              <p className="body-3 mb-1 font-semibold text-[var(--color-muted-foreground)]">
                {keyToLabel(k)}
              </p>
              {renderFieldValue(v)}
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <p className="body-2 whitespace-pre-wrap text-[var(--color-foreground)]">
      {normalizeEmDashToHyphen(String(value))}
    </p>
  )
}

export function OfferStepPreview({ offerId, stepNumber, toolbarTrailing }: OfferStepPreviewProps) {
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOffer = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setOffer(await fetchOffer(offerId))
    } catch (err) {
      setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_OFFER)
    } finally {
      setLoading(false)
    }
  }, [offerId])

  useEffect(() => {
    void loadOffer()
  }, [loadOffer])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-[var(--color-muted-foreground)]" />
        <p className="body-2 text-[var(--color-foreground)]">
          {error ? 'Unable to load offer' : 'Offer not found'}
        </p>
      </div>
    )
  }

  const stepMeta = OFFER_STEPS.find((s) => s.number === stepNumber)
  const stepData = offer[`step${stepNumber}_data` as keyof Offer] as Record<string, unknown> | null
  const fields = stepData ? getFieldsFromData(stepData, stepNumber) : []

  if (!stepData) {
    return (
      <div className="flex h-full flex-col">
        {toolbarTrailing ? (
          <div className="border-border flex items-center justify-between border-b px-3 py-2">
            <span className="body-3 text-foreground truncate font-medium">
              {stepMeta?.name ?? `Step ${stepNumber}`}
            </span>
            <div className="flex shrink-0 items-center gap-1">{toolbarTrailing}</div>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <p className="body-3 text-[var(--color-muted-foreground)]">
            This step hasn&apos;t been completed yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {toolbarTrailing ? (
        <div className="border-border flex shrink-0 items-center justify-between border-b px-3 py-2">
          <span className="body-3 text-foreground min-w-0 truncate font-medium">
            {stepMeta?.name ?? `Step ${stepNumber}`}
          </span>
          <div className="flex shrink-0 items-center gap-1">{toolbarTrailing}</div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 p-4">
          {!toolbarTrailing ? (
            <h2 className="title-h3">{stepMeta?.name ?? `Step ${stepNumber}`}</h2>
          ) : null}
          {fields.map(([key, label]) => {
            const value = stepData[key]
            if (value === null || value === undefined || value === '') return null
            if (typeof value === 'string' && value.trim() === '') return null

            return (
              <div key={key} className="card-glass rounded-xl">
                <div className="p-3 sm:p-4 md:p-6">
                  <h3 className="body-2 mb-2 font-semibold text-[var(--color-foreground)]">
                    {label}
                  </h3>
                  {renderFieldValue(value, STATEMENT_FIELDS.has(key))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
