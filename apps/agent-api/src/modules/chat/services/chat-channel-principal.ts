export interface ChannelPrincipalUser {
  platform_id: string
  username?: string
  display_name: string
  language?: string
  relationship_kind?: 'internal'
  is_connection_owner?: boolean
  personal_brain_access?: boolean
}

export function applyChannelPrincipalBrainPolicy(input: {
  source?: string
  policyAllowsPersonalBrain: boolean
  channelUser?: ChannelPrincipalUser
}): boolean {
  if (input.source !== 'slack') return input.policyAllowsPersonalBrain
  return input.policyAllowsPersonalBrain && input.channelUser?.personal_brain_access === true
}
