'use client'

import { useMemo, useRef, type RefObject } from 'react'
import { FolderKanban, Plus, X } from 'lucide-react'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations'
import {
  useConversationScopeCampaigns,
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
  const campaign = campaigns.find((row) => row.id === campaignId) ?? null
  const space = useConversationScopeFallbackSpace({
    activeOrgId,
    selectedCampaignId: null,
    selectedSpaceId: spaceId,
    spacesByCampaign: {},
  })
  const rows = useMemo(() => {
    const items: Array<{ id: string; title: string; subtitle: string }> = []
    if (campaignId) {
      items.push({
        id: 'campaign',
        title: campaign?.name?.trim() || 'Campaign',
        subtitle: 'Campaign',
      })
    }
    if (spaceId) {
      items.push({
        id: 'space',
        title: space?.title?.trim() || 'Space',
        subtitle: 'Space',
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
        <h3 className="typo-caption text-muted-foreground min-w-0 flex-1 font-medium uppercase tracking-wide">
          Connections
        </h3>
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
        <ul className="space-y-spacing-1">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="gap-spacing-2 px-spacing-2 py-spacing-2 flex items-center rounded-lg">
                <FolderKanban className="icon-sm text-muted-foreground shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="body-3 text-foreground truncate">{row.title}</p>
                  <p className="body-4 text-muted-foreground">{row.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-spacing-1 rounded-lg transition-colors"
                  aria-label={`Remove ${row.title} connection`}
                  onClick={() => void clearScope()}
                >
                  <X className="icon-sm" aria-hidden />
                </button>
              </div>
            </li>
          ))}
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
