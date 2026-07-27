import type { SupabaseClient } from '@supabase/supabase-js'

export async function insertConversationPassOffNotification(
  supabase: SupabaseClient,
  input: {
    conversationId: string
    conversationTitle: string | null | undefined
    fromUserId: string
    toUserId: string
    orgId: string | null
    note: string
  },
): Promise<void> {
  if (input.toUserId === input.fromUserId) return

  const title =
    typeof input.conversationTitle === 'string' && input.conversationTitle.trim().length > 0
      ? input.conversationTitle.trim()
      : 'a conversation'

  let fromName = 'A teammate'
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', input.fromUserId)
    .maybeSingle()
  if (typeof profile?.full_name === 'string' && profile.full_name.trim()) {
    fromName = profile.full_name.trim()
  }

  const noteLine = input.note ? ` Note: ${input.note}` : ''
  const actionUrl = `/home?conversation=${encodeURIComponent(input.conversationId)}`
  const { error } = await supabase.from('user_notifications').insert({
    user_id: input.toUserId,
    org_id: input.orgId,
    type: 'conversation_pass_off',
    title: `${fromName} passed you a conversation`,
    body: `${fromName} shared “${title}” with you.${noteLine}`,
    mission_id: null,
    action_url: actionUrl,
  })
  if (error) throw new Error(error.message)
}
