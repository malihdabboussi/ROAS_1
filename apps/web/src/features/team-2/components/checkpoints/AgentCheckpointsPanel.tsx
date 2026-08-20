'use client'

import { useCallback, useState } from 'react'
import { ArrowLeft, Eye, GitBranch, Pencil, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { cn } from '@/lib/utils/cn'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { useAgentCheckpoints } from '../../hooks/useAgentCheckpoints'
import {
  getCheckpoint,
  restoreCheckpoint,
  type AgentCheckpointDetail,
  type AgentCheckpointListItem,
} from '../../services/agent-checkpoints.service'
import { AgentCheckpointDiffModal } from './AgentCheckpointDiffModal'
import { AgentCheckpointRestoreDialog } from './AgentCheckpointRestoreDialog'

interface AgentCheckpointsSidebarProps {
  agentKey: string
  agentName?: string
  refreshSignal: number
  onBack?: () => void
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function kindLabel(kind: AgentCheckpointListItem['kind']): string {
  if (kind === 'baseline') return 'original'
  if (kind === 'restore') return 'restore'
  return 'auto'
}

export function AgentCheckpointsSidebar({
  agentKey,
  agentName,
  refreshSignal,
  onBack,
}: AgentCheckpointsSidebarProps) {
  const { checkpoints, loading, error, reload, rename } = useAgentCheckpoints(
    agentKey,
    true,
    refreshSignal,
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<AgentCheckpointDetail | null>(null)
  const [previous, setPrevious] = useState<AgentCheckpointDetail | null>(null)
  const [restoring, setRestoring] = useState<AgentCheckpointListItem | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)

  const openDiff = useCallback(
    async (checkpoint: AgentCheckpointListItem) => {
      setSelectedId(checkpoint.id)
      const detail = await getCheckpoint(agentKey, checkpoint.id)
      setViewing(detail.checkpoint)
      setPrevious(detail.previous_checkpoint)
    },
    [agentKey],
  )

  const commitRename = useCallback(
    async (checkpoint: AgentCheckpointListItem) => {
      const next = draft.trim()
      setEditingId(null)
      if (!next || next === checkpoint.summary) return
      try {
        await rename(checkpoint.id, next.slice(0, 140))
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Could not rename checkpoint'))
      }
    },
    [draft, rename],
  )

  const confirmRestore = useCallback(async () => {
    if (!restoring) return
    setRestoreBusy(true)
    try {
      await restoreCheckpoint(agentKey, restoring.id)
      toast.success('Version restored')
      setRestoring(null)
      await reload()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not restore version'))
    } finally {
      setRestoreBusy(false)
    }
  }, [agentKey, reload, restoring])

  return (
    <>
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="gap-spacing-1 flex shrink-0 flex-col border-b border-[var(--color-border)] p-3">
          <div className="gap-spacing-2 flex items-center">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-hover-subtle)]"
                aria-label="Back to chat"
                title="Back to chat"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <p className="body-3 min-w-0 flex-1 font-semibold text-[var(--foreground)]">
              {agentName ? `${agentName} · History` : 'History'}
            </p>
          </div>
          <p className="body-4 text-[var(--color-muted-foreground)]">Jump back to earlier edits.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="p-4">
              <ListSkeleton rows={4} label="Loading history…" />
            </div>
          )}
          {error && <p className="body-4 text-destructive p-4 text-center">{error}</p>}
          {!loading && !error && checkpoints.length === 0 && (
            <div className="p-6 text-center">
              <GitBranch className="mx-auto h-6 w-6 text-[var(--color-muted-foreground)]" />
              <p className="body-3 mt-2 font-semibold">No checkpoints yet</p>
              <p className="body-4 text-muted-foreground mt-1">
                Edits will show up here as you work.
              </p>
            </div>
          )}
          <div className="gap-spacing-1 flex flex-col">
            {!loading &&
              !error &&
              checkpoints.map((checkpoint) => {
                const selected = checkpoint.id === selectedId
                const renaming = editingId === checkpoint.id
                return (
                  <div
                    key={checkpoint.id}
                    className={cn(
                      'group/checkpoint px-spacing-2 py-spacing-1 flex items-start gap-2 rounded-xl transition-colors',
                      selected
                        ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                    )}
                  >
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      <GitBranch className="text-[var(--color-muted-foreground)]/70 h-3.5 w-3.5" />
                    </div>
                    {renaming ? (
                      <input
                        autoFocus
                        value={draft}
                        maxLength={140}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => void commitRename(checkpoint)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commitRename(checkpoint)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-primary)] bg-[var(--background)] px-1.5 py-0.5 font-medium text-[var(--foreground)] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => void openDiff(checkpoint)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="body-3 truncate font-medium text-[var(--foreground)]">
                          {checkpoint.summary}
                        </p>
                        <p className="body-4 truncate text-[var(--color-muted-foreground)]">
                          {formatDate(checkpoint.created_at)} · {kindLabel(checkpoint.kind)}
                          {checkpoint.summary_edited_at ? ' · edited' : ''}
                        </p>
                      </button>
                    )}
                    <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Rename checkpoint"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDraft(checkpoint.summary)
                          setEditingId(checkpoint.id)
                        }}
                        className={cn(
                          'rounded-md p-1 text-[var(--color-muted-foreground)] transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                          renaming ? 'opacity-100' : 'opacity-0 group-hover/checkpoint:opacity-100',
                        )}
                      >
                        <Pencil className="icon-xs" />
                      </button>
                      <button
                        type="button"
                        aria-label="View checkpoint"
                        onClick={(e) => {
                          e.stopPropagation()
                          void openDiff(checkpoint)
                        }}
                        className="rounded-md p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] group-hover/checkpoint:opacity-100"
                      >
                        <Eye className="icon-xs" />
                      </button>
                      <button
                        type="button"
                        aria-label="Restore checkpoint"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRestoring(checkpoint)
                        }}
                        className="rounded-md p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] group-hover/checkpoint:opacity-100"
                      >
                        <RotateCcw className="icon-xs" />
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
      <AgentCheckpointDiffModal
        open={!!viewing}
        checkpoint={viewing}
        previousCheckpoint={previous}
        onClose={() => {
          setViewing(null)
          setPrevious(null)
        }}
      />
      <AgentCheckpointRestoreDialog
        checkpoint={restoring}
        restoring={restoreBusy}
        onCancel={() => setRestoring(null)}
        onConfirm={confirmRestore}
      />
    </>
  )
}
