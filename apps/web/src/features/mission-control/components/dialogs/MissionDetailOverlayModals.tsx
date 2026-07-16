import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import type {
  Mission,
  MissionAgent,
  MissionDeliverable,
  MissionLog,
  MissionStatus,
  MissionSubtask,
  PrdContent,
  RecommendedHire,
} from '../../types'
import { PlanDetailModal } from './PlanDetailModal'
import { SubtaskDetailModal } from './SubtaskDetailModal'

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
  selectedSubtaskId: string | null
  missionLogs: MissionLog[]
  onCloseSubtask: () => void
  onSubtaskCommentSent: (log: MissionLog) => void
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
  selectedSubtaskId,
  missionLogs,
  onCloseSubtask,
  onSubtaskCommentSent,
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
  const selectedSubtask = selectedSubtaskId
    ? (subtasks.find((item) => item.id === selectedSubtaskId) ?? null)
    : null

  return (
    <>
      {previewDeliverable && (
        <DeliverablePreviewModal
          deliverable={previewDeliverable}
          agents={agents}
          campaignId={effectiveMission.campaign_id ?? previewDeliverable.campaign_id ?? null}
          hideOpenSourceMission
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={onClosePreview}
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

      {selectedSubtask ? (
        <SubtaskDetailModal
          missionId={effectiveMission.id}
          subtask={selectedSubtask}
          agents={agents}
          logs={missionLogs}
          onClose={onCloseSubtask}
          onCommentSent={onSubtaskCommentSent}
        />
      ) : null}

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
