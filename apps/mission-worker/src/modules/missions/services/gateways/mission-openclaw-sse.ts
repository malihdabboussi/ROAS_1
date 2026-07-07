/**
 * Consumes OpenClaw /v1/responses SSE (event + data lines) until response.completed or response.failed.
 */
export type OpenResponsesSseHandlers = {
  onHeartbeat: () => void | Promise<void>
  onToolStart?: (
    name: string,
    args?: Record<string, unknown>,
    toolCallId?: string,
  ) => void | Promise<void>
  onToolUpdate?: (
    name: string,
    partialResult?: unknown,
    toolCallId?: string,
  ) => void | Promise<void>
  onToolDone?: (
    name: string,
    toolCallId?: string,
    isError?: boolean,
    action?: string,
    result?: unknown,
  ) => void | Promise<void>
  onThinkingDelta?: (delta: string, text: string) => void | Promise<void>
  onOutputTextDelta?: (delta: string) => void | Promise<void>
  onTrace?: (traceType: string, data: Record<string, unknown>) => void | Promise<void>
}

export async function consumeOpenResponsesSseStream(
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal | undefined,
  handlers: OpenResponsesSseHandlers,
): Promise<Record<string, unknown>> {
  if (!body) {
    throw new Error('Agent stream: empty body')
  }
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed: Record<string, unknown> | null = null

  const pumpBlock = async (block: string) => {
    const trimmed = block.trim()
    if (trimmed.length === 0) return

    await handlers.onHeartbeat()

    const lines = block.split('\n')
    let dataLine: string | null = null
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        dataLine = line.slice(6)
      }
    }
    if (!dataLine) return

    let evt: {
      type?: string
      response?: Record<string, unknown>
      name?: string
      tool_call_id?: string
      args?: Record<string, unknown>
      partial_result?: unknown
      is_error?: boolean
      action?: string
      result?: unknown
      delta?: string
      text?: string
    }
    try {
      evt = JSON.parse(dataLine) as typeof evt
    } catch {
      return
    }

    const t = evt.type
    if (t === 'response.tool.start' && typeof evt.name === 'string') {
      const args =
        evt.args && typeof evt.args === 'object' && !Array.isArray(evt.args) ? evt.args : undefined
      await handlers.onToolStart?.(evt.name, args, evt.tool_call_id)
    }
    if (t === 'response.tool.update' && typeof evt.name === 'string') {
      await handlers.onToolUpdate?.(evt.name, evt.partial_result, evt.tool_call_id)
    }
    if (t === 'response.reasoning.delta') {
      const delta = typeof evt.delta === 'string' ? evt.delta : ''
      const text = typeof evt.text === 'string' ? evt.text : ''
      if (delta) {
        await handlers.onThinkingDelta?.(delta, text)
      }
    }
    if (t === 'response.output_text.delta') {
      const delta = typeof evt.delta === 'string' ? evt.delta : ''
      if (delta) {
        await handlers.onOutputTextDelta?.(delta)
      }
    }
    if (t === 'response.tool.done' && typeof evt.name === 'string') {
      await handlers.onToolDone?.(
        evt.name,
        evt.tool_call_id,
        evt.is_error === true,
        typeof evt.action === 'string' ? evt.action : undefined,
        evt.result !== undefined ? evt.result : undefined,
      )
    }
    if (t === 'response.trace' && handlers.onTrace) {
      const traceType =
        typeof (evt as Record<string, unknown>).trace_type === 'string'
          ? ((evt as Record<string, unknown>).trace_type as string)
          : ''
      if (traceType) {
        await handlers.onTrace(traceType, evt as Record<string, unknown>)
      }
    }
    if (t === 'response.completed' && evt.response && typeof evt.response === 'object') {
      completed = evt.response
    }
    if (t === 'response.failed' && evt.response && typeof evt.response === 'object') {
      completed = evt.response
    }
  }

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Agent stream aborted', 'AbortError')
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        await pumpBlock(block)
      }
    }
    if (buffer.trim().length > 0) {
      await pumpBlock(buffer)
    }
  } finally {
    reader.releaseLock()
  }

  if (!completed) {
    throw new Error('Agent stream ended without completion event')
  }
  return completed
}
