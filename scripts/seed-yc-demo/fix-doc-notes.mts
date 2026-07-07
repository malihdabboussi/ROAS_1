import { createClient } from '@supabase/supabase-js'
import { marked } from 'marked'

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const ORG_ID = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800'

marked.setOptions({ gfm: true, breaks: false })

interface DocRow {
  id: string
  title: string
  notes: string | null
  custom_data: Record<string, unknown>
}

const { data: spaces, error: spErr } = await sb.from('spaces').select('id').eq('org_id', ORG_ID)
if (spErr) throw spErr
const spaceIds = (spaces ?? []).map((s) => s.id as string)
console.log(`Org has ${spaceIds.length} spaces`)

const { data: rows, error: rowErr } = await sb
  .from('space_items')
  .select('id, title, notes, custom_data')
  .in('space_id', spaceIds)
const allRows = (rows ?? []) as DocRow[]
if (rowErr) throw rowErr

const docs = allRows.filter(
  (r) =>
    r.custom_data &&
    typeof r.custom_data === 'object' &&
    (r.custom_data as Record<string, unknown>)._view_type === 'doc',
)
console.log(`Found ${docs.length} doc-shaped space_items in org`)

let updated = 0
let skippedAlreadyHas = 0
let skippedNoBody = 0
let skippedMissionSourced = 0

for (const row of docs) {
  const cd = row.custom_data as Record<string, unknown>
  const body = typeof cd.body === 'string' ? cd.body.trim() : ''
  const docSource = typeof cd._doc_source === 'string' ? cd._doc_source : null

  if (docSource === 'mission') {
    skippedMissionSourced++
    continue
  }

  if (!body) {
    skippedNoBody++
    continue
  }

  // Skip if notes already has real content (not just <p></p>)
  const existing = (row.notes ?? '').trim()
  if (existing && existing !== '<p></p>' && existing.length > 50) {
    skippedAlreadyHas++
    continue
  }

  const html = await marked.parse(body)
  const { error: upErr } = await sb
    .from('space_items')
    .update({ notes: html, updated_at: new Date().toISOString() })
    .eq('id', row.id)
  if (upErr) {
    console.error(`update failed for ${row.id} (${row.title}): ${upErr.message}`)
    continue
  }
  updated++
  if (updated % 10 === 0) console.log(`...updated ${updated}`)
}

console.log('---')
console.log(`updated: ${updated}`)
console.log(`skipped (already had notes): ${skippedAlreadyHas}`)
console.log(`skipped (no body): ${skippedNoBody}`)
console.log(`skipped (mission-sourced): ${skippedMissionSourced}`)
