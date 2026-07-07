import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

export type ArtifactSpaceDocRow = {
  id: string
  space_id: string
  title: string | null
  parent_item_id: string | null
  doc_body: string | null
  notes: string | null
  custom_data: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

@Injectable()
export class ArtifactDocumentsRepository {
  async listConversationDocuments(
    supabase: SupabaseClient,
    input: {
      campaignId: string
      conversationId?: string | null
      documentType?: string | null
      search?: string | null
      limit: number
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('conversation_documents')
      .select('*')
      .eq('campaign_id', input.campaignId)
    if (input.conversationId) query = query.eq('conversation_id', input.conversationId)
    if (input.documentType) query = query.eq('document_type', input.documentType)
    if (input.search) query = query.ilike('title', `%${input.search}%`)
    return (await query.order('created_at', { ascending: false }).limit(input.limit)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listCampaignSpaces(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase.from('spaces').select('id').eq('campaign_id', campaignId)) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listSpaceDocumentRows(
    supabase: SupabaseClient,
    input: {
      spaceId: string | string[]
      parentItemId?: unknown
      docSource?: string | null
      search?: string | null
      limit: number
    },
  ): Promise<{ data: ArtifactSpaceDocRow[] | null; error: QueryError | null }> {
    let query = supabase
      .from('space_items')
      .select(
        'id, space_id, title, parent_item_id, doc_body, notes, custom_data, created_at, updated_at',
      )
      .eq('custom_data->>_view_type', 'doc')
      .order('sort_order', { ascending: true })
    query = Array.isArray(input.spaceId)
      ? query.in('space_id', input.spaceId)
      : query.eq('space_id', input.spaceId)
    if (input.parentItemId !== undefined) {
      query =
        input.parentItemId === null || input.parentItemId === 'null'
          ? query.is('parent_item_id', null)
          : query.eq('parent_item_id', String(input.parentItemId))
    }
    if (input.docSource) query = query.eq('custom_data->>_doc_source', input.docSource)
    if (input.search) query = query.ilike('title', `%${input.search}%`)
    return (await query.limit(input.limit)) as {
      data: ArtifactSpaceDocRow[] | null
      error: QueryError | null
    }
  }

  async findConversation(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findChannelAnchorConversation(
    supabase: SupabaseClient,
    input: { userId: string; anchorMeta: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', input.userId)
      .contains('metadata', input.anchorMeta)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createChannelConversation(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('conversations').insert(payload).select('id').single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async createConversationDocument(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase.from('conversation_documents').insert(payload).select().single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async findConversationDocument(
    supabase: SupabaseClient,
    documentId: string,
    columns = '*',
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('conversation_documents')
      .select(columns)
      .eq('id', documentId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateConversationDocument(
    supabase: SupabaseClient,
    input: { documentId: string; updates: Record<string, unknown> },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('conversation_documents')
      .update(input.updates)
      .eq('id', input.documentId)
      .select()
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findSpaceDocumentRow(
    supabase: SupabaseClient,
    input: { spaceId: string; documentId: string },
  ): Promise<{ data: ArtifactSpaceDocRow | null; error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .select(
        'id, space_id, title, parent_item_id, doc_body, notes, custom_data, created_at, updated_at',
      )
      .eq('space_id', input.spaceId)
      .eq('id', input.documentId)
      .eq('custom_data->>_view_type', 'doc')
      .maybeSingle()) as {
      data: ArtifactSpaceDocRow | null
      error: QueryError | null
    }
  }

  async findLinkedSpaceDocItems(
    supabase: SupabaseClient,
    conversationDocumentId: string,
  ): Promise<{ data: ArtifactSpaceDocRow[] | null; error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .select(
        'id, space_id, title, parent_item_id, doc_body, notes, custom_data, created_at, updated_at',
      )
      .eq('custom_data->>_view_type', 'doc')
      .eq('custom_data->>_conversation_document_id', conversationDocumentId)) as {
      data: ArtifactSpaceDocRow[] | null
      error: QueryError | null
    }
  }

  async findSpaceDocItemById(
    supabase: SupabaseClient,
    documentId: string,
  ): Promise<{ data: ArtifactSpaceDocRow | null; error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .select(
        'id, space_id, title, parent_item_id, doc_body, notes, custom_data, created_at, updated_at',
      )
      .eq('id', documentId)
      .eq('custom_data->>_view_type', 'doc')
      .maybeSingle()) as {
      data: ArtifactSpaceDocRow | null
      error: QueryError | null
    }
  }

  async updateSpaceDocItem(
    supabase: SupabaseClient,
    input: { itemId: string; updates: Record<string, unknown> },
  ): Promise<{ data: ArtifactSpaceDocRow; error: QueryError | null }> {
    return (await supabase
      .from('space_items')
      .update(input.updates)
      .eq('id', input.itemId)
      .select(
        'id, space_id, title, parent_item_id, doc_body, notes, custom_data, created_at, updated_at',
      )
      .single()) as {
      data: ArtifactSpaceDocRow
      error: QueryError | null
    }
  }

  async findGoogleDriveIntegrationMetadata(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', input.userId)
      .eq('integration_id', 'google_drive')
      .eq('status', 'connected')
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
