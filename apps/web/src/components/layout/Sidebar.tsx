'use client'

import { useCallback, useEffect, useState } from 'react'
import { useShellPrefsHydrated } from '@/components/shell/use-shell-prefs-hydrated'
import { useShellStore } from '@/components/shell/use-shell-store'
import { StudioSearchModal } from '@/features/studio/components/StudioSearchModal'
import { FeatureUpdateDetailModal } from '@/features/updates/components/FeatureUpdateDetailModal'
import { FeatureUpdatesPanel } from '@/features/updates/components/FeatureUpdatesPanel'
import { useFeatureUpdates } from '@/features/updates/hooks/useFeatureUpdates'
import type { FeatureUpdate } from '@/features/updates/types'
import { DeleteCampaignDialog } from './DeleteCampaignDialog'
import { NewCampaignModal } from './NewCampaignModal'
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
  const sidebarPinned = shellPrefsHydrated ? sidebarPinnedRaw : false
  const sidebarPeek = shellPrefsHydrated ? sidebarPeekRaw : false
  // Pin pushes layout; peek overlays (rail stays 72px). Never widen for peek.
  const hqDesktopWidth =
    c.sidebarMode === 'hq' ? (sidebarPinned ? 'md:w-[272px]' : 'md:w-[72px]') : c.desktopWidth
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
        className={`relative flex flex-col transition-all duration-300 ease-in-out ${
          c.sidebarMode === 'hq' ? '' : 'md:!bg-transparent'
        } ${
          c.mobileDrawerOpen
            ? 'surface-card border-r-glass fixed inset-y-0 left-0 z-[999] h-dvh w-[280px]'
            : 'hidden h-full'
        } md:relative md:flex md:h-full ${hqPeeking ? 'md:z-40' : 'md:z-10'} ${
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
          }}
          editingCampaign={c.editingCampaign}
          onCreate={c.handleNewCampaignModalCreate}
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
