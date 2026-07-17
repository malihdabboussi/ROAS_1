'use client'

import type { ReactNode, RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AttachedFile } from '@/components/chat/FileAttachments'
import type { MissionAgent, MissionLog, MissionSubtask } from '../../types'
import { ActivityTimelineComposer } from './ActivityTimelineComposer'
import { ActivityTimelineLogList } from './ActivityTimelineLogList'
import type { RatingPayload } from './MissionRatingStrip'

const BOTTOM_SCROLL_THRESHOLD = 80

interface ActivityTimelineProps {
  logsLoading: boolean
  isMissionLinked: boolean
  sortedLogs: MissionLog[]
  subtasks: MissionSubtask[]
  agents: MissionAgent[]
  userProfile: { fullName: string; avatarUrl: string | null } | null
  createdAt: string
  commentText: string
  sendingComment: boolean
  onCommentChange: (value: string) => void
  onCommentSend: () => void
  activityEndRef: RefObject<HTMLDivElement | null>
  timelineKey?: string
  className?: string
  /** Optional content above the log feed (e.g. human gate review). */
  leadSlot?: ReactNode
  /** Sidebar title. Defaults to Activity. */
  title?: string
  /** Skip the empty-state illustration when leadSlot already fills the panel. */
  hideEmptyState?: boolean
  attachedFiles?: AttachedFile[]
  onRemoveFile?: (id: string) => void
  onFileButtonClick?: () => void
  onOpenDrive?: () => void
  onOpenDropbox?: () => void
  onOpenLibrary?: () => void
  maxFiles?: number
  fileInputRef?: RefObject<HTMLInputElement | null>
  acceptedTypes?: string
  onFileSelect?: (files: FileList | null) => void
  onPasteFiles?: (files: File[]) => void
  missionId?: string
  missionStatus?: string
  onRatingSubmit?: (payload: RatingPayload) => Promise<void>
  ratingSending?: boolean
  ratingSubmitted?: boolean
  onViewPlan?: () => void
  onApprove?: () => void
  onReject?: () => void
  approving?: boolean
  autoApprovePlans?: boolean
  onToggleAutoApprove?: (enabled: boolean) => void
}

export function ActivityTimeline({
  logsLoading,
  isMissionLinked,
  sortedLogs,
  subtasks,
  agents,
  userProfile,
  createdAt,
  commentText,
  sendingComment,
  onCommentChange,
  onCommentSend,
  activityEndRef,
  timelineKey,
  className = 'pb-spacing-2 hidden min-w-0 flex-1 shrink-0 lg:flex lg:flex-col',
  leadSlot,
  title = 'Activity',
  hideEmptyState = false,
  attachedFiles = [],
  onRemoveFile,
  onFileButtonClick,
  onOpenDrive,
  onOpenDropbox,
  missionStatus,
  onRatingSubmit,
  ratingSending,
  ratingSubmitted,
  onViewPlan,
  onApprove,
  onReject,
  approving,
  autoApprovePlans,
  onToggleAutoApprove,
  onOpenLibrary,
  maxFiles = 5,
  fileInputRef,
  acceptedTypes,
  onFileSelect,
  onPasteFiles,
}: ActivityTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false)
  const prevLogCountRef = useRef(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_SCROLL_THRESHOLD
    setUserHasScrolledUp(!atBottom)
  }, [])

  const handleScrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setUserHasScrolledUp(false)
  }, [])

  useEffect(() => {
    prevLogCountRef.current = 0
    setUserHasScrolledUp(false)
  }, [timelineKey])

  useEffect(() => {
    if (logsLoading) {
      prevLogCountRef.current = 0
      return
    }
    const el = scrollRef.current
    const len = sortedLogs.length
    if (!el || len === 0) {
      prevLogCountRef.current = len
      return
    }

    const prev = prevLogCountRef.current
    const initialLoad = prev === 0 && len > 0
    const grew = len > prev
    prevLogCountRef.current = len

    if (initialLoad || (grew && !userHasScrolledUp)) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
        requestAnimationFrame(() => handleScroll())
      })
      if (initialLoad) setUserHasScrolledUp(false)
    }
  }, [logsLoading, sortedLogs.length, userHasScrolledUp, handleScroll])

  return (
    <div className={className}>
      <div className="card-glass lg:rounded-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-border px-spacing-4 py-spacing-3 flex flex-shrink-0 items-center justify-between border-b">
          <h3 className="body-2 text-foreground font-semibold">{title}</h3>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
            {leadSlot ? (
              <div className="border-border px-spacing-4 pt-spacing-4 pb-spacing-3 border-b">
                {leadSlot}
              </div>
            ) : null}
            <ActivityTimelineLogList
              scrollRef={scrollRef}
              onScroll={handleScroll}
              logsLoading={logsLoading}
              isMissionLinked={isMissionLinked}
              sortedLogs={sortedLogs}
              subtasks={subtasks}
              agents={agents}
              userProfile={userProfile}
              createdAt={createdAt}
              activityEndRef={activityEndRef}
              missionStatus={missionStatus}
              onViewPlan={onViewPlan}
              onApprove={onApprove}
              onReject={onReject}
              approving={approving}
              autoApprovePlans={autoApprovePlans}
              onToggleAutoApprove={onToggleAutoApprove}
              hideEmptyState={hideEmptyState || Boolean(leadSlot)}
              nestScroll={false}
            />
          </div>

          {isMissionLinked && (
            <ActivityTimelineComposer
              userHasScrolledUp={userHasScrolledUp}
              hasLogs={sortedLogs.length > 0}
              onScrollToBottom={handleScrollToBottom}
              commentText={commentText}
              sendingComment={sendingComment}
              onCommentChange={onCommentChange}
              onCommentSend={onCommentSend}
              attachedFiles={attachedFiles}
              onRemoveFile={onRemoveFile}
              onFileButtonClick={onFileButtonClick}
              onOpenDrive={onOpenDrive}
              onOpenDropbox={onOpenDropbox}
              onOpenLibrary={onOpenLibrary}
              maxFiles={maxFiles}
              fileInputRef={fileInputRef}
              acceptedTypes={acceptedTypes}
              onFileSelect={onFileSelect}
              onPasteFiles={onPasteFiles}
              missionStatus={missionStatus}
              onRatingSubmit={onRatingSubmit}
              ratingSending={ratingSending}
              ratingSubmitted={ratingSubmitted}
            />
          )}
        </div>
      </div>
    </div>
  )
}
