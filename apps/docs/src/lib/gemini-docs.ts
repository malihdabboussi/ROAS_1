const EMBEDDING_MODEL = process.env.DOCS_EMBEDDING_MODEL || 'gemini-embedding-2'
const OUTPUT_DIM = 768

export async function embedQueryGemini(apiKey: string, text: string): Promise<number[]> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Empty query for embedding')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: trimmed }] },
        outputDimensionality: OUTPUT_DIM,
        taskType: 'RETRIEVAL_QUERY',
      }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embed ${res.status}: ${err.slice(0, 400)}`)
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } }
  const values = data.embedding?.values
  if (!values?.length) throw new Error('Empty embedding from Gemini')
  return values
}

export function defaultAskModel(): string {
  return process.env.DOCS_ASK_MODEL || 'gemini-3-flash-preview'
}

export async function streamGeminiAnswerAsSse(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<ReadableStream<Uint8Array>> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    const t = await res.text()
    throw new Error(`Gemini stream ${res.status}: ${t.slice(0, 400)}`)
  }

  const geminiReader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await geminiReader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let nl: number
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim()
            buffer = buffer.slice(nl + 1)
            if (!line || line.startsWith(':')) continue
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6)
            if (jsonStr === '[DONE]') {
              controller.close()
              return
            }
            let parsed: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
            try {
              parsed = JSON.parse(jsonStr) as typeof parsed
            } catch {
              continue
            }
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
