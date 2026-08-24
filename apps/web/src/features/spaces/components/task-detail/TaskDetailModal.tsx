'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import type { MissionDeliverable } from '@/lib/missions'
import {
  resolveSpaceTaskUpdateError,
  SPACES_ACTIONS_TOAST_ERRORS,
} from '../../config/spaces-toast-errors.config'
import { useTaskDetailData } from '../../hooks/useTaskDetailData'
import { canUpdateLinkedMissionTaskStatus } from '../../lib/linked-mission-task-status'
import { createSpaceItem, deleteSpaceItem, updateSpaceItem } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import { ShareModal } from '../ShareModal'
import { useSpaceItemUpdate } from '../SpaceStatusCascadeConfirmProvider'
import { TaskMenuDropdown } from '../task-menu/TaskMenuDropdown'
import { SendTaskToAgentModal, type SendToAgentInstructionsSeed } from './SendTaskToAgentModal'
import type { TaskDetailModalProps } from './task-detail-modal.types'
import { TaskActivity } from './TaskActivity'
import { TaskDetailHeader } from './TaskDetailHeader'
import { TaskDetailMainPanel } from './TaskDetailMainPanel'
import { TaskDetailPresentationShell } from './TaskDetailPresentationShell'
import { useCampaignTaskAgents } from './use-campaign-task-agents'

export * from './home-task-detail-entry'

