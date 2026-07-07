'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, ChevronDown, Clock3, Info, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { BrainQueueUiJob } from '../hooks/use-brain-queue'

interface BrainProcessingQueueProps {
  jobs: BrainQueueUiJob[]
  loading?: boolean
  onCancel?: (jobId: string) => void
  onRetry?: (jobId: string) => void
  onDismiss?: (jobId: string) => void
}

function buildResultSummary(job: BrainQueueUiJob): string {
  const result = (job.result ?? {}) as Record<string, unknown>
  const memories = typeof result.memories_created === 'number' ? result.memories_created : null
  const snapshots = typeof result.snapshots_created === 'number' ? result.snapshots_created : null
  if (memories != null || snapshots != null) {
    return `${memories ?? 0} memories, ${snapshots ?? 0} snapshots`
  }

  const entriesInserted =
    typeof result.entriesInserted === 'number'
      ? result.entriesInserted
      : typeof result.entries_inserted === 'number'
        ? result.entries_inserted
        : null
  const duplicate = result.duplicate === true

  if (entriesInserted != null) {
    if (entriesInserted === 0 && duplicate) return 'Already in brain'
    if (entriesInserted === 0) return 'No new knowledge found'
    return `${entriesInserted} knowledge entries`
  }

  return 'Done'
}

