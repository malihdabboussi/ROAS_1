'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Loader2 } from 'lucide-react'
import { DeleteCampaignDialog } from '@/components/layout/DeleteCampaignDialog'
import { NewCampaignModal } from '@/components/layout/NewCampaignModal'
import type {
  SidebarCampaignRow,
  SidebarEditingCampaign,
} from '@/components/layout/sidebar/sidebar-types'
import { SidebarCampaignMenuPortal } from '@/components/layout/sidebar/SidebarCampaignMenuPortal'
import { ShareModal } from '@/components/org'
import { TransferDialog } from '@/components/transfer'
import { CampaignTeamManageModal } from '@/features/team/components/CampaignTeamManageModal'
import type { Campaign } from '@/lib/campaigns'
import { campaignToSidebarRow } from './team-conversations-sidebar.logic'

type CampaignMenuAnchorRect = {
  top: number
  left: number
  bottom: number
  right: number
}

type AssignConfirmState = {
  id: string
  name: string
}

type DeleteDialogCampaign = {
  id: string
  name: string
  icon: string
}

export interface TeamConversationsSidebarOverlaysProps {
  agentName?: string
  assignConfirm: AssignConfirmState | null
  assigning: boolean
  campaignMenuAnchorRect: CampaignMenuAnchorRect | null
  campaignMenuGroupKey: string | null
  deletingCampaign: { id: string; name: string } | null
  deleteDialogCampaigns: DeleteDialogCampaign[]
  editingCampaign: SidebarEditingCampaign
  manageTeamCampaign: SidebarCampaignRow | null
  shareCampaignRow: SidebarCampaignRow | null
  showNewCampaignModal: boolean
  transferCampaign: SidebarCampaignRow | null
  onAssignClose: () => void
  onAssignConfirm: () => void | Promise<void>
  onCampaignMenuClose: () => void
  onCampaignMenuDelete: (campaign: SidebarCampaignRow) => void
  onCampaignMenuEdit: (campaign: SidebarCampaignRow) => void
  onCampaignMenuManageTeam: (campaign: SidebarCampaignRow) => void
  onCampaignMenuPin: (campaign: Campaign) => void | Promise<void>
  onCampaignMenuShare: (campaign: SidebarCampaignRow) => void
  onCampaignMenuTransfer: (campaign: SidebarCampaignRow) => void
  onCampaignsRefresh?: () => void | Promise<void>
  onDeleteCampaignClose: () => void
  onDeleteCampaignConfirm: (campaignId: string) => Promise<void>
  onManageTeamOpenChange: (open: boolean) => void
  onNewCampaignClose: () => void
  onNewCampaignCreate: (name: string, icon: string) => void
  onShareClose: () => void
  onTransferClose: () => void
  resolveCampaignForGroup: (groupKey: string) => Campaign | null
}

