'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileText } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchSpaceItems } from '@/lib/spaces/spaces-api'
import { fetchCampaignDocuments } from '@/features/studio/services/artifact-preview.service'
import type { ConversationDocument } from '@/features/studio/types'

interface CampaignOverviewDocsSectionProps {
  campaignId: string
  primarySpaceId: string | null
  onOpenSpace: (spaceId: string) => void
}

export function CampaignOverviewDocsSection({
  campaignId,
  primarySpaceId,
  onOpenSpace,
}: CampaignOverviewDocsSectionProps) {
  const router = useRouter()
  const [docs, setDocs] = useState<ConversationDocument[]>([])
  const [docSpaceItemByConversationId, setDocSpaceItemByConversationId] = useState<
    Record<string, string>
  >({})
  const [loading, setLoading] = useState(true)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchCampaignDocuments(campaignId)
      const limited = rows.slice(0, 8)
      setDocs(limited)

      if (!primarySpaceId || limited.length === 0) {
        setDocSpaceItemByConversationId({})
        return
      }

      const spaceItems = await fetchSpaceItems(primarySpaceId, { item_kind: 'doc', limit: 100 })
      const map: Record<string, string> = {}
      for (const item of spaceItems) {
        const custom = (item.custom_data ?? {}) as Record<string, unknown>
        const conversationDocId =
          typeof custom._conversation_document_id === 'string'
            ? custom._conversation_document_id
            : null
        if (conversationDocId) map[conversationDocId] = item.id
      }
      setDocSpaceItemByConversationId(map)
    } catch {
      setDocs([])
      setDocSpaceItemByConversationId({})
    } finally {
      setLoading(false)
    }
  }, [campaignId, primarySpaceId])

  useEffect(() => {
    void loadDocs()
  }, [loadDocs])

  const openDoc = useMemo(
    () => (docId: string) => {
      if (!primarySpaceId) return
      const spaceItemId = docSpaceItemByConversationId[docId]
      if (spaceItemId) {
        router.push(
          `/spaces?space=${encodeURIComponent(primarySpaceId)}&item=${encodeURIComponent(spaceItemId)}`,
        )
        return
      }
      onOpenSpace(primarySpaceId)
    },
    [docSpaceItemByConversationId, onOpenSpace, primarySpaceId, router],
  )

  return (
    <section className="surface-card border-border rounded-spacing-3 border p-4">
      <div className="mb-spacing-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="text-muted-foreground h-4 w-4" />
          <h2 className="body-2 text-foreground font-semibold uppercase tracking-wide">Docs</h2>
        </div>
        {primarySpaceId ? (
          <button
            type="button"
            onClick={() => onOpenSpace(primarySpaceId)}
            className="body-4 text-primary hover:underline"
          >
            Open Docs
          </button>
        ) : null}
      </div>
      {loading ? (
        <VibeyLoadingOrb size="sm" text="Loading docs…" state="processing" />
      ) : docs.length === 0 ? (
        <p className="body-3 text-muted-foreground">
          No documents yet. Agent saves and Studio delivers will show up here and in the campaign
          space Docs tab.
        </p>
      ) : (
        <ul className="space-y-1">
          {docs.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => openDoc(doc.id)}
                disabled={!primarySpaceId}
                className="hover:bg-hover-subtle rounded-spacing-2 body-3 text-foreground flex w-full items-center gap-2 px-2 py-2 text-left disabled:opacity-60"
              >
                <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{doc.title || 'Untitled document'}</span>
                <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
