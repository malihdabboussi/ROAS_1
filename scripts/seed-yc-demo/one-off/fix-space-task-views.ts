#!/usr/bin/env tsx
/**
 * One-off: expose board/list/calendar tasks in the YC demo by stripping
 * erroneous custom_data._view_type from non-doc space_items, remapping
 * statuses to each space schema, and backfilling due_date + wiki list tasks.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ids } from '../lib/ids'
import { remapToSpaceStatus, statusOptionsFromSchema } from '../lib/space-item-status'
import { after, iso, seededRandom } from '../lib/timeline'

const ORG_ID = '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800'
const WIKI_SLUG = 'company-wiki'
const WIKI_TASK_TITLES = [
  'Audit wiki pages for stale scope language',
  'Refresh the brand voice cheatsheet with Q4 examples',
  'Publish the updated kickoff SOP after retro',
  'Reconcile approvals SOP with the new partner gate',
  'Index the brain-domain map for new hires',
  'Retire three anti-patterns from the public wiki',
  'Draft the Q1 campaign brief template refresh',
  'Align case study standard with Throughput win',
  'Update channel-mix guide after Saltline launch',
  'Schedule the quarterly wiki hygiene review',
]
const OPS_STATUSES = ['active', 'blocked', 'done'] as const

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), 'apps/api/.env')
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function pickDueDateIso(createdAt: string, seedKey: string): string {
  const base = new Date(createdAt)
  const daysAhead = Math.floor(seededRandom(`${seedKey}:due`) * 40) - 5
  return iso(after(base, daysAhead, 17, 0))
}

function stripViewType(customData: Record<string, unknown> | null): Record<string, unknown> {
  if (!customData || typeof customData !== 'object') return {}
  const next = { ...customData }
  delete next._view_type
  return next
}

async function main(): Promise<void> {
  loadDotEnv()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  const { data: spaces, error: spacesErr } = await supabase
    .from('spaces')
    .select('id, title, schema')
    .eq('org_id', ORG_ID)
  if (spacesErr) throw spacesErr

  const schemaBySpaceId = new Map<string, Record<string, unknown>>()
  for (const s of spaces ?? []) {
    schemaBySpaceId.set(s.id, (s.schema as Record<string, unknown>) ?? {})
  }

  const { data: items, error: itemsErr } = await supabase
    .from('space_items')
    .select('id, space_id, title, status, due_date, custom_data, created_at, org_id, user_id')
    .eq('org_id', ORG_ID)
  if (itemsErr) throw itemsErr

  const updates: Array<Record<string, unknown>> = []
  let stripped = 0
  let remapped = 0
  let dueFilled = 0

  for (const item of items ?? []) {
    const cd = (item.custom_data as Record<string, unknown> | null) ?? {}
    const isDoc = cd._view_type === 'doc'
    const schema = schemaBySpaceId.get(item.space_id) ?? {}
    const statusOpts = statusOptionsFromSchema(
      schema as { fields?: Array<{ id: string; options?: { id: string; group?: string }[] }> },
    )

    let nextStatus = item.status as string | null
    if (!isDoc) {
      const remappedStatus = remapToSpaceStatus(nextStatus, statusOpts)
      if (remappedStatus !== nextStatus) {
        remapped += 1
        nextStatus = remappedStatus
      }
    }

    let nextCustom = cd
    if (!isDoc && cd._view_type != null) {
      stripped += 1
      nextCustom = stripViewType(cd)
    }

    let nextDue = item.due_date as string | null
    if (!isDoc && !nextDue) {
      dueFilled += 1
      nextDue = pickDueDateIso(item.created_at as string, item.id as string)
    }

    const changed =
      nextStatus !== item.status ||
      nextDue !== item.due_date ||
      JSON.stringify(nextCustom) !== JSON.stringify(cd)

    if (changed) {
      updates.push({
        id: item.id,
        patch: {
          status: nextStatus,
          due_date: nextDue,
          custom_data: nextCustom,
        },
      })
    }
  }

  for (const { id, patch } of updates) {
    const { error } = await supabase.from('space_items').update(patch).eq('id', id)
    if (error) throw error
  }

  const wikiSpace = (spaces ?? []).find((s) => {
    const slugGuess = ids.id('space', ORG_ID, WIKI_SLUG)
    return s.id === slugGuess
  })
  const wikiSpaceId = wikiSpace?.id ?? ids.id('space', ORG_ID, WIKI_SLUG)

  const wikiTaskCount = (items ?? []).filter(
    (i) =>
      i.space_id === wikiSpaceId &&
      (i.custom_data as Record<string, unknown>)?._view_type !== 'doc',
  ).length

  let wikiInserted = 0
  if (wikiTaskCount === 0) {
    const founderUserId =
      (items ?? []).find((i) => i.space_id === wikiSpaceId)?.user_id ?? (items ?? [])[0]?.user_id
    if (!founderUserId) throw new Error('Could not resolve founder user_id for wiki tasks')

    const wikiRows = WIKI_TASK_TITLES.map((title, idx) => {
      const status = OPS_STATUSES[idx % OPS_STATUSES.length]!
      const itemId = ids.id('space-item', wikiSpaceId, `wiki-task-${idx}-${title.slice(0, 24)}`)
      const createdAt = iso(new Date(Date.now() - (idx + 3) * 86_400_000))
      return {
        id: itemId,
        space_id: wikiSpaceId,
        org_id: ORG_ID,
        user_id: founderUserId,
        title,
        status,
        priority: idx % 3 === 0 ? 'high' : 'medium',
        assignee_type: idx % 4 === 0 ? 'human' : 'agent',
        assignee_id: idx % 4 === 0 ? founderUserId : 'maya',
        source: 'manual',
        due_date: pickDueDateIso(createdAt, itemId),
        custom_data: { tags: ['wiki'] },
        sort_order: (idx + 1) * 100,
        created_at: createdAt,
        updated_at: createdAt,
      }
    })
    const { error: wikiErr } = await supabase
      .from('space_items')
      .upsert(wikiRows, { onConflict: 'id' })
    if (wikiErr) throw wikiErr
    wikiInserted = wikiRows.length
  }

  console.log(
    JSON.stringify(
      {
        spaces: spaces?.length ?? 0,
        itemsScanned: items?.length ?? 0,
        updated: updates.length,
        strippedViewType: stripped,
        remappedStatus: remapped,
        dueDatesFilled: dueFilled,
        wikiTasksInserted: wikiInserted,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
