'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { Channel } from '@/lib/channels'

const CHANNEL_NAME_MAX = 80

const PREFIX_SUGGESTIONS: Array<{ prefix: string; description: string }> = [
  {
    prefix: 'help',
    description: 'For questions, assistance, and resources on a topic',
  },
  {
    prefix: 'proj',
    description: 'For collaboration on and discussion about a project',
  },
  {
    prefix: 'team',
    description: 'For updates and work from a department or team',
  },
]

function normalizeChannelName(raw: string): string {
  return raw.replace(/^#+\s*/, '').trim()
}

export function CreateChannelModal({
  open,
  onOpenChange,
  channels,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  channels: Channel[]
  onCreate: (payload: { name: string; is_private: boolean }) => Promise<Channel>
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const normalizedName = useMemo(() => normalizeChannelName(name), [name])

  const duplicate = useMemo(() => {
    const n = normalizedName.toLowerCase()
    if (!n) return false
    return channels.some((c) => c.name.trim().toLowerCase() === n)
  }, [channels, normalizedName])

  const nameTooLong = normalizedName.length > CHANNEL_NAME_MAX
  const step1Valid = normalizedName.length > 0 && !duplicate && !nameTooLong

  useEffect(() => {
    if (open) {
      setStep(1)
      setName('')
      setIsPrivate(false)
      setSubmitting(false)
      setCreateError(null)
    }
  }, [open])

  const handleOpenChange = (next: boolean) => {
    if (!next && submitting) return
    onOpenChange(next)
  }

  const handleNameChange = (raw: string) => {
    const stripped = raw.replace(/^#+\s*/, '')
    if (stripped.length <= CHANNEL_NAME_MAX) setName(stripped)
  }

  const applyPrefix = (prefix: string) => {
    const next = `${prefix}-`
    if (next.length <= CHANNEL_NAME_MAX) setName(next)
  }

  const goNext = () => {
    if (!step1Valid) return
    setStep(2)
  }

  const handleCreate = async () => {
    if (!step1Valid || submitting) return
    setSubmitting(true)
    setCreateError(null)
    try {
      await onCreate({ name: normalizedName, is_private: isPrivate })
      onOpenChange(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create channel.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onPointerDownOutside={(e) => {
            if (submitting) e.preventDefault()
          }}
        >
          <div
            className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    Create a channel
                  </DialogPrimitive.Title>
                  {step === 2 && (
                    <p className="body-3 text-muted-foreground mt-spacing-1 font-mono">
                      #{normalizedName}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  disabled={submitting}
                  className="btn-icon-bare shrink-0 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
              {step === 1 && (
                <div className="space-y-spacing-3">
                  <div>
                    <label
                      htmlFor="create-channel-name"
                      className="body-2 text-foreground mb-spacing-1 block"
                    >
                      Name
                    </label>
                    <div className="border-border bg-background focus-within:ring-ring gap-spacing-2 rounded-spacing-2 px-spacing-2 flex items-center border focus-within:ring-2">
                      <span className="body-3 text-muted-foreground shrink-0" aria-hidden>
                        #
                      </span>
                      <input
                        id="create-channel-name"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && step1Valid) {
                            e.preventDefault()
                            goNext()
                          }
                        }}
                        placeholder="e.g. plan-budget"
                        maxLength={CHANNEL_NAME_MAX}
                        autoComplete="off"
                        className="body-3 text-foreground placeholder:text-muted-foreground py-spacing-2 min-w-0 flex-1 bg-transparent outline-none"
                        aria-invalid={duplicate || nameTooLong}
                        aria-describedby={
                          duplicate || nameTooLong ? 'create-channel-name-hint' : undefined
                        }
                      />
                      <span className="body-4 text-muted-foreground shrink-0 tabular-nums">
                        {CHANNEL_NAME_MAX - name.length}
                      </span>
                    </div>
                    {(duplicate || nameTooLong) && (
                      <p
                        id="create-channel-name-hint"
                        className="body-4 text-destructive mt-spacing-1"
                      >
                        {duplicate
                          ? 'A channel with this name already exists. Choose a different name.'
                          : `Name must be at most ${CHANNEL_NAME_MAX} characters.`}
                      </p>
                    )}
                  </div>

                  <div className="border-border rounded-spacing-2 border">
                    <p className="typo-caption text-muted-foreground border-border px-spacing-3 py-spacing-2 border-b">
                      Suggestions
                    </p>
                    <ul className="max-h-40 overflow-y-auto">
                      {PREFIX_SUGGESTIONS.map((s) => (
                        <li key={s.prefix} className="border-border border-b last:border-b-0">
                          <button
                            type="button"
                            onClick={() => applyPrefix(s.prefix)}
                            className="hover:bg-hover-subtle px-spacing-3 py-spacing-2 w-full text-left transition-colors"
                          >
                            <span className="body-3 text-foreground font-medium">{s.prefix}</span>
                            <span className="body-4 text-muted-foreground block">
                              {s.description}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-spacing-4">
                  <p className="body-2 text-foreground font-medium">Visibility</p>

                  <div className="space-y-spacing-2">
                    <label
                      className={[
                        'gap-spacing-3 rounded-spacing-2 p-spacing-3 flex cursor-pointer items-start border transition-colors',
                        !isPrivate
                          ? 'border-primary bg-muted'
                          : 'border-border hover:bg-hover-subtle',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="channel-visibility"
                        checked={!isPrivate}
                        onChange={() => setIsPrivate(false)}
                        className="border-border accent-primary mt-1 h-4 w-4 shrink-0"
                      />
                      <span>
                        <span className="body-2 text-foreground block">
                          Public — anyone in Vibey
                        </span>
                      </span>
                    </label>

                    <label
                      className={[
                        'gap-spacing-3 rounded-spacing-2 p-spacing-3 flex cursor-pointer items-start border transition-colors',
                        isPrivate
                          ? 'border-primary bg-muted'
                          : 'border-border hover:bg-hover-subtle',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="channel-visibility"
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

                  {createError && <p className="body-4 text-destructive">{createError}</p>}
                </div>
              )}
            </div>

            <div className="border-border px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between border-t">
              <span className="typo-caption text-muted-foreground">Step {step} of 2</span>
              {step === 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!step1Valid}
                  className="button-glass-accent px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                </button>
              ) : (
                <div className="gap-spacing-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={!step1Valid || submitting}
                    className="button-glass-accent px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium disabled:pointer-events-none disabled:opacity-40"
                  >
                    {submitting ? 'Creating…' : 'Create'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
