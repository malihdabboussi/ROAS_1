'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { dmService } from '../services/dm.service'

interface UserStatusSetterProps {
  initialEmoji?: string | null
  initialText?: string | null
  onSaved?: (next: { emoji: string | null; text: string | null }) => void
}

export function UserStatusSetter({ initialEmoji, initialText, onSaved }: UserStatusSetterProps) {
  const [emoji, setEmoji] = useState(initialEmoji ?? '')
  const [text, setText] = useState(initialText ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        status_emoji: emoji.trim() || null,
        status_text: text.trim() || null,
      }
      await dmService.updateStatus(payload)
      onSaved?.({ emoji: payload.status_emoji, text: payload.status_text })
      toast.success('Status updated')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not save status'))
    } finally {
      setSaving(false)
    }
  }

  const clear = async () => {
    setEmoji('')
    setText('')
    setSaving(true)
    try {
      await dmService.updateStatus({ status_emoji: null, status_text: null })
      onSaved?.({ emoji: null, text: null })
      toast.success('Status cleared')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Could not clear status'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="surface-card border-subtle gap-spacing-3 rounded-spacing-3 p-spacing-4 flex w-72 flex-col border">
      <span className="body-3 text-foreground font-semibold">Set your status</span>
      <div className="gap-spacing-2 flex items-center">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          maxLength={4}
          placeholder=":)"
          className="surface-card-soft body-2 text-foreground rounded-spacing-2 px-spacing-2 py-spacing-1 w-12 text-center focus:outline-none"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder="What are you up to?"
          className="surface-card-soft body-3 text-foreground placeholder:text-muted-foreground rounded-spacing-2 px-spacing-2 py-spacing-1 flex-1 focus:outline-none"
        />
      </div>
      <div className="gap-spacing-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => void clear()}
          disabled={saving}
          className="body-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="button-medium bg-primary text-primary-foreground rounded-spacing-2 px-spacing-3 py-1 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
