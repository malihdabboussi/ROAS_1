import { NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsMoveBase } from './artifacts-move.base'

export class ArtifactsDocumentsBase extends ArtifactsMoveBase {
  // ─── Documents ───

  async listDocumentsByCampaign(supabase: SupabaseClient, campaignId: string) {
    return this.artifactDocumentsRepo.listDocumentsByCampaign(supabase, campaignId)
  }

  async listDocumentsByConversation(supabase: SupabaseClient, conversationId: string) {
    return this.artifactDocumentsRepo.listDocumentsByConversation(supabase, conversationId)
  }

  protected collectExistingArtifactResourceIds(
    merged: Awaited<ReturnType<ArtifactsDocumentsBase['listDocumentsByConversation']>>,
    documentType: string,
    contentIdKeys: readonly string[],
  ): Set<string> {
    const set = new Set<string>()
    for (const d of merged) {
      const row = d as { document_type?: string; resource_id?: string | null; content?: unknown }
      if (row.document_type !== documentType) continue
      const rid =
        typeof row.resource_id === 'string' && row.resource_id.trim().length > 0
          ? row.resource_id.trim()
          : null
      if (rid) {
        set.add(rid)
        continue
      }
      const c = row.content
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        const obj = c as Record<string, unknown>
        for (const k of contentIdKeys) {
          const v = obj[k]
          if (typeof v === 'string' && v.trim().length > 0) {
            set.add(v.trim())
            break
          }
        }
      }
    }
    return set
  }

  protected appendSyntheticCampaignArtifacts(
    merged: Awaited<ReturnType<ArtifactsDocumentsBase['listDocumentsByConversation']>>,
    rows:
      | Array<{
          id: string
          campaign_id: string
          name: string | null
          created_at: string
          updated_at: string
        }>
      | null
      | undefined,
    documentType: 'offer' | 'avatar' | 'presentation' | 'sequence' | 'funnel',
    contentField: string,
    existingIds: Set<string>,
    convByCampaign: Map<string, string>,
    fallbackConvId: string,
  ) {
    for (const row of rows ?? []) {
      if (existingIds.has(row.id)) continue
      const conversationId = convByCampaign.get(row.campaign_id) ?? fallbackConvId
      if (!conversationId) continue
      const title = (typeof row.name === 'string' ? row.name.trim() : '') || 'Untitled'
      merged.push({
        id: `${documentType}-synth:${row.id}`,
        conversation_id: conversationId,
        campaign_id: row.campaign_id,
        document_type: documentType,
        title,
        resource_id: row.id,
        content: { [contentField]: row.id },
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as (typeof merged)[number])
    }
  }

  async listDocumentsByAgent(supabase: SupabaseClient, agentKey: string) {
    const convos = await this.artifactDocumentsRepo.listConversationsByAgent(supabase, agentKey)

    const ids = (convos ?? []).map((c: { id: string }) => c.id)
    if (ids.length === 0) return []

    const CHUNK = 100
    const merged: Awaited<ReturnType<ArtifactsDocumentsBase['listDocumentsByConversation']>> = []

    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK)
      const data = await this.artifactDocumentsRepo.listDocumentsByConversationIds(supabase, chunk)
      merged.push(...data)
    }

    const existingOfferIds = this.collectExistingArtifactResourceIds(merged, 'offer', [
      'offer_id',
      'id',
    ])
    const existingAvatarIds = this.collectExistingArtifactResourceIds(merged, 'avatar', [
      'avatar_id',
      'id',
    ])
    const existingPresentationIds = this.collectExistingArtifactResourceIds(
      merged,
      'presentation',
      ['presentation_id', 'id'],
    )
    const existingSequenceIds = this.collectExistingArtifactResourceIds(merged, 'sequence', [
      'sequence_id',
      'id',
    ])
    const existingFunnelIds = this.collectExistingArtifactResourceIds(merged, 'funnel', [
      'funnel_id',
      'id',
    ])
    const existingEmailIds = this.collectExistingArtifactResourceIds(merged, 'email', [
      'email_id',
      'sequence_email_id',
      'id',
    ])

    const convByCampaign = new Map<string, string>()
    for (const c of convos ?? []) {
      const row = c as { id: string; campaign_id?: string | null }
      if (typeof row.campaign_id !== 'string' || !row.campaign_id) continue
      if (!convByCampaign.has(row.campaign_id)) convByCampaign.set(row.campaign_id, row.id)
    }
    const fallbackConvId = ids[0] ?? null

    const campaignIds = [...new Set([...convByCampaign.keys()])]
    if (campaignIds.length > 0 && fallbackConvId) {
      for (let i = 0; i < campaignIds.length; i += CHUNK) {
        const cChunk = campaignIds.slice(i, i + CHUNK)
        const [offersRes, sequencesRes, presentationsRes, avatarsRes, funnelsRes] =
          await Promise.all([
            this.artifactDocumentsRepo.listSyntheticArtifactRows(
              supabase,
              'offers',
              cChunk,
              'offers',
            ),
            this.artifactDocumentsRepo.listSyntheticArtifactRows(
              supabase,
              'sequences',
              cChunk,
              'sequences',
            ),
            this.artifactDocumentsRepo.listSyntheticArtifactRows(
              supabase,
              'presentations',
              cChunk,
              'presentations',
            ),
            this.artifactDocumentsRepo.listSyntheticArtifactRows(
              supabase,
              'avatars',
              cChunk,
              'avatars',
            ),
            this.artifactDocumentsRepo.listSyntheticArtifactRows(
              supabase,
              'funnels',
              cChunk,
              'funnels',
            ),
          ])

        this.appendSyntheticCampaignArtifacts(
          merged,
          offersRes,
          'offer',
          'offer_id',
          existingOfferIds,
          convByCampaign,
          fallbackConvId,
        )
        this.appendSyntheticCampaignArtifacts(
          merged,
          sequencesRes,
          'sequence',
          'sequence_id',
          existingSequenceIds,
          convByCampaign,
          fallbackConvId,
        )
        this.appendSyntheticCampaignArtifacts(
          merged,
          presentationsRes,
          'presentation',
          'presentation_id',
          existingPresentationIds,
          convByCampaign,
          fallbackConvId,
        )
        this.appendSyntheticCampaignArtifacts(
          merged,
          avatarsRes,
          'avatar',
          'avatar_id',
          existingAvatarIds,
          convByCampaign,
          fallbackConvId,
        )
        this.appendSyntheticCampaignArtifacts(
          merged,
          funnelsRes,
          'funnel',
          'funnel_id',
          existingFunnelIds,
          convByCampaign,
          fallbackConvId,
        )

        const seqRows = sequencesRes as Array<{ id: string; campaign_id: string }>
        const seqIdToCampaign = new Map<string, string>(
          seqRows.map((s) => [s.id, s.campaign_id] as const),
        )
        const seqIds = [...seqIdToCampaign.keys()]
        for (let si = 0; si < seqIds.length; si += CHUNK) {
          const seqPart = seqIds.slice(si, si + CHUNK)
          if (seqPart.length === 0) continue
          const emailRows = await this.artifactDocumentsRepo.listSequenceEmails(supabase, seqPart)
          for (const e of emailRows ?? []) {
            const row = e as {
              id: string
              sequence_id: string
              subject: string | null
              created_at: string
              updated_at: string
            }
            if (existingEmailIds.has(row.id)) continue
            const cid = seqIdToCampaign.get(row.sequence_id)
            if (!cid) continue
            const conversationId = convByCampaign.get(cid) ?? fallbackConvId
            if (!conversationId) continue
            merged.push({
              id: `email-synth:${row.id}`,
              conversation_id: conversationId,
              campaign_id: cid,
              document_type: 'email',
              title: (typeof row.subject === 'string' && row.subject.trim()) || 'Email',
              resource_id: row.id,
              content: {
                sequence_email_id: row.id,
                email_id: row.id,
                sequence_id: row.sequence_id,
              },
              created_at: row.created_at,
              updated_at: row.updated_at,
            } as (typeof merged)[number])
          }
        }
      }
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return merged
  }

  async getDocument(supabase: SupabaseClient, userId: string, id: string) {
    const direct = await this.artifactDocumentsRepo.findDocument(supabase, id)
    if (direct) return direct

    const lifted = await this.artifactDocumentsRepo.findDocumentWithService(id)
    if (!lifted) throw new NotFoundException('Document not found')

    const allowed =
      (await this.userCanAccessConversationDocumentRow(supabase, lifted)) ||
      (await this.documentVisibleViaChannelMetadata(supabase, userId, id))
    if (!allowed) throw new NotFoundException('Document not found')
    return lifted
  }

  /** RLS can hide rows (e.g. channel tools used a non-conversation id). Authorize via linked conversation or campaign. */
  protected async userCanAccessConversationDocumentRow(
    userSupabase: SupabaseClient,
    row: { conversation_id?: string | null; campaign_id?: string | null },
  ): Promise<boolean> {
    const convId =
      typeof row.conversation_id === 'string' && row.conversation_id.length > 0
        ? row.conversation_id
        : null
    if (convId) {
      return this.artifactDocumentsRepo.userCanAccessConversation(userSupabase, convId)
    }
    const campId =
      typeof row.campaign_id === 'string' && row.campaign_id.length > 0 ? row.campaign_id : null
    if (campId) {
      return this.artifactDocumentsRepo.userCanAccessCampaign(userSupabase, campId)
    }
    return false
  }

  /** Channel agent stores document id in message metadata; RLS may hide the document row. */
  protected async documentVisibleViaChannelMetadata(
    userSupabase: SupabaseClient,
    userId: string,
    documentId: string,
  ): Promise<boolean> {
    const channelIds = await this.artifactDocumentsRepo.listChannelIdsByDocumentMetadata(documentId)
    for (const ch of channelIds) {
      if (await this.artifactDocumentsRepo.userHasChannelMembership(userSupabase, userId, ch)) {
        return true
      }
    }
    return false
  }

  async updateDocument(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    patch: {
      title?: string
      content?: Record<string, unknown>
      metadata?: Record<string, unknown>
    },
  ) {
    const existing = await this.artifactDocumentsRepo.findDocumentContentMetadata(supabase, id)
    if (!existing) throw new NotFoundException('Document not found')

    const prevContent =
      existing.content !== null && typeof existing.content === 'object'
        ? (existing.content as Record<string, unknown>)
        : {}
    const prevMeta =
      existing.metadata !== null && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {}

    const nextContent =
      patch.content !== undefined ? { ...prevContent, ...patch.content } : undefined
    const nextMeta = patch.metadata !== undefined ? { ...prevMeta, ...patch.metadata } : undefined

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (patch.title !== undefined) updatePayload.title = patch.title
    if (nextContent !== undefined) updatePayload.content = nextContent
    if (nextMeta !== undefined) updatePayload.metadata = nextMeta

    const data = await this.artifactDocumentsRepo.updateDocument(supabase, id, updatePayload)
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'conversation_document',
      sourceId: id,
      userId,
    })
    return data
  }

  async deleteDocument(supabase: SupabaseClient, id: string) {
    await this.artifactDocumentsRepo.deleteDocument(supabase, id)
    await this.spaceRetrievalIndex.deleteSource(supabase, 'conversation_document', id)
  }
}
