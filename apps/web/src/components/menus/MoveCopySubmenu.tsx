'use client'

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Building2, ChevronRight, FolderKanban, FolderPlus, FolderTree, User } from 'lucide-react'
import { useTransferDialog } from '@/components/transfer'
import { backendGet } from '@/lib/api/backend-client'
import type { Campaign } from '@/lib/campaigns'
import type { OrgMembership } from '@/lib/org'
import type { TransferEntityType, TransferMode } from '@/lib/transfer'
import { canTransferAcrossContext } from '@/lib/transfer'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'

const MENU_WIDTH = 224
const NESTED_MENU_WIDTH = 240
const NESTED_MENU_MAX_H = 320
const PREVIEW_LIMIT = 5
const HOVER_CLOSE_DELAY_MS = 140
const CROSS_CONTEXT_MOVE_ENABLED = process.env.NEXT_PUBLIC_CROSS_CONTEXT_MOVE_ENABLED !== 'false'

/** Space 3-dots menu & other `dropdown-menu-solid` rows — matches adjacent menu items. */
export const moveCopyTriggerDropdown =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'

/** Sidebar space context menu — same as `ITEM_CLS` beside Move/Copy in that menu. */
export const moveCopyTriggerSidebar =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'

/** Studio campaign menus (sidebar + campaigns page kebab). */
export const moveCopyTriggerStudioMenu =
  'body-2 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]'

/** Customize view panel — matches Sharing & DELETE rows (body-3, gap-1.5). */
export const moveCopyTriggerCustomize =
  'body-3 text-[var(--foreground)] flex w-full cursor-pointer items-center gap-1.5 text-left transition-colors hover:opacity-80'

type MoveCopyExclusiveCtx = {
  activeId: string | null
  setActiveId: (id: string | null) => void
}

const MoveCopyExclusiveContext = createContext<MoveCopyExclusiveCtx | null>(null)

