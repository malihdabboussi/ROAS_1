import { describe, expect, it, vi } from 'vitest'
import { syncVisualDocLinkedPresentation } from './artifact-visual-doc-presentation.sync'

function query(result: Record<string, unknown>) {
  const chain: any = {
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    then(
      onFulfilled: (value: Record<string, unknown>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  return chain
}

describe('syncVisualDocLinkedPresentation', () => {
  it('creates an html_bundle presentation and returns its id', async () => {
    let presentationInsert: Record<string, unknown> | null = null
    let fileUpsert: Array<Record<string, unknown>> | null = null
    let spacesCalls = 0

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'spaces') {
          spacesCalls += 1
          if (spacesCalls === 1) {
            return query({ data: { id: 'space-1', campaign_id: 'campaign-1' }, error: null })
          }
          return query({
            data: { id: 'space-1', schema: { views: [] } },
            error: null,
          })
        }
        if (table === 'presentations') {
          const chain = query({
            data: {
              id: 'pres-1',
              user_id: 'user-1',
              org_id: 'org-1',
              name: 'Pre-Call Strategy Map',
            },
            error: null,
          })
          chain.insert = vi.fn((payload: Record<string, unknown>) => {
            presentationInsert = payload
            return chain
          })
          return chain
        }
        if (table === 'presentation_files') {
          const chain = query({ data: [{ id: 'file-1' }], error: null })
          chain.upsert = vi.fn((rows: Array<Record<string, unknown>>) => {
            fileUpsert = rows
            return chain
          })
          return chain
        }
        return query({ data: null, error: null })
      }),
    }

    const synced = await syncVisualDocLinkedPresentation({
      supabase: supabase as any,
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      itemId: 'item-1',
      title: 'Pre-Call Strategy Map',
      html: '<!doctype html><html><body><h1>Hello</h1></body></html>',
      existingPresentationId: null,
    })

    expect(synced).toEqual({ presentationId: 'pres-1', created: true })
    expect(presentationInsert).toMatchObject({
      campaign_id: 'campaign-1',
      metadata: expect.objectContaining({
        linked_from: 'visual_doc',
        source_mode: 'html_bundle',
        visual_doc_item_id: 'item-1',
      }),
      name: 'Pre-Call Strategy Map',
      space_id: 'space-1',
      user_id: 'user-1',
    })
    expect(fileUpsert?.[0]).toMatchObject({
      path: 'index.html',
      presentation_id: 'pres-1',
      role: 'entry',
    })
  })

  it('updates the existing linked presentation files on re-visualize', async () => {
    let updatePayload: Record<string, unknown> | null = null
    let fileUpsert: Array<Record<string, unknown>> | null = null

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'spaces') {
          return query({
            data: {
              id: 'space-1',
              campaign_id: 'campaign-1',
              schema: { views: [{ type: 'presentations' }] },
            },
            error: null,
          })
        }
        if (table === 'presentations') {
          const chain = query({
            data: {
              id: 'pres-existing',
              user_id: 'user-1',
              org_id: null,
              name: 'Agenda',
            },
            error: null,
          })
          chain.update = vi.fn((payload: Record<string, unknown>) => {
            updatePayload = payload
            return chain
          })
          return chain
        }
        if (table === 'presentation_files') {
          const chain = query({ data: [{ id: 'file-1' }], error: null })
          chain.upsert = vi.fn((rows: Array<Record<string, unknown>>) => {
            fileUpsert = rows
            return chain
          })
          return chain
        }
        return query({ data: null, error: null })
      }),
    }

    const synced = await syncVisualDocLinkedPresentation({
      supabase: supabase as any,
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      itemId: 'item-2',
      title: 'Agenda',
      html: '<!doctype html><html><body><h1>Updated</h1></body></html>',
      existingPresentationId: 'pres-existing',
    })

    expect(synced).toEqual({ presentationId: 'pres-existing', created: false })
    expect(updatePayload).toMatchObject({
      generated_html: null,
      metadata: expect.objectContaining({ visual_doc_item_id: 'item-2' }),
      name: 'Agenda',
    })
    expect(fileUpsert?.[0]?.content).toContain('Updated')
  })
})
