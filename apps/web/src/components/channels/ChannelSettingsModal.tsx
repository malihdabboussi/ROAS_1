'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import type { Channel } from '@/lib/channels'

export function ChannelSettingsModal({
  open,
  onOpenChange,
  channel,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: Channel | null
  onSave: (payload: { description: string | null; is_private: boolean }) => Promise<void>
}) {
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !channel) return
    setDescription(channel.description ?? '')
    setIsPrivate(channel.is_private)
    setSubmitting(false)
    setError(null)
  }, [open, channel])

  const handleSave = async () => {
    if (!channel || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSave({
        description: description.trim() || null,
        is_private: isPrivate,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save channel settings.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="z-modal-backdrop fixed inset-0"
          {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}
        />
        <DialogPrimitive.Content
          className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center"
          {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}
        >
          <div className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border shadow-2xl">
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    Channel settings
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    Update this channel's description and visibility.
                  </DialogPrimitive.Description>
                  {channel ? (
                    <p className="body-3 text-muted-foreground mt-spacing-1 font-mono">
                      #{channel.name}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                  className="btn-icon-bare shrink-0 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div>
                <label
                  htmlFor="channel-settings-description"
                  className="body-2 text-foreground mb-spacing-1 block"
                >
                  Description
                </label>
                <textarea
                  id="channel-settings-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this channel for?"
                  className="border-border bg-background body-3 text-foreground placeholder:text-muted-foreground px-spacing-3 py-spacing-2 w-full resize-none rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-spacing-2">
                <p className="body-2 text-foreground font-medium">Visibility</p>
                <label
                  className={[
                    'gap-spacing-3 rounded-spacing-2 p-spacing-3 flex cursor-pointer items-start border transition-colors',
                    !isPrivate ? 'border-primary bg-muted' : 'border-border hover:bg-hover-subtle',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="channel-settings-visibility"
                    checked={!isPrivate}
                    onChange={() => setIsPrivate(false)}
                    className="border-border accent-primary mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="body-2 text-foreground block">Public — anyone in Vibey</span>
                  </span>
                </label>
                <label
                  className={[
                    'gap-spacing-3 rounded-spacing-2 p-spacing-3 flex cursor-pointer items-start border transition-colors',
                    isPrivate ? 'border-primary bg-muted' : 'border-border hover:bg-hover-subtle',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="channel-settings-visibility"
                    checked={isPrivate}
                    onChange={() => setIsPrivate(true)}
                    className="border-border accent-primary mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="body-2 text-foreground block">
                      Private — only specific people
                    </span>
                    <span className="body-4 text-muted-foreground mt-spacing-1 block">
                      Can only be viewed or joined by invitation.
                    </span>
                  </span>
                </label>
              </div>

              {error ? <p className="body-4 text-destructive">{error}</p> : null}
            </div>

            <div className="border-border px-spacing-6 py-spacing-4 gap-spacing-2 flex shrink-0 items-center justify-end border-t">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={submitting || !channel}
                className="button-glass-accent px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
