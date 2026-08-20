import type { SupabaseClient } from '@supabase/supabase-js'

const SLACK_USER_MENTION_RE = /<@([A-Z0-9]+)(?:\|[^>]+)?>/g

export type SlackMentionIdentity = {
  slackUserId: string
  displayName: string
  email: string | null
  linkedRoasName: string | null
}

export type SlackMentionExpansion = {
  text: string
  directoryBlock: string
}

type SlackUserLookup = {
  getUserInfo: (
    botToken: string,
    userId: string,
  ) => Promise<{
    id?: string
    name?: string
    real_name?: string
    profile?: { display_name?: string; real_name?: string; email?: string }
  } | null>
}

type ChannelMemberRow = {
  platform_id: string
  display_name: string | null
  username: string | null
  email: string | null
  vibey_user_id: string | null
}

function uniqueMentionIds(text: string): string[] {
  return [...new Set([...text.matchAll(SLACK_USER_MENTION_RE)].map((match) => match[1]))]
}

export function stripSelfSlackMentions(text: string, botUserId: string | null | undefined): string {
  if (!botUserId) return text
  return text.replace(new RegExp(`<@${botUserId}(?:\\|[^>]+)?>\\s*`, 'g'), '').trim()
}

export function formatSlackMentionDirectoryBlock(identities: SlackMentionIdentity[]): string {
  if (identities.length === 0) return ''
  const lines = identities.map((identity) => {
    const email = identity.email ? `<${identity.email}>` : 'email unknown'
    const linked = identity.linkedRoasName
      ? `linked ROAS user: ${identity.linkedRoasName}`
      : 'not linked to a ROAS/Portal teammate — do not guess another person who shares a first name or slash alias'
    return `- ${identity.displayName} ${email} (${linked})`
  })
  return `[Slack teammates mentioned]\n${lines.join('\n')}`
}

export function applySlackMentionIdentities(
  text: string,
  identities: SlackMentionIdentity[],
): SlackMentionExpansion {
  const byId = new Map(identities.map((identity) => [identity.slackUserId, identity]))
  const expanded = text.replace(SLACK_USER_MENTION_RE, (match, slackUserId: string) => {
    const identity = byId.get(slackUserId)
    return identity ? `@${identity.displayName}` : match
  })
  return { text: expanded, directoryBlock: formatSlackMentionDirectoryBlock(identities) }
}

function displayNameFromSlackUser(user: {
  name?: string
  real_name?: string
  profile?: { display_name?: string; real_name?: string }
}): string {
  return (
    user.profile?.display_name?.trim() ||
    user.profile?.real_name?.trim() ||
    user.real_name?.trim() ||
    user.name?.trim() ||
    ''
  )
}

async function loadChannelMembers(
  supabase: SupabaseClient,
  input: { orgId: string | null; ownerUserId: string; slackUserIds: string[] },
): Promise<ChannelMemberRow[]> {
  let query = supabase
    .from('channel_members')
    .select('platform_id, display_name, username, email, vibey_user_id')
    .eq('platform', 'slack')
    .in('platform_id', input.slackUserIds)
  query = input.orgId
    ? query.eq('org_id', input.orgId)
    : query.eq('user_id', input.ownerUserId)
  const { data } = await query
  return (data ?? []) as ChannelMemberRow[]
}

async function loadLinkedRoasNames(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (userIds.length === 0) return names
  const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
  for (const row of data ?? []) {
    const name =
      (typeof row.full_name === 'string' && row.full_name.trim()) ||
      (typeof row.email === 'string' && row.email.trim()) ||
      ''
    if (name) names.set(String(row.id), name)
  }
  return names
}

export async function expandInboundSlackMentions(input: {
  supabase: SupabaseClient
  slackApi: SlackUserLookup
  orgId: string | null
  ownerUserId: string
  botToken: string
  botUserId?: string | null
  text: string
}): Promise<SlackMentionExpansion> {
  const stripped = stripSelfSlackMentions(input.text, input.botUserId)
  const slackUserIds = uniqueMentionIds(stripped).filter((id) => id !== input.botUserId)
  if (slackUserIds.length === 0) return { text: stripped, directoryBlock: '' }

  const members = await loadChannelMembers(input.supabase, {
    orgId: input.orgId,
    ownerUserId: input.ownerUserId,
    slackUserIds,
  })
  const memberById = new Map(members.map((row) => [row.platform_id, row]))
  const linkedNames = await loadLinkedRoasNames(
    input.supabase,
    members.map((row) => row.vibey_user_id).filter((id): id is string => Boolean(id)),
  )

  const identities: SlackMentionIdentity[] = []
  for (const slackUserId of slackUserIds) {
    const member = memberById.get(slackUserId)
    const slackUser = member
      ? null
      : await input.slackApi.getUserInfo(input.botToken, slackUserId).catch(() => null)
    const displayName =
      member?.display_name?.trim() ||
      member?.username?.trim() ||
      (slackUser ? displayNameFromSlackUser(slackUser) : '') ||
      slackUserId
    identities.push({
      slackUserId,
      displayName,
      email: member?.email?.trim() || slackUser?.profile?.email?.trim() || null,
      linkedRoasName: member?.vibey_user_id
        ? (linkedNames.get(member.vibey_user_id) ?? null)
        : null,
    })
  }

  return applySlackMentionIdentities(stripped, identities)
}