/** Wrap sibling Move/Copy rows so only one flyout is open at a time. */
export function MoveCopySubmenuExclusiveGroup({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const value = useMemo(() => ({ activeId, setActiveId }), [activeId])
  return (
    <MoveCopyExclusiveContext.Provider value={value}>{children}</MoveCopyExclusiveContext.Provider>
  )
}

interface MoveCopySubmenuProps {
  mode: TransferMode
  label: string
  icon: ReactNode
  entityType: TransferEntityType
  entityId: string
  entityName: string
  sourceOrgId: string | null
  sourceCampaignId?: string | null
  currentCampaigns?: Campaign[]
  memberships: OrgMembership[]
  onSameContextCampaignSelect?: (campaignId: string | null) => void | Promise<void>
  onCloseMenus: () => void
  className: string
}

type TransferTarget = {
  orgId: string | null
  campaignId?: string | null
  label: string
}

type ContextTarget = {
  key: string
  orgId: string | null
  label: string
}

type SpaceStep = {
  orgId: string | null
  campaignId: string | null
  label: string
  pos: { top: number; left: number }
}

type SpaceLite = { id: string; title: string }

export function MoveCopySubmenu({
  mode,
  label,
  icon,
  entityType,
  entityId,
  entityName,
  sourceOrgId,
  sourceCampaignId,
  currentCampaigns = [],
  memberships,
  onSameContextCampaignSelect,
  onCloseMenus,
  className,
}: MoveCopySubmenuProps) {
  if (!CROSS_CONTEXT_MOVE_ENABLED) return null

  const instanceId = useId()
  const exclusiveCtx = useContext(MoveCopyExclusiveContext)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const nestedMenuRef = useRef<HTMLDivElement>(null)
  const contextRowRef = useRef<HTMLButtonElement | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [nestedPos, setNestedPos] = useState<{ top: number; left: number } | null>(null)
  const [hoverContext, setHoverContext] = useState<ContextTarget | null>(null)
  const [contextCampaigns, setContextCampaigns] = useState<Record<string, Campaign[]>>({})
  const transferDialog = useTransferDialog()
  const [expandSameContextCampaigns, setExpandSameContextCampaigns] = useState(false)
  const [expandContexts, setExpandContexts] = useState(false)
  const [expandNestedCampaigns, setExpandNestedCampaigns] = useState(false)
  const [spaceStep, setSpaceStep] = useState<SpaceStep | null>(null)
  const [spacesByTarget, setSpacesByTarget] = useState<Record<string, SpaceLite[]>>({})
  const [expandSpaces, setExpandSpaces] = useState(false)
  const requireSpaceTarget = entityType === 'view'

  const cancelClose = () => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => {
      setHoverContext(null)
      setNestedPos(null)
      contextRowRef.current = null
      setOpen(false)
      setSpaceStep(null)
      releaseExclusive()
    }, HOVER_CLOSE_DELAY_MS)
  }

  const placeNestedMenuBesideRow = (
    el: HTMLButtonElement | null,
    nestedEl: HTMLDivElement | null = nestedMenuRef.current,
  ) => {
    contextRowRef.current = el
    if (!el) {
      setNestedPos(null)
      return
    }
    const rect = el.getBoundingClientRect()
    const pad = 8
    const menuHeight = Math.min(
      nestedEl?.getBoundingClientRect().height ?? NESTED_MENU_MAX_H,
      NESTED_MENU_MAX_H,
    )
    let left = rect.right + 4
    let top = rect.top
    if (left + NESTED_MENU_WIDTH > window.innerWidth - pad) {
      left = rect.left - NESTED_MENU_WIDTH - 4
    }
    if (top + menuHeight > window.innerHeight - pad) {
      top = rect.bottom - menuHeight
    }
    if (top < pad) top = pad
    setNestedPos({ top, left })
  }

  useEffect(() => () => cancelClose(), [])

  useEffect(() => {
    if (!exclusiveCtx) return
    if (exclusiveCtx.activeId != null && exclusiveCtx.activeId !== instanceId && open) {
      cancelClose()
      setOpen(false)
      setHoverContext(null)
      setNestedPos(null)
      contextRowRef.current = null
    }
  }, [exclusiveCtx, exclusiveCtx?.activeId, instanceId, open])

  useEffect(() => {
    if (!open) {
      setExpandSameContextCampaigns(false)
      setExpandContexts(false)
      setExpandNestedCampaigns(false)
      setExpandSpaces(false)
      setSpaceStep(null)
    }
  }, [open])

  useEffect(() => {
    setExpandSpaces(false)
  }, [spaceStep?.orgId, spaceStep?.campaignId])

  useEffect(() => {
    if (!spaceStep) return
    const key = spaceTargetKey(spaceStep.orgId, spaceStep.campaignId)
    if (spacesByTarget[key]) return
    const params: Record<string, string> = {}
    if (spaceStep.campaignId) params.campaign_id = spaceStep.campaignId
    else params.general = '1'
    void backendGet<SpaceLite[]>(buildSpacesUrl(params), { orgId: spaceStep.orgId }).then(
      (rows) => {
        setSpacesByTarget((prev) => ({
          ...prev,
          [key]: (rows ?? []).map((r) => ({ id: r.id, title: r.title })),
        }))
      },
    )
  }, [spaceStep, spacesByTarget])

  useEffect(() => {
    setExpandNestedCampaigns(false)
  }, [hoverContext?.key])

  useEffect(() => {
    if (!open || !buttonRef.current) {
      setPos(null)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    const pad = 8
    let left = rect.right + 4
    let top = rect.top
    if (left + MENU_WIDTH > window.innerWidth - pad) left = rect.left - MENU_WIDTH - 4
    if (top + 320 > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - 320 - pad)
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const targets = buildContextTargets(sourceOrgId, memberships, mode)
    for (const context of targets) {
      if (context.orgId == null) continue
      const key = context.key
      if (contextCampaigns[key]) continue
      void backendGet<Campaign[]>('/api/campaigns', { orgId: context.orgId }).then((campaigns) => {
        setContextCampaigns((prev) => (prev[key] ? prev : { ...prev, [key]: campaigns }))
      })
    }
  }, [open, sourceOrgId, memberships, mode])

  useLayoutEffect(() => {
    if (!open || !hoverContext) return
    placeNestedMenuBesideRow(contextRowRef.current, nestedMenuRef.current)
  }, [open, hoverContext, contextCampaigns, expandNestedCampaigns])

  useEffect(() => {
    if (!open || !hoverContext) return
    const sync = () => placeNestedMenuBesideRow(contextRowRef.current, nestedMenuRef.current)
    sync()
    const panel = menuRef.current
    window.addEventListener('resize', sync)
    panel?.addEventListener('scroll', sync, { passive: true })
    return () => {
      window.removeEventListener('resize', sync)
      panel?.removeEventListener('scroll', sync)
    }
  }, [open, hoverContext])

  const contexts = buildContextTargets(sourceOrgId, memberships, mode)

  const sameContextCampaignRows =
    entityType === 'campaign'
      ? []
      : [
          { id: null, name: 'General' },
          ...currentCampaigns.map((campaign) => ({ id: campaign.id, name: campaign.name })),
        ].filter((campaign) => campaign.id !== sourceCampaignId)

  const sameContextVisible = expandSameContextCampaigns
    ? sameContextCampaignRows
    : sameContextCampaignRows.slice(0, PREVIEW_LIMIT)
  const sameContextHasMore = sameContextCampaignRows.length > PREVIEW_LIMIT

  const contextsVisible = expandContexts ? contexts : contexts.slice(0, PREVIEW_LIMIT)
  const contextsHasMore = contexts.length > PREVIEW_LIMIT

  const nestedCampaignsRaw =
    hoverContext == null
      ? []
      : hoverContext.orgId
        ? (contextCampaigns[hoverContext.key] ?? null)
        : currentCampaigns
  const nestedCampaignsLoading =
    hoverContext != null && hoverContext.orgId != null && nestedCampaignsRaw === null
  const nestedCampaignsFull = nestedCampaignsRaw ?? []
  const nestedCampaignsVisible = expandNestedCampaigns
    ? nestedCampaignsFull
    : nestedCampaignsFull.slice(0, PREVIEW_LIMIT)
  const nestedCampaignsHasMore = nestedCampaignsFull.length > PREVIEW_LIMIT

  const releaseExclusive = () => {
    if (exclusiveCtx?.activeId === instanceId) exclusiveCtx.setActiveId(null)
  }

  const dispatchTransfer = (target: TransferTarget & { spaceId?: string | null }) => {
    transferDialog.open({
      entityType,
      entityId,
      entityName,
      mode,
      targetOrgId: target.orgId,
      targetCampaignId: target.campaignId ?? undefined,
      targetSpaceId: target.spaceId ?? undefined,
      onComplete: () => {
        window.location.reload()
      },
    })
    setOpen(false)
    setHoverContext(null)
    setNestedPos(null)
    contextRowRef.current = null
    setSpaceStep(null)
    releaseExclusive()
    onCloseMenus()
  }

  const openTransfer = (target: TransferTarget, anchor?: HTMLElement | null) => {
    if (requireSpaceTarget) {
      const rect = anchor?.getBoundingClientRect()
      const pad = 8
      const w = NESTED_MENU_WIDTH
      let left = rect ? rect.right + 4 : 0
      let top = rect ? rect.top : 0
      if (rect && left + w > window.innerWidth - pad) left = Math.max(pad, rect.left - w - 4)
      if (rect) {
        const estH = NESTED_MENU_MAX_H
        if (top + estH > window.innerHeight - pad) top = rect.bottom - estH
        if (top < pad) top = pad
      }
      setSpaceStep({
        orgId: target.orgId,
        campaignId: target.campaignId ?? null,
        label: target.label,
        pos: { top, left },
      })
      return
    }
    dispatchTransfer(target)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={className}
        onMouseEnter={() => {
          cancelClose()
          exclusiveCtx?.setActiveId(instanceId)
          setOpen(true)
        }}
        onMouseLeave={scheduleClose}
        onClick={() =>
          setOpen((value) => {
            const next = !value
            if (next) {
              exclusiveCtx?.setActiveId(instanceId)
            } else {
              if (exclusiveCtx?.activeId === instanceId) exclusiveCtx.setActiveId(null)
            }
            return next
          })
        }
      >
        {icon}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
      </button>

      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}
              className="dropdown-menu-solid fixed flex max-h-[320px] w-[224px] flex-col overflow-y-auto rounded-xl py-1"
              style={{ top: pos.top, left: pos.left, zIndex: 100002 }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              {sameContextCampaignRows.length > 0 ? (
                <>
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Campaigns
                  </p>
                  <div className="flex flex-col">
                    {sameContextVisible.map((campaign) => (
                      <button
                        key={campaign.id ?? 'top-level'}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                        onClick={(e) => {
                          if (onSameContextCampaignSelect && !requireSpaceTarget) {
                            void onSameContextCampaignSelect(campaign.id)
                            onCloseMenus()
                            setOpen(false)
                            setHoverContext(null)
                            setNestedPos(null)
                            contextRowRef.current = null
                            releaseExclusive()
                            return
                          }
                          openTransfer(
                            {
                              orgId: sourceOrgId,
                              campaignId: campaign.id,
                              label: campaign.name,
                            },
                            e.currentTarget,
                          )
                        }}
                      >
                        <FolderKanban className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                        <span className="min-w-0 flex-1 truncate">{campaign.name}</span>
                      </button>
                    ))}
                    {sameContextHasMore && !expandSameContextCampaigns ? (
                      <button
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
                        onMouseEnter={cancelClose}
                        onClick={() => setExpandSameContextCampaigns(true)}
                      >
                        More
                      </button>
                    ) : null}
                  </div>
                  <div className="my-1 h-px bg-[var(--color-border)]" />
                </>
              ) : null}

              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Personal / Orgs
              </p>
              <div className="flex flex-col">
                {contextsVisible.map((context) => (
                  <button
                    key={context.key}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                    onMouseEnter={(e) => {
                      cancelClose()
                      setHoverContext(context)
                      placeNestedMenuBesideRow(e.currentTarget)
                    }}
                    onFocus={(e) => {
                      setHoverContext(context)
                      placeNestedMenuBesideRow(e.currentTarget)
                    }}
                  >
                    {context.orgId ? (
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                    ) : (
                      <User className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{context.label}</span>
                    <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                  </button>
                ))}
                {contextsHasMore && !expandContexts ? (
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
                    onMouseEnter={cancelClose}
                    onClick={() => setExpandContexts(true)}
                  >
                    More
                  </button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      {open && hoverContext && nestedPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={nestedMenuRef}
              {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}
              className="dropdown-menu-solid fixed flex max-h-[320px] w-[240px] flex-col overflow-y-auto rounded-xl py-1"
              style={{ top: nestedPos.top, left: nestedPos.left, zIndex: 100003 }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="flex flex-col">
                {nestedCampaignsLoading ? (
                  <p className="px-3 py-1.5 text-sm text-[var(--color-muted-foreground)]">
                    Loading…
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                      onClick={(e) =>
                        openTransfer(
                          {
                            orgId: hoverContext.orgId,
                            campaignId: null,
                            label: `${hoverContext.label} / General`,
                          },
                          e.currentTarget,
                        )
                      }
                    >
                      <FolderKanban className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                      <span className="min-w-0 flex-1 truncate">General</span>
                    </button>
                    {nestedCampaignsVisible.map((campaign) => (
                      <button
                        key={campaign.id}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                        onClick={(e) =>
                          openTransfer(
                            {
                              orgId: hoverContext.orgId,
                              campaignId: campaign.id,
                              label: campaign.name,
                            },
                            e.currentTarget,
                          )
                        }
                      >
                        <FolderKanban className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                        <span className="min-w-0 flex-1 truncate">{campaign.name}</span>
                      </button>
                    ))}
                    {nestedCampaignsHasMore && !expandNestedCampaigns ? (
                      <button
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
                        onMouseEnter={cancelClose}
                        onClick={() => setExpandNestedCampaigns(true)}
                      >
                        More
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {open && spaceStep && typeof document !== 'undefined'
        ? (() => {
            const key = spaceTargetKey(spaceStep.orgId, spaceStep.campaignId)
            const all = spacesByTarget[key]
            const visible = all == null ? null : expandSpaces ? all : all.slice(0, PREVIEW_LIMIT)
            const hasMore = all != null && all.length > PREVIEW_LIMIT
            return createPortal(
              <div
                {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}
                className="dropdown-menu-solid fixed flex max-h-[320px] w-[240px] flex-col overflow-y-auto rounded-xl py-1"
                style={{ top: spaceStep.pos.top, left: spaceStep.pos.left, zIndex: 100004 }}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
              >
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Spaces
                </p>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                  onClick={() =>
                    dispatchTransfer({
                      orgId: spaceStep.orgId,
                      campaignId: spaceStep.campaignId,
                      label: `${spaceStep.label} / New space`,
                    })
                  }
                >
                  <FolderPlus className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="min-w-0 flex-1 truncate">New space</span>
                </button>
                <div className="my-1 h-px bg-[var(--color-border)]" />
                {visible == null ? (
                  <p className="px-3 py-1.5 text-sm text-[var(--color-muted-foreground)]">
                    Loading...
                  </p>
                ) : visible.length === 0 ? (
                  <p className="px-3 py-1.5 text-sm text-[var(--color-muted-foreground)]">
                    No spaces yet
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {visible.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
                        onClick={() =>
                          dispatchTransfer({
                            orgId: spaceStep.orgId,
                            campaignId: spaceStep.campaignId,
                            spaceId: s.id,
                            label: `${spaceStep.label} / ${s.title}`,
                          })
                        }
                      >
                        <FolderTree className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                        <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      </button>
                    ))}
                    {hasMore && !expandSpaces ? (
                      <button
                        type="button"
                        className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
                        onMouseEnter={cancelClose}
                        onClick={() => setExpandSpaces(true)}
                      >
                        More
                      </button>
                    ) : null}
                  </div>
                )}
              </div>,
              document.body,
            )
          })()
        : null}
    </>
  )
}

function spaceTargetKey(orgId: string | null, campaignId: string | null): string {
  return `${orgId ?? 'self'}:${campaignId ?? 'general'}`
}

function buildSpacesUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString()
  return `/api/spaces?${search}`
}

function buildContextTargets(
  sourceOrgId: string | null,
  memberships: OrgMembership[],
  mode: TransferMode,
): ContextTarget[] {
  const targets: ContextTarget[] = []
  if (sourceOrgId !== null && canTransferAcrossContext(mode, sourceOrgId, null, memberships)) {
    targets.push({ key: 'personal', orgId: null, label: 'Personal' })
  }
  for (const membership of memberships) {
    if (membership.status !== 'active') continue
    if (membership.org_id === sourceOrgId) continue
    if (!canTransferAcrossContext(mode, sourceOrgId, membership.org_id, memberships)) continue
    targets.push({
      key: membership.org_id,
      orgId: membership.org_id,
      label: membership.organizations.name,
    })
  }
  return targets
}
