/**
 * Narrative demo sequences for Foundry client campaigns (post–stub cleanup).
 */

export interface DemoSequenceEmailDef {
  subject: string
  body: string
  delayHours: number
}

export interface DemoSequenceDef {
  slug: string
  name: string
  clientSlug: string
  campaignSlug: string
  funnelSlug?: string
  triggerType?: 'manual'
  configKind: string
  createdWeek: number
  createdDay: number
  createdHour?: number
  emails: readonly DemoSequenceEmailDef[]
}

export const ALMANAC_MENTOR_MATCHING_SEQUENCE: DemoSequenceDef = {
  slug: 'mentor-matching',
  name: 'Almanac — Mentor Matching',
  clientSlug: 'zeta',
  campaignSlug: 'zeta',
  funnelSlug: 'zeta-writing-cohort-checkout',
  configKind: 'mentor_matching',
  createdWeek: 12,
  createdDay: 1,
  emails: [
    {
      subject: 'Your writing cohort starts soon — mentor match in progress',
      delayHours: 0,
      body: `Hi —

You are enrolled in the next adult writing cohort. Before the first Sunday review, we match you with a mentor who has read your application note.

That match usually lands within seven days. You will get a personal note from your mentor — not a template — with how they work and what they expect from you.

Until then: skim the syllabus. Do not start the exercises early. The cohort moves together.

Questions? Reply here. A human reads it.

— Almanac Learning`,
    },
    {
      subject: 'Meet Elena — your mentor for this cohort',
      delayHours: 72,
      body: `Hi —

Your mentor is Elena Morales. She has run three Almanac cohorts and publishes her own essays on revision, not inspiration.

Elena wrote you a short note (attached in spirit — it is in the next paragraph):

"I care about sentences that survive a second read. I do not care if you have a book outline yet. Show up to Sunday review with one paragraph you are embarrassed by — that is enough to start."

Your first live session is Sunday at 4pm ET. Office hours are optional; the review is not.

— Almanac Learning`,
    },
    {
      subject: 'Sunday review preview — what to bring',
      delayHours: 144,
      body: `Hi —

First Sunday review is this weekend.

Bring:
- One page you wrote this week (draft is fine)
- One question you are stuck on — craft, not career

Elena will work through two volunteer pieces live, then open the room. You are not required to volunteer week one.

If you cannot make it live, the recording posts within an hour. The cohort still expects you to submit your page before midnight.

See you Sunday.

— Almanac Learning`,
    },
  ],
}

export const SALTLINE_PANTRY_WELCOME_SEQUENCE: DemoSequenceDef = {
  slug: 'pantry-club-welcome',
  name: 'Saltline — Pantry Club Welcome',
  clientSlug: 'beta',
  campaignSlug: 'beta',
  funnelSlug: 'beta-pantry-club-vsl',
  configKind: 'membership_welcome',
  createdWeek: 11,
  createdDay: 3,
  emails: [
    {
      subject: 'Welcome to the Pantry Club',
      delayHours: 0,
      body: `Hi —

You are in. The Pantry Club is a small membership — quarterly boxes, occasional drops, no urgency language in this inbox.

Your first box ships on the 15th. Until then, we will send you two notes: how drops work, and what to cook first when the parcel lands.

No points. No tiers. If it is not useful, unsubscribe — we would rather a full table than a full list.

— Saltline & Co`,
    },
    {
      subject: 'How Saltline drops work (no flash sales)',
      delayHours: 48,
      body: `Hi —

A note on how we release things.

We do four drops a year, tied to the season — not the algorithm. When a drop opens, members get 48 hours first. After that, whatever remains goes to the site.

We do not stack discount codes on top of member pricing. If you see a sale elsewhere, it is not us being clever — it is old inventory leaving quietly.

Your member price is locked for the year you joined.

— Saltline & Co`,
    },
    {
      subject: 'When your box arrives — start here',
      delayHours: 120,
      body: `Hi —

Your first box is en route. When it lands:

1. Open the olive oil first — it is meant for weeknight pasta, not ceremony.
2. The recipe card is for a two-pan dinner. Ignore the garnish photo.
3. Save the linen wrap. It is the right size for bread you buy on Saturday.

If anything arrives damaged, reply with a photo. We replace without making you prove you are a "loyal customer."

— Saltline & Co`,
    },
    {
      subject: 'A letter from June — the shared table',
      delayHours: 240,
      body: `Hi —

June asked us to send this directly:

"I started Saltline because I wanted fewer products and better reasons to cook on a Tuesday. The Pantry Club funds the small batches that do not scale — the ones we would otherwise skip.

If you cook one meal from the box and send us a note about what you changed, I read every reply."

That is the whole pitch. Thank you for joining.

— Saltline & Co`,
    },
  ],
}

