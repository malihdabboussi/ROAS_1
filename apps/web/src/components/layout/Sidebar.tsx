'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { useShellPrefsHydrated } from '@/components/shell/use-shell-prefs-hydrated'
import { useShellStore } from '@/components/shell/use-shell-store'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { StudioSearchModal } from '@/features/studio/components/StudioSearchModal'
import { FeatureUpdateDetailModal } from '@/features/updates/components/FeatureUpdateDetailModal'
import { FeatureUpdatesPanel } from '@/features/updates/components/FeatureUpdatesPanel'
import { useFeatureUpdates } from '@/features/updates/hooks/useFeatureUpdates'
import type { FeatureUpdate } from '@/features/updates/types'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { createProgram, invalidateProgramsListCache } from '@/lib/programs'
import { DeleteCampaignDialog } from './DeleteCampaignDialog'
import { NewCampaignModal } from './NewCampaignModal'
import { NewProgramModal } from './NewProgramModal'
import type { SidebarCampaignRow, SidebarProps } from './sidebar/sidebar-types'
import { SidebarHqSection } from './sidebar/SidebarHqSection'
import { SidebarStudioFooter } from './sidebar/SidebarStudioFooter'
import { SidebarStudioHeader } from './sidebar/SidebarStudioHeader'
import { SidebarStudioSection } from './sidebar/SidebarStudioSection'
import { useSidebarController } from './sidebar/useSidebarController'

export type { SidebarProps } from './sidebar/sidebar-types'