function QueueJobRow({
  job,
  onCancel,
  onRetry,
  onDismiss,
}: {
  job: BrainQueueUiJob
  onCancel?: (jobId: string) => void
  onRetry?: (jobId: string) => void
  onDismiss?: (jobId: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const isRetrying = job.isRetrying === true
  const isActive = job.status === 'queued' || job.status === 'processing' || job.status === 'retry'
  const isFailed = job.status === 'failed'
  const isBrainOps = job.queue_kind === 'brain_ops'

  const rowClass = job.isFading ? 'opacity-0 transition-opacity duration-300' : 'opacity-100'

  const showActiveActions = hovered && isActive && onCancel && !isBrainOps
  const showFailedActions = hovered && isFailed && (onRetry || onDismiss) && !isBrainOps

  return (
    <div
      className={`bg-muted/20 rounded-lg px-2 py-2 ${rowClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          {(job.status === 'processing' || job.status === 'retry' || isRetrying) && (
            <div className="h-6 w-6 scale-[0.7]">
              <VibeyChatOrb state="executing" />
            </div>
          )}
          {job.status === 'queued' && <Clock3 className="text-muted-foreground h-3 w-3" />}
          {job.status === 'succeeded' && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
          {job.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-red-400" />}
        </div>
        <p className="body-4 text-foreground min-w-0 flex-1 truncate font-medium">{job.title}</p>
        {showActiveActions ? (
          <Tooltip
            label={job.status === 'queued' ? 'Remove from queue' : 'Stop & remove'}
            side="top"
          >
            <button
              type="button"
              onClick={() => onCancel(job.id)}
              className="text-muted-foreground flex shrink-0 items-center justify-center rounded p-0.5 transition-colors hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Tooltip>
        ) : showFailedActions ? (
          <span className="flex shrink-0 items-center gap-1">
            {onRetry && (
              <Tooltip label="Retry" side="top">
                <button
                  type="button"
                  onClick={() => onRetry(job.id)}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center rounded p-0.5 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
            {onDismiss && (
              <Tooltip label="Delete" side="top">
                <button
                  type="button"
                  onClick={() => onDismiss(job.id)}
                  className="text-muted-foreground flex items-center justify-center rounded p-0.5 transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
          </span>
        ) : (
          <span className="typo-caption text-muted-foreground flex shrink-0 items-center gap-1">
            {job.status === 'processing' && 'Processing...'}
            {job.status === 'queued' && 'In queue'}
            {job.status === 'retry' && (
              <>
                {isRetrying ? 'Retrying now...' : 'Retrying...'}
                {job.last_error && (
                  <Tooltip label={job.last_error} side="top" wide>
                    <Info className="h-3 w-3 cursor-help text-amber-400/70" />
                  </Tooltip>
                )}
              </>
            )}
            {job.status === 'succeeded' && buildResultSummary(job)}
            {job.status === 'failed' && (
              <>
                Failed
                {job.last_error?.trim() && (
                  <Tooltip label={job.last_error.trim()} side="top" wide>
                    <Info className="h-3 w-3 cursor-help text-red-400/70" />
                  </Tooltip>
                )}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

export default function BrainProcessingQueue({
  jobs,
  onCancel,
  onRetry,
  onDismiss,
}: BrainProcessingQueueProps) {
  const [expanded, setExpanded] = useState(false)
  const [queueHovered, setQueueHovered] = useState(false)
  const previousJobIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const previousIds = previousJobIdsRef.current
    const hasNewJob = jobs.some((job) => !previousIds.has(job.id))
    if (hasNewJob && jobs.length > 0) setExpanded(true)
    previousJobIdsRef.current = new Set(jobs.map((job) => job.id))
  }, [jobs])

  const processingCount = useMemo(
    () =>
      jobs.filter(
        (job) => job.status === 'queued' || job.status === 'processing' || job.status === 'retry',
      ).length,
    [jobs],
  )

  const retryableJobs = useMemo(
    () =>
      jobs.filter((job) => job.status === 'failed' && job.queue_kind !== 'brain_ops' && onRetry),
    [jobs, onRetry],
  )

  const removableJobs = useMemo(
    () =>
      jobs.filter((job) => {
        if (job.queue_kind === 'brain_ops') return false
        const isActive =
          job.status === 'queued' || job.status === 'processing' || job.status === 'retry'
        return (isActive && onCancel) || (job.status === 'failed' && onDismiss)
      }),
    [jobs, onCancel, onDismiss],
  )

  const showRetryAll = queueHovered && retryableJobs.length > 0
  const showRemoveAll = queueHovered && removableJobs.length > 0

  const handleRetryAll = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      for (const job of retryableJobs) onRetry?.(job.id)
    },
    [onRetry, retryableJobs],
  )

  const handleRemoveAll = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      for (const job of removableJobs) {
        const isActive =
          job.status === 'queued' || job.status === 'processing' || job.status === 'retry'
        if (isActive) onCancel?.(job.id)
        else if (job.status === 'failed') onDismiss?.(job.id)
      }
    },
    [onCancel, onDismiss, removableJobs],
  )

  if (jobs.length === 0) return null

  return (
    <div
      className="surface-card border-border mb-2 w-[420px] max-w-[92vw] overflow-hidden rounded-xl border"
      onMouseEnter={() => setQueueHovered(true)}
      onMouseLeave={() => setQueueHovered(false)}
    >
      <div
        className="flex cursor-pointer items-center justify-between px-3 py-1.5"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="typo-caption text-foreground font-medium">
          {`${processingCount} processing`}
        </span>
        <div className="flex items-center gap-1">
          <AnimatePresence initial={false}>
            {showRetryAll ? (
              <motion.span
                key="queue-retry-all"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex shrink-0 items-center"
              >
                <Tooltip label="Retry all" side="top">
                  <button
                    type="button"
                    onClick={handleRetryAll}
                    className="text-muted-foreground hover:text-foreground flex items-center justify-center rounded p-0.5 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </Tooltip>
              </motion.span>
            ) : null}
            {showRemoveAll ? (
              <motion.span
                key="queue-remove-all"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{
                  duration: 0.15,
                  delay: showRetryAll ? 0.05 : 0,
                  ease: 'easeOut',
                }}
                className="flex shrink-0 items-center"
              >
                <Tooltip label="Remove all" side="top">
                  <button
                    type="button"
                    onClick={handleRemoveAll}
                    className="text-muted-foreground flex items-center justify-center rounded p-0.5 transition-colors hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Tooltip>
              </motion.span>
            ) : null}
          </AnimatePresence>
          <ChevronDown
            className={`icon-xs text-muted-foreground transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`}
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="queue-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-border max-h-[200px] overflow-y-auto border-t px-2 pb-2">
              <div className="space-y-1 pt-1">
                {jobs.map((job) => (
                  <QueueJobRow
                    key={job.id}
                    job={job}
                    onCancel={onCancel}
                    onRetry={onRetry}
                    onDismiss={onDismiss}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
