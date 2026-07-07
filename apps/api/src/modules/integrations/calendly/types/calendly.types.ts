// ── OAuth ──

export type CalendlyOAuthTokenResponse = {
  token_type: string
  access_token: string
  refresh_token: string
  scope: string
  expires_in: number
  created_at: number
  owner: string
  organization: string
}

// ── User ──

export type CalendlyUser = {
  uri: string
  name: string
  slug: string
  email: string
  scheduling_url: string
  timezone: string
  avatar_url: string | null
  created_at: string
  updated_at: string
  current_organization: string
}

export type CalendlyUserIntegration = {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: 'pending' | 'connected' | 'error' | 'disconnected'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  connected_at: string | null
  metadata: {
    calendly_user_uri?: string
    calendly_org_uri?: string
    calendly_user_email?: string
    calendly_scheduling_url?: string
    webhook_subscription_uri?: string
  } | null
}

// ── Location ──

export type CalendlyLocationKind =
  | 'ask_invitee'
  | 'custom'
  | 'google_conference'
  | 'gotomeeting_conference'
  | 'inbound_call'
  | 'microsoft_teams_conference'
  | 'outbound_call'
  | 'physical'
  | 'webex_conference'
  | 'zoom_conference'

export type CalendlyLocationConfig = {
  kind: CalendlyLocationKind
  location?: string
  additional_info?: string
  phone_number?: string
}

// ── Event Types ──

export type CalendlyEventType = {
  uri: string
  name: string
  slug: string
  scheduling_url: string
  duration: number
  duration_options: number[] | null
  kind: string
  active: boolean
  color: string
  locale: string
  description_plain: string | null
  description_html: string | null
  locations: CalendlyLocationConfig[]
  pooling_type: string | null
  type: string
  profile: {
    name: string
    owner: string
    type: string
  } | null
  created_at: string
  updated_at: string
}

export type CreateEventTypeInput = {
  owner: string
  name: string
  description?: string
  duration: number
  duration_options?: number[]
  locations?: CalendlyLocationConfig[]
  color?: string
  locale?: string
  active?: boolean
  kind?: CalendlyLocationKind
}

export type UpdateEventTypeInput = {
  name?: string
  description?: string
  duration?: number
  duration_options?: number[]
  locations?: CalendlyLocationConfig[]
  color?: string
  locale?: string
  active?: boolean
}

// ── One-Off Event Types ──

export type CreateOneOffEventTypeInput = {
  name: string
  host: string
  co_hosts?: string[]
  duration: number
  timezone?: string
  date_setting: {
    type: 'date_range'
    start_date: string
    end_date: string
  }
  location?: {
    kind: string
    location: string
    additional_info?: string
  }
}

// ── Scheduled Events ──

export type CalendlyScheduledEvent = {
  uri: string
  name: string
  status: string
  start_time: string
  end_time: string
  event_type: string
  location: {
    type: string
    location?: string
    join_url?: string
  } | null
  invitees_counter: {
    total: number
    active: number
    limit: number
  }
  created_at: string
  updated_at: string
  event_memberships: Array<{ user: string }>
}

export type CalendlyInvitee = {
  uri: string
  email: string
  name: string
  first_name: string | null
  last_name: string | null
  status: string
  timezone: string | null
  questions_and_answers: Array<{
    question: string
    answer: string
    position: number
  }>
  tracking: {
    utm_campaign: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_content: string | null
    utm_term: string | null
    salesforce_uuid: string | null
  }
  cancel_url: string
  reschedule_url: string
  cancellation: Record<string, unknown> | null
  payment: Record<string, unknown> | null
  no_show: Record<string, unknown> | null
  rescheduled: boolean
  old_invitee: string | null
  new_invitee: string | null
  scheduling_method: string | null
  invitee_scheduled_by: string | null
  created_at: string
  updated_at: string
}

export type CreateScheduledEventInput = {
  event_type: string
  start_time: string
  invitee: {
    name: string
    first_name: string
    last_name: string
    email: string
    timezone: string
    text_reminder_number?: string | null
  }
  location?: {
    kind: string
    location: string
  }
  questions_and_answers?: Array<{
    question: string
    answer: string
    position: number
  }>
  tracking?: {
    utm_campaign?: string
    utm_source?: string
    utm_medium?: string
    utm_content?: string
    utm_term?: string
    salesforce_uuid?: string
  }
  event_guests?: string[]
}

// ── Available Times ──

export type CalendlyAvailableTime = {
  status: string
  start_time: string
  invitees_remaining: number
}

// ── Webhooks ──

export type CalendlyWebhookSubscription = {
  uri: string
  callback_url: string
  events: string[]
  scope: string
  organization: string
  user: string
  created_at: string
  updated_at: string
}

export type CalendlyWebhookPayload = {
  event: 'invitee.created' | 'invitee.canceled'
  created_at: string
  created_by: string
  payload: {
    uri: string
    email: string
    name: string
    first_name: string | null
    last_name: string | null
    status: string
    timezone: string | null
    event: string
    cancel_url: string
    reschedule_url: string
    questions_and_answers: Array<{
      question: string
      answer: string
      position: number
    }>
    tracking: {
      utm_campaign: string | null
      utm_source: string | null
      utm_medium: string | null
      utm_content: string | null
      utm_term: string | null
      salesforce_uuid: string | null
    }
    cancellation?: {
      canceled_by: string
      reason: string | null
    }
    scheduled_event: {
      uri: string
      name: string
      status: string
      start_time: string
      end_time: string
      event_type: string
      location: {
        type: string
        location?: string
        join_url?: string
      } | null
    }
  }
}
