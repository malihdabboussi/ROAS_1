import { resolveFollowUpOwner } from './meeting-follow-up-slack-message'

export type MeetingFollowUpRoute =
  | 'am_follow_up'
  | 'page_grader_candidate'
  | 'needs_clarification'
  | 'recap_only'

export type MeetingFollowUpPageGraderTaskType =
  | 'design'
  | 'copy'
  | 'funnel'
  | 'ghl'
  | 'ad'
  | 'video'
  | 'other'
  | 'general'

export type MeetingFollowUpActionLedger = {
  kind: 'post_call_action'
  status: 'proposed' | 'confirmed' | 'delegated' | 'blocked' | 'done' | 'dismissed'
  route: MeetingFollowUpRoute
  owner_name: string | null
  source_call_item_id: string | null
  page_grader: {
    candidate: boolean
    task_type: MeetingFollowUpPageGraderTaskType | null
    task_subtype: string | null
    reason: string | null
    delegation_status?: 'not_applicable' | 'ready' | 'delegated' | 'blocked' | 'failed'
    client_id?: string | null
    client_name?: string | null
    work_id?: string | null
    work_url?: string | null
    clickup_task_id?: string | null
    clickup_task_url?: string | null
    clickup_status?: string | null
    clickup_status_color?: string | null
    error?: string | null
    delegated_at?: string | null
    completed_at?: string | null
    status_synced_at?: string | null
  }
  confidence: 'high' | 'medium' | 'low'
  created_from: 'meeting_follow_up'
  updated_at: string
}

const CLARIFICATION_RE = /\b(confirm|clarify|find out|figure out|ask|check with|verify)\b/i
const DEPENDENCY_RE =
  /\b(confirm|clarify|find out|check with|verify)\b[\s\S]{0,180}\b(then|before|after that|once)\b/i
const PAGE_GRADER_SIGNALS: Array<[MeetingFollowUpPageGraderTaskType, RegExp, string]> = [
  [
    'funnel',
    /\b(funnel|landing page|webinar page|page preview|split[- ]test|booking calendar|advent|addevent|integrate|qc)\b/i,
    'funnel/page fulfillment signal',
  ],
  [
    'copy',
    /\b(copy|script|vsl|email|sms|text follow[- ]up|headline|sub[- ]headline|sales letter)\b/i,
    'copywriting signal',
  ],
  ['design', /\b(design|graphic|creative|deck|presentation|visual|image)\b/i, 'design signal'],
  [
    'ad',
    /\b(meta|ad account|ad rejection|campaign launch|media buying|tracking|capi|targeting)\b/i,
    'ads/media signal',
  ],
  ['video', /\b(video|reel|shorts|editing)\b/i, 'video signal'],
  ['ghl', /\b(ghl|leadconnector|workflow|automation|crm|pipeline)\b/i, 'CRM/GHL signal'],
]

const INTERNAL_ONLY_RE = /^\s*(send|message|brief|grant|compile|schedule|confirm|find|share)\b/i

export function buildMeetingFollowUpActionLedger(input: {
  item: Record<string, unknown>
  callItemId?: string | null
  status?: MeetingFollowUpActionLedger['status']
  now?: string
}): MeetingFollowUpActionLedger {
  const title = String(input.item.title ?? '').trim()
  const text = `${title}\n${String(input.item.description ?? '')}`.trim()
  const owner = resolveFollowUpOwner(input.item)
  const routed = classifyFollowUpRoute(text)
  const now = input.now ?? new Date().toISOString()

  return {
    kind: 'post_call_action',
    status: input.status ?? 'proposed',
    route: routed.route,
    owner_name: owner,
    source_call_item_id: input.callItemId ?? readSourceCallItemId(input.item),
    page_grader: {
      candidate: routed.route === 'page_grader_candidate',
      task_type: routed.taskType,
      task_subtype: routed.taskType ? inferPageGraderTaskSubtype(routed.taskType, text) : null,
      reason: routed.reason,
      delegation_status: routed.route === 'page_grader_candidate' ? 'ready' : 'not_applicable',
    },
    confidence: routed.confidence,
    created_from: 'meeting_follow_up',
    updated_at: now,
  }
}

