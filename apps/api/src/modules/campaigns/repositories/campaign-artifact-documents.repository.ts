import { Injectable } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type SyntheticArtifactRow = {
  id: string
  campaign_id: string
  name: string | null
  created_at: string
  updated_at: string
}

@Injectable()
export class CampaignArtifactDocumentsRepository {
  async listDocumentsByCampaign(supabase: SupabaseClient, campaignId: string) {
    const { data: convDocs, error: convErr } = await supabase
      .from('conversation_documents')
      .select('*, conversations(id, title, metadata)')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (convErr) throw new Error(`Failed to list documents: ${convErr.message}`)

    const { data: presentationRows } = await supabase
      .from('presentations')
      .select('id, name, file_url, status, created_at, updated_at')
      .eq('campaign_id', campaignId)
      .not('file_url', 'is', null)
      .order('created_at', { ascending: false })

    const presentationDocs = await Promise.all(
      ((presentationRows ?? []) as Array<Record<string, unknown>>).map(async (row) => {
        const fileUrl = await this.resolveSignedStorageUrl(supabase, String(row.file_url ?? ''))
        return {
          id: `lm-${String(row.id)}`,
          conversation_id: null,
          campaign_id: campaignId,
          document_type: 'presentation',
          title: row.name,
          content: { file_url: fileUrl, type: 'pdf' },
          resource_id: row.id,
          created_at: row.created_at,
          updated_at: row.updated_at,
          _source: 'presentation',
        }
      }),
    )

    const all = [...(convDocs ?? []), ...presentationDocs]
    all.sort(
      (a: { created_at?: string }, b: { created_at?: string }) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )
    return all
  }

  async listDocumentsByConversation(supabase: SupabaseClient, conversationId: string) {
    const { data, error } = await supabase
      .from('conversation_documents')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list documents: ${error.message}`)
    return data ?? []
  }

  async listConversationsByAgent(supabase: SupabaseClient, agentKey: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, campaign_id')
      .eq('agent_id', agentKey)
    if (error) throw new Error(`Failed to list conversations: ${error.message}`)
    return data ?? []
  }

  async listDocumentsByConversationIds(supabase: SupabaseClient, conversationIds: string[]) {
    const { data, error } = await supabase
      .from('conversation_documents')
      .select('*')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list documents: ${error.message}`)
    return data ?? []
  }

  async listSyntheticArtifactRows(
    supabase: SupabaseClient,
    table: string,
    campaignIds: string[],
    label: string,
  ): Promise<SyntheticArtifactRow[]> {
    const { data, error } = await supabase
      .from(table)
      .select('id, campaign_id, name, created_at, updated_at')
      .in('campaign_id', campaignIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list ${label}: ${error.message}`)
    return (data ?? []) as SyntheticArtifactRow[]
  }

  async listSequenceEmails(supabase: SupabaseClient, sequenceIds: string[]) {
    const { data, error } = await supabase
      .from('sequence_emails')
      .select('id, sequence_id, subject, created_at, updated_at')
      .in('sequence_id', sequenceIds)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Failed to list sequence emails: ${error.message}`)
    return data ?? []
  }

  async findDocument(supabase: SupabaseClient, id: string) {
    const { data } = await supabase
      .from('conversation_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    return data ?? null
  }

  async findDocumentWithService(id: string) {
    const { data } = await this.createServiceClient()
      .from('conversation_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    return data ?? null
  }

  async userCanAccessConversation(userSupabase: SupabaseClient, conversationId: string) {
    const { data } = await userSupabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle()
    return Boolean(data)
  }

  async userCanAccessCampaign(userSupabase: SupabaseClient, campaignId: string) {
    const { data } = await userSupabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .maybeSingle()
    return Boolean(data)
  }

  async listChannelIdsByDocumentMetadata(documentId: string) {
    const { data: hits, error } = await this.createServiceClient()
      .from('channel_messages')
      .select('channel_id')
      .like('metadata', `%${documentId}%`)
      .limit(25)
    if (error || !hits?.length) return []
    return [...new Set(hits.map((hit) => hit.channel_id as string).filter(Boolean))]
  }

  async userHasChannelMembership(
    userSupabase: SupabaseClient,
    userId: string,
    channelId: string,
  ): Promise<boolean> {
    const { data } = await userSupabase
      .from('channel_memberships')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .eq('member_type', 'user')
      .maybeSingle()
    return Boolean(data)
  }

  async findDocumentContentMetadata(supabase: SupabaseClient, id: string) {
    const { data, error } = await supabase
      .from('conversation_documents')
      .select('content, metadata')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load document: ${error.message}`)
    return data ?? null
  }

  async updateDocument(supabase: SupabaseClient, id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('conversation_documents')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(`Failed to update document: ${error.message}`)
    return data
  }

  async deleteDocument(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('conversation_documents').delete().eq('id', id)
    if (error) throw new Error(`Failed to delete document: ${error.message}`)
  }

  private async resolveSignedStorageUrl(supabase: SupabaseClient, fileUrl: string) {
    if (!fileUrl || !fileUrl.includes('/storage/v1/object/') || fileUrl.includes('token=')) {
      return fileUrl
    }
    const objectMatch = fileUrl.match(/\/storage\/v1\/object\/([^/]+)\/(.+)$/)
    if (!objectMatch) return fileUrl
    const bucket = objectMatch[1]!
    const filePath = objectMatch[2]!
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 365 * 24 * 60 * 60)
    return data?.signedUrl ?? fileUrl
  }

  private createServiceClient() {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
}
