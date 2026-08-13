'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight, Filter, User } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useHomeCustomizeEditing } from '@/features/home/context/home-customize-context'
import {
  getCachedCampaigns,
  isCampaignFetchInFlight,
  prefetchOrgCampaigns,
  useCampaignCacheVersion,
} from '@/features/home/lib/home-feed-campaign-cache'
import {
  DEFAULT_HOME_FEED_SCOPE,
  parseHomeFeedScope,
  type HomeFeedScopeState,
} from '@/features/home/types/home-feed-scope'
import { useOrgStore } from '@/features/org/store/use-org-store'

export type HomeFeedScopePickerVariant =
  | 'conversations'
  | 'automations'
  | 'favorite_spaces'
  | 'favorite_conversations'
  | 'favorite_campaigns'
  | 'my_tasks'
  | 'approval_queue'
  | 'org_pulse'

const MENU_WIDTH = 280
const MENU_MARGIN = 8

function storageKey(variant: HomeFeedScopePickerVariant): string {
  return `vibey-home-feed-scope:${variant}`
}

function loadScope(variant: HomeFeedScopePickerVariant): HomeFeedScopeState {
  const defaultScope =
    variant === 'my_tasks'
      ? { feedScope: 'all' as const, orgId: null, campaignId: null }
      : { ...DEFAULT_HOME_FEED_SCOPE }
  if (typeof window === 'undefined') return defaultScope
  try {
    const raw = window.sessionStorage.getItem(storageKey(variant))
    return raw ? parseHomeFeedScope(JSON.parse(raw) as unknown) : defaultScope
  } catch {
    return defaultScope
  }
}

function saveScope(variant: HomeFeedScopePickerVariant, scope: HomeFeedScopeState) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(storageKey(variant), JSON.stringify(scope))
}

function scopeSummary(
  scope: HomeFeedScopeState,
  memberships: { org_id: string; organizations: { name: string } }[],
) {
  const orgName = (id: string) =>
    memberships.find((m) => m.org_id === id)?.organizations?.name ?? 'Organization'
  if (scope.feedScope === 'org' && scope.orgId) {
    return scope.campaignId ? `${orgName(scope.orgId)} · campaign` : orgName(scope.orgId)
  }
  if (scope.feedScope === 'personal') return 'Personal'
  if (scope.feedScope === 'all') return 'Everything'
  return 'Workspace'
}

export function usePersistedHomeFeedScope(variant: HomeFeedScopePickerVariant) {
  // Read sessionStorage synchronously so the first fetch already uses the
  // persisted scope — a post-mount effect here made every card whose scope
  // differed from the default fetch twice.
  const [scope, setScope] = useState<HomeFeedScopeState>(() => loadScope(variant))

  const update = useCallback(
    (patch: Partial<HomeFeedScopeState> | ((prev: HomeFeedScopeState) => HomeFeedScopeState)) => {
      setScope((prev) => {
        const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }
        saveScope(variant, next)
        return next
      })
    },
    [variant],
  )

  return { scope, updateScope: update }
}

