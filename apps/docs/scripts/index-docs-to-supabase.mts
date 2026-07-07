/**
 * Chunk MDX docs, embed with Gemini (RETRIEVAL_DOCUMENT, 768), upsert to public_docs_chunks.
 * Requires: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: DOCS_INDEX_RUN_ID (default: git short sha or ISO timestamp)
 * Run from apps/docs: pnpm index:supabase
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import matter from 'gray-matter'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DOCS_ROOT = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(DOCS_ROOT, 'content')

const EMBEDDING_MODEL = 'gemini-embedding-2'
const OUTPUT_DIM = 768
const CHUNK_CHARS = 4000
const OVERLAP_CHARS = 480

function stripMdx(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function walkMdxSlugs(dir: string, prefix: string, slugs: string[]) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      walkMdxSlugs(path.join(dir, entry.name), `${prefix}${entry.name}/`, slugs)
    } else if (entry.name.endsWith('.mdx')) {
      const slug = `${prefix}${entry.name.replace(/\.mdx$/, '')}`
      if (slug !== 'index') slugs.push(slug)
    }
  }
}

function getDocSlugs(): string[] {
  const slugs: string[] = []
  walkMdxSlugs(CONTENT_DIR, '', slugs)
  return slugs
}

function chunkText(text: string): string[] {
  const t = text.trim()
  if (!t) return []
  const chunks: string[] = []
  let start = 0
  while (start < t.length) {
    const end = Math.min(start + CHUNK_CHARS, t.length)
    let slice = t.slice(start, end)
    if (end < t.length) {
      const lastPara = slice.lastIndexOf('\n\n')
      if (lastPara > CHUNK_CHARS * 0.4) slice = slice.slice(0, lastPara)
    }
    chunks.push(slice.trim())
    if (end >= t.length) break
    start += Math.max(slice.length - OVERLAP_CHARS, 1)
  }
  return chunks.filter(Boolean)
}

async function embedChunk(
  apiKey: string,
  text: string,
): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: OUTPUT_DIM,
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embed ${res.status}: ${err.slice(0, 500)}`)
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } }
  const values = data.embedding?.values
  if (!values?.length) throw new Error('Empty embedding from Gemini')
  return values
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!geminiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error(
      'Missing env: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
    )
    process.exit(1)
  }

  let indexRunId = process.env.DOCS_INDEX_RUN_ID?.trim()
  if (!indexRunId) {
    try {
      const { execSync } = await import('child_process')
      indexRunId = execSync('git rev-parse --short HEAD', {
        cwd: DOCS_ROOT,
        encoding: 'utf-8',
      }).trim()
    } catch {
      indexRunId = new Date().toISOString().replace(/[:.]/g, '-')
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const slugs = getDocSlugs()
  const rows: Array<{
    index_run_id: string
    doc_slug: string
    chunk_index: number
    title: string
    body: string
    embedding: string
  }> = []

  for (const slug of slugs) {
    const filePath = path.join(CONTENT_DIR, `${slug}.mdx`)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(fileContent)
    const title = (data.title as string) || slug.split('/').pop() || slug
    const plain = stripMdx(content)
    const chunks = chunkText(plain)
    if (chunks.length === 0) continue

    for (let i = 0; i < chunks.length; i++) {
      const body = chunks[i]
      const embedding = await embedChunk(geminiKey, body)
      rows.push({
        index_run_id: indexRunId,
        doc_slug: slug,
        chunk_index: i,
        title,
        body,
        embedding: `[${embedding.join(',')}]`,
      })
      await new Promise((r) => setTimeout(r, 50))
    }
    console.error(`Indexed ${slug}: ${chunks.length} chunks`)
  }

  const batchSize = 40
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from('public_docs_chunks').insert(batch)
    if (error) {
      await supabase.from('public_docs_chunks').delete().eq('index_run_id', indexRunId)
      throw new Error(`Supabase insert: ${error.message}`)
    }
  }

  const { error: delErr } = await supabase
    .from('public_docs_chunks')
    .delete()
    .neq('index_run_id', indexRunId)
  if (delErr) throw new Error(`Supabase delete old runs: ${delErr.message}`)

  console.error(`Done. index_run_id=${indexRunId} total_chunks=${rows.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
