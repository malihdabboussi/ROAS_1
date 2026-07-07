'use client'

import { useState } from 'react'
import { Loader2, RotateCcw, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { patchMessageMetadata } from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Message } from '@/features/studio/types'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { SPACES_ACTIONS_TOAST_ERRORS } from '../../config/spaces-toast-errors.config'
import { useSpacesStore } from '../../store/use-spaces-store'

type UndoState = 'undone' | 'redone' | null

function undoStateFromMessage(message: Message): UndoState {
  const value = message.metadata?.spaces_undo_state
  return value === 'undone' || value === 'redone' ? value : null
}

function skippedSentence(count: number): string {
  if (count === 0) return ''
  return `${count} ${count === 1 ? 'change was' : 'changes were'} skipped because the task changed after Vibey touched it.`
}

export function SpaceUndoButton({ message }: { message: Message }) {
  const undoAgentTaskEdits = useSpacesStore((s) => s.undoAgentTaskEdits)
  const updateMessage = useChatStore((s) => s.updateMessage)
  const [loading, setLoading] = useState(false)
  const undoState = undoStateFromMessage(message)
  const direction = undoState === 'undone' ? 'redo' : 'undo'
  const Icon = direction === 'undo' ? RotateCcw : RotateCw
  const tooltip = direction === 'undo' ? 'Undo task edits' : 'Redo task edits'

  const applyState = async (nextState: UndoState) => {
    const metadata = { ...message.metadata, spaces_undo_state: nextState }
    updateMessage(message.conversation_id, message.id, { metadata })
    await patchMessageMetadata(message.conversation_id, message.id, {
      spaces_undo_state: nextState,
    })
  }

  const handleClick = async (mode: 'strict' | 'force' = 'strict') => {
    if (loading) return
    setLoading(true)
    try {
      const result = await undoAgentTaskEdits(message.id, direction, mode)
      if (!result?.success) throw new Error('Undo did not complete')

      const undone = result.undone
      const skipped = result.skipped.length
      const action = direction === 'undo' ? 'reverted' : 'reapplied'

      if (undone === 0) {
        if (skipped > 0 && mode === 'strict') {
          toast(`${undone} ${action}. ${skippedSentence(skipped)}`, {
            action: {
              label: direction === 'undo' ? 'Undo anyway' : 'Redo anyway',
              onClick: () => void handleClick('force'),
            },
          })
          return
        }
        if (skipped > 0 && mode === 'force') {
          toast.error(SPACES_ACTIONS_TOAST_ERRORS.UNDO_FAILED.userMessage)
          return
        }
        if (direction === 'redo' && undoState === 'undone') {
          await applyState(null)
          toast.error(SPACES_ACTIONS_TOAST_ERRORS.REDO_NOTHING.userMessage)
        } else {
          toast.error(
            direction === 'undo'
              ? 'No task changes linked to this message to undo.'
              : 'Nothing to redo for this message.',
          )
        }
        return
      }

      await applyState(direction === 'undo' ? 'undone' : 'redone')
      if (skipped > 0 && mode === 'strict') {
        toast(`${undone} ${action}. ${skippedSentence(skipped)}`, {
          action: {
            label: direction === 'undo' ? 'Undo anyway' : 'Redo anyway',
            onClick: () => void handleClick('force'),
          },
        })
      } else {
        toast.success(`${undone} task ${undone === 1 ? 'change' : 'changes'} ${action}.`)
      }
    } catch (error) {
      toast.error(sanitizeUserError(error, SPACES_ACTIONS_TOAST_ERRORS.UNDO_FAILED.userMessage))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tooltip label={tooltip} side="top" delayMs={150}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        aria-label={tooltip}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icon className="text-muted-foreground h-3.5 w-3.5" />
        )}
      </button>
    </Tooltip>
  )
}
