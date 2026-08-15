'use client'

import { useMemo, useRef, type LucideIcon, type RefObject } from 'react'
import { FolderKanban, Layers, Plus, X } from 'lucide-react'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations'
import {
  useConversationScopeCampaigns,
  useConversationScopeFallbackCampaign,
  useConversationScopeFallbackSpace,
} from '@/components/conversations/use-conversation-scope-data'
import type { Conversation } from '@/lib/conversations'
import { assignConversationScope } from '@/lib/conversations'
import { useCampaignCacheVersion } from '@/lib/home'
import { useOrgStore } from '@/lib/org'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'

export function ShellRightPanelConnections({
  conversation,
  campaignId,
  spaceId,
  pickerRef,
  onConversationUpdated,
  onScopeChanged,
  onOpenCampaign,
}: {
  conversation: Conversation | null
  campaignId: string | null
  spaceId: string | null
  pickerRef?: RefObject<ConversationScopePickerHandle | null>
  onConversationUpdated?: (conversation: Conversation) => void
  onScopeChanged?: (scope: { campaignId: string | null; spaceId: string | null }) => void
  onOpenCampaign?: (campaignId: string) => void
}) {
  const localPickerRef = useRef<ConversationScopePickerHandle>(null)
  const scopePickerRef = pickerRef ?? localPickerRef
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const cacheVersion = useCampaignCacheVersion()
  const campaigns = useConversationScopeCampaigns(activeOrgId, cacheVersion)
  const fallbackCampaign = useConversationScopeFallbackCampaign(campaignId, campaigns)
  const campaign = campaigns.find((row) => row.id === campaignId) ?? fallbackCampaign
  const space = useConversationScopeFallbackSpace({
    activeOrgId,
    selectedCampaignId: null,
    selectedSpaceId: spaceId,
    spacesByCampaign: {},
  })
  const rows = useMemo(() => {
    const items: Array<{ id: string; title: string; type: string; icon: LucideIcon }> = []
    if (campaignId) {
      items.push({
        id: 'campaign',
        title: campaign?.name?.trim() || 'Campaign',
        type: 'Campaign',
        icon: FolderKanban,
      })
    }
    if (spaceId) {
      items.push({
        id: 'space',
        title: space?.title?.trim() || 'Space',
        type: 'Space',
        icon: Layers,
      })
    }
    return items
  }, [campaign?.name, campaignId, space?.title, spaceId])

  const clearScope = async () => {
    if (!conversation) {
      onScopeChanged?.({ campaignId: null, spaceId: null })
      return
    }
    const updated = await assignConversationScope(conversation.id, null, null)
    onConversationUpdated?.(updated)
    onScopeChanged?.({ campaignId: null, spaceId: null })
  }

  return (
    <section aria-label="Connections" className="gap-spacing-2 flex flex-col">
      <div className="gap-spacing-2 flex items-center">
        <h3 className="typo-section-label text-muted-foreground min-w-0 flex-1">Connections</h3>
        <button
          ref={addButtonRef}
          type="button"
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground p-spacing-1 rounded-lg transition-colors"
          aria-label="Add connection"
          title="Add connection"
          onClick={() => scopePickerRef.current?.openMenuFromBanner()}
        >
          <Plus className="icon-sm" aria-hidden />
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="body-3 text-muted-foreground">
          {SHELL_RIGHT_PANEL_MESSAGES.connectionsEmpty}
        </p>
      ) : (
        <ul>
          {rows.map((row) => {
            const Icon = row.icon
            return (
              <li key={row.id}>
                {/* Name left, type right — the type reads as the row's value
                    instead of a second line that repeats what the icon says. */}
                <div className="gap-spacing-2 px-spacing-3 py-spacing-1-5 hover:bg-hover-subtle group flex items-center rounded-lg transition-colors">
                  <Icon className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                  <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                    {row.title}
                  </span>
                  <span className="body-4 text-muted-foreground shrink-0">{row.type}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Remove ${row.title} connection`}
                    onClick={() => void clearScope()}
                  >
                    <X className="icon-sm" aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <ConversationScopePicker
        ref={scopePickerRef}
        conversation={conversation}
        campaignId={campaignId}
        spaceId={spaceId}
        hideTrigger
        bannerAnchorRef={addButtonRef}
        onConversationUpdated={onConversationUpdated}
        onScopeChanged={onScopeChanged}
        onOpenCampaign={onOpenCampaign}
      />
    </section>
  )
}
