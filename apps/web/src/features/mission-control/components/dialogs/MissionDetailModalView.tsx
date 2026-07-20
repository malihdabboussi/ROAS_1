import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { MissionSubtask } from '../../types'
import type { MissionDetailModalViewProps } from './mission-detail-modal-view.types'
import { MissionAccessApprovalCard } from './MissionAccessApprovalCard'
import { MissionDetailDesktopShell } from './MissionDetailDesktopShell'
import { MissionDetailMobileShell } from './MissionDetailMobileShell'
import { MissionDetailOverlayModals } from './MissionDetailOverlayModals'
import {
  collectDependencySubtasks,
  collectSubtaskResourceLinks,
  filterMissionDeliverables,
  filterSubtaskDeliverables,
  filterSubtaskLogs,
  numberDeliverablesByTask,
} from './subtask-detail'

export function MissionDetailModalView({
  mission,
  liveMission,
  title,
  setTitle,
  description,
  setDescription,
  currentStatus,
  currentPriority,
  selectedSubtaskId,
  setSelectedSubtaskId,
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
  denyingAccess,
  onApproveAccess,
  onDenyAccess,
  commentText,
  sendingComment,
  setCommentText,
  onSendComment,
  subtaskCommentText,
  setSubtaskCommentText,
  sendingSubtaskComment,
  onSendSubtaskComment,
  approvingHumanGate,
  onApproveHumanGate,
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
  const effectiveMission = liveMission ?? mission
  const selectedSubtask = selectedSubtaskId
    ? (subtasks.find((item) => item.id === selectedSubtaskId) ?? null)
    : null
  const visibleDeliverables = numberDeliverablesByTask(
    filterMissionDeliverables(
      selectedSubtask
        ? filterSubtaskDeliverables(deliverables, selectedSubtask, subtasks)
        : deliverables,
    ),
    subtasks,
  )
  const subtaskDetailProps = selectedSubtask
    ? {
        subtask: selectedSubtask,
        agents,
        userProfile,
        deliverables: visibleDeliverables,
        resourceLinks: collectSubtaskResourceLinks(selectedSubtask, subtasks, visibleDeliverables),
        dependencies: collectDependencySubtasks(selectedSubtask, subtasks),
        feedback: subtaskCommentText,
        approving: approvingHumanGate,
        sendingFeedback: sendingSubtaskComment,
        onRequestChanges: onSendSubtaskComment,
        onApprove: onApproveHumanGate,
        onSelectDeliverable: setPreviewDeliverable,
        accessApprovalCard: (
          <MissionAccessApprovalCard
            pendingAccessRequests={pendingAccessRequests.filter(
              (request) => request.subtask_id === selectedSubtask.id,
            )}
            approvingAccess={approvingAccess}
            denyingAccess={denyingAccess}
            onApproveAccess={onApproveAccess}
            onDenyAccess={onDenyAccess}
          />
        ),
      }
    : null
  const accessApprovalCard: ReactNode = (
    <MissionAccessApprovalCard
      pendingAccessRequests={pendingAccessRequests}
      approvingAccess={approvingAccess}
      denyingAccess={denyingAccess}
      onApproveAccess={onApproveAccess}
      onDenyAccess={onDenyAccess}
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
  const missionActivityTimelineProps = {
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
  const activityTimelineProps = selectedSubtask
    ? {
        ...missionActivityTimelineProps,
        sortedLogs: filterSubtaskLogs(sortedLogs, selectedSubtask),
        subtasks: [selectedSubtask],
        createdAt: selectedSubtask.created_at,
        commentText: subtaskCommentText,
        sendingComment: sendingSubtaskComment,
        onCommentChange: setSubtaskCommentText,
        onCommentSend: onSendSubtaskComment,
        timelineKey: `${mission.id}:${selectedSubtask.id}`,
        attachedFiles: [],
        onRemoveFile: undefined,
        onFileButtonClick: undefined,
        onOpenDrive: undefined,
        onOpenDropbox: undefined,
        onOpenLibrary: undefined,
        fileInputRef: undefined,
        acceptedTypes: undefined,
        onFileSelect: undefined,
        onPasteFiles: undefined,
        missionStatus: undefined,
        onRatingSubmit: undefined,
        onViewPlan: undefined,
        onApprove: undefined,
        onReject: undefined,
        onToggleAutoApprove: undefined,
      }
    : missionActivityTimelineProps
  const overlayModals = (
    <MissionDetailOverlayModals
      previewDeliverable={previewDeliverable}
      deliverables={visibleDeliverables}
      agents={agents}
      effectiveMission={effectiveMission}
      onClosePreview={() => setPreviewDeliverable(null)}
      onSelectPreview={setPreviewDeliverable}
      planModalOpen={planModalOpen}
      planContent={planContent}
      subtasks={subtasks}
      onClosePlan={onClosePlan}
      missionStatus={currentStatus}
      recommendedHires={recommendedHires}
      onApprovePlan={onApprovePlan}
      onRejectPlan={onRejectPlan}
      approvingPlan={approvingPlan}
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
            selectedSubtask={selectedSubtask}
            subtaskDetailProps={subtaskDetailProps}
            onBackToMission={() => setSelectedSubtaskId(null)}
            onClose={onClose}
            currentStatus={currentStatus}
            onRetry={onRetry}
            onArchive={onArchive}
            onDelete={onDelete}
            missionMetaProps={missionMetaProps}
            subtasksProps={subtasksProps}
            accessApprovalCard={accessApprovalCard}
            deliverables={visibleDeliverables}
            onSelectDeliverable={setPreviewDeliverable}
            missionId={effectiveMission.id}
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
          hideMissionSurface={previewDeliverable != null}
          onClose={onClose}
          title={title}
          selectedSubtask={selectedSubtask}
          subtaskDetailProps={subtaskDetailProps}
          onBackToMission={() => setSelectedSubtaskId(null)}
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
          deliverables={visibleDeliverables}
          onSelectDeliverable={setPreviewDeliverable}
          activityTimelineProps={activityTimelineProps}
          overlayModals={overlayModals}
        />,
        portalTarget,
      )
    : null
}
