/**
 * P10 — Polish.
 *
 * 1. UPDATE profiles for the 3 humans (founder, Nico, Jules):
 *    - full_name from content/agency.ts HumanPartner.displayName
 *    - avatar_url deterministically derived (dicebear notionists style for
 *      humans — readable on dark + light backgrounds)
 *    - onboarding_animation_seen = true
 *
 * 2. INSERT ~50-150 `space_item_activity` rows distributed across the last
 *    14-21 days. Wave 4b will populate state.spaceIds + space_items in P6;
 *    in a single-phase run (or before P6) state.spaceIds will be empty —
 *    in that case we log a warning and skip the backfill. When state.spaceIds
 *    IS populated, we query `space_items` for real ids in the org and create
 *    activity rows referencing them.
 *
 * 3. Agent 1:1 chats: see phase `10c-agent-conversations` (titles + messages).
 *
 * Org-scoped. Deterministic ids. `--reset` cascades from P1.
 */
import { FOUNDER, JULES, NICO } from '../content/agency'
import { startResult, type PhaseHandler, type PhaseState } from './_context'

interface HumanProfileTarget {
  slug: 'founder' | 'nico' | 'jules'
  userIdKey: 'founderUserId' | 'nicoUserId' | 'julesUserId'
  displayName: string
}

const HUMAN_PROFILE_TARGETS: readonly HumanProfileTarget[] = [
  { slug: 'founder', userIdKey: 'founderUserId', displayName: FOUNDER.displayName },
  { slug: 'nico', userIdKey: 'nicoUserId', displayName: NICO.displayName },
  { slug: 'jules', userIdKey: 'julesUserId', displayName: JULES.displayName },
]

