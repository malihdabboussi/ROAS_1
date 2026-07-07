'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check, Search, X } from 'lucide-react'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'
import { useChannels } from '../hooks/use-channels'
import type { Channel } from '../services/channels.service'
import { ChannelIcon } from './ChannelIcon'

type ChannelPickerMode = 'single' | 'multi'

export function ChannelPickerModal({
  open,
  onOpenChange,
  mode = 'single',
  selectedChannelIds = [],
  onSelectChannel,
  onSelectChannels,
  title = 'Add channels',
  description = "Choose the channels that belong in this space's flow.",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: ChannelPickerMode
  selectedChannelIds?: string[]
  onSelectChannel?: (channel: Channel) => void
  onSelectChannels?: (channels: Channel[]) => void
  title?: string
  description?: string
}) {
  const { channels, loading } = useChannels()
  const [query, setQuery] = useState('')
  const [draftIds, setDraftIds] = useState<string[]>(selectedChannelIds)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setDraftIds(selectedChannelIds)
  }, [open, selectedChannelIds])

  const selectedSet = useMemo(() => new Set(selectedChannelIds), [selectedChannelIds])
  const draftSet = useMemo(() => new Set(draftIds), [draftIds])

  const filteredChannels = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...channels].sort((a, b) => a.name.localeCompare(b.name))
    if (!q) return sorted
    return sorted.filter(
      (channel) =>
        channel.name.toLowerCase().includes(q) ||
        (channel.description ?? '').toLowerCase().includes(q),
    )
  }, [channels, query])

  function toggleDraft(channelId: string) {
    setDraftIds((current) =>
      current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId],
    )
  }

  function confirmMultiSelection() {
    const byId = new Map(channels.map((channel) => [channel.id, channel]))
    const picked = draftIds
      .map((id) => byId.get(id))
      .filter((channel): channel is Channel => !!channel)
    onSelectChannels?.(picked)
    onOpenChange(false)
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
          <div className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border bg-[var(--color-card)] shadow-2xl">
            <div className="px-spacing-6 pt-spacing-4 pb-spacing-2 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                    {description}
                  </DialogPrimitive.Description>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-icon-bare shrink-0"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 flex min-h-0 flex-1 flex-col">
              <div className="border-border bg-background gap-spacing-2 rounded-spacing-2 px-spacing-3 mb-spacing-3 flex items-center border">
                <Search className="icon-sm text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="body-3 text-foreground placeholder:text-muted-foreground py-spacing-2 min-w-0 flex-1 bg-transparent outline-none"
                />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                  <p className="body-3 text-muted-foreground py-spacing-6 text-center">
                    Loading channels...
                  </p>
                ) : filteredChannels.length === 0 ? (
                  <p className="body-3 text-muted-foreground py-spacing-6 text-center">
                    No channels match that search.
                  </p>
                ) : (
                  <div className="space-y-spacing-1">
                    {filteredChannels.map((channel) => {
                      const alreadySelected = selectedSet.has(channel.id)
                      const checked = mode === 'multi' ? draftSet.has(channel.id) : alreadySelected
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          disabled={mode === 'single' && alreadySelected}
                          onClick={() => {
                            if (mode === 'single') {
                              if (alreadySelected) return
                              onSelectChannel?.(channel)
                              onOpenChange(false)
                              return
                            }
                            toggleDraft(channel.id)
                          }}
                          className={cn(
                            'hover:bg-hover-subtle gap-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors',
                            checked && 'bg-muted/30',
                            mode === 'single' && alreadySelected && 'cursor-default opacity-70',
                          )}
                        >
                          <ChannelIcon channel={channel} className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="body-3 text-foreground block truncate font-medium">
                              {channel.name}
                            </span>
                            {channel.description ? (
                              <span className="body-4 text-muted-foreground line-clamp-1">
                                {channel.description}
                              </span>
                            ) : null}
                          </span>
                          {checked ? <Check className="icon-sm text-primary shrink-0" /> : null}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {mode === 'multi' ? (
              <div className="border-border px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between border-t">
                <span className="typo-caption text-muted-foreground">
                  {draftIds.length} selected
                </span>
                <div className="gap-spacing-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmMultiSelection}
                    className="button-glass-accent px-spacing-4 py-spacing-2 rounded-lg text-sm font-medium"
                  >
                    Add channels
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
