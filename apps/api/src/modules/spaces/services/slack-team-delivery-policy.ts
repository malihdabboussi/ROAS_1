import type { SlackShadowAction } from '../../slack/types/slack.types'
import { decideSlackCadence, type SlackCadenceConfig } from './slack-team-cadence'

type DeliveryPerson = {
  id: string
  relationship_kind: string
  delivery_mode: string
}

export function decideSlackDelivery(input: {
  deliveryMode: 'shadow' | 'active'
  personIds: string[]
  quietHoursActive: boolean
  now?: Date
  timezone?: string
  cadence?: SlackCadenceConfig
  action: SlackShadowAction
  recipient?: DeliveryPerson
  kind: string
}): { canSend: boolean; reason: string; nextEligibleAt?: string } {
  if (input.quietHoursActive) return { canSend: false, reason: 'quiet_hours' }
  if (input.action.action_kind !== 'message') return { canSend: false, reason: 'not_message' }
  if (!input.recipient) return { canSend: false, reason: 'recipient_missing' }
  if (input.recipient.relationship_kind !== 'internal') {
    return { canSend: false, reason: 'recipient_not_internal' }
  }
  if (input.recipient.delivery_mode !== 'active') {
    return { canSend: false, reason: 'recipient_not_active' }
  }
  const cadence = decideSlackCadence({
    now: input.now ?? new Date(),
    timezone: input.timezone ?? 'America/Los_Angeles',
    kind: input.kind,
    metadata: input.action.metadata,
    config: input.cadence,
  })
  if (!cadence.allowed) {
    return { canSend: false, reason: cadence.reason, nextEligibleAt: cadence.nextEligibleAt }
  }
  if (input.kind === 'personal_moment') {
    if (input.deliveryMode !== 'active') return { canSend: false, reason: 'flow_shadow' }
    if (!input.personIds.includes(input.recipient.id)) {
      return { canSend: false, reason: 'recipient_not_allowlisted' }
    }
    return { canSend: true, reason: 'allowed' }
  }
  if (input.deliveryMode !== 'shadow' && !input.personIds.includes(input.recipient.id)) {
    return { canSend: false, reason: 'recipient_not_allowlisted' }
  }
  return { canSend: true, reason: 'allowed' }
}
