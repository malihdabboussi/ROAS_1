import type { LucideIcon } from 'lucide-react'
import { CheckSquare, ListChecks, ListTodo, Send } from 'lucide-react'

/**
 * One-click post-call actions shown in the meeting workspace once a call is
 * complete. Each action sends its prompt into the meeting's linked
 * conversation, where the agent has the transcript, recording summary, and
 * action items as context.
 *
 * The prompts encode how Dylan actually writes follow-ups: owner + concrete
 * deliverable + real date + the one-line why, ✅ DONE markers for finished
 * work, direct asks aimed at named people — and they filter Fathom's
 * over-captured conversational asides instead of treating every remark as a
 * commitment. Message deliverables come back in ```draft fences so they render
 * as editable versioned draft cards.
 */
export interface MeetingPostCallAction {
  id: string
  label: string
  icon: LucideIcon
  prompt: string
}

export const MEETING_FOLLOW_UP_REVIEW_PARAM = 'review'
export const MEETING_FOLLOW_UP_REVIEW_VALUE = 'follow-up'

/**
 * Guided review opened from Pixel's post-call Slack recap. The meeting workspace
 * stays visible beside the linked conversation while Pixel walks the operator
 * through context, the existing Portal delegation preview, and the editable
 * draft-message card in that order.
 */
export const MEETING_FOLLOW_UP_REVIEW_PROMPT = [
  'Start the post-meeting follow-up review for this meeting.',
  '',
  'Stage 1 — confirm the meeting context:',
  '- Show one compact summary using the linked meeting workspace: meeting summary, Client Workspace, who attended, and how many follow-ups exist.',
  '- Ask me to confirm it or tell you what to change. Keep the meeting workspace as the source of truth and apply any corrections there.',
  '- Do not delegate tasks or draft the client message until I confirm the context.',
  '',
  'Stage 2 — confirm and delegate tasks:',
  '- After I confirm the context, collect every remaining work item our team owns from the recap, transcript, recording summary, and meeting action items.',
  '- Let me add, edit, or dismiss items in chat before delegation. Skip client-owned work and anything already marked done.',
  '- Use the existing bulk delegation flow exactly: call list_mcp_tools, then call page_grader_create_delegation_preview once with the resolved Portal client, Portal campaign_id, the full remaining-work list, and a stable idempotency_key from this meeting id.',
  '- Return the real confirm_url and stop while I review each task in The ROAS Portal. Do not create tasks another way and do not claim they exist before I Confirm there.',
  '',
  'Stage 3 — finish the follow-up message:',
  '- After I tell you the delegation review is complete, write the editable client follow-up using the final confirmed tasks.',
  '- Return the full send-ready message in a ```draft Follow-up message``` fence so the existing editable message card is used.',
  '- Help me revise it in chat. Do not send it. The final action is for me to copy the completed message.',
  '',
  'Work through one stage at a time and wait for my confirmation between stages.',
].join('\n')

