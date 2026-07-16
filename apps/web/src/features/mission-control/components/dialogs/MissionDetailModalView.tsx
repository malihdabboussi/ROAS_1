import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { AttachedFile } from '@/components/chat/FileAttachments'
import type {
  Mission,
  MissionAccessRequest,
  MissionAgent,
  MissionDeliverable,
  MissionLog,
  MissionPriority,
  MissionStatus,
  MissionSubtask,
  PrdContent,
  RecommendedHire,
} from '../../types'
import { MissionAccessApprovalCard } from './MissionAccessApprovalCard'
import { MissionDetailDesktopShell } from './MissionDetailDesktopShell'
import { MissionDetailMobileShell } from './MissionDetailMobileShell'
import { MissionDetailOverlayModals } from './MissionDetailOverlayModals'
import type { RatingPayload } from './MissionRatingStrip'

interface MissionDetailModalViewProps {
  mission: Mission
  liveMission: Mission | null
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
  currentStatus: MissionStatus
  currentPriority: MissionPriority
  elevatedStacking: boolean
  onClose: () => void
  onUpdated: () => void
  isMobile: boolean
  mobileScreen: 'detail' | 'activity'
  setMobileScreen: Dispatch<SetStateAction<'detail' | 'activity'>>
  mobileMenuOpen: boolean
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>
  menuAnchor: HTMLElement | null
  setMenuAnchor: Dispatch<SetStateAction<HTMLElement | null>>
  prdLoading: boolean
  logsLoading: boolean
  planContent: PrdContent | null
  planModalOpen: boolean
  onClosePlan: () => void
  recommendedHires: RecommendedHire[]
  sortedLogs: MissionLog[]
  subtasks: MissionSubtask[]
  setSubtasks: Dispatch<SetStateAction<MissionSubtask[]>>
  agents: MissionAgent[]
  userProfile: { fullName: string; avatarUrl: string | null } | null
  deliverables: MissionDeliverable[]
  previewDeliverable: MissionDeliverable | null
  setPreviewDeliverable: Dispatch<SetStateAction<MissionDeliverable | null>>
  pendingAccessRequests: MissionAccessRequest[]
  approvingAccess: boolean
  onApproveAccess: () => void
  commentText: string
  sendingComment: boolean
  setCommentText: (value: string) => void
  onSendComment: () => void
  onAppendMissionLog: (log: MissionLog) => void
  activityEndRef: RefObject<HTMLDivElement | null>
  attachedFiles: AttachedFile[]
  onRemoveFile: (id: string) => void
  onFileButtonClick: () => void
  openDrive: () => void
  openDropbox: () => void
  setShowLibraryPicker: Dispatch<SetStateAction<boolean>>
  maxFiles: number
  fileInputRef: RefObject<HTMLInputElement | null>
  acceptedTypes: string
  onFileSelect: (files: FileList | readonly File[] | null) => void
  onPasteFiles: (files: File[]) => void
  onRatingSubmit: (payload: RatingPayload) => Promise<void>
  ratingSending: boolean
  ratingSubmitted: boolean
  onViewPlan: () => void
  onApprovePlan: () => void
  onRejectPlan: () => void
  approvingPlan: boolean
  autoApprovePlans: boolean
  onToggleAutoApprove: (enabled: boolean) => void
  showDrivePicker: boolean
  setShowDrivePicker: Dispatch<SetStateAction<boolean>>
  onSelectCloudFile: (file: File) => void
  showDropboxPicker: boolean
  setShowDropboxPicker: Dispatch<SetStateAction<boolean>>
  showLibraryPicker: boolean
  onSelectLibrary: (url: string) => void
  onRetry: () => Promise<void>
  onArchive: () => void
  onDelete: () => void
  onStatusChange: (newStatus: MissionStatus) => Promise<void>
  onPriorityChange: (newPriority: MissionPriority) => Promise<void>
}

