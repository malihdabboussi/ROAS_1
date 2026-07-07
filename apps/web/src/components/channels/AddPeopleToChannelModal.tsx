'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Bot, Hash, Lock, X } from 'lucide-react'
import type { Channel, ChannelMember } from '@/lib/channels'
import type { TeamRosterEntry } from '@/lib/team'

export type AddPeopleToChannelPurpose = 'afterCreate' | 'addMembers'

export interface AddPeopleToChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: Channel | null
  purpose?: AddPeopleToChannelPurpose
  existingMemberKeys?: Set<string>
  onMembersAdded?: () => void
  roster: TeamRosterEntry[]
  currentUserId: string | null
  workspaceName?: string
  onAddMembers: (entries: TeamRosterEntry[]) => Promise<void> | void
}

export function channelMembersToRosterKeys(members: ChannelMember[]): Set<string> {
  const keys = new Set<string>()
  for (const member of members) {
    if (member.member_type === 'user' && member.user_id) keys.add(`human:${member.user_id}`)
    if (member.member_type === 'agent' && member.agent_key) keys.add(`agent:${member.agent_key}`)
  }
  return keys
}

const EMPTY_KEY_SET = new Set<string>()

function rosterKey(entry: TeamRosterEntry): string | null {
  if (entry.kind === 'human' && entry.user_id) return `human:${entry.user_id}`
  if (entry.kind === 'agent' && entry.agent_key) return `agent:${entry.agent_key}`
  return null
}

function RosterAvatar({ entry, size = 'md' }: { entry: TeamRosterEntry; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-spacing-6 w-spacing-6' : 'h-spacing-7 w-spacing-7'

  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <span
      className={`${sizeClass} bg-muted typo-caption text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-full font-semibold uppercase`}
    >
      {entry.kind === 'agent' ? <Bot className="icon-sm" /> : entry.display_name.charAt(0)}
    </span>
  )
}