export function HomeFeedScopePicker({
  variant: _variant,
  scope,
  onChange,
  showSummary = false,
}: {
  variant: HomeFeedScopePickerVariant
  scope: HomeFeedScopeState
  onChange: (patch: Partial<HomeFeedScopeState>) => void
  showSummary?: boolean
}) {
  const memberships = useOrgStore((s) => s.memberships)
  const isOrgOnly = useOrgStore((s) => s.isOrgOnly)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useCampaignCacheVersion()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setExpandedOrgId(scope.feedScope === 'org' ? scope.orgId : null)
  }, [open, scope.feedScope, scope.orgId])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (menuRef.current?.contains(t)) return
      if (buttonRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const vw = window.innerWidth
    let left = rect.right - MENU_WIDTH
    if (left + MENU_WIDTH + MENU_MARGIN > vw) left = vw - MENU_WIDTH - MENU_MARGIN
    if (left < MENU_MARGIN) left = MENU_MARGIN
    setPosition({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open || !expandedOrgId) return
    if (getCachedCampaigns(expandedOrgId) !== undefined) return
    void prefetchOrgCampaigns(expandedOrgId).catch(() => {})
  }, [open, expandedOrgId])

  const summary = useMemo(() => scopeSummary(scope, memberships), [scope, memberships])

  const handlePersonal = () => {
    onChange({ feedScope: 'personal', orgId: null, campaignId: null })
    setOpen(false)
  }

  const handleOrgClick = (orgId: string) => {
    setExpandedOrgId((curr) => (curr === orgId ? null : orgId))
  }

  const handleAllInOrg = (orgId: string) => {
    onChange({ feedScope: 'org', orgId, campaignId: null })
    setOpen(false)
  }

  const handleCampaign = (orgId: string, campaignId: string) => {
    onChange({ feedScope: 'org', orgId, campaignId })
    setOpen(false)
  }

  const personalSelected = scope.feedScope === 'personal'

  const rowCls = (active: boolean) =>
    `body-3 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${
      active
        ? 'bg-[var(--color-hover-subtle)] text-foreground font-semibold'
        : 'text-foreground hover:bg-[var(--color-hover-subtle)]'
    }`

  return (
    <>
      <Tooltip label={`Filter scope · ${summary}`} side="bottom">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={
            showSummary
              ? 'input-glass rounded-spacing-2 gap-spacing-2 h-spacing-9 px-spacing-3 body-3 text-foreground flex min-w-0 items-center'
              : 'text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors hover:bg-[var(--color-hover-subtle)]'
          }
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Filter scope · ${summary}`}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          {showSummary ? <span className="max-w-xs truncate">{summary}</span> : null}
        </button>
      </Tooltip>

      {mounted && open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="dropdown-menu-solid fixed max-h-[min(70vh,520px)] overflow-y-auto py-1"
              style={{
                top: position?.top ?? 0,
                left: position?.left ?? 0,
                width: MENU_WIDTH,
                visibility: position ? 'visible' : 'hidden',
              }}
            >
              {!isOrgOnly ? (
                <button type="button" className={rowCls(personalSelected)} onClick={handlePersonal}>
                  <User className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">Personal</span>
                  {personalSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ) : null}

              {memberships.map((m) => {
                const expanded = expandedOrgId === m.org_id
                const orgSelected = scope.feedScope === 'org' && scope.orgId === m.org_id
                const campaignList = getCachedCampaigns(m.org_id)
                const campaignsLoading =
                  campaignList === undefined && isCampaignFetchInFlight(m.org_id)
                return (
                  <div key={m.org_id}>
                    <button
                      type="button"
                      className={rowCls(orgSelected && !scope.campaignId)}
                      onClick={() => handleOrgClick(m.org_id)}
                      aria-expanded={expanded}
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {m.organizations?.name ?? m.org_id}
                      </span>
                      {orgSelected && !scope.campaignId ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                      ) : null}
                    </button>
                    {expanded ? (
                      <div className="border-border ml-3 border-l">
                        <button
                          type="button"
                          className={rowCls(orgSelected && !scope.campaignId)}
                          onClick={() => handleAllInOrg(m.org_id)}
                        >
                          <span className="min-w-0 flex-1 truncate pl-3">
                            All of {m.organizations?.name ?? 'organization'}
                          </span>
                          {orgSelected && !scope.campaignId ? (
                            <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                          ) : null}
                        </button>
                        {campaignList === undefined || campaignsLoading ? (
                          <div className="body-3 text-muted-foreground/70 px-3 py-2 pl-6">
                            Loading…
                          </div>
                        ) : campaignList.length === 0 ? (
                          <div className="body-3 text-muted-foreground/70 px-3 py-2 pl-6">
                            No campaigns
                          </div>
                        ) : (
                          campaignList.map((c) => {
                            const active = orgSelected && scope.campaignId === c.id
                            return (
                              <button
                                key={c.id}
                                type="button"
                                className={rowCls(active)}
                                onClick={() => handleCampaign(m.org_id, c.id)}
                              >
                                <span className="min-w-0 flex-1 truncate pl-3">
                                  {c.name ?? c.id}
                                </span>
                                {active ? (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                                ) : null}
                              </button>
                            )
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}

              {memberships.length === 0 && isOrgOnly ? (
                <div className="body-3 text-muted-foreground/70 px-3 py-2">
                  No organizations yet
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export function HomeFeedScopeHoverReveal({ children }: { children: React.ReactNode }) {
  const editing = useHomeCustomizeEditing()
  if (editing) return null

  return (
    <div className="pointer-events-none flex shrink-0 translate-x-2 items-center opacity-0 transition-[opacity,transform] duration-200 ease-out [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] group-focus-within/home-feed-head:pointer-events-auto group-focus-within/home-feed-head:translate-x-0 group-focus-within/home-feed-head:opacity-100 group-hover/home-feed-head:pointer-events-auto group-hover/home-feed-head:translate-x-0 group-hover/home-feed-head:opacity-100">
      {children}
    </div>
  )
}
