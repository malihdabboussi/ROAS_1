'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { assignConversationScope, CONVERSATION_ACTIONS_TOAST_ERRORS } from '@/lib/conversations'
import { useCampaignCacheVersion } from '@/lib/home'
import { useOrgStore } from '@/lib/org'
import { fetchSpaces } from '@/lib/spaces'
import { positionFloatingMenuFromAnchorRect } from '@/lib/ui'
import { groupScopeCampaignsByProgram } from './conversation-scope-groups'
import {
  CONVERSATION_SCOPE_MENU_HEIGHT_CAP,
  CONVERSATION_SCOPE_MENU_HEIGHT_MIN,
  CONVERSATION_SCOPE_MENU_WIDTH,
  CONVERSATION_SCOPE_VIEWPORT_MARGIN,
  conversationScopeDisplayLabel,
  findConversationScopeSpace,
  placeSpacesMenuFromRowRect,
  readConversationSpaceId,
  type ConversationScopeMenuGeom,
  type ConversationScopePickerHandle,
  type ConversationScopePickerProps,
  type ConversationScopeSpace,
} from './conversation-scope-picker-layout'
import { ConversationScopePickerMenus } from './ConversationScopePickerMenus'
import { ConversationScopeTrigger } from './ConversationScopeTrigger'
import {
  useConversationScopeCampaigns,
  useConversationScopeFallbackSpace,
  useConversationScopePrograms,
} from './use-conversation-scope-data'

export type { ConversationScopePickerHandle } from './conversation-scope-picker-layout'

export const ConversationScopePicker = forwardRef<
  ConversationScopePickerHandle,
  ConversationScopePickerProps
