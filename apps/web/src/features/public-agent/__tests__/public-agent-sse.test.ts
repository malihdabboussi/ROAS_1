import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendPublicMessageStream } from '../services/public-agent.service'

function parseSSELines(raw: string): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = []
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const payload = line.slice(6)
    if (payload === '[DONE]') {
      events.push({ type: '__done__' })
      continue
    }
    try {
      events.push(JSON.parse(payload))
    } catch {
      // skip
    }
  }
  return events
}

describe('SSE line parsing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses content_delta events', () => {
    const raw =
      'data: {"type":"content_delta","content":"Hello"}\n\ndata: {"type":"content_delta","content":" world"}\n\n'
    const events = parseSSELines(raw)
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ type: 'content_delta', content: 'Hello' })
    expect(events[1]).toEqual({ type: 'content_delta', content: ' world' })
  })

  it('parses tool_start and tool_end events', () => {
    const raw = [
      'data: {"type":"tool_start","name":"search","label":"Searching..."}',
      'data: {"type":"tool_end","name":"search","label":"Done","status":"completed"}',
    ].join('\n')
    const events = parseSSELines(raw)
    expect(events).toHaveLength(2)
    expect(events[0]!.type).toBe('tool_start')
    expect(events[1]!.type).toBe('tool_end')
    expect(events[1]!.status).toBe('completed')
  })

  it('parses status events', () => {
    const raw = 'data: {"type":"status","phase":"thinking","message":"Analyzing..."}\n\n'
    const events = parseSSELines(raw)
    expect(events[0]).toEqual({ type: 'status', phase: 'thinking', message: 'Analyzing...' })
  })

  it('detects [DONE] terminal marker', () => {
    const raw = 'data: {"type":"content_delta","content":"Hi"}\n\ndata: [DONE]\n\n'
    const events = parseSSELines(raw)
    expect(events).toHaveLength(2)
    expect(events[1]).toEqual({ type: '__done__' })
  })

  it('skips heartbeat comments', () => {
    const raw = ': heartbeat\n\ndata: {"type":"content_delta","content":"ok"}\n\n'
    const events = parseSSELines(raw)
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('content_delta')
  })

  it('skips malformed JSON lines', () => {
    const raw = 'data: not-json\n\ndata: {"type":"done"}\n\n'
    const events = parseSSELines(raw)
    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('done')
  })

  it('processes a final SSE event without a trailing newline', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"content_delta","content":"final"}'))
        controller.close()
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(stream, { status: 200 })),
    )

    const events: Array<Record<string, unknown>> = []
    await sendPublicMessageStream(
      'brian',
      'mastermind_coach',
      { visitor_id: 'visitor-1', conversation_id: 'conv-1', content: 'Hi' },
      (event) => events.push(event),
    )

    expect(events).toEqual([{ type: 'content_delta', content: 'final' }])
  })
})

describe('content_blocks_ordered building', () => {
  it('builds text block from content_delta events', () => {
    type Block = { type: string; id: string; content?: string; name?: string; state?: string }
    let blocks: Block[] = []
    let lastTextId: string | null = null
    let content = ''

    const events = [
      { type: 'content_delta', content: 'Hello' },
      { type: 'content_delta', content: ' world' },
    ]

    for (const event of events) {
      if (event.type === 'content_delta' && typeof event.content === 'string') {
        content += event.content
        if (lastTextId) {
          blocks = blocks.map((b) =>
            b.type === 'text' && b.id === lastTextId ? { ...b, content } : b,
          )
        } else {
          lastTextId = 'text-1'
          blocks.push({ type: 'text', id: lastTextId, content })
        }
      }
    }

    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.content).toBe('Hello world')
    expect(blocks[0]!.type).toBe('text')
  })

  it('interleaves tool and text blocks', () => {
    type Block = { type: string; id: string; content?: string; name?: string; state?: string }
    let blocks: Block[] = []
    let lastTextId: string | null = null
    let content = ''

    const events = [
      { type: 'content_delta', content: 'Before tool' },
      { type: 'tool_start', name: 'search', label: 'Searching' },
      { type: 'tool_end', name: 'search', status: 'completed' },
      { type: 'content_delta', content: 'After tool' },
    ]

    for (const event of events) {
      if (event.type === 'content_delta' && 'content' in event) {
        content += event.content
        if (lastTextId) {
          blocks = blocks.map((b) =>
            b.type === 'text' && b.id === lastTextId ? { ...b, content } : b,
          )
        } else {
          lastTextId = `text-${blocks.length}`
          blocks.push({ type: 'text', id: lastTextId, content })
        }
      } else if (event.type === 'tool_start') {
        lastTextId = null
        content = ''
        blocks.push({
          type: 'tool',
          id: `tool-${event.name}`,
          name: event.name,
          state: 'active',
        })
      } else if (event.type === 'tool_end') {
        blocks = blocks.map((b) =>
          b.type === 'tool' && b.name === event.name && b.state === 'active'
            ? { ...b, state: 'complete' }
            : b,
        )
      }
    }

    expect(blocks).toHaveLength(3)
    expect(blocks[0]!.type).toBe('text')
    expect(blocks[0]!.content).toBe('Before tool')
    expect(blocks[1]!.type).toBe('tool')
    expect(blocks[1]!.state).toBe('complete')
    expect(blocks[2]!.type).toBe('text')
    expect(blocks[2]!.content).toBe('After tool')
  })
})
