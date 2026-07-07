/**
 * P10c — Agent 1:1 conversations + messages for Recent Conversations / Team chat.
 *
 * Replaces empty "New Conversation" stubs with titled threads and short exchanges
 * tied to Foundry campaigns and hired agents.
 */
import { AGENT_CONVERSATIONS } from '../content/agent-conversations'
import { after, dayOffset, iso } from '../lib/timeline'
import { startResult, type PhaseContext, type PhaseHandler } from './_context'

const PHASE_ID = '10c-agent-conversations'
const ORG_SLUG = 'foundry-creative'

export async function seedAgentConversationsForOrg(
  ctx: PhaseContext,
  options?: { replaceExisting?: boolean },
): Promise<{ conversations: number; messages: number }> {
  const orgId = ctx.state.orgId
  const founderUserId = ctx.state.founderUserId
  if (!orgId) throw new Error(`${PHASE_ID}: missing state.orgId`)
  if (!founderUserId) throw new Error(`${PHASE_ID}: missing state.founderUserId`)

  const replaceExisting = options?.replaceExisting ?? true

  const { data: campaigns, error: campErr } = await ctx.supabase
    .from('campaigns')
    .select('id, name')
    .eq('org_id', orgId)
  if (campErr) throw new Error(`${PHASE_ID}: campaigns fetch failed: ${campErr.message}`)

  const campaignIdByName = new Map<string, string>()
  for (const c of campaigns ?? []) {
    campaignIdByName.set(c.name, c.id)
  }

  if (replaceExisting) {
    const { data: existing, error: exErr } = await ctx.supabase
      .from('conversations')
      .select('id')
      .eq('org_id', orgId)
    if (exErr) throw new Error(`${PHASE_ID}: conversations list failed: ${exErr.message}`)
    const existingIds = (existing ?? []).map((r) => r.id as string)
    if (existingIds.length > 0) {
      const { error: msgDelErr } = await ctx.supabase
        .from('messages')
        .delete()
        .in('conversation_id', existingIds)
      if (msgDelErr) {
        throw new Error(`${PHASE_ID}: messages delete failed: ${msgDelErr.message}`)
      }
      const { error: convDelErr } = await ctx.supabase
        .from('conversations')
        .delete()
        .in('id', existingIds)
      if (convDelErr) {
        throw new Error(`${PHASE_ID}: conversations delete failed: ${convDelErr.message}`)
      }
    }
  }

  const conversationRows: Record<string, unknown>[] = []
  const messageRows: Record<string, unknown>[] = []

  for (const brief of AGENT_CONVERSATIONS) {
    const conversationId = ctx.ids.id('conversation', orgId, brief.slug)
    const campaignId = brief.campaignName
      ? (campaignIdByName.get(brief.campaignName) ?? null)
      : null
    if (brief.campaignName && !campaignId) {
      throw new Error(
        `${PHASE_ID}: campaign "${brief.campaignName}" not found for conversation "${brief.slug}"`,
      )
    }

    const startedAt = dayOffset(brief.startedDaysAgo, 10, 30)
    const startedIso = iso(startedAt)
    let lastAt = startedAt

    conversationRows.push({
      id: conversationId,
      user_id: founderUserId,
      org_id: orgId,
      campaign_id: campaignId,
      agent_id: brief.agentKey,
      title: brief.title,
      status: 'active',
      metadata: { source: 'yc-demo-seeder', conversation_slug: brief.slug },
      created_at: startedIso,
      updated_at: startedIso,
    })

    for (let i = 0; i < brief.exchanges.length; i += 1) {
      const ex = brief.exchanges[i]!
      const messageId = ctx.ids.id('message', conversationId, String(i))
      lastAt = after(lastAt, 0, 0, i === 0 ? 2 : 45 + i * 8)
      const createdIso = iso(lastAt)
      messageRows.push({
        id: messageId,
        conversation_id: conversationId,
        org_id: orgId,
        user_id: founderUserId,
        role: ex.role,
        content: ex.content,
        metadata: { source: 'yc-demo-seeder' },
        created_at: createdIso,
      })
    }

    const lastIso = iso(lastAt)
    const lastRow = conversationRows[conversationRows.length - 1]
    if (lastRow && lastRow.id === conversationId) {
      lastRow.updated_at = lastIso
    }
  }

  if (ctx.dryRun) {
    return { conversations: conversationRows.length, messages: messageRows.length }
  }

  const { error: convErr } = await ctx.supabase
    .from('conversations')
    .upsert(conversationRows, { onConflict: 'id', ignoreDuplicates: false })
  if (convErr) throw new Error(`${PHASE_ID}: conversations upsert failed: ${convErr.message}`)

  const CHUNK = 100
  for (let i = 0; i < messageRows.length; i += CHUNK) {
    const chunk = messageRows.slice(i, i + CHUNK)
    const { error: msgErr } = await ctx.supabase
      .from('messages')
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: false })
    if (msgErr) throw new Error(`${PHASE_ID}: messages upsert failed: ${msgErr.message}`)
  }

  return { conversations: conversationRows.length, messages: messageRows.length }
}

export const runP10cAgentConversations: PhaseHandler = async (ctx) => {
  const r = startResult(PHASE_ID)
  ctx.log.step('P10c — agent conversations + messages (Recent Conversations)')

  if (!ctx.state.orgId && ctx.dryRun) {
    ctx.state.orgId = ctx.ids.id('org', ORG_SLUG)
    ctx.state.founderUserId = ctx.state.founderUserId ?? ctx.ids.id('user', 'founder')
  }

  const counts = await seedAgentConversationsForOrg(ctx, { replaceExisting: true })
  ctx.log.step(`Seeded ${counts.conversations} conversations, ${counts.messages} messages`)
  return r.finish({
    conversations: counts.conversations,
    messages: counts.messages,
  })
}
