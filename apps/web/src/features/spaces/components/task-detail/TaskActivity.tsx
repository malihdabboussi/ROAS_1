'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { ChannelComposer } from '@/components/channels/ChannelComposerAdapter'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { MissionDeliverable } from '@/lib/missions'
import type { TeamRosterEntry } from '@/lib/team'
import { useSpacePermission } from '../../hooks/use-space-permission'
import type { SpaceItemActivity } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { FieldDef } from '../../types/space-schema'
import type { SendToAgentInstructionsSeed } from './SendTaskToAgentModal'
import type { MissionLog } from './task-activity-types'
import { TaskActivityTimeline } from './TaskActivityTimeline'
import { useTaskActivityState } from './useTaskActivityState'

interface TaskActivityProps {
  spaceId: string
  itemId: string
  missionLogs: MissionLog[]
  createdAt: string
  allFields: FieldDef[]
  campaignId: string | null
  roster: TeamRosterEntry[]
  currentUserId: string | null
  /** Opens `DeliverablePreviewModal` in parent (e.g. task modal), same as mission / channel. */
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  /** Click handler for task entity-chip mentions in rendered activity comments. */
  onOpenTaskById?: (taskId: string) => void
  /** Click handler for conversation entity-chip mentions in rendered activity comments. */
  onOpenConversationById?: (conversationId: string) => void
  /** Opens send-to-agent modal (parent owns modal state). Optional seed pre-fills extra instructions. */
  onOpenSendToAgent?: (seed?: SendToAgentInstructionsSeed) => void
  /** Sync new comment rows into parent deliverables source immediately. */
  onActivityEntryAdded?: (entry: SpaceItemActivity) => void
  /** True while an automation/agent step is executing on this task. */
  isAgentWorking?: boolean
}

const BOTTOM_SCROLL_THRESHOLD = 80

export function TaskActivity({
  spaceId,
  itemId,
  missionLogs,
  createdAt,
  allFields,
  campaignId,
  roster,
  currentUserId,
  onOpenDeliverablePreview,
  onOpenTaskById,
  onOpenConversationById,
  onOpenSendToAgent,
  onActivityEntryAdded,
  isAgentWorking = false,
}: TaskActivityProps) {
  const space = useSpacesStore((s) => s.spaces.find((sp) => sp.id === spaceId) ?? null)
  const perm = useSpacePermission(space)
  const {
    loading,
    merged,
    authProfile,
    rosterAvatars,
    composerMembers,
    stoppingAgentActivityId,
    handleAssignToMeFromComposer,
    handleCommentDeleted,
    handleCommentUpdated,
    handleComposerSend,
    handleSetStatusFromComposer,
    handleStopAgent,
  } = useTaskActivityState({
    spaceId,
    itemId,
    missionLogs,
    campaignId,
    roster,
    currentUserId,
    onActivityEntryAdded,
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const prevCountRef = useRef(0)

  // Old saved task chips have a descriptive `title` attribute baked into their
  // HTML. Strip it (and force the tooltip text to "Open task") so the slow
  // native browser tooltip doesn't override our CSS `::after` tooltip.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    root.querySelectorAll('.entity-chip[data-entity-kind="task"]').forEach((el) => {
      if (el.hasAttribute('title')) el.removeAttribute('title')
      el.setAttribute('data-tooltip', 'Open task')
      el.setAttribute('aria-label', 'Open task')
    })
    root.querySelectorAll('.entity-chip[data-entity-kind="conversation"]').forEach((el) => {
      if (el.hasAttribute('title')) el.removeAttribute('title')
      el.setAttribute('data-tooltip', 'Open conversation')
      el.setAttribute('aria-label', 'Open conversation')
    })
  }, [merged])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SCROLL_THRESHOLD
    setUserScrolledUp(!atBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setUserScrolledUp(false)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    const len = merged.length
    if (!el || len === 0) {
      prevCountRef.current = len
      return
    }
    const prev = prevCountRef.current
    const initialLoad = prev === 0 && len > 0
    const grew = len > prev
    prevCountRef.current = len
    if (initialLoad || (grew && !userScrolledUp)) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [merged.length, userScrolledUp])

  const handleRunAgentFromComposer = useCallback(() => {
    onOpenSendToAgent?.()
  }, [onOpenSendToAgent])

  return (
    <div className="pb-spacing-2 flex min-w-0 flex-[4] shrink-0 flex-col">
      <div className="card-glass rounded-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="px-spacing-6 py-spacing-3 flex-shrink-0">
          <h3 className="body-3 font-semibold text-foreground">Activity</h3>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* Timeline scroll area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="px-spacing-6 py-spacing-3 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
          >
            <TaskActivityTimeline
              loading={loading}
              merged={merged}
              createdAt={createdAt}
              allFields={allFields}
              roster={roster}
              rosterAvatars={rosterAvatars}
              authProfile={authProfile}
              currentUserId={currentUserId}
              spaceId={spaceId}
              itemId={itemId}
              canEdit={perm.canEdit}
              isAgentWorking={isAgentWorking}
              stoppingAgentActivityId={stoppingAgentActivityId}
              onOpenDeliverablePreview={onOpenDeliverablePreview}
              onOpenTaskById={onOpenTaskById}
              onOpenConversationById={onOpenConversationById}
              onOpenSendToAgent={onOpenSendToAgent}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
              onStopAgent={handleStopAgent}
            />
          </div>

          {/* Scroll to bottom */}
          <div className="relative flex-shrink-0">
            {userScrolledUp && merged.length > 0 && (
              <div className="pointer-events-none absolute inset-x-0 -top-12 z-10 flex justify-center">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="border-border bg-card pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border shadow-lg transition-all hover:opacity-90"
                  aria-label="Scroll to latest activity"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Composer — match activity horizontal rhythm; clear space below the glass input.
                Per matrix: posting a comment requires `edit`. View-only members
                see no composer at all (no UI surface they can't act on). */}
            {isAgentWorking && !perm.canEdit ? (
              <div className="px-spacing-6 pt-spacing-2 pb-spacing-2">
                <AgentWorkingOnTaskBanner />
              </div>
            ) : null}
            {perm.canEdit ? (
              <div className="px-spacing-6 pb-spacing-4 pt-spacing-2">
                <div className={isAgentWorking ? 'bg-secondary rounded-2xl' : 'contents'}>
                  {isAgentWorking ? (
                    <div className="px-spacing-4 pt-spacing-2 pb-spacing-1">
                      <AgentWorkingOnTaskBanner />
                    </div>
                  ) : null}
                  <ChannelComposer
                    embedded={isAgentWorking}
                    channelId={`task-activity-${itemId}`}
                    members={composerMembers}
                    rosterAvatars={rosterAvatars}
                    entityMentionPeopleMembers={composerMembers}
                    campaignId={campaignId}
                    draftStorageKey={`vibey-task-draft:${spaceId}:${itemId}`}
                    onSend={handleComposerSend}
                    commandContext={{
                      kind: 'task',
                      onRunAgent: handleRunAgentFromComposer,
                      onAssignToMe: currentUserId ? handleAssignToMeFromComposer : undefined,
                      onSetStatus: handleSetStatusFromComposer,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function AgentWorkingOnTaskBanner() {
  return (
    <div className="gap-spacing-2 flex items-center">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
        <VibeyChatOrb state="thinking" style="elastic" />
      </div>
      <span className="body-3 text-muted-foreground">Agent is working on this task...</span>
    </div>
  )
}