>(function ConversationScopePicker(props, ref) {
  const {
    conversation,
    campaignId,
    spaceId,
    showLabel = false,
    compact = false,
    onConversationUpdated,
    onScopeChanged,
    onOpenCampaign,
    bannerAnchorRef,
    hideTrigger = false,
    allowClear = false,
  } = props
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const cacheVersion = useCampaignCacheVersion()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [menuLayout, setMenuLayout] = useState<{
    campaign: ConversationScopeMenuGeom
    spaces: ConversationScopeMenuGeom | null
  } | null>(null)
  const campaigns = useConversationScopeCampaigns(activeOrgId, cacheVersion)
  const programs = useConversationScopePrograms(activeOrgId)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [spacesByCampaign, setSpacesByCampaign] = useState<
    Record<string, ConversationScopeSpace[]>
  >({})
  const [loadingCampaignId, setLoadingCampaignId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const openFromBannerRef = useRef(false)
  const campaignMenuRef = useRef<HTMLDivElement>(null)
  const spacesMenuRef = useRef<HTMLDivElement>(null)
  const [hoverRowEl, setHoverRowEl] = useState<HTMLElement | null>(null)
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
  const measureMenus = useCallback(() => {
    if (!open || !mounted) return
    const fromBanner = openFromBannerRef.current
    const btn = fromBanner ? (bannerAnchorRef?.current ?? buttonRef.current) : buttonRef.current
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    const measured = campaignMenuRef.current?.offsetHeight
    const menuHeightForPlacement = Math.min(
      Math.max(measured && measured > 0 ? measured : 0, CONVERSATION_SCOPE_MENU_HEIGHT_MIN),
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

  const selectedCampaignId = conversation ? conversation.campaign_id : (campaignId ?? null)
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null
  const generalCampaign = campaigns.find((campaign) => campaign.config?.system_kind === 'general')

  const selectedSpaceId = conversation ? readConversationSpaceId(conversation) : (spaceId ?? null)
  const fallbackSpace = useConversationScopeFallbackSpace({
    activeOrgId,
    selectedCampaignId,
    selectedSpaceId,
    spacesByCampaign,
  })
  const selectedSpace =
    findConversationScopeSpace(spacesByCampaign, selectedSpaceId) ?? fallbackSpace

  const selectedName = conversationScopeDisplayLabel({
    campaignName: selectedCampaign?.name,
    spaceTitle: selectedSpace?.title,
    campaignId: selectedCampaignId,
    spaceId: selectedSpaceId,
    emptyLabel: allowClear ? 'All' : 'General',
  })
  const label = selectedSpace
    ? selectedCampaign
      ? `${selectedCampaign.name} / ${selectedSpace.title}`
      : selectedSpace.title
    : selectedName
  const displayLabel = compact ? selectedName : label

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
          setSpacesByCampaign((prev) => ({
            ...prev,
            [campaignId]: [...rows].sort((a, b) =>
              a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
            ),
          }))
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
    if (!selectedCampaignId || !selectedSpaceId) return
    loadSpacesForCampaign(selectedCampaignId)
  }, [selectedCampaignId, selectedSpaceId, loadSpacesForCampaign])

  const handleSelectScope = useCallback(
    async (nextCampaignId: string | null, nextSpaceId: string | null) => {
      if (saving) return
      setSaving(true)
      try {
        if (conversation) {
          const updated = await assignConversationScope(
            conversation.id,
            nextCampaignId,
            nextSpaceId,
          )
          onConversationUpdated?.(updated)
        }
        const campaignName =
          nextCampaignId == null
            ? null
            : (campaigns.find((campaign) => campaign.id === nextCampaignId)?.name ?? null)
        const spaceTitle =
          nextSpaceId == null
            ? null
            : (findConversationScopeSpace(spacesByCampaign, nextSpaceId)?.title ??
              (fallbackSpace?.id === nextSpaceId ? fallbackSpace.title : null))
        onScopeChanged?.({
          campaignId: nextCampaignId,
          spaceId: nextSpaceId,
          campaignName,
          spaceTitle,
        })
        setOpen(false)
      } catch (error) {
        console.error('Move conversation scope failed:', error)
        toast.error(CONVERSATION_ACTIONS_TOAST_ERRORS.MOVE_CONVERSATION_FAILED.userMessage)
      } finally {
        setSaving(false)
      }
    },
    [
      campaigns,
      conversation,
      fallbackSpace,
      onConversationUpdated,
      onScopeChanged,
      saving,
      spacesByCampaign,
    ],
  )

  const activeSpaces = activeCampaignId ? spacesByCampaign[activeCampaignId] : undefined
  const listedCampaigns = campaigns.filter((campaign) => campaign.id !== generalCampaign?.id)
  const campaignGroups =
    programs.length > 0
      ? groupScopeCampaignsByProgram(listedCampaigns, programs)
      : [{ key: 'all', label: '', campaigns: listedCampaigns }]

  const portalMenus =
    mounted &&
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <ConversationScopePickerMenus
        campaignMenuRef={campaignMenuRef}
        spacesMenuRef={spacesMenuRef}
        menuLayout={menuLayout}
        campaignGroups={campaignGroups}
        generalCampaign={generalCampaign}
        selectedCampaignId={selectedCampaignId}
        selectedSpaceId={selectedSpaceId}
        activeCampaignId={activeCampaignId}
        loadingCampaignId={loadingCampaignId}
        activeSpaces={activeSpaces}
        allowClear={allowClear}
        onSelectAll={allowClear ? () => void handleSelectScope(null, null) : undefined}
        onSelectGeneral={() => void handleSelectScope(generalCampaign?.id ?? null, null)}
        onSelectCampaign={(campaignId) => void handleSelectScope(campaignId, null)}
        onOpenCampaignSpaces={(campaignId, row) => {
          setHoverRowEl(row)
          loadSpacesForCampaign(campaignId)
        }}
        onSelectSpace={(campaignId, spaceId) => void handleSelectScope(campaignId, spaceId)}
      />,
      document.body,
    )

  return (
    <div className="relative">
      {hideTrigger ? null : (
        <ConversationScopeTrigger
          buttonRef={buttonRef}
          label={displayLabel}
          open={open}
          saving={saving}
          showLabel={showLabel}
          compact={compact}
          tooltipLabel={label}
          campaignId={selectedCampaignId}
          onOpenCampaign={
            selectedCampaignId && onOpenCampaign
              ? () => onOpenCampaign(selectedCampaignId)
              : undefined
          }
          onToggle={() =>
            setOpen((prev) => {
              const next = !prev
              if (next) openFromBannerRef.current = false
              return next
            })
          }
        />
      )}
      {portalMenus}
    </div>
  )
})