export function TaskDetailModal({
  presentation = 'modal',
  item: initialItem,
  allFields,
  activeView,
  spaceSchema,
  onViewPatch,
  roster,
  currentUserId,
  campaignId,
  onNavigateToSpace,
  onNavigateToView,
  breadcrumbParentCrumb,
  canGoBack,
  onBack,
  onOpenTaskByItem,
  onOpenConversationById,
  onClose,
  onUpdated,
  onUpdateItem,
  externalTaskMirror,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
}: TaskDetailModalProps) {
  const [item, setItem] = useState(initialItem)
  const [title, setTitle] = useState(initialItem.title)
  const [, setDeleting] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [sendToAgentOpen, setSendToAgentOpen] = useState(false)
  const [sendToAgentInstructionsSeed, setSendToAgentInstructionsSeed] = useState<string | null>(
    null,
  )
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const {
    subtasks,
    taskDeliverables,
    missionLogs,
    loading,
    reload,
    setSubtasks,
    appendActivityRow,
  } = useTaskDetailData(item)
  const [previewDeliverable, setPreviewDeliverable] = useState<MissionDeliverable | null>(null)
  const missionAgents = useCampaignTaskAgents(campaignId)
  useEffect(() => {
    setPortalTarget(document.body)
  }, [])
  useEffect(() => {
    setItem(initialItem)
    setTitle(initialItem.title)
  }, [initialItem])
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[data-vibey-mention-suggestions]')) return
      if (shareOpen) {
        setShareOpen(false)
        return
      }
      if (sendToAgentOpen) {
        setSendToAgentOpen(false)
        return
      }
      onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, shareOpen, sendToAgentOpen])
  const storeUpdateItem = useSpaceItemUpdate()
  const pushToAgent = useSpacesStore((s) => s.pushToAgent)
  const openConversationInSpaceChat = useSpacesStore((s) => s.openConversationInSpaceChat)
  const setChatCollapsed = useSpacesStore((s) => s.setChatCollapsed)
  const storeItems = useSpacesStore((s) => s.items)
  const spaceName = useSpacesStore(
    (s) => s.spaces.find((sp) => sp.id === item.space_id)?.title ?? null,
  )
  const viewName = activeView.name ?? null
  const handleOpenTaskById = useCallback(
    (taskId: string) => {
      if (!onOpenTaskByItem) return
      const next = storeItems.find((i) => i.id === taskId)
      if (next) {
        onOpenTaskByItem(next)
      } else {
        toast.error('Task not loaded — open it from its space first')
      }
    },
    [storeItems, onOpenTaskByItem],
  )
  const handleOpenConversationById = useCallback(
    (conversationId: string) => {
      if (onOpenConversationById) {
        onOpenConversationById(conversationId)
        return
      }
      openConversationInSpaceChat(conversationId)
      setChatCollapsed(false)
      onClose()
    },
    [onOpenConversationById, openConversationInSpaceChat, setChatCollapsed, onClose],
  )
  const handleUpdateField = useCallback(
    async (patch: Partial<SpaceItem>) => {
      const previous = item
      // Status may open the “also complete subtasks?” confirm — wait before painting Done.
      const deferOptimistic = typeof patch.status === 'string'
      if (!deferOptimistic) {
        setItem({ ...item, ...patch } as SpaceItem)
      }
      try {
        const canUpdate =
          !patch.status ||
          (await canUpdateLinkedMissionTaskStatus(item, patch.status, () =>
            toast.message(SPACES_ACTIONS_TOAST_ERRORS.LINKED_AGENT_STEP_STATUS_MANAGED.userMessage),
          ))
        if (!canUpdate) return
        if (onUpdateItem) await onUpdateItem(item, patch)
        else await storeUpdateItem(item.id, patch)
        const fresh = useSpacesStore.getState().items.find((row) => row.id === item.id)
        if (fresh) setItem(fresh)
        else setItem((current) => ({ ...current, ...patch }) as SpaceItem)
      } catch {
        setItem(previous)
        toast.error(
          resolveSpaceTaskUpdateError(
            Boolean(item.linked_mission_subtask_id),
            patch.status === 'done',
          ),
        )
      }
    },
    [item, onUpdateItem, storeUpdateItem],
  )
  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitle(item.title)
      return
    }
    if (trimmed !== item.title) {
      void handleUpdateField({ title: trimmed })
    }
  }, [title, item.title, handleUpdateField])
  const handleDescriptionChange = useCallback(
    (description: string | null) => {
      void handleUpdateField({ description })
    },
    [handleUpdateField],
  )

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await deleteSpaceItem(item.space_id, item.id)
      onUpdated()
      onClose()
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }, [item.space_id, item.id, onUpdated, onClose])

  const handleUpdateSubtask = useCallback(
    async (subtaskId: string, patch: Partial<SpaceItem>) => {
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subtaskId ? ({ ...s, ...patch } as SpaceItem) : s)),
      )
      try {
        await updateSpaceItem(item.space_id, subtaskId, patch)
      } catch {
        reload()
        toast.error('Failed to update subtask')
      }
    },
    [item.space_id, setSubtasks, reload],
  )

  const handleCreateSubtask = useCallback(
    async (subtaskTitle: string, extra: Record<string, unknown> = {}) => {
      try {
        const newSub = await createSpaceItem(item.space_id, {
          title: subtaskTitle,
          parent_item_id: item.id,
          ...extra,
        })
        setSubtasks((prev) => [...prev, newSub])
      } catch {
        toast.error('Failed to create subtask')
      }
    },
    [item.space_id, item.id, setSubtasks],
  )

  const handleDeleteSubtask = useCallback(
    async (subtaskId: string) => {
      await useSpacesStore.getState().deleteItem(subtaskId)
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId))
      onUpdated()
    },
    [setSubtasks, onUpdated],
  )

  const [taskSubtasksSectionCollapsedMap, setTaskSubtasksSectionCollapsedMap] = useState<
    Record<string, boolean>
  >({})
  const subtasksSectionCollapsed = taskSubtasksSectionCollapsedMap[item.id] ?? false
  const setSubtasksSectionCollapsed = useCallback(
    (collapsed: boolean) => {
      setTaskSubtasksSectionCollapsedMap((prev) => ({
        ...prev,
        [item.id]: collapsed,
      }))
    },
    [item.id],
  )

  const tree = (
    <TaskDetailPresentationShell presentation={presentation} onClose={onClose}>
      <TaskDetailHeader
        committedTitle={item.title}
        liveTitle={title}
        spaceName={spaceName}
        viewName={viewName}
        viewType={activeView.type ?? null}
        onNavigateToSpace={onNavigateToSpace}
        onNavigateToView={onNavigateToView}
        breadcrumbParentCrumb={breadcrumbParentCrumb}
        canGoBack={canGoBack}
        onBack={onBack}
        onShare={() => setShareOpen(true)}
        onClose={onClose}
        onOpenMenu={(anchor) => setMenuAnchor(anchor)}
      />
      {menuAnchor ? (
        <TaskMenuDropdown
          task={item}
          anchorRef={{ current: menuAnchor }}
          onClose={() => setMenuAnchor(null)}
          onChanged={onUpdated}
          subtaskCount={subtasks.length}
          onDelete={() => void handleDelete()}
          onSendToAgent={() => {
            setMenuAnchor(null)
            setSendToAgentInstructionsSeed(null)
            setSendToAgentOpen(true)
          }}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left panel: title + main fields + subtasks + deliverables & media scroll together.
              Title lives in here (not in TaskDetailHeader) so the right-side Activity
              panel spans the full modal-body height. */}
        <TaskDetailMainPanel
          item={item}
          title={title}
          allFields={allFields}
          activeView={activeView}
          spaceSchema={spaceSchema}
          onViewPatch={onViewPatch}
          roster={roster}
          currentUserId={currentUserId}
          taskDeliverables={taskDeliverables}
          subtasks={subtasks}
          loading={loading}
          subtasksSectionCollapsed={subtasksSectionCollapsed}
          onSubtasksSectionCollapsedChange={setSubtasksSectionCollapsed}
          onTitleChange={setTitle}
          onTitleBlur={handleTitleBlur}
          onUpdateField={(patch) => void handleUpdateField(patch)}
          onDescriptionChange={handleDescriptionChange}
          onUpdateSubtask={(id, patch) => void handleUpdateSubtask(id, patch)}
          onCreateSubtask={handleCreateSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          onEditStatuses={onEditStatuses}
          onEditCategories={onEditCategories}
          onPushToAgent={pushToAgent}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          onOpenTaskDetail={onOpenTaskByItem}
          onRefresh={async () => reload()}
          onSelectDeliverable={(d) => setPreviewDeliverable(d)}
        />

        {presentation === 'modal' ? (
          <TaskActivity
            spaceId={item.space_id}
            itemId={item.id}
            missionLogs={missionLogs}
            createdAt={item.created_at}
            allFields={allFields}
            campaignId={campaignId}
            roster={roster}
            currentUserId={currentUserId}
            onOpenDeliverablePreview={(d) => setPreviewDeliverable(d)}
            onOpenTaskById={onOpenTaskByItem ? handleOpenTaskById : undefined}
            onOpenConversationById={handleOpenConversationById}
            onOpenSendToAgent={(seed?: SendToAgentInstructionsSeed) => {
              setSendToAgentInstructionsSeed(seed?.html ?? null)
              setSendToAgentOpen(true)
            }}
            onActivityEntryAdded={appendActivityRow}
            isAgentWorking={item.task_execution_status === 'running'}
            onSendExternalComment={externalTaskMirror?.onSendComment}
          />
        ) : null}
      </div>

      {previewDeliverable && (
        <DeliverablePreviewModal
          deliverable={previewDeliverable}
          agents={missionAgents}
          campaignId={campaignId ?? previewDeliverable.campaign_id ?? null}
          hideOpenSourceMission
          fallbackSpaceId={item.space_id}
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={() => setPreviewDeliverable(null)}
          onArtifactCampaignChanged={() => void reload()}
          onDeliverableRenamed={() => void reload()}
        />
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        entityType="item"
        spaceId={item.space_id}
        entityId={item.id}
        entityName={item.title}
        item={item}
        roster={roster}
        onItemPatch={async (patch) => {
          await handleUpdateField(patch)
        }}
      />

      <SendTaskToAgentModal
        open={sendToAgentOpen}
        onClose={() => {
          setSendToAgentOpen(false)
          setSendToAgentInstructionsSeed(null)
        }}
        spaceItem={item}
        allFields={allFields}
        roster={roster}
        campaignId={campaignId}
        currentUserId={currentUserId}
        initialInstructionsHtml={sendToAgentInstructionsSeed}
        onSent={() => void reload()}
      />
    </TaskDetailPresentationShell>
  )

  if (presentation === 'panel') return tree
  return portalTarget ? createPortal(tree, portalTarget) : null
}