function dicebearAvatarUrl(slug: string): string {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(slug)}`
}

const HUMAN_EVENT_TYPES: readonly (
  | 'comment'
  | 'field_change'
  | 'status_change'
  | 'assignee_change'
  | 'created'
  | 'added_subtask'
)[] = ['comment', 'status_change', 'assignee_change', 'field_change', 'created', 'added_subtask']

interface ActorChoice {
  userIdKey: 'founderUserId' | 'nicoUserId' | 'julesUserId'
  actorKind: 'human' | 'agent'
  actorLabel: string
}

function buildActorRotation(
  state: PhaseState,
  hiredAgentKeys: readonly string[],
): readonly ActorChoice[] {
  const choices: ActorChoice[] = []
  if (state.founderUserId) {
    choices.push({ userIdKey: 'founderUserId', actorKind: 'human', actorLabel: FOUNDER.slug })
  }
  if (state.nicoUserId) {
    choices.push({ userIdKey: 'nicoUserId', actorKind: 'human', actorLabel: NICO.slug })
  }
  if (state.julesUserId) {
    choices.push({ userIdKey: 'julesUserId', actorKind: 'human', actorLabel: JULES.slug })
  }
  // Agent-attributed events still need a real auth.users.id for the FK; we
  // route those through the founder's user_id and record the agent identity
  // in payload.actor.
  for (const agentKey of hiredAgentKeys) {
    if (!state.founderUserId) break
    choices.push({ userIdKey: 'founderUserId', actorKind: 'agent', actorLabel: agentKey })
  }
  return choices
}

function payloadFor(
  eventType: (typeof HUMAN_EVENT_TYPES)[number],
  actor: ActorChoice,
  seedSuffix: string,
): Record<string, unknown> {
  const base = {
    actor: { kind: actor.actorKind, key: actor.actorLabel },
    seed: seedSuffix,
  }
  switch (eventType) {
    case 'comment':
      return {
        ...base,
        body:
          actor.actorKind === 'agent'
            ? `Drafted an update for review — let me know if the tone reads off.`
            : `Pulled the latest feedback into the doc. Take a look before Friday.`,
      }
    case 'status_change':
      return { ...base, from: 'todo', to: 'in_progress' }
    case 'assignee_change':
      return { ...base, from: null, to: actor.actorLabel }
    case 'field_change':
      return { ...base, field: 'priority', from: 'medium', to: 'high' }
    case 'created':
      return { ...base, source: 'manual' }
    case 'added_subtask':
      return { ...base, subtask_title: 'Pressure-test the framing with one customer quote' }
  }
}

function ensureDryRunBootstrap(state: PhaseState, idFn: (...parts: string[]) => string): void {
  if (!state.orgId) state.orgId = idFn('org', 'foundry-creative')
  if (!state.founderUserId) state.founderUserId = idFn('user', 'founder')
  if (!state.nicoUserId) state.nicoUserId = idFn('user', 'nico')
  if (!state.julesUserId) state.julesUserId = idFn('user', 'jules')
}

export const runP10Polish: PhaseHandler = async (ctx) => {
  const r = startResult('10-polish')
  const { state, log, supabase, ids, dryRun, timeline } = ctx

  if (dryRun && (!state.orgId || !state.founderUserId || !state.nicoUserId || !state.julesUserId)) {
    ensureDryRunBootstrap(state, ids.id)
    log.step('Dry-run isolation: synthesized state.orgId + state.{founder,nico,jules}UserId')
  }

  const orgId = state.orgId
  if (!orgId) throw new Error('P10 requires state.orgId (set by P1)')

  const warnings: string[] = []
  const rowCounts: Record<string, number> = {
    'profiles (UPDATE)': 0,
    space_item_activity: 0,
    messages: 0,
  }

  // ─── 1) UPDATE profiles for the 3 humans ───────────────────────────────
  log.step(`Updating ${HUMAN_PROFILE_TARGETS.length} human profiles (full_name + avatar)`)
  for (const target of HUMAN_PROFILE_TARGETS) {
    const userId = state[target.userIdKey]
    if (!userId) {
      const warning = `P10: state.${target.userIdKey} missing — skipping profile update for "${target.slug}"`
      warnings.push(warning)
      log.warn(warning)
      continue
    }

    const update = {
      full_name: target.displayName,
      avatar_url: dicebearAvatarUrl(target.slug),
      onboarding_animation_seen: true,
      updated_at: timeline.iso(timeline.now()),
    }

    if (dryRun) {
      log.step(
        `  [dry-run] would UPDATE profiles { id: "${userId}", full_name: "${target.displayName}", avatar_url: "${update.avatar_url}", onboarding_animation_seen: true }`,
      )
    } else {
      const { error: profErr } = await supabase.from('profiles').update(update).eq('id', userId)
      if (profErr) {
        throw new Error(`Update profiles for "${target.slug}" failed: ${profErr.message}`)
      }
    }
    rowCounts['profiles (UPDATE)'] = (rowCounts['profiles (UPDATE)'] ?? 0) + 1
  }

  // ─── 2) space_item_activity backfill (conditional on P6 having run) ────
  const spaceSlugs = Object.keys(state.spaceIds ?? {})
  if (spaceSlugs.length === 0) {
    const warning =
      'P10: state.spaceIds is empty — skipping space_item_activity backfill. Re-run the full chain after P6 (spaces) is implemented to materialize ~100 activity rows.'
    warnings.push(warning)
    log.warn(warning)
  } else {
    log.step(
      `Backfilling space_item_activity across ${spaceSlugs.length} spaces from state.spaceIds`,
    )

    // Pull a sample of real space_items.ids for this org. If none exist yet
    // (P6 may have inserted spaces but no items), fall back to a synthesized
    // dry-run preview that does not commit.
    let itemRows: Array<{ id: string; space_id: string }> = []
    if (!dryRun) {
      const { data: rows, error: itemsErr } = await supabase
        .from('space_items')
        .select('id, space_id')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(300)
      if (itemsErr) {
        throw new Error(`Sample space_items failed: ${itemsErr.message}`)
      }
      itemRows = (rows ?? []) as Array<{ id: string; space_id: string }>
    } else {
      // Dry-run: synthesize 30 plausible (item_id, space_id) pairs from
      // state.spaceIds so the preview output is realistic without DB reads.
      for (const spaceSlug of spaceSlugs) {
        const spaceId = state.spaceIds?.[spaceSlug]
        if (!spaceId) continue
        for (let i = 0; i < 5; i++) {
          itemRows.push({
            id: ids.id('space-item-synthetic', orgId, spaceSlug, String(i)),
            space_id: spaceId,
          })
        }
      }
    }

    if (itemRows.length === 0) {
      const warning =
        'P10: state.spaceIds is populated but `space_items` returned 0 rows for this org. Skipping space_item_activity backfill — re-run after P6.5/P7 has inserted items.'
      warnings.push(warning)
      log.warn(warning)
    } else {
      const hiredAgentKeys = state.hiredAgentKeys ?? []
      const actorRotation = buildActorRotation(state, hiredAgentKeys)
      if (actorRotation.length === 0) {
        throw new Error('P10: actor rotation is empty — at least one human user_id is required')
      }

      const TARGET_ROWS = Math.min(120, Math.max(50, itemRows.length * 3))
      const activityRows: Array<Record<string, unknown>> = []

      for (let i = 0; i < TARGET_ROWS; i++) {
        const item = itemRows[i % itemRows.length]
        if (!item) continue
        const actor = actorRotation[i % actorRotation.length]
        if (!actor) continue
        const userId = state[actor.userIdKey]
        if (!userId) continue
        const eventType = HUMAN_EVENT_TYPES[i % HUMAN_EVENT_TYPES.length]
        if (!eventType) continue

        // Distribute across the last 14-21 days, jittered with a deterministic seed.
        const seed = `p10-activity:${orgId}:${item.id}:${i}`
        const rand = timeline.seededRandom(seed)
        const daysAgo = 1 + Math.floor(rand * 20)
        const hour = 8 + Math.floor(timeline.seededRandom(`${seed}:h`) * 12)
        const minute = Math.floor(timeline.seededRandom(`${seed}:m`) * 60)
        const createdAtIso = timeline.iso(timeline.dayOffset(daysAgo, hour, minute))

        activityRows.push({
          id: ids.id('space_item_activity', orgId, item.id, String(i)),
          item_id: item.id,
          space_id: item.space_id,
          user_id: userId,
          org_id: orgId,
          event_type: eventType,
          payload: payloadFor(eventType, actor, seed),
          created_at: createdAtIso,
        })
      }

      if (dryRun) {
        log.step(
          `  [dry-run] would INSERT ${activityRows.length} space_item_activity rows across ${itemRows.length} space_items (synthesized for preview)`,
        )
        rowCounts.space_item_activity = (rowCounts.space_item_activity ?? 0) + activityRows.length
      } else {
        // Batched upsert by id to stay idempotent on re-runs.
        const BATCH = 50
        for (let i = 0; i < activityRows.length; i += BATCH) {
          const chunk = activityRows.slice(i, i + BATCH)
          const { error: actErr } = await supabase
            .from('space_item_activity')
            .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
          if (actErr) {
            throw new Error(
              `Upsert space_item_activity (batch ${i}..${i + chunk.length}) failed: ${actErr.message}`,
            )
          }
          rowCounts.space_item_activity = (rowCounts.space_item_activity ?? 0) + chunk.length
        }
      }
    }
  }

  // ─── 3) Vibey strategic-chat seed — SKIPPED ───────────────────────────
  const vibeyChatWarning =
    'P10: Vibey strategic-chat seed in `messages` was punted. messages.conversation_id FK requires materializing a full conversations row (agent_key/agent_kind/brain bindings) outside the scope of this polish phase. Wave 4c can add this.'
  warnings.push(vibeyChatWarning)
  log.warn(vibeyChatWarning)

  return r.finish(rowCounts, warnings)
}
