'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ChannelPickerModal, SpaceChannelBrainstormMenu } from '@/features/channels'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { SpaceCustomizeButton } from '../../components/toolbar'
import {
  buildSpaceChannelViewPatch,
  getChannelIdsFromView,
} from '../../lib/space-channel-view-patch'
import type { SpaceToolbarContext } from '../types'

/** Toolbar for channels / channel views. */
export function ChannelsToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  if (ctx.activeView?.type !== 'channels') {
    return <SingleChannelToolbarInner ctx={ctx} />
  }

  return <ChannelsIndexToolbarInner ctx={ctx} />
}

function SingleChannelToolbarInner({ ctx }: { ctx: SpaceToolbarContext }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const activeView = ctx.activeView
  const { handleViewPatch, schemaEditorOpen, closeCustomizePanel, openCustomizeFromToolbar } = ctx

  if (!activeView || activeView.type !== 'channel') return null

  const channelView = activeView
  const singleChannelId = channelView.channel_config?.channel_id ?? null
  const channelIds = getChannelIdsFromView(channelView)

  async function patchChannelSelection(nextIds: string[]) {
    await handleViewPatch(
      buildSpaceChannelViewPatch(channelView, nextIds, singleChannelId ?? nextIds[0]),
    )
  }

  return (
    <>
      <ToolbarShell ctx={ctx} channelsLayout>
        <div className="flex min-w-0 flex-nowrap items-center gap-1" />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <SaveViewSlot ctx={ctx} />
          {singleChannelId ? (
            <>
              <SpaceChannelBrainstormMenu channelId={singleChannelId} />
              <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            </>
          ) : null}
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <SpaceCustomizeButton
              schemaEditorOpen={schemaEditorOpen}
              closeCustomizePanel={closeCustomizePanel}
              openCustomizeFromToolbar={openCustomizeFromToolbar}
            />
            <Tooltip label="Add channel" side="bottom">
              <span className="inline-flex">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
                  aria-label="Add channel"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Channel
                </button>
              </span>
            </Tooltip>
          </div>
        </div>
      </ToolbarShell>

      <ChannelPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multi"
        selectedChannelIds={channelIds}
        onSelectChannels={(selected) => {
          void patchChannelSelection(selected.map((channel) => channel.id))
        }}
      />
    </>
  )
}

function ChannelsIndexToolbarInner({ ctx }: { ctx: SpaceToolbarContext }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const activeView = ctx.activeView
  const { handleViewPatch, schemaEditorOpen, closeCustomizePanel, openCustomizeFromToolbar } = ctx

  const config = useMemo(() => {
    if (!activeView || activeView.type !== 'channels') return { channel_ids: [] as string[] }
    return activeView.channels_config ?? { channel_ids: [] }
  }, [activeView])

  const channelIds = config.channel_ids ?? []

  if (!activeView || activeView.type !== 'channels') return null

  const channelsView = activeView
  const activeChannelId =
    config.active_channel_id && channelIds.includes(config.active_channel_id)
      ? config.active_channel_id
      : channelIds[0]

  async function patchChannelsConfig(nextIds: string[], activeId?: string) {
    await handleViewPatch(buildSpaceChannelViewPatch(channelsView, nextIds, activeId))
  }

  const showBrainstormInToolbar = channelIds.length > 0 && !!activeChannelId

  return (
    <>
      <ToolbarShell ctx={ctx} channelsLayout>
        <div className="flex min-w-0 flex-nowrap items-center gap-1" />

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <SaveViewSlot ctx={ctx} />
          {showBrainstormInToolbar ? (
            <>
              <SpaceChannelBrainstormMenu channelId={activeChannelId} />
              <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            </>
          ) : null}
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            <SpaceCustomizeButton
              schemaEditorOpen={schemaEditorOpen}
              closeCustomizePanel={closeCustomizePanel}
              openCustomizeFromToolbar={openCustomizeFromToolbar}
            />
            <Tooltip label="Add channel" side="bottom">
              <span className="inline-flex">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
                  aria-label="Add channel"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Channel
                </button>
              </span>
            </Tooltip>
          </div>
        </div>
      </ToolbarShell>

      <ChannelPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multi"
        selectedChannelIds={channelIds}
        onSelectChannels={(selected) => {
          const nextIds = selected.map((channel) => channel.id)
          void patchChannelsConfig(
            nextIds,
            activeChannelId && nextIds.includes(activeChannelId) ? activeChannelId : nextIds[0],
          )
        }}
      />
    </>
  )
}
