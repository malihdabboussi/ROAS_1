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
import { useCampaignCacheVersion } from '@/lib/home'
import { useOrgStore } from '@/lib/org'
import { isHiddenClientGeneralSpace } from '@/lib/spaces/page-grader-client-general-space'
import { positionFloatingMenuFromAnchorRect } from '@/lib/ui'
import { applyConversationScopePickerSelection } from './conversation-scope-add'
import {
  buildConversationScopeLists,
  filterScopeClients,
  programNameForCampaign,
} from './conversation-scope-groups'
import {
  CONVERSATION_SCOPE_MENU_HEIGHT_CAP,
  CONVERSATION_SCOPE_MENU_HEIGHT_MIN,
  CONVERSATION_SCOPE_MENU_WIDTH,
  CONVERSATION_SCOPE_VIEWPORT_MARGIN,
  conversationScopeDisplayLabel,
  findConversationScopeSpace,
  placeSpacesMenuFromRowRect,
  readConversationSpaceId,
  sameConversationScopeMenuLayout,
  type ConversationScopeMenuGeom,
  type ConversationScopePickerHandle,
  type ConversationScopePickerProps,
} from './conversation-scope-picker-layout'
import { isGeneralLabel } from './conversation-scope-sort'
import {
  ConversationScopePickerMenus,
  type ConversationScopeSubmenu,
} from './ConversationScopePickerMenus'
import { ConversationScopeTrigger } from './ConversationScopeTrigger'
import {
  useConversationScopeCampaigns,
  useConversationScopeFallbackCampaign,
  useConversationScopeFallbackSpace,
  useConversationScopePrograms,
} from './use-conversation-scope-data'
import { useConversationScopeSpaces } from './use-conversation-scope-spaces'

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
    selectionMode = 'replace',
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
  const [submenu, setSubmenu] = useState<ConversationScopeSubmenu | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const { spacesByCampaign, loadingCampaignId, fetchSpacesForCampaign, resolveGeneralSpaceId } =
    useConversationScopeSpaces(activeOrgId)
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
    if (!open) {
      setSubmenu(null)
      setClientSearch('')
    }
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
    if (submenu && hoverRowEl) {
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
    setMenuLayout((prev) =>
      sameConversationScopeMenuLayout(prev, campaignGeom, spacesGeom)
        ? prev
        : { campaign: campaignGeom, spaces: spacesGeom },
    )
  }, [open, mounted, submenu, hoverRowEl, bannerAnchorRef])

  useLayoutEffect(() => {
    if (!open) {
      setMenuLayout((prev) => (prev == null ? prev : null))
      openFromBannerRef.current = false
      setHoverRowEl((prev) => (prev == null ? prev : null))
      return
    }
    if (!mounted) return
    measureMenus()
  }, [open, mounted, submenu, hoverRowEl, measureMenus, clientSearch])

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

  const selectedCampaignIdFromProps = conversation ? conversation.campaign_id : (campaignId ?? null)
  const selectedSpaceId = conversation ? readConversationSpaceId(conversation) : (spaceId ?? null)
  const fallbackSpace = useConversationScopeFallbackSpace({
    activeOrgId,
    selectedCampaignId: selectedCampaignIdFromProps,
    selectedSpaceId,
    spacesByCampaign,
  })
  const selectedSpace =
    findConversationScopeSpace(spacesByCampaign, selectedSpaceId) ?? fallbackSpace
  const selectedCampaignId = selectedCampaignIdFromProps ?? selectedSpace?.campaign_id ?? null
  const fallbackCampaign = useConversationScopeFallbackCampaign(selectedCampaignId, campaigns)
  const selectedCampaign =
    campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? fallbackCampaign
  const generalCampaign = campaigns.find((campaign) => campaign.config?.system_kind === 'general')

  const selectedProgramName = programNameForCampaign(selectedCampaign, programs)
  const selectedName = conversationScopeDisplayLabel({
    campaignName: selectedCampaign?.name,
    spaceTitle: selectedSpace?.title,
    programName: selectedProgramName,
    campaignId: selectedCampaignId,
    spaceId: selectedSpaceId,
    emptyLabel: allowClear ? 'All' : 'General',
  })
  const label =
    selectedSpace && selectedCampaign && !isGeneralLabel(selectedSpace.title)
      ? `${selectedCampaign.name} / ${selectedSpace.title}`
      : selectedName
  const displayLabel = compact ? selectedName : label

  useEffect(() => {
    if (!selectedCampaignId || !selectedSpaceId) return
    fetchSpacesForCampaign(selectedCampaignId)
  }, [selectedCampaignId, selectedSpaceId, fetchSpacesForCampaign])

  const handleSelectScope = useCallback(
    async (nextCampaignId: string | null, nextSpaceId: string | null) => {
      if (saving) return
      setSaving(true)
      try {
        await applyConversationScopePickerSelection({
          selectionMode,
          conversation,
          nextCampaignId,
          nextSpaceId,
          resolveGeneralSpaceId,
          campaigns,
          programs,
          spacesByCampaign,
          fallbackSpace,
          onConversationUpdated,
          onScopeChanged,
        })
        setOpen(false)
      } catch {
        // Toast is owned by applyConversationScopePickerSelection.
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
      programs,
      resolveGeneralSpaceId,
      saving,
      selectionMode,
      spacesByCampaign,
    ],
  )

  const listedCampaigns = campaigns.filter((campaign) => campaign.id !== generalCampaign?.id)
  const scopeLists = useMemo(
    () => buildConversationScopeLists(listedCampaigns, programs),
    [listedCampaigns, programs],
  )
  const visibleClients = filterScopeClients(scopeLists.clients, clientSearch)
  const submenuCampaign =
    submenu?.type === 'spaces'
      ? (campaigns.find((campaign) => campaign.id === submenu.campaignId) ?? null)
      : null
  const activeSpaces = submenu?.type === 'spaces' ? spacesByCampaign[submenu.campaignId] : undefined
  const visibleSpaces = activeSpaces?.filter(
    (space) => !isHiddenClientGeneralSpace(space, submenuCampaign),
  )
  const programCampaigns =
    submenu?.type === 'program'
      ? (scopeLists.programs.find((program) => program.id === submenu.programId)?.campaigns ?? [])
      : []

  const portalMenus =
    mounted &&
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <ConversationScopePickerMenus
        campaignMenuRef={campaignMenuRef}
        spacesMenuRef={spacesMenuRef}
        menuLayout={menuLayout}
        programs={scopeLists.programs}
        ungroupedCampaigns={scopeLists.ungroupedCampaigns}
        clients={visibleClients}
        clientSearch={clientSearch}
        onClientSearchChange={setClientSearch}
        generalCampaign={generalCampaign}
        selectedCampaignId={selectedCampaignId}
        selectedSpaceId={selectedSpaceId}
        submenu={submenu}
        loadingCampaignId={loadingCampaignId}
        programCampaigns={programCampaigns}
        activeSpaces={visibleSpaces}
        allowClear={allowClear}
        onSelectAll={allowClear ? () => void handleSelectScope(null, null) : undefined}
        onSelectGeneral={() => void handleSelectScope(generalCampaign?.id ?? null, null)}
        onSelectCampaign={(nextCampaignId) => void handleSelectScope(nextCampaignId, null)}
        onOpenProgram={(programId, row) => {
          setHoverRowEl((prev) => (prev === row ? prev : row))
          setSubmenu((prev) =>
            prev?.type === 'program' && prev.programId === programId
              ? prev
              : { type: 'program', programId },
          )
        }}
        onOpenClients={(row) => {
          setHoverRowEl((prev) => (prev === row ? prev : row))
          setSubmenu((prev) => (prev?.type === 'clients' ? prev : { type: 'clients' }))
        }}
        onOpenCampaignSpaces={(nextCampaignId, row) => {
          // Keep the Clients-folder anchor when drilling client → spaces so the
          // flyout does not jump after the client row unmounts.
          if (submenu?.type !== 'clients') {
            setHoverRowEl((prev) => (prev === row ? prev : row))
          }
          setSubmenu((prev) =>
            prev?.type === 'spaces' && prev.campaignId === nextCampaignId
              ? prev
              : { type: 'spaces', campaignId: nextCampaignId },
          )
          fetchSpacesForCampaign(nextCampaignId)
        }}
        onSelectSpace={(nextCampaignId, nextSpaceId) =>
          void handleSelectScope(nextCampaignId, nextSpaceId)
        }
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
