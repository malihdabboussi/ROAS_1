'use client'

import { useRouter } from 'next/navigation'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { ShareModal } from '@/components/org'
import { TransferDialog } from '@/components/transfer'
import { ConfirmDialog } from '@/components/ui/dialogs/ConfirmDialog'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import {
  createSpace as createSpaceRequest,
  deleteSpace as deleteSpaceRequest,
  updateSpace as updateSpaceRequest,
} from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import { CampaignTeamManageModal } from '@/features/team/components/CampaignTeamManageModal'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import type { SidebarCampaignRow } from './sidebar-types'
import { SidebarCampaignMenuPortal } from './SidebarCampaignMenuPortal'
import type { SectionMenuAnchorRect } from './SidebarHqSpacesRows'
import { SidebarSpaceContextMenu } from './SidebarSpaceContextMenu'
import type { SidebarControllerReturn } from './useSidebarController'

export type SidebarHqCampaignMenuState = {
  campaign: SidebarCampaignRow
  anchorRect: SectionMenuAnchorRect
}

export type SidebarHqSpaceMenuState = {
  space: Space
  anchorRect?: SectionMenuAnchorRect
  x: number
  y: number
}

export function SidebarHqCampaignMenuLayer({
  campaignMenuFor,
  setCampaignMenuFor,
  controller,
  startCreating,
}: {
  campaignMenuFor: SidebarHqCampaignMenuState | null
  setCampaignMenuFor: Dispatch<SetStateAction<SidebarHqCampaignMenuState | null>>
  controller: SidebarControllerReturn
  startCreating: (bucket: string) => void
}) {
  const [shareCampaignModal, setShareCampaignModal] = useState<SidebarCampaignRow | null>(null)
  const [transferCampaign, setTransferCampaign] = useState<SidebarCampaignRow | null>(null)
  const [manageTeamCampaign, setManageTeamCampaign] = useState<SidebarCampaignRow | null>(null)

  return (
    <>
      {campaignMenuFor ? (
        <SidebarCampaignMenuPortal
          campaign={campaignMenuFor.campaign}
          anchorRect={campaignMenuFor.anchorRect}
          onClose={() => setCampaignMenuFor(null)}
          onToggleFavorite={() =>
            void controller.toggleFavoriteCampaign(campaignMenuFor.campaign.id)
          }
          onEdit={() => {
            controller.setEditingCampaign({
              id: campaignMenuFor.campaign.id,
              name: campaignMenuFor.campaign.name,
              icon: campaignMenuFor.campaign.icon,
              config: campaignMenuFor.campaign.config,
            })
            controller.setShowNewCampaignModal(true)
            setCampaignMenuFor(null)
          }}
          onCreateSpaceInCampaign={() => {
            startCreating(campaignMenuFor.campaign.id)
            setCampaignMenuFor(null)
          }}
          onPatchCampaignConfig={controller.patchCampaignConfig}
          onHide={() => void controller.toggleHiddenCampaign(campaignMenuFor.campaign.id)}
          onArchive={() => void controller.archiveCampaignById(campaignMenuFor.campaign.id)}
          onDeleteRequest={() => {
            controller.setDeletingCampaign({
              id: campaignMenuFor.campaign.id,
              name: campaignMenuFor.campaign.name,
            })
            setCampaignMenuFor(null)
          }}
          onRequestShare={() => {
            setShareCampaignModal(campaignMenuFor.campaign)
            setCampaignMenuFor(null)
          }}
          onRequestTransfer={() => {
            setTransferCampaign(campaignMenuFor.campaign)
            setCampaignMenuFor(null)
          }}
          onManageTeam={() => {
            setManageTeamCampaign(campaignMenuFor.campaign)
            setCampaignMenuFor(null)
          }}
        />
      ) : null}
      {shareCampaignModal && (
        <ShareModal
          open
          onClose={() => setShareCampaignModal(null)}
          resourceType="campaign"
          resourceId={shareCampaignModal.id}
          resourceName={shareCampaignModal.name}
        />
      )}
      {transferCampaign && (
        <TransferDialog
          open
          onClose={() => setTransferCampaign(null)}
          entityType="campaign"
          entityId={transferCampaign.id}
          entityName={transferCampaign.name}
          onTransferComplete={() => window.location.reload()}
        />
      )}
      {manageTeamCampaign && (
        <CampaignTeamManageModal
          open={!!manageTeamCampaign}
          onOpenChange={(open) => {
            if (!open) setManageTeamCampaign(null)
          }}
          campaignId={manageTeamCampaign.id}
          campaignName={manageTeamCampaign.name}
          campaignTeam={[]}
          onTeamChange={() => {}}
          context={{ purpose: '', result: '', strategy: '' }}
          createdSummary=""
        />
      )}
    </>
  )
}

