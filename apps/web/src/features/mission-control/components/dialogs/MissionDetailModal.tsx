'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { backendPost } from '@/lib/api/backend-client'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { useMissionDetailData } from '../../hooks/useMissionDetailData'
import { useMissionDetailFocus } from '../../hooks/useMissionDetailFocus'
import {
  approveMissionPlan,
  fetchProfileSettings,
  rejectMissionPlan,
  retryMission,
  toggleAutoApprovePlans,
  trashMission,
  updateMission,
  updateMissionStatus,
} from '../../services/missions.service'
import type {
  MissionDeliverable,
  MissionLog,
  MissionPriority,
  MissionStatus,
  PrdContent,
} from '../../types'
import { MISSION_DETAIL_ERRORS } from '../../types'
import {
  getMissionDetailDisplayData,
  type MissionDetailModalProps,
} from './mission-detail-modal-helpers'
import { MissionDetailModalView } from './MissionDetailModalView'
import { useMissionAccessApproval } from './useMissionAccessApproval'
import { useMissionDetailCommentAttachments } from './useMissionDetailCommentAttachments'
import { useMissionTrackActions } from './useMissionTrackActions'
import { useSubtaskDetailState } from './useSubtaskDetailState'

export function MissionDetailModal({
  mission,
  onClose,
  onUpdated,
  elevatedStacking = false,
  initialSubtaskId = null,
  presentation = 'modal',
}: MissionDetailModalProps) {
  const [title, setTitle] = useState(mission.title)
  const [description, setDescription] = useState(mission.brief ?? mission.description ?? '')
  const [currentStatus, setCurrentStatus] = useState<MissionStatus>(mission.status)
  const [currentPriority, setCurrentPriority] = useState<MissionPriority>(mission.priority)
  const [previewDeliverable, setPreviewDeliverable] = useState<MissionDeliverable | null>(null)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [approvingPlan, setApprovingPlan] = useState(false)
  const [autoApprovePlans, setAutoApprovePlans] = useState(false)
  const [ratingSending, setRatingSending] = useState(false)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileScreen, setMobileScreen] = useState<'detail' | 'activity'>('detail')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const activityEndRef = useRef<HTMLDivElement>(null)

  const {
    prd,
    prdLoading,
    liveMission,
    missionLogs,
    deliverables,
    accessRequests,
    logsLoading,
    subtasks,
    agents,
    userProfile,
    setMissionLogs,
    setSubtasks,
    setAccessRequests,
  } = useMissionDetailData({ mission })
  const {
    selectedSubtaskId,
    setSelectedSubtaskId,
    subtaskCommentText,
    setSubtaskCommentText,
    sendingSubtaskComment,
    handleSendSubtaskComment,
    approvingHumanGate,
    handleApproveHumanGate,
  } = useSubtaskDetailState({
    missionId: mission.id,
    initialSubtaskId,
    subtasks,
    setSubtasks,
    setMissionLogs,
    onUpdated,
  })
  const {
    commentText,
    setCommentText,
    sendingComment,
    attachedFiles,
    showLibraryPicker,
    setShowLibraryPicker,
    fileInputRef,
    maxFiles,
    acceptedTypes,
    handleFileSelect,
    handleRemoveFile,
    handleFileButtonClick,
    handleFileFromCloud,
    handlePasteCommentImages,
    handleLibrarySelect,
    handleSendComment,
  } = useMissionDetailCommentAttachments({ mission, setMissionLogs, activityEndRef })
  const { rerunningSubtaskId, handleExtendTrack, handleRerunSubtask } = useMissionTrackActions(
    mission.id,
    onUpdated,
  )

  useEffect(() => {
    if (!liveMission) return
    setTitle(liveMission.title)
    setDescription(liveMission.brief ?? liveMission.description ?? '')
    setCurrentStatus(liveMission.status)
    setCurrentPriority(liveMission.priority)
  }, [liveMission])

  useMissionDetailFocus(mission.id, title, currentStatus)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (previewDeliverable) {
        setPreviewDeliverable(null)
        return
      }
      if (selectedSubtaskId) {
        setSelectedSubtaskId(null)
        setMobileScreen('detail')
        return
      }
      onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, selectedSubtaskId, previewDeliverable])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    let mounted = true
    fetchProfileSettings()
      .then((s) => {
        if (mounted) setAutoApprovePlans(s?.auto_approve_plans ?? false)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const handleToggleAutoApprove = useCallback(async (enabled: boolean) => {
    setAutoApprovePlans(enabled)
    try {
      const result = await toggleAutoApprovePlans(enabled)
      setAutoApprovePlans(result.auto_approve_plans)
    } catch {
      setAutoApprovePlans(!enabled)
    }
  }, [])

  const handleDelete = async () => {
    try {
      await trashMission(mission.id)
      onUpdated()
      onClose()
    } catch (err) {
      toast.error(sanitizeUserError(err, MISSION_DETAIL_ERRORS.DELETE_FAILED.userMessage))
    }
  }

  const handleArchive = async () => {
    try {
      const newStatus: MissionStatus = currentStatus === 'archived' ? 'backlog' : 'archived'
      await updateMissionStatus(mission.id, { status: newStatus })
      setCurrentStatus(newStatus)
      onUpdated()
      if (newStatus === 'archived') onClose()
    } catch (err) {
      toast.error(sanitizeUserError(err, MISSION_DETAIL_ERRORS.UPDATE_FAILED.userMessage))
    }
  }

  const handleRetry = async () => {
    try {
      await retryMission(mission.id)
      onUpdated()
    } catch {
      /* noop */
    }
  }

  const handleApprovePlan = useCallback(async () => {
    setApprovingPlan(true)
    try {
      await approveMissionPlan(mission.id)
      toast.success('Plan approved')
      setPlanModalOpen(false)
      onUpdated()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to approve plan'))
    } finally {
      setApprovingPlan(false)
    }
  }, [mission.id, onUpdated])

  const handleRejectPlan = useCallback(async () => {
    try {
      await rejectMissionPlan(mission.id)
      setPlanModalOpen(false)
      toast.success('Plan rejected — replanning in progress')
      onUpdated?.()
    } catch {
      toast.error('Failed to reject plan')
    }
  }, [mission.id, onUpdated])

  const pendingAccessRequests = accessRequests.filter((request) => request.status === 'pending')

  const { approvingAccess, denyingAccess, handleApproveAccess, handleDenyAccess } =
    useMissionAccessApproval({
      missionId: mission.id,
      requests: pendingAccessRequests,
      setRequests: setAccessRequests,
      setSubtasks,
      onUpdated,
    })

  const handlePriorityChange = async (newPriority: MissionPriority) => {
    setCurrentPriority(newPriority)
    try {
      await updateMission(mission.id, { priority: newPriority })
      onUpdated()
    } catch (err) {
      setCurrentPriority(mission.priority)
      toast.error(
        err instanceof Error
          ? err.message
          : MISSION_DETAIL_ERRORS.PRIORITY_CHANGE_FAILED.userMessage,
      )
    }
  }

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'toast_if_disconnected',
    onDriveDisconnectedToast: 'Connect Google Drive to attach files.',
    onDropboxDisconnectedToast: 'Connect Dropbox to attach files.',
    onDriveStatusErrorToast: 'Connect Google Drive to attach files.',
    onDropboxStatusErrorToast: 'Connect Dropbox to attach files.',
  })

  const handleRatingSubmit = useCallback(
    async (payload: { thumbs_up: boolean | null; rating: number | null; feedback: string }) => {
      setRatingSending(true)
      try {
        await backendPost(`/api/missions/${mission.id}/rate`, payload)
        const localLog: MissionLog = {
          id: `local-rating-${Date.now()}`,
          mission_id: mission.id,
          user_id: '',
          event_type: 'user.rating',
          from_status: null,
          to_status: null,
          agent_key: null,
          correlation_id: null,
          payload: {
            thumbs_up: payload.thumbs_up,
            rating: payload.rating,
            feedback: payload.feedback || undefined,
          },
          created_at: new Date().toISOString(),
        }
        setMissionLogs((prev) => [...prev, localLog])
        setRatingSubmitted(true)
        setTimeout(() => activityEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } catch {
        toast.error('Failed to save rating')
      } finally {
        setRatingSending(false)
      }
    },
    [mission.id, setMissionLogs],
  )

  const handleStatusChange = async (_newStatus: MissionStatus) => undefined
  const planContent = prd?.content as PrdContent | null
  const { recommendedHires, sortedLogs } = getMissionDetailDisplayData(planContent, missionLogs)

  return (
    <MissionDetailModalView
      mission={mission}
      presentation={presentation}
      liveMission={liveMission}
      title={title}
      setTitle={setTitle}
      description={description}
      setDescription={setDescription}
      currentStatus={currentStatus}
      currentPriority={currentPriority}
      selectedSubtaskId={selectedSubtaskId}
      setSelectedSubtaskId={setSelectedSubtaskId}
      elevatedStacking={elevatedStacking}
      onClose={onClose}
      onUpdated={onUpdated}
      isMobile={isMobile}
      mobileScreen={mobileScreen}
      setMobileScreen={setMobileScreen}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
      menuAnchor={menuAnchor}
      setMenuAnchor={setMenuAnchor}
      prdLoading={prdLoading}
      logsLoading={logsLoading}
      planContent={planContent}
      planModalOpen={planModalOpen}
      onClosePlan={() => setPlanModalOpen(false)}
      recommendedHires={recommendedHires}
      sortedLogs={sortedLogs}
      subtasks={subtasks}
      setSubtasks={setSubtasks}
      agents={agents}
      userProfile={userProfile}
      deliverables={deliverables}
      previewDeliverable={previewDeliverable}
      setPreviewDeliverable={setPreviewDeliverable}
      pendingAccessRequests={pendingAccessRequests}
      approvingAccess={approvingAccess}
      denyingAccess={denyingAccess}
      onApproveAccess={handleApproveAccess}
      onDenyAccess={handleDenyAccess}
      commentText={commentText}
      sendingComment={sendingComment}
      setCommentText={setCommentText}
      onSendComment={handleSendComment}
      subtaskCommentText={subtaskCommentText}
      setSubtaskCommentText={setSubtaskCommentText}
      sendingSubtaskComment={sendingSubtaskComment}
      onSendSubtaskComment={handleSendSubtaskComment}
      approvingHumanGate={approvingHumanGate}
      onApproveHumanGate={handleApproveHumanGate}
      activityEndRef={activityEndRef}
      attachedFiles={attachedFiles}
      onRemoveFile={handleRemoveFile}
      onFileButtonClick={handleFileButtonClick}
      openDrive={openDrive}
      openDropbox={openDropbox}
      setShowLibraryPicker={setShowLibraryPicker}
      maxFiles={maxFiles}
      fileInputRef={fileInputRef}
      acceptedTypes={acceptedTypes}
      onFileSelect={handleFileSelect}
      onPasteFiles={handlePasteCommentImages}
      onRatingSubmit={handleRatingSubmit}
      ratingSending={ratingSending}
      ratingSubmitted={ratingSubmitted}
      onViewPlan={() => setPlanModalOpen(true)}
      onApprovePlan={handleApprovePlan}
      onRejectPlan={handleRejectPlan}
      approvingPlan={approvingPlan}
      autoApprovePlans={autoApprovePlans}
      onToggleAutoApprove={handleToggleAutoApprove}
      showDrivePicker={showDrivePicker}
      setShowDrivePicker={setShowDrivePicker}
      onSelectCloudFile={handleFileFromCloud}
      showDropboxPicker={showDropboxPicker}
      setShowDropboxPicker={setShowDropboxPicker}
      showLibraryPicker={showLibraryPicker}
      onSelectLibrary={handleLibrarySelect}
      onRetry={handleRetry}
      onArchive={handleArchive}
      onDelete={handleDelete}
      onStatusChange={handleStatusChange}
      onPriorityChange={handlePriorityChange}
      onExtendTrack={handleExtendTrack}
      onRerunSubtask={handleRerunSubtask}
      rerunningSubtaskId={rerunningSubtaskId}
    />
  )
}