export const MEETING_POST_CALL_ACTIONS: MeetingPostCallAction[] = [
  {
    id: 'run-post-call-flow',
    label: 'Run post-call flow',
    icon: ListChecks,
    prompt: MEETING_FOLLOW_UP_REVIEW_PROMPT,
  },
  {
    id: 'action-items-pass',
    label: 'Clean up action items',
    icon: CheckSquare,
    prompt: [
      "Review this meeting's action items against the transcript. Fathom over-captures, so judge each one:",
      '',
      '1. Real commitment or conversational aside? Someone saying "yeah, I\'ll watch it over the weekend" is not a tracked action item — flag those to drop, with a one-line reason.',
      '2. Rewrite every real item as: owner — concrete deliverable — deadline. Pull the date from the conversation; if no date was said, propose a sensible one and mark it (proposed).',
      '3. Note anything discussed on the call that SHOULD be an action item but was not captured.',
      '',
      'End with the cleaned, paste-ready list.',
    ].join('\n'),
  },
  {
    id: 'follow-up-message',
    label: 'Follow-up message',
    icon: Send,
    prompt: [
      'Draft my client-facing follow-up message for this meeting from the transcript and summary — written for Slack, not email. No subject line, no letter formatting.',
      '',
      'Include: a short honest framing of where things stand (own anything that was our miss — plainly, no groveling); what is happening next with owner — deliverable — date and the why in one line each; anything I need from them, asked directly with @name; and a closing line that commits to when they will hear from me next.',
      '',
      'Skip conversational asides — only real commitments with dates.',
      'Do not stall for missing details. Draft from confirmed facts now; omit unknown deadlines or label sensible assumptions as proposed, and ask any remaining question only after the drafts.',
      'Inside draft fences use send-ready plain text only. Do not use Markdown emphasis markers such as ** or __.',
      '',
      'Give me two versions in draft fences: ```draft Full message``` and ```draft Short version``` (tight, a few lines).',
    ].join('\n'),
  },
  {
    id: 'delegate-remaining',
    label: 'Delegate remaining work',
    icon: ListTodo,
    prompt: [
      'I just finished this call. Collect every remaining work item our team still owns and send me one confirm link in The ROAS Portal.',
      '',
      'Sources, in order: the recap hit list if one exists, then the transcript, recording summary, and action items.',
      'Keep (IN PROGRESS) and (TO-DO) items. Skip anything marked ✅ DONE, already confirmed on the call, or owned by the client.',
      '',
      'Resolve the Portal client from this meeting and the current campaign (prefer the webinar/campaign named in the recap or agenda). If zero or many campaigns remain, ask one question: which campaign.',
      'Call list_mcp_tools, then page_grader_create_delegation_preview once with client_ref, the Portal campaign_id, raw_text = the full remaining-work list (not titles only), and a stable idempotency_key from this meeting id.',
      '',
      'Reply with the confirm_url as a real openable https link. Tell me to review and Confirm in The ROAS Portal.',
      'Do not create tasks. Do not loop page_grader_create_fulfillment_request. Do not send work silently. Do not say the tasks exist until I Confirm.',
    ].join('\n'),
  },
]

/**
 * Pre-call actions shown before the meeting starts. Same mechanics as the
 * post-call actions: each seeds the meeting's linked conversation, where the
 * agent has the invite, prior-meeting continuity, and open action items as
 * context.
 */
export function startAgendaPrompt(agendaDocItemId: string | null | undefined): string {
  const writeTarget = agendaDocItemId?.trim()
    ? [
        `Write the agenda into the meeting agenda Space Doc with update_document using document_id ${agendaDocItemId.trim()} (this is the space_item_id).`,
        'The user edits that document on the right like a Space Doc. Do not only return a draft fence.',
      ].join(' ')
    : 'Return it in a ```draft Agenda``` fence so I can edit it.'
  return [
    'Kick off the agenda for this upcoming meeting and put it on the agenda page.',
    '',
    'Pull in and write onto the agenda, when they exist:',
    '- Open action items and unresolved commitments from this meeting and the last related meeting',
    '- Launches, launch dates, and launch deliverables from the linked campaign or Space',
    '- Client reports, Page Grader / campaign performance, and other client deliverables that should be reviewed on this call',
    '- Recurring follow-ups, blockers, and decisions the attendees need to make',
    '',
    'Also use the invite, who is attending, and anything unresolved from the last meeting.',
    'Omit a source if it is missing. Do not invent launches, reports, or numbers.',
    '',
    'Format: 3-6 agenda points max, each as topic — why it matters — decision or outcome we need. Put the highest-stakes item first. Flag anything I should read or prep before the call.',
    '',
    writeTarget,
  ].join('\n')
}

export const MEETING_PRE_CALL_ACTIONS: MeetingPostCallAction[] = [
  {
    id: 'start-agenda',
    label: 'Start agenda',
    icon: ListChecks,
    prompt: startAgendaPrompt(null),
  },
]

export function googleAgendaPrompt(): string {
  return [
    'Kick off this meeting’s agenda in the Page Grader Google Doc — not the Space Doc on the right.',
    '',
    'If a Google agenda is already linked on the calendar invite, open and update that doc.',
    'Otherwise create or open the Page Grader portal agenda Google Doc for this call.',
    '',
    "Shape it like the live client agenda: WHAT'S ON THE AGENDA? as a short TOC, then one 🏆 section per topic, then 🏆 ACTIONS as a checkbox hit list at the bottom.",
    '',
    'Keep the Space Doc agenda untouched unless I ask for it.',
  ].join('\n')
}