export function SidebarHqSpaceMenuLayer({
  menuFor,
  setMenuFor,
  campaigns,
  activeSpaceId,
  isFavorite,
  toggleFavorite,
  toggleHidden,
  startRenameSpace,
}: {
  menuFor: SidebarHqSpaceMenuState | null
  setMenuFor: Dispatch<SetStateAction<SidebarHqSpaceMenuState | null>>
  campaigns: SidebarCampaignRow[]
  activeSpaceId: string | null
  isFavorite: (spaceId: string) => boolean
  toggleFavorite: (spaceId: string) => void | Promise<void>
  toggleHidden: (spaceId: string, name: string) => void | Promise<void>
  startRenameSpace: (space: Space) => void
}) {
  const [deletingSpace, setDeletingSpace] = useState<Space | null>(null)
  const [isDeletingSpace, setIsDeletingSpace] = useState(false)
  const router = useRouter()

  const handleDuplicate = async (space: Space) => {
    try {
      const dup = await createSpaceRequest({
        title: `${space.title ?? 'Untitled'} (copy)`,
        description: space.description ?? undefined,
        campaign_id: space.campaign_id ?? undefined,
        visibility: space.visibility,
        schema: space.schema,
      })
      cachedSpaces.mutate((prev) => [dup, ...(prev ?? [])])
      useSpacesStore.setState((s) => ({ spaces: [dup, ...s.spaces] }))
      toast.success(`Duplicated as "${dup.title}"`)
    } catch {
      toast.error('Failed to duplicate space')
    }
  }

  const handleMoveSpace = async (space: Space, campaignId: string | null) => {
    if ((space.campaign_id ?? null) === campaignId) return
    try {
      await updateSpaceRequest(space.id, { campaign_id: campaignId })
      cachedSpaces.mutate((prev) =>
        (prev ?? []).map((sp) => (sp.id === space.id ? { ...sp, campaign_id: campaignId } : sp)),
      )
      useSpacesStore.setState((s) => ({
        spaces: s.spaces.map((sp) =>
          sp.id === space.id ? { ...sp, campaign_id: campaignId } : sp,
        ),
      }))
      toast.success('Moved space')
    } catch {
      toast.error('Failed to move space')
    }
  }

  const handleCopySpace = async (space: Space, campaignId: string | null) => {
    try {
      const dup = await createSpaceRequest({
        title: `${space.title ?? 'Untitled'} (copy)`,
        description: space.description ?? undefined,
        campaign_id: campaignId ?? undefined,
        visibility: space.visibility,
        schema: space.schema,
      })
      cachedSpaces.mutate((prev) => [dup, ...(prev ?? [])])
      useSpacesStore.setState((s) => ({ spaces: [dup, ...s.spaces] }))
      toast.success(`Copied as "${dup.title}"`)
    } catch {
      toast.error('Failed to copy space')
    }
  }

  const handleDeleteSpace = async (space: Space) => {
    setIsDeletingSpace(true)
    try {
      await deleteSpaceRequest(space.id)
      cachedSpaces.mutate((prev) => (prev ?? []).filter((sp) => sp.id !== space.id))
      useSpacesStore.setState((s) => ({
        spaces: s.spaces.filter((sp) => sp.id !== space.id),
        ...(s.activeSpaceId === space.id
          ? { activeSpaceId: null, activeViewId: null, items: [] }
          : {}),
      }))
      toast.success('Space deleted')
    } catch {
      toast.error('Failed to delete space')
    } finally {
      setIsDeletingSpace(false)
      setDeletingSpace(null)
    }
  }

  return (
    <>
      {menuFor ? (
        <SidebarSpaceContextMenu
          position={{ x: menuFor.x, y: menuFor.y }}
          anchorRect={menuFor.anchorRect}
          space={menuFor.space}
          campaigns={campaigns}
          onClose={() => setMenuFor(null)}
          onOpenInNewTab={() => {
            openInNewTab(`/spaces?space=${menuFor.space.id}`)
          }}
          onRename={() => startRenameSpace(menuFor.space)}
          onDuplicate={() => void handleDuplicate(menuFor.space)}
          onMoveToCampaign={(cid) => void handleMoveSpace(menuFor.space, cid)}
          onCopyToCampaign={(cid) => void handleCopySpace(menuFor.space, cid)}
          onPatchSchemaIcon={async (patch) => {
            const next = {
              ...(menuFor.space.schema as unknown as Record<string, unknown>),
              ...patch,
            }
            try {
              await updateSpaceRequest(menuFor.space.id, { schema: next as any })
              cachedSpaces.mutate((prev) =>
                (prev ?? []).map((sp) =>
                  sp.id === menuFor.space.id ? { ...sp, schema: next as any } : sp,
                ),
              )
              useSpacesStore.setState((s) => ({
                spaces: s.spaces.map((sp) =>
                  sp.id === menuFor.space.id ? { ...sp, schema: next as any } : sp,
                ),
              }))
            } catch {
              toast.error('Failed to update icon')
            }
          }}
          onOpenAutomations={() => {
            useSpacesStore.setState({
              pendingMenuAction: { spaceId: menuFor.space.id, action: 'automations' },
            })
            useSpacesStore.getState().setActiveSpace(menuFor.space.id)
            router.push('/spaces')
          }}
          onOpenSharing={() => {
            useSpacesStore.setState({
              pendingMenuAction: { spaceId: menuFor.space.id, action: 'share' },
            })
            useSpacesStore.getState().setActiveSpace(menuFor.space.id)
            router.push('/spaces')
          }}
          onDelete={() => setDeletingSpace(menuFor.space)}
          isFavorite={isFavorite(menuFor.space.id)}
          onToggleFavorite={() => void toggleFavorite(menuFor.space.id)}
          onOpenCampaign={
            menuFor.space.campaign_id
              ? () => {
                  openInNewTab(`/campaigns/${menuFor.space.campaign_id}`)
                }
              : undefined
          }
          onHide={() => {
            void toggleHidden(menuFor.space.id, menuFor.space.title ?? 'Untitled')
            if (activeSpaceId === menuFor.space.id) {
              useSpacesStore.setState({ activeSpaceId: null, activeViewId: null, items: [] })
            }
          }}
        />
      ) : null}
      <ConfirmDialog
        open={!!deletingSpace}
        onOpenChange={(open) => {
          if (!open && !isDeletingSpace) setDeletingSpace(null)
        }}
        title="Delete space?"
        description={
          deletingSpace
            ? `Are you sure you want to delete "${deletingSpace.title || 'Untitled'}"? This cannot be undone.`
            : undefined
        }
        confirmText="Delete"
        confirmDisabled={isDeletingSpace}
        confirmingText="Deleting…"
        onConfirm={() => {
          if (deletingSpace) void handleDeleteSpace(deletingSpace)
        }}
      />
    </>
  )
}