export const CLOVERKIN_ONBOARDING_SEQUENCE: DemoSequenceDef = {
  slug: 'new-patient-onboarding',
  name: 'Cloverkin — New Patient Onboarding',
  clientSlug: 'delta',
  campaignSlug: 'delta',
  configKind: 'patient_onboarding',
  triggerType: 'manual',
  createdWeek: 12,
  createdDay: 0,
  emails: [
    {
      subject: 'Welcome to Cloverkin — here is what happens next',
      delayHours: 0,
      body: `Hi —

Thank you for signing up with Cloverkin. You are not in a queue — a patient navigator will reach out within one business day to confirm your first visit.

What to expect:
- A short call to verify insurance and location preference
- A plain-language summary of your care team (no "care journey" language — we mean it)
- Your visit date, time, and who you will see

If you need to reach us before the call: reply to this email or use the number in your confirmation text.

— Cloverkin Health`,
    },
    {
      subject: 'Your navigator will call tomorrow',
      delayHours: 24,
      body: `Hi —

Your navigator is Alex Chen. They will call tomorrow between 9am and 12pm local time from a number ending in 4410.

Alex will ask about:
- Which metro you are in (Boston, Providence, or Hartford)
- Whether you prefer in-person or virtual for the first visit
- Any medications you want the clinician to know about before you arrive

The call takes about ten minutes. If the time does not work, reply with two windows that do.

— Cloverkin Health`,
    },
    {
      subject: 'Before your first visit',
      delayHours: 72,
      body: `Hi —

Your first visit is scheduled. A few practical notes:

Bring:
- Photo ID and insurance card (or photos on your phone)
- A list of current medications — photos of the bottles are fine
- One question you want answered in the first fifteen minutes

Please arrive ten minutes early if in-person. Virtual visits: test your link fifteen minutes before — we send it again the morning of.

Clinical claims in our materials are reviewed by our medical director. If something on the site felt unclear, tell your clinician — we track that feedback.

— Cloverkin Health`,
    },
    {
      subject: 'Reminder — your visit is tomorrow',
      delayHours: 144,
      body: `Hi —

Your first Cloverkin visit is tomorrow.

In-person: {{clinic_address}} — check in at the front desk. Ask for the navigator desk if you are early.

Virtual: your link is in the portal. Sign in five minutes before; a staff member will admit you from the waiting room.

After the visit you will get one follow-up note — what was discussed, next steps, and how to reach your care team. Not a marketing email. A clinical summary.

See you tomorrow.

— Cloverkin Health`,
    },
  ],
}

export const THROUGHPUT_COO_OUTBOUND_SEQUENCE: DemoSequenceDef = {
  slug: 'coo-outbound',
  name: 'Throughput — COO Outbound',
  clientSlug: 'epsilon',
  campaignSlug: 'epsilon',
  configKind: 'coo_outbound',
  triggerType: 'manual',
  createdWeek: 13,
  createdDay: 0,
  emails: [
    {
      subject: 'Bench utilization question — {{company}}',
      delayHours: 0,
      body: `Hi {{first_name}} —

I work with Throughput Group. We repackage services firms when the website still lists six overlapping lines and the COO has to explain utilization in board prep.

One question — no pitch attached: when bench creeps above 15%, does your team treat it as a staffing problem or a positioning problem?

If you have a strong view either way, I would value ten minutes. If not, ignore this — wrong thread.

— {{sender_name}}
Throughput Group`,
    },
    {
      subject: 'Re: bench utilization — one COO quote',
      delayHours: 96,
      body: `Hi {{first_name}} —

Following up once. A COO at a 400-person consultancy told us last month:

"We did not have a utilization problem. We had a story problem — buyers could not tell which line item they were buying."

They collapsed six lines into three flagship offers. Bench did not move for two quarters — then pipeline clarity showed up in close rates.

If that matches something you are navigating, happy to send the one-page hierarchy they used. If not, I will close the loop.

— {{sender_name}}`,
    },
    {
      subject: 'The proposal kit problem',
      delayHours: 216,
      body: `Hi {{first_name}} —

Third note. Throughput's partners stopped opening their own 40-page proposal deck. We rebuilt the kit to eight pages: diagnosis, recommended pod, margin assumption, kill criteria, fee, next step.

COOs cared. Partners resisted. The COO won.

If proposal sprawl is a live issue at {{company}}, I can share the outline — no call required. Reply "outline" and I will send it.

— {{sender_name}}`,
    },
    {
      subject: 'Case note — one pod, one quarter',
      delayHours: 336,
      body: `Hi {{first_name}} —

Short case note: a services firm at ~600 people ran one pod as a pilot on the new hierarchy — one flagship line, fixed scope, explicit kill criteria at week six.

They did not hit the revenue target. They did get a clean answer on whether the positioning held in sales calls. That was the point.

Worth a conversation if you are running a similar experiment? If timing is off, say so — I will check back next quarter.

— {{sender_name}}`,
    },
    {
      subject: 'Closing the loop',
      delayHours: 504,
      body: `Hi {{first_name}} —

Last email from me on this thread.

If repackaging service lines is not on your roadmap this half, no action needed — I will not add you to a nurture stream.

If it moves up the list, reply with one sentence on what triggered it. That helps us send useful material instead of generic follow-ups.

Thank you for the silence or the reply — both are useful signals.

— {{sender_name}}
Throughput Group`,
    },
  ],
}

export const CLIENT_DEMO_SEQUENCES: readonly DemoSequenceDef[] = [
  ALMANAC_MENTOR_MATCHING_SEQUENCE,
  SALTLINE_PANTRY_WELCOME_SEQUENCE,
  CLOVERKIN_ONBOARDING_SEQUENCE,
  THROUGHPUT_COO_OUTBOUND_SEQUENCE,
]
