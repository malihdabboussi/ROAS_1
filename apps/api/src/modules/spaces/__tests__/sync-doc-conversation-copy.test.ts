import { describe, expect, it, vi } from 'vitest'
import { syncDocEditToConversationDocument } from '../lib/sync-doc-conversation-copy'

function makeSupabase(result: { error: { message: string } | null } = { error: null }) {
  const calls: Array<{ table: string; payload: Record<string, unknown>; id: unknown }> = []
  const repo = {
    updateLinkedConversationDocument: vi.fn(
      async (_client: unknown, id: unknown, payload: Record<string, unknown>) => {
        calls.push({ table: 'conversation_documents', payload, id })
        return result
      },
    ),
  }
  return { client: {}, repo, calls }
}

const linkedItem = {
  id: 'item-1',
  custom_data: { _view_type: 'doc', _conversation_document_id: 'doc-1' },
}

describe('syncDocEditToConversationDocument', () => {
  it('writes title and doc_body through to the linked conversation document', async () => {
    const supabase = makeSupabase()
    const result = await syncDocEditToConversationDocument(
      supabase.repo,
      supabase.client as any,
      linkedItem,
      {
        title: 'Gabber x Vibey',
        doc_body: '<h1>Gabber</h1>',
      },
    )

    expect(result).toEqual({ synced: true })
    expect(supabase.calls).toEqual([
      {
        table: 'conversation_documents',
        id: 'doc-1',
        payload: expect.objectContaining({
          title: 'Gabber x Vibey',
          content: '<h1>Gabber</h1>',
          updated_at: expect.any(String),
        }),
      },
    ])
  })

  it('does nothing for items without a linked conversation document', async () => {
    const supabase = makeSupabase()
    const result = await syncDocEditToConversationDocument(
      supabase.repo,
      supabase.client as any,
      { id: 'task-1', custom_data: {} },
      { title: 'Renamed task' },
    )

    expect(result).toEqual({ synced: false })
    expect(supabase.calls).toEqual([])
  })

  it('does nothing when neither title nor doc_body changed', async () => {
    const supabase = makeSupabase()
    const result = await syncDocEditToConversationDocument(
      supabase.repo,
      supabase.client as any,
      linkedItem,
      {},
    )

    expect(result).toEqual({ synced: false })
    expect(supabase.calls).toEqual([])
  })

  it('reports write errors without throwing (best-effort under RLS)', async () => {
    const supabase = makeSupabase({ error: { message: 'permission denied' } })
    const result = await syncDocEditToConversationDocument(
      supabase.repo,
      supabase.client as any,
      linkedItem,
      {
        doc_body: '<p>Edit</p>',
      },
    )

    expect(result).toEqual({ synced: false, error: 'permission denied' })
  })
})
