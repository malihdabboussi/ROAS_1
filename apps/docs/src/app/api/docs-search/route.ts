import { NextResponse } from 'next/server'
import { clientIpFromHeaders, docsRagRateLimit } from '@/lib/docs-rag-rate-limit'
import { createDocsSupabaseAnon } from '@/lib/docs-supabase-server'
import { embedQueryGemini } from '@/lib/gemini-docs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers)
  if (!docsRagRateLimit(`docs-search:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  let body: { query?: string; match_count?: number; min_similarity?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const matchCount = body.match_count ?? 8
  const minSimilarity = body.min_similarity ?? 0.35

  const embedding = await embedQueryGemini(apiKey, query)
  const embeddingStr = `[${embedding.join(',')}]`

  const supabase = createDocsSupabaseAnon()
  const { data, error } = await supabase.rpc('search_public_docs_chunks', {
    query_embedding: embeddingStr,
    match_count: matchCount,
    min_similarity: minSimilarity,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as Array<{
    doc_slug: string
    title: string
    body: string
    chunk_index: number
    similarity: number
  }>

  const citations = rows.map((r) => ({
    slug: r.doc_slug,
    title: r.title,
    snippet: r.body.length > 500 ? `${r.body.slice(0, 500)}…` : r.body,
    chunk_index: r.chunk_index,
    similarity: r.similarity,
  }))

  return NextResponse.json({ citations })
}
