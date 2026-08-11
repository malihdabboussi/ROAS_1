import { describe, expect, it, vi } from 'vitest'
import { loadPrecallRelatedContext } from '../meetings-precall-related-context'

function supabaseWithCalls(rows: Array<Record<string, unknown>>) {
  const query = {
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  return {
    from: vi.fn(() => ({ select: vi.fn(() => query) })),
  }
}

const event = (input: { title: string; email?: string | null }) => ({
  id: 'event-1',
  title: input.title,
  start: '2026-08-11T17:00:00.000Z',
  end: '2026-08-11T18:00:00.000Z',
  all_day: false,
  video_url: null,
  attendees: [{ name: 'Client', email: input.email ?? null }],
})

describe('loadPrecallRelatedContext', () => {
  it('uses the client title when a synthetic Page Grader event has no attendee email', async () => {
    const supabase = supabaseWithCalls([
      {
        title: 'Contoso weekly call',
        notes: 'Contoso confidential notes',
        custom_data: { attendees: [] },
      },
      {
        title: 'Acme weekly call',
        notes: 'Acme approved the new offer test',
        custom_data: { attendees: [] },
      },
    ])

    const result = await loadPrecallRelatedContext(
      supabase as never,
      'space-1',
      event({ title: 'Acme — Meeting' }),
    )

    expect(result).toContain('Acme approved the new offer test')
    expect(result).not.toContain('Contoso')
  })

  it('uses attendee email evidence when it is available', async () => {
    const supabase = supabaseWithCalls([
      {
        title: 'Quarterly business review',
        notes: 'Offer economics and creative pipeline',
        custom_data: { attendees: ['client@acme.test'] },
      },
    ])

    const result = await loadPrecallRelatedContext(
      supabase as never,
      'space-1',
      event({ title: 'Unrelated calendar title', email: 'client@acme.test' }),
    )

    expect(result).toContain('Offer economics and creative pipeline')
  })

  it('returns no related context for a generic no-email meeting title', async () => {
    const supabase = supabaseWithCalls([
      {
        title: 'Another client weekly call',
        notes: 'Must not leak',
        custom_data: { attendees: [] },
      },
    ])

    const result = await loadPrecallRelatedContext(
      supabase as never,
      'space-1',
      event({ title: 'Client Meeting' }),
    )

    expect(result).toBe('')
  })
})