export function TeamConversationsSidebarOverlays({
  agentName,
  assignConfirm,
  assigning,
  campaignMenuAnchorRect,
  campaignMenuGroupKey,
  deletingCampaign,
  deleteDialogCampaigns,
  editingCampaign,
  manageTeamCampaign,
  onAssignClose,
  onAssignConfirm,
  onCampaignMenuClose,
  onCampaignMenuDelete,
  onCampaignMenuEdit,
  onCampaignMenuManageTeam,
  onCampaignMenuPin,
  onCampaignMenuShare,
  onCampaignMenuTransfer,
  onCampaignsRefresh,
  onDeleteCampaignClose,
  onDeleteCampaignConfirm,
  onManageTeamOpenChange,
  onNewCampaignClose,
  onNewCampaignCreate,
  onShareClose,
  onTransferClose,
  resolveCampaignForGroup,
  shareCampaignRow,
  showNewCampaignModal,
  transferCampaign,
}: TeamConversationsSidebarOverlaysProps) {
  const campaignMenuEntity = campaignMenuGroupKey
    ? resolveCampaignForGroup(campaignMenuGroupKey)
    : null
  const campaignMenuRow = campaignMenuEntity ? campaignToSidebarRow(campaignMenuEntity) : null

  return (
    <>
      <DialogPrimitive.Root
        open={!!assignConfirm}
        onOpenChange={(open) => {
          if (!open && !assigning) onAssignClose()
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
            {assignConfirm ? (
              <div className="surface-card wizard-container-border rounded-spacing-4 container-modal-sm p-spacing-6 w-full">
                <div className="space-y-spacing-2">
                  <DialogPrimitive.Title className="title-h6">
                    Assign to campaign?
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-2 text-muted-foreground">
                    Are you sure you want to assign{' '}
                    <span className="text-foreground font-medium">
                      {agentName ?? 'this agent'}
                    </span>{' '}
                    to campaign{' '}
                    <span className="text-foreground font-medium">
                      "{assignConfirm.name}"
                    </span>
                    ?
                  </DialogPrimitive.Description>
                </div>

                <div className="mt-spacing-6 gap-spacing-2 flex items-center justify-end">
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      disabled={assigning}
                      className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </DialogPrimitive.Close>
                  <button
                    type="button"
                    disabled={assigning}
                    onClick={() => void onAssignConfirm()}
                    className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 disabled:opacity-50"
                  >
                    <span className="gap-spacing-2 relative z-10 inline-flex items-center justify-center">
                      {assigning ? (
                        <>
                          <Loader2 className="icon-sm animate-spin" />
                          Assigning…
                        </>
                      ) : (
                        'Assign'
                      )}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {campaignMenuRow && campaignMenuEntity && campaignMenuAnchorRect ? (
        <SidebarCampaignMenuPortal
          campaign={campaignMenuRow}
          anchorRect={campaignMenuAnchorRect}
          onClose={onCampaignMenuClose}
          onPin={() => void onCampaignMenuPin(campaignMenuEntity)}
          onEdit={() => onCampaignMenuEdit(campaignMenuRow)}
          onDeleteRequest={() => onCampaignMenuDelete(campaignMenuRow)}
          onRequestShare={() => onCampaignMenuShare(campaignMenuRow)}
          onRequestTransfer={() => onCampaignMenuTransfer(campaignMenuRow)}
          onManageTeam={() => onCampaignMenuManageTeam(campaignMenuRow)}
        />
      ) : null}

      {shareCampaignRow ? (
        <ShareModal
          open
          onClose={onShareClose}
          resourceType="campaign"
          resourceId={shareCampaignRow.id}
          resourceName={shareCampaignRow.name}
        />
      ) : null}

      {transferCampaign ? (
        <TransferDialog
          open
          onClose={onTransferClose}
          entityType="campaign"
          entityId={transferCampaign.id}
          entityName={transferCampaign.name}
          onTransferComplete={() => {
            onTransferClose()
            void onCampaignsRefresh?.()
          }}
        />
      ) : null}

      <DeleteCampaignDialog
        campaign={deletingCampaign}
        campaigns={deleteDialogCampaigns}
        onClose={onDeleteCampaignClose}
        onConfirm={onDeleteCampaignConfirm}
      />

      <NewCampaignModal
        open={showNewCampaignModal}
        onClose={onNewCampaignClose}
        editingCampaign={editingCampaign}
        onCreate={onNewCampaignCreate}
      />

      {manageTeamCampaign ? (
        <CampaignTeamManageModal
          open={!!manageTeamCampaign}
          onOpenChange={onManageTeamOpenChange}
          campaignId={manageTeamCampaign.id}
          campaignName={manageTeamCampaign.name}
          campaignTeam={[]}
          onTeamChange={() => void onCampaignsRefresh?.()}
          context={{ purpose: '', result: '', strategy: '' }}
          createdSummary=""
        />
      ) : null}
    </>
  )
}
