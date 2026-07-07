import { describe, expect, it } from 'vitest'

type ChainResult = { data: Array<Record<string, unknown>>; error: null }

function makeClient(tableData: Record<string, Array<Record<string, unknown>>>) {
  const calls: string[] = []
  const makeChain = (table: string) => {
    const result: ChainResult = { data: tableData[table] ?? [], error: null }
    const chain: Record<string, unknown> = {
      select() {
        return chain
      },
      eq() {
        return chain
      },
      gte() {
        return chain
      },
      lt() {
        return chain
      },
      order() {
        return chain
      },
      then(resolve: (value: ChainResult) => unknown) {
        return Promise.resolve(result).then(resolve)
      },
    }
    calls.push(table)
    return chain
  }

  return {
    calls,
    client: { from: (table: string) => makeChain(table) },
  }
}

async function loadCollector() {
  const mod = await import('./company-cortex-dream-collector.service')
  expect(mod.CompanyCortexDreamCollectorService).toBeTypeOf('function')
  return mod.CompanyCortexDreamCollectorService as new (database: { getClient(): unknown }) => {
    collect(input: {
      orgId: string
      brainId: string
      windowStart: string
      windowEnd: string
    }): Promise<{
      groups: Array<{ id: string; source: string }>
      sourceCounts: Record<string, number>
    }>
  }
}

describe('CompanyCortexDreamCollectorService contract', () => {
  it('collects and groups rows from existing conversation, channel, space, deliverable, and document tables', async () => {
    const { calls, client } = makeClient({
      messages: [
        {
          id: 'message-1',
          conversation_id: 'conversation-1',
          role: 'user',
          content: "I love how it's not in your face.",
          created_at: '2026-05-18T10:00:00.000Z',
        },
        {
          id: 'message-2',
          conversation_id: 'conversation-1',
          role: 'assistant',
          content: 'Got it.',
          created_at: '2026-05-18T10:01:00.000Z',
        },
      ],
      channel_messages: [
        {
          id: 'channel-message-1',
          channel_id: 'channel-1',
          reply_to_id: null,
          sender_type: 'user',
          sender_id: 'user-1',
          content: 'Agents should ask before creating follow-up tasks.',
          created_at: '2026-05-18T11:00:00.000Z',
        },
      ],
      space_item_activity: [
        {
          id: 'activity-1',
          item_id: 'item-1',
          event_type: 'comment',
          actor_kind: 'user',
          payload: { text: 'This is too polished for us.' },
          created_at: '2026-05-18T12:00:00.000Z',
        },
      ],
      space_item_deliverables: [
        {
          id: 'deliverable-1',
          item_id: 'item-1',
          agent_key: 'ivy',
          title: 'Follow-up email',
          content: 'Draft body',
          created_at: '2026-05-18T13:00:00.000Z',
        },
      ],
      conversation_documents: [
        {
          id: 'document-1',
          conversation_id: 'conversation-1',
          document_type: 'email',
          title: 'Accepted follow-up',
          content: { text: 'Short, direct follow-up' },
          created_at: '2026-05-18T14:00:00.000Z',
        },
      ],
    })
    const Collector = await loadCollector()
    const collector = new Collector({ getClient: () => client })

    const result = await collector.collect({
      orgId: 'org-1',
      brainId: 'brain-1',
      windowStart: '2026-05-18T00:00:00.000Z',
      windowEnd: '2026-05-19T00:00:00.000Z',
    })

    expect(calls).toEqual(
      expect.arrayContaining([
        'messages',
        'channel_messages',
        'space_item_activity',
        'space_item_deliverables',
        'conversation_documents',
      ]),
    )
    expect(result.sourceCounts).toMatchObject({
      messages: 2,
      channel_messages: 1,
      space_item_activity: 1,
      space_item_deliverables: 1,
      conversation_documents: 1,
    })
    expect(result.groups.map((group) => group.id)).toEqual(
      expect.arrayContaining([
        'conversation:conversation-1',
        'channel_thread:channel-1:channel-message-1',
        'space_item:item-1',
        'deliverable:deliverable-1',
        'conversation_document:document-1',
      ]),
    )
  })
})
