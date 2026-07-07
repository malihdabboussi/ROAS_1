import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string; code?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }

export type ArtifactContactNoteAddInput = {
  contactId: string
  orgId: string
  userId: string
  content: string
  cardTint?: string | null
}

export type ArtifactContactNoteUpdateInput = {
  contactId: string
  noteId: string
  orgId: string
  userId: string
  orgRole?: string | null
  updates: {
    content?: string
    card_tint?: string | null
  }
}

@Injectable()
export class ArtifactContactNotesRepository {
  async addContactNote(
    supabase: SupabaseClient,
    input: ArtifactContactNoteAddInput,
  ): Promise<QueryResult<Record<string, unknown>>> {
    const contact = await this.findScopedContact(supabase, input.contactId, input.orgId)
    if (contact.error) return { data: null, error: contact.error }
    if (!contact.data) return { data: null, error: null }

    return (await supabase
      .from('contact_notes')
      .insert({
        contact_id: input.contactId,
        user_id: input.userId,
        org_id: input.orgId,
        content: input.content,
        card_tint: input.cardTint ?? null,
      })
      .select('id, contact_id, content, created_at, updated_at, user_id, card_tint')
      .single()) as QueryResult<Record<string, unknown>>
  }

  async updateContactNote(
    supabase: SupabaseClient,
    input: ArtifactContactNoteUpdateInput,
  ): Promise<QueryResult<Record<string, unknown>>> {
    const existing = await this.findScopedNote(supabase, input)
    if (existing.error) return { data: null, error: existing.error }
    if (!existing.data) return { data: null, error: null }

    const isOwnerOrAdmin = input.orgRole === 'owner' || input.orgRole === 'admin'
    if (existing.data.user_id !== input.userId && !isOwnerOrAdmin) {
      return {
        data: null,
        error: { message: 'Only the note author or an org owner/admin can edit this note.' },
      }
    }

    if (Object.keys(input.updates).length === 0) {
      return { data: existing.data, error: null }
    }

    return (await supabase
      .from('contact_notes')
      .update({ ...input.updates, updated_at: new Date().toISOString() })
      .eq('id', input.noteId)
      .eq('contact_id', input.contactId)
      .eq('org_id', input.orgId)
      .select('id, contact_id, content, created_at, updated_at, user_id, card_tint')
      .single()) as QueryResult<Record<string, unknown>>
  }

  private async findScopedContact(
    supabase: SupabaseClient,
    contactId: string,
    orgId: string,
  ): Promise<QueryResult<{ id: string }>> {
    return (await supabase
      .from('contacts')
      .select('id')
      .eq('id', contactId)
      .eq('org_id', orgId)
      .maybeSingle()) as QueryResult<{ id: string }>
  }

  private async findScopedNote(
    supabase: SupabaseClient,
    input: ArtifactContactNoteUpdateInput,
  ): Promise<QueryResult<Record<string, unknown>>> {
    return (await supabase
      .from('contact_notes')
      .select('id, contact_id, content, created_at, updated_at, user_id, card_tint')
      .eq('id', input.noteId)
      .eq('contact_id', input.contactId)
      .eq('org_id', input.orgId)
      .maybeSingle()) as QueryResult<Record<string, unknown>>
  }
}
