export type SlackOpenItem = {
  id: string
  org_id: string
  scope_level: 'company' | 'client' | 'campaign'
  program_id: string | null
  campaign_id: string | null
  space_id: string | null
  external_client_id: string | null
  case_type:
    | 'unanswered_ask'
    | 'client_ask'
    | 'commitment'
    | 'client_risk'
    | 'quality_control'
    | 'proactive_launch'
    | 'campaign_quality_control'
    | 'post_call'
    | 'offer'
  source_type: string
  source_key: string
  subject_person_id: string | null
  client_label: string | null
  channel_id: string | null
  source_message_ts: string | null
  summary: string
  severity: 'low' | 'normal' | 'high' | 'critical'
  status: 'open' | 'acknowledged' | 'snoozed' | 'answered' | 'resolved' | 'stale'
  first_seen_at: string
  last_activity_at: string
  due_at: string | null
  breach_notified_at: string | null
  snoozed_until: string | null
  times_surfaced: number
  last_surfaced_at: string | null
  resolution_note: string | null
  metadata: Record<string, unknown>
}
