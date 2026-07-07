'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { fetchCampaigns, resolveArtifactCampaigns } from '@/lib/campaigns'
import type { ChannelMember, ChannelMessage } from '@/lib/channels'
import {
  extractDeliverablesFromMessage,
  readCampaignFromMetadata,
  type Deliverable,
} from '../lib/channel-deliverables'
import {
  deliverableToMissionDeliverable,
  ENTITY_TABLE_FOR_ARTIFACT,
  RESOLVABLE_ARTIFACT_TABLES,
} from '../lib/channel-deliverable-mission-mapping'
import { timeFilterMs, type FilterState } from '../lib/channel-deliverable-filters'
import { DeliverableCard } from './ChannelDeliverableCard'
import { DeliverablesActiveFilterChips } from './DeliverablesActiveFilterChips'
import { DeliverablesFilterDropdown } from './DeliverablesFilterDropdown'

export function DeliverablesView({
  messages,
  members,
  rosterAvatars,
  onOpenThread: _onOpenThread,
  threadFilterId,
  onClearThreadFilter,
}: {
  messages: ChannelMessage[]
  members: ChannelMember[]
  rosterAvatars?: Map<string, string>
  onOpenThread?: (messageId: string) => void
  threadFilterId?: string | null
  onClearThreadFilter?: () => void
}) {
  const [filterState, setFilterState] = useState<FilterState>({
    types: new Set(),
    time: 'any',
    senders: new Set(),
    threadId: null,
    campaigns: new Set(),
  })
  const [previewItem, setPreviewItem] = useState<Deliverable | null>(null)
  const [artifactCampaignRefreshNonce, setArtifactCampaignRefreshNonce] = useState(0)
  const [campaignOptions, setCampaignOptions] = useState<{ id: string; name: string }[]>([])
  const [artifactCampaignByKey, setArtifactCampaignByKey] = useState<Record<string, string[]>>({})

  const bumpArtifactCampaignResolution = useCallback(() => {
    setArtifactCampaignRefreshNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchCampaigns()
      .then((list) => {
        if (cancelled) return
        const opts = list
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setCampaignOptions(opts)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const campaignLabelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of campaignOptions) m.set(c.id, c.name)
    return m
  }, [campaignOptions])

  const effectiveThreadFilter = filterState.threadId ?? threadFilterId ?? null

  const scopedMessages = useMemo(() => {
    if (!effectiveThreadFilter) return messages
    return messages.filter(
      (m) => m.id === effectiveThreadFilter || m.reply_to_id === effectiveThreadFilter,
    )
  }, [messages, effectiveThreadFilter])

  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages])

  const campaignResolver = useMemo(
    () => (msg: ChannelMessage) => {
      let cur: ChannelMessage | undefined = msg
      const seen = new Set<string>()
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id)
        const cid = readCampaignFromMetadata(cur.metadata as Record<string, unknown> | null)
        if (cid) return cid
        if (!cur.reply_to_id) break
        cur = messageById.get(cur.reply_to_id)
      }
      return null
    },
    [messageById],
  )

  const allDeliverables = useMemo(() => {
    const items: Deliverable[] = []
    for (const msg of scopedMessages) {
      items.push(...extractDeliverablesFromMessage(msg, rosterAvatars, campaignResolver))
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [scopedMessages, rosterAvatars, campaignResolver])

  const artifactResolutionSig = useMemo(() => {
    const pairs: { table: string; id: string }[] = []
    const seen = new Set<string>()
    for (const d of allDeliverables) {
      const aType = d.artifactType ?? ''
      const table = ENTITY_TABLE_FOR_ARTIFACT[aType]
      if (!table || !RESOLVABLE_ARTIFACT_TABLES.has(table)) continue
      const id = d.artifactId?.trim()
      if (!id) continue
      const k = `${table}:${id}`
      if (seen.has(k)) continue
      seen.add(k)
      pairs.push({ table, id })
    }
    return pairs.length === 0
      ? ''
      : pairs
          .map((p) => `${p.table}:${p.id}`)
          .sort()
          .join('|')
  }, [allDeliverables])

  useEffect(() => {
    if (!artifactResolutionSig) {
      setArtifactCampaignByKey({})
      return
    }
    const pairs = artifactResolutionSig.split('|').map((part) => {
      const i = part.indexOf(':')
      return { table: part.slice(0, i), id: part.slice(i + 1) }
    })
    let cancelled = false
    resolveArtifactCampaigns(pairs).then((map) => {
      if (!cancelled) setArtifactCampaignByKey(map)
    })
    return () => {
      cancelled = true
    }
  }, [artifactResolutionSig, artifactCampaignRefreshNonce])

  const deliverablesWithCampaigns = useMemo(() => {
    return allDeliverables.map((d) => {
      const aType = d.artifactType ?? ''
      const table = ENTITY_TABLE_FOR_ARTIFACT[aType]
      if (!table || !RESOLVABLE_ARTIFACT_TABLES.has(table)) return d
      const id = d.artifactId?.trim()
      if (!id) return d
      const k = `${table}:${id}`
      if (!(k in artifactCampaignByKey)) return d
      const ids = artifactCampaignByKey[k]
      if (!ids?.length) return d
      return { ...d, campaignIds: ids, campaignId: ids[0] ?? d.campaignId }
    })
  }, [allDeliverables, artifactCampaignByKey])

  const filtered = useMemo(() => {
    let result = deliverablesWithCampaigns

    if (filterState.types.size > 0) result = result.filter((d) => filterState.types.has(d.type))

    if (filterState.time !== 'any') {
      const cutoff = Date.now() - timeFilterMs(filterState.time)
      result = result.filter((d) => new Date(d.createdAt).getTime() >= cutoff)
    }

    if (filterState.senders.size > 0) {
      result = result.filter((d) => {
        const key = d.agentKey ?? d.messageId
        if (filterState.senders.has(key)) return true
        if (d.agentKey && filterState.senders.has(d.agentKey)) return true
        if (!d.agentKey) {
          for (const msg of messages) {
            if (msg.id === d.messageId && filterState.senders.has(msg.sender_id)) return true
          }
        }
        return false
      })
    }

    if (filterState.campaigns.size > 0) {
      result = result.filter((d) => {
        const ids = d.campaignIds?.length ? d.campaignIds : d.campaignId ? [d.campaignId] : []
        return ids.some((cid) => filterState.campaigns.has(cid))
      })
    }

    return result
  }, [deliverablesWithCampaigns, filterState, messages])

  const activeCount =
    (filterState.types.size > 0 ? 1 : 0) +
    (filterState.time !== 'any' ? 1 : 0) +
    (filterState.senders.size > 0 ? 1 : 0) +
    (effectiveThreadFilter ? 1 : 0) +
    (filterState.campaigns.size > 0 ? 1 : 0)

  const senderLabelMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const mem of members) {
      if (mem.member_type === 'agent' && mem.agent_key) m.set(mem.agent_key, mem.agent_key)
      else if (mem.member_type === 'user' && mem.user_id)
        m.set(mem.user_id, mem.profile?.full_name ?? mem.user_id)
    }
    return m
  }, [members])

  const clearAll = () => {
    setFilterState({
      types: new Set(),
      time: 'any',
      senders: new Set(),
      threadId: null,
      campaigns: new Set(),
    })
    onClearThreadFilter?.()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 px-4 py-3 md:px-6">
        <DeliverablesActiveFilterChips
          filterState={filterState}
          effectiveThreadFilter={effectiveThreadFilter}
          senderLabelMap={senderLabelMap}
          campaignLabelMap={campaignLabelMap}
          onFilterStateChange={setFilterState}
          onClearThreadFilter={onClearThreadFilter}
        />

        <div className="ml-auto">
          <DeliverablesFilterDropdown
            messages={messages}
            members={members}
            filterState={filterState}
            threadFilterId={threadFilterId}
            onFilterChange={setFilterState}
            onClearAll={clearAll}
            onClearThreadFilter={onClearThreadFilter}
            rosterAvatars={rosterAvatars}
            campaignOptions={campaignOptions}
            campaignLabelMap={campaignLabelMap}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <ImageIcon className="text-muted-foreground h-8 w-8" />
          {activeCount > 0 ? (
            <>
              <p className="body-3 text-muted-foreground text-center">
                No items match the current filters.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="text-primary hover:text-primary/80 text-xs font-medium"
              >
                Clear filters
              </button>
            </>
          ) : (
            <p className="body-3 text-muted-foreground text-center">
              No media or deliverables yet. Files and images shared in this channel will appear
              here.
            </p>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((item) => (
              <DeliverableCard key={item.id} item={item} onClick={() => setPreviewItem(item)} />
            ))}
          </div>
        </div>
      )}

      {previewItem && (
        <DeliverablePreviewModal
          deliverable={deliverableToMissionDeliverable(previewItem)}
          agents={[]}
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={() => setPreviewItem(null)}
          onArtifactCampaignChanged={bumpArtifactCampaignResolution}
        />
      )}
    </div>
  )
}
