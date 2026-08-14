import { describe, expect, it, vi } from 'vitest'
import { consumeOpenResponsesSseStream } from './mission-openclaw-sse'

const encoder = new TextEncoder()

function event(type: 'response.completed' | 'response.failed', response: Record<string, unknown>) {
  return encoder.encode(`data: ${JSON.stringify({ type, response })}\n\n`)
}

describe('consumeOpenResponsesSseStream', () => {
  it('returns the terminal success when the transport fails immediately afterward', async () => {
    let pullCount = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pullCount += 1
        if (pullCount === 1) {
          controller.enqueue(event('response.completed', { id: 'response-1', status: 'completed' }))
          return
        }
        controller.error(new TypeError('terminated'))
      },
    })

    await expect(
      consumeOpenResponsesSseStream(stream, undefined, { onHeartbeat: vi.fn() }),
    ).resolves.toEqual({ id: 'response-1', status: 'completed' })
    expect(pullCount).toBe(2)
  })

  it('returns a terminal failure response for the gateway error parser', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(event('response.failed', { id: 'response-2', status: 'failed' }))
        controller.close()
      },
    })

    await expect(
      consumeOpenResponsesSseStream(stream, undefined, { onHeartbeat: vi.fn() }),
    ).resolves.toEqual({ id: 'response-2', status: 'failed' })
  })

  it('rejects a stream that ends without a terminal response event', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"response.output_text.delta"}\n\n'))
        controller.close()
      },
    })

    await expect(
      consumeOpenResponsesSseStream(stream, undefined, { onHeartbeat: vi.fn() }),
    ).rejects.toThrow('Agent stream ended without completion event')
  })
})
