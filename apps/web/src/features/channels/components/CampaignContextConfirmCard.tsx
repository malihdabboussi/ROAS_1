'use client'

import { useState } from 'react'
import { Check, FolderKanban, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { MessageContentBlock } from '@/features/studio/types'
import { useChannels } from '../hooks/use-channels'
import { channelsService } from '../services/channels.service'

type CampaignContextConfirmBlock = Extract<
  MessageContentBlock,
  { type: 'campaign_context_confirm' }
>

export function CampaignContextConfirmCard({
  block,
  channelId,
  messageId,
  allBlocks,
}: {
  block: CampaignContextConfirmBlock
  channelId: string
  messageId: string
  /** Full ordered block list of the message — persisted as a whole on resolve. */
  allBlocks: MessageContentBlock[]
}) {
  const { updateChannel } = useChannels()
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'dismissed'>(
    block.status ?? 'pending',
  )
  const [selectedId, setSelectedId] = useState<string | null>(
    block.suggested_campaign_id ?? block.options[0]?.id ?? null,
  )
  const [saving, setSaving] = useState(false)
  const [confirmedId, setConfirmedId] = useState<string | null>(block.confirmed_campaign_id ?? null)

  const persistBlockState = (
    nextStatus: 'confirmed' | 'dismissed',
    nextConfirmedId: string | null,
  ) => {
    const nextBlocks = allBlocks.map((item) =>
      item.id === block.id && item.type === 'campaign_context_confirm'
        ? { ...item, status: nextStatus, confirmed_campaign_id: nextConfirmedId }
        : item,
    ) as Array<Record<string, unknown>>
    // Fire-and-forget: the card already resolved locally; persistence only
    // keeps it resolved across reloads.
    void channelsService.patchMessageBlocks(channelId, messageId, nextBlocks).catch(() => {})
  }

  const handleConfirm = async () => {
    if (!selectedId || saving) return
    setSaving(true)
    try {
      await updateChannel(channelId, { default_campaign_id: selectedId })
      setConfirmedId(selectedId)
      setStatus('confirmed')
      persistBlockState('confirmed', selectedId)
    } catch {
      toast.error('Could not set channel context')
    } finally {
      setSaving(false)
    }
  }

  const handleDismiss = () => {
    if (saving) return
    setStatus('dismissed')
    persistBlockState('dismissed', null)
  }

  const campaignName = (id: string | null) =>
    block.options.find((option) => option.id === id)?.name ?? 'Campaign'

  if (status === 'confirmed') {
    return (
      <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
        <div className="gap-spacing-2 flex items-center">
          <Check className="icon-sm text-primary" aria-hidden />
          <p className="body-3 text-foreground">
            Channel context set to <span className="font-medium">{campaignName(confirmedId)}</span>.
            Change it in the Context tab.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'dismissed') {
    return (
      <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
        <p className="body-3 text-muted-foreground">
          Campaign selection dismissed — assign one anytime in the Context tab.
        </p>
      </div>
    )
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div className="gap-spacing-2 flex items-center">
        <FolderKanban className="icon-sm text-primary" aria-hidden />
        <h3 className="body-1 text-foreground font-medium">Pick this channel&apos;s campaign</h3>
      </div>
      <p className="body-3 text-muted-foreground mt-spacing-2">
        This channel isn&apos;t assigned to a campaign yet. Your choice is saved for everyone in the
        channel.
      </p>

      <div className="mt-spacing-3 border-border divide-border divide-y rounded-lg border">
        {block.options.map((option) => {
          const dataSummary = [
            option.avatar_count ? `${option.avatar_count} avatars` : null,
            option.offer_count ? `${option.offer_count} offers` : null,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <button
              key={option.id}
              type="button"
              disabled={saving}
              onClick={() => setSelectedId(option.id)}
              className={`hover:bg-hover-subtle flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors first:rounded-t-lg last:rounded-b-lg ${
                selectedId === option.id ? 'bg-primary/5' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="body-3 text-foreground block truncate font-medium">
                  {option.name}
                </span>
                {dataSummary && (
                  <span className="body-4 text-muted-foreground block">{dataSummary}</span>
                )}
              </span>
              {selectedId === option.id && (
                <Check className="text-primary h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-spacing-3 gap-spacing-2 flex">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={saving}
          className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 inline-flex items-center gap-1.5 font-medium disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Not now
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={saving || !selectedId}
          className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 inline-flex items-center gap-1.5 font-medium disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          {saving ? 'Saving…' : `Use ${campaignName(selectedId)}`}
        </button>
      </div>
    </div>
  )
}