export function AddPeopleToChannelModal({
  open,
  onOpenChange,
  channel,
  purpose = 'afterCreate',
  existingMemberKeys,
  onMembersAdded,
  roster,
  currentUserId,
  workspaceName = 'your workspace',
  onAddMembers,
}: AddPeopleToChannelModalProps) {
  const blockedMemberKeys = existingMemberKeys ?? EMPTY_KEY_SET
  const [selected, setSelected] = useState<TeamRosterEntry[]>([])
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [skipPanelVisible, setSkipPanelVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const isPrivate = channel?.is_private ?? false
  const selectedKeys = useMemo(
    () => new Set(selected.map((entry) => rosterKey(entry)).filter(Boolean) as string[]),
    [selected],
  )

  const reset = useCallback(() => {
    setSelected([])
    setSearch('')
    setDropdownOpen(false)
    setSkipPanelVisible(false)
    setSubmitting(false)
    setActionError(null)
  }, [])

  useEffect(() => {
    reset()
  }, [open, reset])

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return []

    return roster
      .filter((entry) => {
        const key = rosterKey(entry)
        if (!key) return false
        if (blockedMemberKeys.has(key)) return false
        if (selectedKeys.has(key)) return false
        if (entry.kind === 'human' && entry.user_id === currentUserId) return false
        return (
          entry.display_name.toLowerCase().includes(query) ||
          (entry.email?.toLowerCase().includes(query) ?? false) ||
          (entry.agent_key?.toLowerCase().includes(query) ?? false)
        )
      })
      .slice(0, 10)
  }, [blockedMemberKeys, currentUserId, roster, search, selectedKeys])

  useEffect(() => {
    if (!dropdownOpen) return

    const handler = (event: MouseEvent) => {
      if (
        !inputRef.current?.contains(event.target as Node) &&
        !dropdownRef.current?.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const pickEntry = (entry: TeamRosterEntry) => {
    setSelected((prev) => [...prev, entry])
    setSearch('')
    setDropdownOpen(false)
    inputRef.current?.focus()
  }

  const removeSelected = (key: string) => {
    setSelected((prev) => prev.filter((entry) => rosterKey(entry) !== key))
  }

  const closeModal = useCallback(() => {
    reset()
    onOpenChange(false)
  }, [onOpenChange, reset])

  const handleDone = async () => {
    if (!channel) return
    setSubmitting(true)
    setActionError(null)

    try {
      await onAddMembers(selected)
      onMembersAdded?.()
      closeModal()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not add members.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleHeaderClose = () => {
    if (purpose === 'addMembers') {
      closeModal()
      return
    }
    if (skipPanelVisible) {
      closeModal()
      return
    }
    setSkipPanelVisible(true)
  }

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      if (submitting) return
      closeModal()
      return
    }
    onOpenChange(next)
  }

  if (!channel) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleDialogOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onPointerDownOutside={(event) => {
            if (submitting) event.preventDefault()
          }}
        >
          <div
            className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-visible border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground flex flex-wrap items-center gap-x-1 gap-y-1">
                    <span>Add people to</span>
                    {isPrivate ? (
                      <Lock className="icon-md shrink-0" aria-hidden />
                    ) : (
                      <Hash className="icon-md shrink-0" aria-hidden />
                    )}
                    <span className="font-mono">{channel.name}</span>
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-4 text-muted-foreground mt-spacing-1">
                    Search for people in {workspaceName} to add.
                  </DialogPrimitive.Description>
                </div>
                <button
                  type="button"
                  onClick={handleHeaderClose}
                  disabled={submitting}
                  className="btn-icon-bare shrink-0 disabled:opacity-50"
                  aria-label={
                    purpose === 'addMembers'
                      ? 'Close'
                      : skipPanelVisible
                        ? 'Close'
                        : 'Skip adding people'
                  }
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-visible">
              <div className="relative">
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setDropdownOpen(true)
                  }}
                  onFocus={() => {
                    if (search.trim()) setDropdownOpen(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && dropdownOpen && filteredResults.length > 0) {
                      event.preventDefault()
                      pickEntry(filteredResults[0]!)
                    }
                  }}
                  placeholder="Search by name, email or agent key..."
                  className="border-border bg-background body-3 text-foreground placeholder:text-muted-foreground px-spacing-4 py-spacing-2 focus-visible:border-border w-full rounded-lg border outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  autoComplete="off"
                />

                {dropdownOpen && filteredResults.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="border-border bg-card rounded-spacing-2 z-dropdown absolute left-0 right-0 top-full mt-spacing-1 max-h-56 overflow-y-auto border shadow-lg"
                  >
                    {filteredResults.map((entry) => {
                      const key = rosterKey(entry)
                      if (!key) return null
                      return (
                        <button
                          key={key}
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            pickEntry(entry)
                          }}
                          className="hover:bg-hover-subtle gap-spacing-3 px-spacing-4 py-spacing-2 flex w-full items-center text-left transition-colors"
                        >
                          <RosterAvatar entry={entry} />
                          <div className="min-w-0 flex-1">
                            <p className="body-3 text-foreground truncate font-medium">
                              {entry.display_name}
                            </p>
                            {entry.email && (
                              <p className="body-4 text-muted-foreground truncate">
                                {entry.email}
                              </p>
                            )}
                          </div>
                          {entry.kind === 'agent' && (
                            <span className="body-4 text-muted-foreground flex shrink-0 items-center gap-1">
                              <Bot className="icon-xs" /> Agent
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {dropdownOpen && search.trim() && filteredResults.length === 0 && (
                  <div className="border-border bg-card rounded-spacing-2 z-dropdown absolute left-0 right-0 top-full mt-spacing-1 border shadow-lg">
                    <p className="body-3 text-muted-foreground px-spacing-4 py-spacing-3">
                      No results for "{search}"
                    </p>
                  </div>
                )}
              </div>

              {selected.length > 0 && (
                <div className="gap-spacing-2 flex flex-wrap">
                  {selected.map((entry) => {
                    const key = rosterKey(entry)
                    if (!key) return null
                    return (
                      <div
                        key={key}
                        className="border-border bg-muted gap-spacing-2 group flex items-center rounded-full border py-1 pl-1 pr-2"
                      >
                        <RosterAvatar entry={entry} size="sm" />
                        <span className="body-3 text-foreground font-medium">
                          {entry.display_name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelected(key)}
                          className="text-muted-foreground hover:text-foreground ml-0.5 rounded-full p-0.5 opacity-0 transition-all group-hover:opacity-100"
                          aria-label={`Remove ${entry.display_name}`}
                        >
                          <X className="icon-xs" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {actionError && <p className="body-4 text-destructive">{actionError}</p>}
            </div>

            <div className="px-spacing-6 py-spacing-4 relative flex shrink-0 items-center justify-end">
              <button
                type="button"
                onClick={() => void handleDone()}
                disabled={submitting || selected.length === 0}
                className="button-default button-glass-primary disabled:pointer-events-none disabled:opacity-40"
              >
                {submitting ? 'Adding...' : `Add${selected.length > 0 ? ` ${selected.length}` : ''}`}
              </button>
            </div>

            {purpose === 'afterCreate' && (
              <div
                className={[
                  'add-channel-people-skip-panel border-border bg-card px-spacing-6 py-spacing-4 absolute inset-x-0 bottom-0 z-10 border-t shadow-2xl',
                  skipPanelVisible ? 'is-visible' : '',
                ].join(' ')}
                role="region"
                aria-label="Skip adding people"
              >
                <p className="title-h6 text-foreground">Skip adding people?</p>
                <p className="body-3 text-muted-foreground mt-spacing-2">
                  You can always add members later from the channel header.
                </p>
                <div className="mt-spacing-4 gap-spacing-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSkipPanelVisible(false)}
                    className="button-default button-glass-neutral"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="button-default button-glass-primary"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
