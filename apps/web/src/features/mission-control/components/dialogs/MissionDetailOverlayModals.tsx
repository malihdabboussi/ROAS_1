import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import type {
  Mission,
  MissionAgent,
  MissionDeliverable,
  MissionStatus,
  MissionSubtask,
  PrdContent,
  RecommendedHire,
} from '../../types'
import { PlanDetailModal } from './PlanDetailModal'

interface MissionDetailOverlayModalsProps {
  previewDeliverable: MissionDeliverable | null
  agents: MissionAgent[]
  effectiveMission: Mission
  onClosePreview: () => void
  planModalOpen: boolean
  planContent: PrdContent | null
  subtasks: MissionSubtask[]
  onClosePlan: () => void
  missionStatus: MissionStatus
  recommendedHires: RecommendedHire[]
  onApprovePlan: () => void
  onRejectPlan: () => void
  approvingPlan: boolean
  showDrivePicker: boolean
  onCloseDrive: () => void
  onSelectCloudFile: (file: File) => void
  showDropboxPicker: boolean
  onCloseDropbox: () => void
  showLibraryPicker: boolean
  onCloseLibrary: () => void
  onSelectLibrary: (url: string) => void
  campaignId?: string | null
}

export function MissionDetailOverlayModals({
  previewDeliverable,
  agents,
  effectiveMission,
  onClosePreview,
  planModalOpen,
  planContent,
  subtasks,
  onClosePlan,
  missionStatus,
  recommendedHires,
  onApprovePlan,
  onRejectPlan,
  approvingPlan,
  showDrivePicker,
  onCloseDrive,
  onSelectCloudFile,
  showDropboxPicker,
  onCloseDropbox,
  showLibraryPicker,
  onCloseLibrary,
  onSelectLibrary,
  campaignId,
}: MissionDetailOverlayModalsProps) {
  return (
    <>
      {previewDeliverable && (
        <DeliverablePreviewModal
          deliverable={previewDeliverable}
          agents={agents}
          campaignId={effectiveMission.campaign_id ?? previewDeliverable.campaign_id ?? null}
          fallbackSpaceId={effectiveMission.space_id ?? null}
          hideOpenSourceMission
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={onClosePreview}
          onBack={onClosePreview}
          backLabel="Back to mission"
          presentation="centered"
        />
      )}

      {planModalOpen && (planContent || subtasks.length > 0) && (
        <PlanDetailModal
          planContent={planContent}
          subtasks={subtasks}
          onClose={onClosePlan}
          missionStatus={missionStatus}
          recommendedHires={recommendedHires}
          onApprove={onApprovePlan}
          onReject={onRejectPlan}
          approving={approvingPlan}
        />
      )}

      <DriveFileBrowserModal
        open={showDrivePicker}
        onClose={onCloseDrive}
        context="chat"
        onSelectFileForChat={onSelectCloudFile}
      />
      <DropboxFileBrowserModal
        open={showDropboxPicker}
        onClose={onCloseDropbox}
        context="chat"
        onSelectFileForChat={onSelectCloudFile}
      />
      <MediaPickerModal
        open={showLibraryPicker}
        onClose={onCloseLibrary}
        onSelect={onSelectLibrary}
        campaignId={campaignId ?? undefined}
      />
    </>
  )
}