export function inferPageGraderTaskSubtype(
  taskType: MeetingFollowUpPageGraderTaskType,
  text: string,
): string | null {
  const rules: Partial<Record<MeetingFollowUpPageGraderTaskType, Array<[RegExp, string]>>> = {
    design: [
      [/\bwebinar slides?\b/i, 'Webinar Slides'],
      [/\bad (graphic|creative|image)s?\b/i, 'Ad Graphic'],
      [/\bfunnel graphic/i, 'Funnel Graphic Elements'],
    ],
    copy: [
      [/\b(vsl|video sales letter).*script|script.*\b(vsl|video sales letter)\b/i, 'VSL Script'],
      [/\bemail (sequence|copy)|email.*follow[- ]up/i, 'Email Sequence Copy'],
      [/\b(sms|text) (sequence|copy|follow[- ]up)/i, 'SMS Sequence Copy'],
      [/\blanding page copy|page copy|headline|sub[- ]headline/i, 'Landing Page Copy'],
      [/\bwebinar script/i, 'Webinar Script'],
      [/\bad copy/i, 'Ad Copy (FB/IG)'],
    ],
    funnel: [
      [/\bwebinar (registration )?(funnel|page)|webinar page/i, 'Webinar Registration Funnel'],
      [/\b(application|booking) (funnel|page)|booking calendar/i, 'Application / Booking Funnel'],
      [/\b(vsl|sales page) funnel/i, 'VSL / Sales Page Funnel'],
      [/\blanding page/i, 'Simple Landing Page'],
      [/\bwebsite/i, 'Full Website'],
    ],
    ad: [
      [/\bwebinar.*campaign|campaign.*webinar/i, 'Webinar Registration Campaign'],
      [/\bretarget/i, 'Retargeting Campaign'],
      [/\bdm ads?\b/i, 'DM Ads Campaign'],
      [/\blead gen|lead campaign/i, 'Lead Gen Campaign'],
      [/\bbrand awareness/i, 'Brand Awareness Campaign'],
    ],
    video: [
      [/\bvsl/i, 'VSL Video Edit'],
      [/\bwebinar/i, 'Webinar Video Edit'],
      [/\btestimonial/i, 'Testimonial Video'],
      [/\bad video|video ad/i, 'Ad Creative Video (Social)'],
      [/\b(reel|short|social)/i, 'Social Media Video'],
    ],
    ghl: [
      [/\bcalendar|booking/i, 'Calendar / Booking Setup'],
      [/\bpipeline/i, 'Pipeline Setup'],
      [/\bemail sequence/i, 'Email Sequence Setup'],
      [/\bsms/i, 'SMS Campaign Setup'],
      [/\b(form|survey)/i, 'Form / Survey Setup'],
      [/\b(a2p|10dlc)/i, 'A2P 10DLC Verification'],
      [/\b(zapier|api|integration)/i, 'Integration (Zapier/API)'],
      [/\bworkflow|automation/i, 'Workflow / Automation'],
    ],
  }

  for (const [pattern, subtype] of rules[taskType] ?? []) {
    if (pattern.test(text)) return subtype
  }
  return taskType === 'other' || taskType === 'general' ? 'Other' : null
}

export function classifyFollowUpRoute(text: string): {
  route: MeetingFollowUpRoute
  taskType: MeetingFollowUpPageGraderTaskType | null
  reason: string | null
  confidence: 'high' | 'medium' | 'low'
} {
  const clean = text.trim()
  if (!clean) {
    return {
      route: 'needs_clarification',
      taskType: null,
      reason: 'empty action item',
      confidence: 'high',
    }
  }

  if (DEPENDENCY_RE.test(clean)) {
    return {
      route: 'needs_clarification',
      taskType: null,
      reason: 'contains a prerequisite that should be confirmed before delegation',
      confidence: 'high',
    }
  }

  for (const [taskType, re, reason] of PAGE_GRADER_SIGNALS) {
    if (!re.test(clean)) continue
    if (INTERNAL_ONLY_RE.test(clean)) {
      return {
        route: 'am_follow_up',
        taskType: null,
        reason: 'handoff wording looks internal rather than new fulfillment work',
        confidence: 'medium',
      }
    }
    return {
      route: 'page_grader_candidate',
      taskType,
      reason,
      confidence: CLARIFICATION_RE.test(clean) ? 'medium' : 'high',
    }
  }

  if (CLARIFICATION_RE.test(clean)) {
    return {
      route: 'needs_clarification',
      taskType: null,
      reason: 'requires confirmation or missing context',
      confidence: 'medium',
    }
  }

  return {
    route: 'am_follow_up',
    taskType: null,
    reason: 'owner follow-up without a fulfillment signal',
    confidence: 'medium',
  }
}

function readSourceCallItemId(item: Record<string, unknown>): string | null {
  const customData =
    item.custom_data && typeof item.custom_data === 'object'
      ? (item.custom_data as Record<string, unknown>)
      : {}
  const id = String(customData.source_call_item_id ?? '').trim()
  return id || null
}