export function MissionDetailModalView({
  mission,
  liveMission,
  title,
  setTitle,
  description,
  setDescription,
  currentStatus,
  currentPriority,
  elevatedStacking,
  onClose,
  onUpdated,
  isMobile,
  mobileScreen,
  setMobileScreen,
  mobileMenuOpen,
  setMobileMenuOpen,
  menuAnchor,
  setMenuAnchor,
  prdLoading,
  logsLoading,
  planContent,
  planModalOpen,
  onClosePlan,
  recommendedHires,
  sortedLogs,
  subtasks,
  setSubtasks,
  agents,
  userProfile,
  deliverables,
  previewDeliverable,
  setPreviewDeliverable,
  pendingAccessRequests,
  approvingAccess,
  onApproveAccess,
  commentText,
  sendingComment,
  setCommentText,
  onSendComment,
  onAppendMissionLog,
  activityEndRef,
  attachedFiles,
  onRemoveFile,
  onFileButtonClick,
  openDrive,
  openDropbox,
  setShowLibraryPicker,
  maxFiles,
  fileInputRef,
  acceptedTypes,
  onFileSelect,
  onPasteFiles,
  onRatingSubmit,
  ratingSending,
  ratingSubmitted,
  onViewPlan,
  onApprovePlan,
  onRejectPlan,
  approvingPlan,
  autoApprovePlans,
  onToggleAutoApprove,
  showDrivePicker,
  setShowDrivePicker,
  onSelectCloudFile,
  showDropboxPicker,
  setShowDropboxPicker,
  showLibraryPicker,
  onSelectLibrary,
  onRetry,
  onArchive,
  onDelete,
  onStatusChange,
  onPriorityChange,
}: MissionDetailModalViewProps) {
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const effectiveMission = liveMission ?? mission
  const accessApprovalCard: ReactNode = (
    <MissionAccessApprovalCard
      pendingAccessRequests={pendingAccessRequests}
      approvingAccess={approvingAccess}
      onApproveAccess={onApproveAccess}
    />
  )
  const missionMetaProps = {
    mission,
    liveMission,
    agents,
    subtasks,
    currentStatus,
    currentPriority,
    description,
    onStatusChange,
    onPriorityChange,
    onDescriptionChange: setDescription,
    onUpdated,
  }
  const subtasksProps = {
    missionId: mission.id,
    logsLoading,
    prdLoading,
    subtasks,
    agents,
    planContent,
    missionProgressNotes: mission.progress_notes,
    missionError: mission.error,
    onOpenPlan: onViewPlan,
    onOpenSubtask: setSelectedSubtaskId,
    onUpdated,
    onSubtasksChange: (updater: (prev: MissionSubtask[]) => MissionSubtask[]) =>
      setSubtasks((prev) => updater(prev)),
  }
  const activityTimelineProps = {
    logsLoading,
    isMissionLinked: true,
    sortedLogs,
    subtasks,
    agents,
    userProfile,
    createdAt: mission.created_at,
    commentText,
    sendingComment,
    onCommentChange: setCommentText,
    onCommentSend: onSendComment,
    activityEndRef,
    timelineKey: mission.id,
    attachedFiles,
    onRemoveFile,
    onFileButtonClick,
    onOpenDrive: openDrive,
    onOpenDropbox: openDropbox,
    onOpenLibrary: () => setShowLibraryPicker(true),
    maxFiles,
    fileInputRef,
    acceptedTypes,
    onFileSelect,
    onPasteFiles,
    missionId: mission.id,
    missionStatus: currentStatus,
    onRatingSubmit,
    ratingSending,
    ratingSubmitted,
    onViewPlan,
    onApprove: onApprovePlan,
    onReject: onRejectPlan,
    approving: approvingPlan,
    autoApprovePlans,
    onToggleAutoApprove,
  }
  const overlayModals = (
    <MissionDetailOverlayModals
      previewDeliverable={previewDeliverable}
      agents={agents}
      effectiveMission={effectiveMission}
      onClosePreview={() => setPreviewDeliverable(null)}
      planModalOpen={planModalOpen}
      planContent={planContent}
      subtasks={subtasks}
      onClosePlan={onClosePlan}
      missionStatus={currentStatus}
      recommendedHires={recommendedHires}
      onApprovePlan={onApprovePlan}
      onRejectPlan={onRejectPlan}
      approvingPlan={approvingPlan}
      selectedSubtaskId={selectedSubtaskId}
      missionLogs={sortedLogs}
      onCloseSubtask={() => setSelectedSubtaskId(null)}
      onSubtaskCommentSent={(log) => {
        onAppendMissionLog(log)
      }}
      showDrivePicker={showDrivePicker}
      onCloseDrive={() => setShowDrivePicker(false)}
      onSelectCloudFile={onSelectCloudFile}
      showDropboxPicker={showDropboxPicker}
      onCloseDropbox={() => setShowDropboxPicker(false)}
      showLibraryPicker={showLibraryPicker}
      onCloseLibrary={() => setShowLibraryPicker(false)}
      onSelectLibrary={onSelectLibrary}
      campaignId={mission.campaign_id}
    />
  )
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  const shellZ = elevatedStacking ? 'z-modal-layer-4' : 'z-50'

  if (isMobile) {
    return portalTarget
      ? createPortal(
          <MissionDetailMobileShell
            shellZ={shellZ}
            mobileScreen={mobileScreen}
            setMobileScreen={setMobileScreen}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            title={title}
            onClose={onClose}
            currentStatus={currentStatus}
            onRetry={onRetry}
            onArchive={onArchive}
            onDelete={onDelete}
            missionMetaProps={missionMetaProps}
            subtasksProps={subtasksProps}
            accessApprovalCard={accessApprovalCard}
            deliverables={deliverables}
            onSelectDeliverable={setPreviewDeliverable}
            activityTimelineProps={activityTimelineProps}
            overlayModals={overlayModals}
          />,
          portalTarget,
        )
      : null
  }

  return portalTarget
    ? createPortal(
        <MissionDetailDesktopShell
          shellZ={shellZ}
          onClose={onClose}
          title={title}
          onTitleChange={setTitle}
          onOpenMenu={setMenuAnchor}
          menuAnchor={menuAnchor}
          menuMission={effectiveMission}
          onCloseMenu={() => setMenuAnchor(null)}
          onUpdated={onUpdated}
          onDelete={onDelete}
          missionMetaProps={missionMetaProps}
          subtasksProps={subtasksProps}
          accessApprovalCard={accessApprovalCard}
          deliverables={deliverables}
          onSelectDeliverable={setPreviewDeliverable}
          activityTimelineProps={activityTimelineProps}
          overlayModals={overlayModals}
        />,
        portalTarget,
      )
    : null
}
