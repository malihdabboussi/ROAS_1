import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { MISSION_CONTROL_MESSAGES } from '../../config/messages.config'
import { completeHumanSubtask } from '../../services/mission-human-subtasks.service'
import { addMissionComment } from '../../services/missions.service'
import type { MissionLog, MissionSubtask } from '../../types'
import { MISSION_DETAIL_ERRORS } from '../../types'
import { buildSubtaskScopedMessage } from './subtask-detail'

interface UseSubtaskDetailStateParams {
  missionId: string
  initialSubtaskId: string | null
  subtasks: MissionSubtask[]
  setSubtasks: Dispatch<SetStateAction<MissionSubtask[]>>
  setMissionLogs: Dispatch<SetStateAction<MissionLog[]>>
  onUpdated: () => void
}

export function useSubtaskDetailState({
  missionId,
  initialSubtaskId,
  subtasks,
  setSubtasks,
  setMissionLogs,
  onUpdated,
}: UseSubtaskDetailStateParams) {
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(initialSubtaskId)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [approvingGate, setApprovingGate] = useState(false)

  useEffect(() => {
    setSelectedSubtaskId(initialSubtaskId)
  }, [initialSubtaskId])

  const sendComment = useCallback(async () => {
    const subtask = subtasks.find((item) => item.id === selectedSubtaskId)
    const message = commentText.trim()
    if (!subtask || !message || sendingComment) return
    setSendingComment(true)
    try {
      const newLog = await addMissionComment(missionId, buildSubtaskScopedMessage(subtask, message))
      setMissionLogs((prev) => [...prev, newLog])
      setCommentText('')
      if (subtask.assignee_type === 'human' && subtask.status === 'awaiting_human') {
        toast.success(MISSION_CONTROL_MESSAGES.HUMAN_GATE_CHANGES_SENT)
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, MISSION_DETAIL_ERRORS.SEND_COMMENT_FAILED.userMessage))
    } finally {
      setSendingComment(false)
    }
  }, [commentText, missionId, selectedSubtaskId, sendingComment, setMissionLogs, subtasks])

  const approveGate = useCallback(async () => {
    const subtask = subtasks.find((item) => item.id === selectedSubtaskId)
    if (
      !subtask ||
      subtask.assignee_type !== 'human' ||
      subtask.status !== 'awaiting_human' ||
      approvingGate
    ) {
      return
    }
    setApprovingGate(true)
    const summary = `Approved ${subtask.title}. Ready to continue.`
    try {
      const result = await completeHumanSubtask(missionId, subtask.id, { summary })
      const updatedAt = new Date().toISOString()
      setSubtasks((prev) =>
        prev.map((item) =>
          item.id === subtask.id
            ? {
                ...item,
                status: 'done',
                awaiting_human_since: null,
                sla_escalate_at: null,
                sla_escalated_at: null,
                deliverable_id: result.deliverable_id,
                output: {
                  ...item.output,
                  summary,
                  completed_by_human: true,
                  deliverable_id: result.deliverable_id,
                },
                updated_at: updatedAt,
              }
            : item,
        ),
      )
      toast.success(MISSION_CONTROL_MESSAGES.HUMAN_GATE_APPROVED)
      onUpdated()
    } catch (err) {
      toast.error(sanitizeUserError(err, MISSION_CONTROL_MESSAGES.HUMAN_GATE_APPROVAL_FAILED))
    } finally {
      setApprovingGate(false)
    }
  }, [approvingGate, missionId, onUpdated, selectedSubtaskId, setSubtasks, subtasks])

  return {
    selectedSubtaskId,
    setSelectedSubtaskId,
    subtaskCommentText: commentText,
    setSubtaskCommentText: setCommentText,
    sendingSubtaskComment: sendingComment,
    handleSendSubtaskComment: sendComment,
    approvingHumanGate: approvingGate,
    handleApproveHumanGate: approveGate,
  }
}
