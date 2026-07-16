'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CampaignContext } from '@/app/(dashboard)/campaigns/[id]/_lib/types'
import { updateCampaign } from '@/features/studio/services/campaign.service'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import { RETRY_CONFIGS, withRetry } from '@/lib/utils/retry'
import { rpsoCoverageLevel } from '../lib/rpso-coverage'

function hasAnyStrategy(ctx: CampaignContext): boolean {
  const r = ctx.result?.trim() ?? ''
  const p = ctx.purpose?.trim() ?? ''
  const s = ctx.strategy?.trim() ?? ''
  const o = ctx.off_limits?.length ?? 0
  return Boolean(r || p || s || o > 0)
}

const inlineTextareaClass =
  'body-3 text-foreground min-h-[88px] w-full resize-none rounded-spacing-2 border border-transparent bg-transparent px-spacing-2 py-spacing-2 -mx-spacing-2 transition-colors placeholder:text-muted-foreground hover:bg-hover-subtle focus:border-border focus:bg-background focus:outline-none'

interface StrategyEditorProps {
  campaignId: string
  name: string
  initialContext: CampaignContext
  onSaved?: () => void
}

export function StrategyEditor({ campaignId, name, initialContext, onSaved }: StrategyEditorProps) {
  const [ctx, setCtx] = useState<CampaignContext>(initialContext)
  const [newRule, setNewRule] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setCtx(initialContext)
  }, [initialContext, campaignId])

  const flushSave = useCallback(
    async (next: CampaignContext) => {
      await withRetry(() => updateCampaign(campaignId, { context: next }), RETRY_CONFIGS.API_CALL)
      onSaved?.()
    },
    [campaignId, onSaved],
  )

  const scheduleSave = useCallback(
    (next: CampaignContext) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void flushSave(next)
      }, 900)
    },
    [flushSave],
  )

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const patchCtx = useCallback(
    (partial: Partial<CampaignContext>) => {
      setCtx((prev) => {
        const next = { ...prev, ...partial }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const handleGenerate = useCallback(() => {
    const storageKey = getOrgScopedKey('team-pending-send-message')
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        agentKey: 'vibey',
        content: '/strategy-planner',
        campaignId,
        campaignName: name,
        suppressUserMessage: true,
      }),
    )
    openInNewTab('/team?agent=vibey')
  }, [campaignId, name])

  const hasStrategy = hasAnyStrategy(ctx)
  const level = rpsoCoverageLevel(ctx)

  const coverageBadge =
    level === 'full' ? (
      <span className="badge-glass badge-glass-green typo-caption font-medium">Full RPSO</span>
    ) : level === 'limited' ? (
      <span className="badge-glass badge-glass-orange typo-caption font-medium">Partial</span>
    ) : null

  return (
    <div className="pb-spacing-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="surface-card wizard-container-border rounded-spacing-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border bg-[var(--color-background)] shadow-lg">
        <div className="border-border modal-scroll-header-edge gap-spacing-3 px-spacing-4 py-spacing-3 flex shrink-0 items-start justify-between border-b">
          <div className="min-w-0 flex-1">
            <p className="title-h6">{name}</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Result, Purpose, Strategy, and off-limits Autopilot uses before creating missions.
            </p>
            {coverageBadge ? <div className="mt-spacing-2">{coverageBadge}</div> : null}
          </div>
          <div className="gap-spacing-2 flex shrink-0 flex-wrap items-center justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              className="button-glass-primary body-3 rounded-spacing-2 px-spacing-4 py-spacing-2 font-semibold"
            >
              Generate with ROAS
            </button>
          </div>
        </div>

        <div className="px-spacing-4 py-spacing-4 min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-spacing-6">
            {!hasStrategy ? (
              <p className="body-3 text-muted-foreground italic">
                Add your strategy below, or use Generate with ROAS to draft from this campaign and
                brand knowledge.
              </p>
            ) : null}

            <section>
              <h3 className="body-2 text-foreground mb-spacing-2 font-semibold">Result</h3>
              <textarea
                value={ctx.result}
                onChange={(e) => patchCtx({ result: e.target.value })}
                placeholder="What does success look like? Click to write."
                className={inlineTextareaClass}
                aria-label="Result"
              />
            </section>

            <section>
              <h3 className="body-2 text-foreground mb-spacing-2 font-semibold">Purpose</h3>
              <textarea
                value={ctx.purpose}
                onChange={(e) => patchCtx({ purpose: e.target.value })}
                placeholder="Why this campaign exists. Click to write."
                className={inlineTextareaClass}
                aria-label="Purpose"
              />
            </section>

            <section>
              <h3 className="body-2 text-foreground mb-spacing-2 font-semibold">Strategy</h3>
              <textarea
                value={ctx.strategy}
                onChange={(e) => patchCtx({ strategy: e.target.value })}
                placeholder="How managers and agents should execute. Click to write."
                className={inlineTextareaClass}
                aria-label="Strategy"
              />
            </section>

            <section>
              <h3 className="body-2 text-foreground mb-spacing-2 font-semibold">Off-limits</h3>
              <p className="body-4 text-muted-foreground mb-spacing-2">
                Rules ROAS won&apos;t break without checking with you.
              </p>
              <div className="gap-spacing-2 flex flex-wrap">
                {(ctx.off_limits ?? []).map((rule) => (
                  <span
                    key={rule}
                    className="badge-glass badge-glass-muted typo-caption gap-spacing-1 px-spacing-2 py-spacing-1 inline-flex items-center"
                  >
                    {rule}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const next = {
                          ...ctx,
                          off_limits: (ctx.off_limits ?? []).filter((r) => r !== rule),
                        }
                        setCtx(next)
                        scheduleSave(next)
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="gap-spacing-2 mt-spacing-2 flex flex-wrap">
                <input
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="e.g. No paid ads without sign-off"
                  className="input-glass body-3 min-h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground min-w-[200px] flex-1 border"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const t = newRule.trim()
                      if (!t) return
                      const next = { ...ctx, off_limits: [...(ctx.off_limits ?? []), t] }
                      setCtx(next)
                      setNewRule('')
                      scheduleSave(next)
                    }
                  }}
                />
                <button
                  type="button"
                  className="button-glass-primary body-3 rounded-spacing-2 px-spacing-4 py-spacing-2 font-medium"
                  onClick={() => {
                    const t = newRule.trim()
                    if (!t) return
                    const next = { ...ctx, off_limits: [...(ctx.off_limits ?? []), t] }
                    setCtx(next)
                    setNewRule('')
                    scheduleSave(next)
                  }}
                >
                  Add
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
