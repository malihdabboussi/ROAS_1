'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, Layers, Loader2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { campaignListCacheKey, fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  assignConversationCampaign,
  assignConversationSpace,
} from '@/lib/conversations'
import {
  getCachedCampaigns,
  prefetchOrgCampaigns,
  useCampaignCacheVersion,
} from '@/lib/home'
import { useOrgStore } from '@/lib/org'
import { fetchSpaces } from '@/lib/spaces'
import {
  CONVERSATION_SCOPE_MENU_HEIGHT_CAP,
  CONVERSATION_SCOPE_MENU_HEIGHT_MIN,
  CONVERSATION_SCOPE_MENU_WIDTH,
  CONVERSATION_SCOPE_VIEWPORT_MARGIN,
  placeSpacesMenuFromRowRect,
  readConversationSpaceId,
  type ConversationScopeMenuGeom,
  type ConversationScopePickerHandle,
  type ConversationScopePickerProps,
  type ConversationScopeSpace,
} from './conversation-scope-picker-layout'
import { positionFloatingMenuFromAnchorRect } from '@/lib/ui'

export type { ConversationScopePickerHandle } from './conversation-scope-picker-layout'

export const ConversationScopePicker = forwardRef<ConversationScopePickerHandle, ConversationScopePickerProps>(
  function ConversationScopePicker({ conversation, onConversationUpdated, bannerAnchorRef }, ref) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const cacheVersion = useCampaignCacheVersion()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuLayout, setMenuLayout] = useState<{
    campaign: ConversationScopeMenuGeom
    spaces: ConversationScopeMenuGeom | null
  } | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [spacesByCampaign, setSpacesByCampaign] =
    useState<Record<string, ConversationScopeSpace[]>>({})
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const buttonRef = useRef<HTMLButtonElement>(null)
  /** When true, menu anchors to `bannerAnchorRef`; when false, to footer trigger `buttonRef`. */
  const openFromBannerRef = useRef(false)
  const campaignMenuRef = useRef<HTMLDivElement>(null)
  const spacesMenuRef = useRef<HTMLDivElement>(null)
  const [hoverRowEl, setHoverRowEl] = useState<HTMLButtonElement | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      openMenuFromBanner: () => {
        openFromBannerRef.current = true
        setOpen(true)
      },
    }),
    [],
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) setActiveCampaignId(null)
  }, [open])

  useEffect(() => {
    let cancelled = false

    if (activeOrgId) {
      const cached = getCachedCampaigns(activeOrgId)
      if (cached) setCampaigns(cached)
      void prefetchOrgCampaigns(activeOrgId)
        .then((rows) => {
          if (!cancelled) setCampaigns(rows)
        })
        .catch(() => {
          if (!cancelled) setCampaigns(cached ?? [])
        })
    } else {
      void cachedFetch(campaignListCacheKey(null), () => fetchCampaigns({ orgId: null }), {
        ttlMs: 60_000,
      })
        .then((rows) => {
          if (!cancelled) setCampaigns(rows)
        })
        .catch(() => {
          if (!cancelled) setCampaigns([])
        })
    }

    return () => {
      cancelled = true
    }
  }, [activeOrgId, cacheVersion])

  const measureMenus = useCallback(() => {
    if (!open || !mounted) return
    const fromBanner = openFromBannerRef.current
    const btn = fromBanner ? (bannerAnchorRef?.current ?? buttonRef.current) : buttonRef.current
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    const measured = campaignMenuRef.current?.offsetHeight
    const menuHeightForPlacement = Math.min(
      Math.max(
        measured && measured > 0 ? measured : 0,
        CONVERSATION_SCOPE_MENU_HEIGHT_MIN,
      ),
      CONVERSATION_SCOPE_MENU_HEIGHT_CAP,
    )
    const pos = positionFloatingMenuFromAnchorRect(rect, {
      menuWidth: CONVERSATION_SCOPE_MENU_WIDTH,
      menuHeight: menuHeightForPlacement,
      gap: CONVERSATION_SCOPE_VIEWPORT_MARGIN,
      viewportMargin: CONVERSATION_SCOPE_VIEWPORT_MARGIN,
    })
    const maxHeight = Math.min(
      CONVERSATION_SCOPE_MENU_HEIGHT_CAP,
      Math.max(
        CONVERSATION_SCOPE_MENU_HEIGHT_MIN,
        window.innerHeight - CONVERSATION_SCOPE_VIEWPORT_MARGIN - pos.top,
      ),
    )
    const campaignGeom: ConversationScopeMenuGeom = { top: pos.top, left: pos.left, maxHeight }

    let spacesGeom: ConversationScopeMenuGeom | null = null
    if (activeCampaignId && hoverRowEl) {
      const measuredSub = spacesMenuRef.current?.offsetHeight
      const subPlacementH = Math.min(
        CONVERSATION_SCOPE_MENU_HEIGHT_CAP,
        Math.max(
          measuredSub && measuredSub > 0 ? measuredSub : 0,
          CONVERSATION_SCOPE_MENU_HEIGHT_MIN,
        ),
      )
      spacesGeom = placeSpacesMenuFromRowRect(hoverRowEl.getBoundingClientRect(), subPlacementH)
    }
    setMenuLayout({ campaign: campaignGeom, spaces: spacesGeom })
  }, [open, mounted, activeCampaignId, hoverRowEl, bannerAnchorRef])

  useLayoutEffect(() => {
    if (!open) {
      setMenuLayout(null)
      openFromBannerRef.current = false
      setHoverRowEl(null)
      return
    }
    if (!mounted) return
    measureMenus()
  }, [
    open,
    mounted,
    activeCampaignId,
    hoverRowEl,
    measureMenus,
    campaigns.length,
    loadingCampaignId,
  ])

  useEffect(() => {
    if (!open) return
    const onResize = () => measureMenus()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open, measureMenus])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (campaignMenuRef.current?.contains(t)) return
      if (spacesMenuRef.current?.contains(t)) return
      if (buttonRef.current?.contains(t)) return
      if (bannerAnchorRef?.current?.contains(t)) return
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
  }, [open, bannerAnchorRef])

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === conversation?.campaign_id) ?? null,
    [campaigns, conversation?.campaign_id],
  )

  const selectedSpaceId = readConversationSpaceId(conversation)
  const selectedSpace = useMemo(() => {
    if (!selectedSpaceId) return null
    for (const spaces of Object.values(spacesByCampaign)) {
      const match = spaces.find((space) => space.id === selectedSpaceId)
      if (match) return match
    }
    return null
  }, [selectedSpaceId, spacesByCampaign])

  const label =
    selectedCampaign && selectedSpace
      ? `${selectedCampaign.name ?? 'Campaign'} / ${selectedSpace.title}`
      : 'Add to campaign + space'

  const loadSpacesForCampaign = useCallback(
    (campaignId: string) => {
      setActiveCampaignId(campaignId)
      if (spacesByCampaign[campaignId]) return
      setLoadingCampaignId(campaignId)
      void fetchSpaces<ConversationScopeSpace>(
        { campaign_id: campaignId, limit: 50 },
        activeOrgId ? { orgId: activeOrgId } : { orgId: null },
      )
        .then((rows) => {
          setSpacesByCampaign((prev) => ({ ...prev, [campaignId]: rows }))
        })
        .catch(() => {
          setSpacesByCampaign((prev) => ({ ...prev, [campaignId]: [] }))
        })
        .finally(() => {
          setLoadingCampaignId((current) => (current === campaignId ? null : current))
        })
    },
    [activeOrgId, spacesByCampaign],
  )

  useEffect(() => {
    if (!conversation?.campaign_id || !selectedSpaceId) return
    loadSpacesForCampaign(conversation.campaign_id)
  }, [conversation?.campaign_id, selectedSpaceId, loadSpacesForCampaign])

  const handleSelectSpace = useCallback(
    async (campaignId: string, spaceId: string) => {
      if (!conversation || saving) return
      setSaving(true)
      try {
        const campaignUpdated = await assignConversationCampaign(conversation.id, campaignId)
        const spaceUpdated = await assignConversationSpace(conversation.id, spaceId)
        onConversationUpdated({
          ...campaignUpdated,
          ...spaceUpdated,
          campaign_id: campaignId,
          metadata: {
            ...(campaignUpdated.metadata ?? {}),
            ...(spaceUpdated.metadata ?? {}),
            space_id: spaceId,
          },
        })
        setOpen(false)
      } finally {
        setSaving(false)
      }
    },
    [conversation, onConversationUpdated, saving],
  )

  const activeSpaces = activeCampaignId ? spacesByCampaign[activeCampaignId] : undefined

  const portalMenus =
    mounted &&
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        <div
          ref={campaignMenuRef}
          className="dropdown-menu-solid z-dropdown fixed flex flex-col overflow-hidden py-1"
          style={{
            top: menuLayout?.campaign.top ?? 0,
            left: menuLayout?.campaign.left ?? 0,
            width: CONVERSATION_SCOPE_MENU_WIDTH,
            maxHeight: menuLayout?.campaign.maxHeight ?? 420,
            visibility: menuLayout ? 'visible' : 'hidden',
          }}
        >
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {campaigns.map((campaign) => {
              const selected = campaign.id === conversation?.campaign_id
              return (
                <button
                  key={campaign.id}
                  type="button"
                  className="body-3 hover:bg-hover-subtle text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
                  onMouseEnter={(e) => {
                    setHoverRowEl(e.currentTarget)
                    loadSpacesForCampaign(campaign.id)
                  }}
                  onFocus={(e) => {
                    setHoverRowEl(e.currentTarget)
                    loadSpacesForCampaign(campaign.id)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {campaign.name ?? 'Untitled campaign'}
                  </span>
                  {selected ? <Check className="icon-xs shrink-0" aria-hidden /> : null}
                  <ChevronRight className="icon-xs text-muted-foreground shrink-0" aria-hidden />
                </button>
              )
            })}
          </div>
        </div>
        {activeCampaignId && menuLayout?.spaces ? (
          <div
            ref={spacesMenuRef}
            className="dropdown-menu-solid z-dropdown fixed flex flex-col overflow-hidden py-1"
            style={{
              top: menuLayout.spaces.top,
              left: menuLayout.spaces.left,
              width: CONVERSATION_SCOPE_MENU_WIDTH,
              maxHeight: menuLayout.spaces.maxHeight,
            }}
          >
            {loadingCampaignId === activeCampaignId ? (
              <div className="body-3 text-muted-foreground flex items-center gap-2 px-3 py-2">
                <Loader2 className="icon-xs animate-spin" aria-hidden />
                Loading spaces...
              </div>
            ) : activeSpaces && activeSpaces.length > 0 ? (
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
                {activeSpaces.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    className="body-3 hover:bg-hover-subtle text-foreground flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors"
                    onClick={() => void handleSelectSpace(activeCampaignId, space.id)}
                  >
                    <span className="min-w-0 flex-1 truncate">{space.title}</span>
                    {selectedSpaceId === space.id ? (
                      <Check className="icon-xs shrink-0" aria-hidden />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="body-3 text-muted-foreground px-3 py-2">No spaces here yet</div>
            )}
          </div>
        ) : null}
      </>,
      document.body,
    )

  return (
    <div className="relative">
      <Tooltip label={label}>
        <button
          ref={buttonRef}
          type="button"
          className="text-muted-foreground hover:text-foreground -ml-spacing-0-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          onClick={() =>
            setOpen((prev) => {
              const next = !prev
              if (next) openFromBannerRef.current = false
              return next
            })
          }
          disabled={!conversation || saving}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={label}
        >
          <Layers className="icon-sm" aria-hidden />
        </button>
      </Tooltip>
      {portalMenus}
    </div>
  )
})