export function Sidebar(props: SidebarProps) {
  const c = useSidebarController(props)
  const shellPrefsHydrated = useShellPrefsHydrated()
  const sidebarPinnedRaw = useShellStore((s) => s.sidebarPinned)
  const sidebarPeekRaw = useShellStore((s) => s.sidebarPeek)
  const desktop = useMediaQuery('(min-width: 768px)')
  const sidebarPinned = shellPrefsHydrated ? sidebarPinnedRaw : false
  const sidebarPeek = shellPrefsHydrated ? sidebarPeekRaw : false
  const savedMenuDock = useShellMenuDock((state) => state.dock)
  const menuDock = shellPrefsHydrated && desktop ? savedMenuDock : 'left'
  // Menu pin/peek still works while AI chat is open — drawer sits beside the rail.
  const hqDesktopWidth =
    c.sidebarMode === 'hq'
      ? menuDock === 'top' || menuDock === 'bottom'
        ? 'md:w-full'
        : sidebarPinned
          ? 'md:w-[272px]'
          : 'md:w-[72px]'
      : c.desktopWidth
  const hqPeeking = c.sidebarMode === 'hq' && sidebarPeek && !sidebarPinned
  const {
    updates: featureUpdateRows,
    loading: featureUpdatesLoading,
    hasUnread: featureUpdatesHasUnread,
    markAsSeen: markFeatureUpdatesSeen,
    refetch: refetchFeatureUpdates,
  } = useFeatureUpdates()
  const [featurePanelOpen, setFeaturePanelOpen] = useState(false)
  const [featurePanelAnchor, setFeaturePanelAnchor] = useState<HTMLElement | null>(null)
  const [featureDetail, setFeatureDetail] = useState<FeatureUpdate | null>(null)

  const openFeaturePanel = useCallback(
    (anchor: HTMLElement) => {
      setFeaturePanelAnchor(anchor)
      setFeaturePanelOpen(true)
      void refetchFeatureUpdates()
    },
    [refetchFeatureUpdates],
  )

  useEffect(() => {
    if (featurePanelOpen && featureUpdateRows.length > 0) {
      markFeatureUpdatesSeen()
    }
  }, [featurePanelOpen, featureUpdateRows, markFeatureUpdatesSeen])

  const closeFeaturePanel = useCallback(() => {
    setFeaturePanelOpen(false)
    setFeaturePanelAnchor(null)
  }, [])

  const selectFeatureUpdate = useCallback(
    (u: FeatureUpdate) => {
      setFeatureDetail(u)
      closeFeaturePanel()
    },
    [closeFeaturePanel],
  )

  return (
    <>
      {c.mobileDrawerOpen && (
        <div
          className="bg-modal-overlay fixed inset-0 z-[998] md:hidden"
          onClick={() => c.setMobileDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        data-shell-menu-dock={menuDock}
        className={`relative flex flex-col transition-all duration-300 ease-in-out ${
          c.sidebarMode === 'hq' ? '' : 'md:!bg-transparent'
        } ${
          c.mobileDrawerOpen
            ? 'surface-card border-r-glass fixed inset-y-0 left-0 z-[999] h-dvh w-[280px]'
            : 'hidden h-full'
        } shell-menu-dock-sidebar md:relative md:flex ${hqPeeking ? 'md:z-40' : 'md:z-10'} ${
          c.sidebarMode === 'hq' ? 'md:overflow-visible' : 'md:overflow-hidden'
        } ${c.sidebarMode === 'hq' ? hqDesktopWidth : c.desktopWidth}`}
      >
        <div
          className={`flex h-full min-h-0 flex-1 flex-col ${
            c.sidebarMode === 'hq' ? 'overflow-visible' : 'overflow-hidden'
          }`}
        >
          {c.sidebarMode === 'studio' ? (
            <div
              className={`flex min-h-0 flex-1 flex-col overflow-hidden ${c.collapsed ? 'md:py-3 md:pl-2' : 'md:p-3'}`}
            >
              <div className="card-glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
                <SidebarStudioHeader
                  c={{
                    collapsed: c.collapsed,
                    setCollapsed: c.setCollapsed,
                    mobileDrawerOpen: c.mobileDrawerOpen,
                    router: c.router,
                    setActiveConversationId: c.setActiveConversationId,
                    setActiveCampaign: c.setActiveCampaign,
                  }}
                />
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <SidebarStudioSection c={c} />
                </div>
                <SidebarStudioFooter
                  c={{
                    isFreePlan: c.isFreePlan,
                    collapsed: c.collapsed,
                    mobileDrawerOpen: c.mobileDrawerOpen,
                    displayName: c.displayName,
                    email: c.email,
                    avatarUrl: c.avatarUrl,
                    initials: c.initials,
                  }}
                  featureUpdates={{
                    hasUnread: featureUpdatesHasUnread,
                    onOpen: openFeaturePanel,
                  }}
                />
              </div>
            </div>
          ) : (
            <SidebarHqSection
              c={c}
              featureUpdates={{
                hasUnread: featureUpdatesHasUnread,
                onOpen: openFeaturePanel,
              }}
            />
          )}
        </div>

        <DeleteCampaignDialog
          campaign={c.deletingCampaign}
          campaigns={c.campaigns}
          onClose={() => c.setDeletingCampaign(null)}
          onConfirm={c.handleDeleteCampaign}
        />

        <NewCampaignModal
          open={c.showNewCampaignModal}
          onClose={() => {
            c.setShowNewCampaignModal(false)
            c.setEditingCampaign(null)
            c.setCreateCampaignProgramId(null)
          }}
          editingCampaign={c.editingCampaign}
          onCreate={c.handleNewCampaignModalCreate}
        />
        <NewProgramModal
          open={c.showNewProgramModal}
          onClose={() => c.setShowNewProgramModal(false)}
          onCreate={async (name, icon, iconColor) => {
            try {
              await createProgram({
                name,
                icon,
                icon_color: iconColor ?? null,
              })
              invalidateProgramsListCache(useOrgStore.getState().activeOrgId)
              window.dispatchEvent(new Event('roas:programs-changed'))
              toast.success(`Program “${name}” is ready`)
            } catch (e) {
              toast.error(
                e instanceof Error && e.message && !e.message.startsWith('Backend error')
                  ? e.message
                  : 'Could not create program',
              )
              throw new Error('create program failed')
            }
          }}
        />
      </aside>
      <StudioSearchModal
        open={c.studioSearchOpen}
        onClose={() => c.setStudioSearchOpen(false)}
        campaigns={c.sortedCampaigns.map((row: SidebarCampaignRow) => ({
          id: row.id,
          name: row.name,
          icon: row.icon,
        }))}
        onSelect={c.handleStudioSearchSelect}
      />
      <FeatureUpdatesPanel
        open={featurePanelOpen}
        anchorEl={featurePanelAnchor}
        updates={featureUpdateRows}
        loading={featureUpdatesLoading}
        onClose={closeFeaturePanel}
        onSelect={selectFeatureUpdate}
      />
      <FeatureUpdateDetailModal
        open={featureDetail !== null}
        update={featureDetail}
        onClose={() => setFeatureDetail(null)}
      />
    </>
  )
}
