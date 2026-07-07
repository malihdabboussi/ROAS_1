import { clientIpFromHeaders, docsRagRateLimit } from '@/lib/docs-rag-rate-limit'
import { createDocsSupabaseAnon } from '@/lib/docs-supabase-server'
import { defaultAskModel, embedQueryGemini, streamGeminiAnswerAsSse } from '@/lib/gemini-docs'

export const runtime = 'nodejs'

type ChatTurn = { role: 'user' | 'assistant'; content: string }

function buildContext(chunks: Array<{ doc_slug: string; title: string; body: string }>): string {
  return chunks
    .map((c) => `slug: ${c.doc_slug}\ntitle: ${c.title}\n---\n${c.body.slice(0, 8000)}`)
    .join('\n\n==========\n\n')
}

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers)
  if (!docsRagRateLimit(`docs-ask:${ip}`, 30, 60_000)) {
    return new Response('Too many requests', { status: 429 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response('Server misconfiguration', { status: 500 })
  }

  let body: { query?: string; history?: ChatTurn[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) {
    return new Response('query is required', { status: 400 })
  }

  const rawHistory = Array.isArray(body.history) ? body.history : []
  const history = rawHistory
    .filter(
      (t): t is ChatTurn =>
        (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string',
    )
    .slice(-6)

  const embedding = await embedQueryGemini(apiKey, query)
  const embeddingStr = `[${embedding.join(',')}]`

  const supabase = createDocsSupabaseAnon()
  const { data: rows, error } = await supabase.rpc('search_public_docs_chunks', {
    query_embedding: embeddingStr,
    match_count: 8,
    min_similarity: 0.35,
  })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  const chunks = (rows ?? []) as Array<{
    doc_slug: string
    title: string
    body: string
  }>

  const context = chunks.length ? buildContext(chunks) : '(no matching doc chunks found)'

  const system = `You are Vibey, the documentation assistant for Vibey. Answer ONLY using the CONTEXT below. If CONTEXT is empty or does not contain the answer, say clearly that the docs do not cover it and suggest which doc slugs might be closest if any are listed. When you cite information, include the doc slug in parentheses like (getting-started/what-is-vibey). Do not invent features or URLs. Be concise and use markdown where helpful.`

  const contents: Array<{ role: string; parts: { text: string }[] }> = []
  for (const turn of history) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content.slice(0, 8000) }],
    })
  }

  contents.push({
    role: 'user',
    parts: [
      {
        text: `CONTEXT:\n${context}\n\n---\n\nUser question: ${query}`,
      },
    ],
  })

  const model = defaultAskModel()
  const geminiBody = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  }

  const stream = await streamGeminiAnswerAsSse(apiKey, model, geminiBody)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
