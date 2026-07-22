type SlackEvidencePerson = { display_name: string }

export type SlackTeamEvidenceMessage = {
  channel_id: string
  channel_name: string
  ts: string
  thread_ts: string | null
  user: string
  text: string
}

type SlackSignalKind = 'brain_memory' | 'workflow_discovery' | 'unanswered_question' | 'client_risk'

type SlackLoopKind =
  | 'brain_compounding'
  | 'workflow_discovery'
  | 'unanswered_questions'
  | 'client_risk'
  | 'all'

export function slackSignalMatchesLoop(kind: SlackSignalKind, loopKind: SlackLoopKind): boolean {
  if (loopKind === 'all') return true
  if (loopKind === 'brain_compounding') return kind === 'brain_memory'
  if (loopKind === 'unanswered_questions') return kind === 'unanswered_question'
  return kind === loopKind
}

export function slackSignalHasLaterHumanReply(
  signal: { target_channel_id: string; source_message_ts: string },
  messages: Array<Pick<SlackTeamEvidenceMessage, 'channel_id' | 'ts' | 'thread_ts' | 'user'>>,
): boolean {
  const source = messages.find(
    (message) =>
      message.channel_id === signal.target_channel_id && message.ts === signal.source_message_ts,
  )
  if (!source) return false
  const threadTs = source.thread_ts || source.ts
  return messages.some(
    (message) =>
      message.channel_id === source.channel_id &&
      message.thread_ts === threadTs &&
      Number(message.ts) > Number(source.ts) &&
      message.user !== 'PIXEL_BOT',
  )
}

export function resolveSlackIdentityText(
  value: string,
  peopleBySlackId: Map<string, SlackEvidencePerson>,
): string {
  let resolved = value
  for (const [slackUserId, person] of peopleBySlackId) {
    resolved = resolved
      .replaceAll(`<@${slackUserId}>`, person.display_name)
      .replaceAll(slackUserId, person.display_name)
  }
  return resolved
}

export function slackTeamEvidenceMetadata(input: {
  source: SlackTeamEvidenceMessage
  slackTeamId: string
  peopleBySlackId: Map<string, SlackEvidencePerson>
}): Record<string, unknown> {
  const sourcePerson = input.peopleBySlackId.get(input.source.user)
  return {
    source_channel_name: input.source.channel_name,
    source_sender_display_name: sourcePerson?.display_name ?? input.source.user,
    source_sender_slack_user_id: input.source.user,
    source_message_text: resolveSlackIdentityText(input.source.text, input.peopleBySlackId),
    source_thread_ts: input.source.thread_ts || input.source.ts,
    source_slack_team_id: input.slackTeamId,
  }
}
