/**
 * Plinthworks on-call webinar — 5-email reminder sequence.
 * Tied to funnel slug `acme-on-call-webinar` (Ship Faster Without Breaking On-Call).
 */

export interface WebinarSequenceEmailDef {
  subject: string
  body: string
  /** Hours after registration before this email sends. */
  delayHours: number
}

export const PLINTHWORKS_WEBINAR_SEQUENCE = {
  slug: 'webinar-reminder',
  name: 'Plinthworks — On-Call Webinar Reminder',
  funnelSlug: 'acme-on-call-webinar',
  clientSlug: 'acme',
  campaignSlug: 'acme',
  emails: [
    {
      subject: "You're registered — Ship Faster Without Breaking On-Call",
      delayHours: 0,
      body: `Thanks for signing up.

We're live Thursday at 11:00am ET for a 45-minute session on shipping to staging without waking the on-call rotation.

Add it to your calendar: {{calendar_link}}

What we'll cover:
- Why most staging rollouts still page on-call (and the one gate that fixes it)
- A rollback path your team will actually use
- The diff view on-call engineers asked for in every interview we ran

No slides deck. One live walkthrough.

— The Plinthworks team`,
    },
    {
      subject: 'Three staging mistakes that still page on-call',
      delayHours: 48,
      body: `Quick preview before Thursday.

The teams we talk to usually have the same three gaps:

1. Staging is "close enough" — until it isn't. No explicit parity checklist before merge.
2. Rollback exists in docs, not in the button path. On-call finds out at 2am.
3. The person who shipped isn't in the rotation. Context dies in Slack threads.

We'll walk through how each one shows up in your pipeline — and what to change first if you only fix one this quarter.

See you Thursday at 11:00am ET.

— Plinthworks`,
    },
    {
      subject: 'Case note: 40% fewer pages, same incident volume',
      delayHours: 96,
      body: `One data point ahead of the session.

A platform team cut pager noise ~40% in six weeks without hiding incidents or slowing deploys.

What changed: they stopped treating staging as a preview environment and started treating it as a rehearsal for on-call.

We'll show the exact gate they added before merge — takes about ten minutes to wire up if your CI already runs checks.

Thursday, 11:00am ET. Reply if you want the checklist PDF after.

— Plinthworks`,
    },
    {
      subject: 'Tomorrow — your pre-webinar checklist',
      delayHours: 120,
      body: `Session is tomorrow at 11:00am ET.

If you want to follow along live, have these handy:
- One recent staging deploy you weren't proud of (no names needed)
- Your current rollback steps — even if they're "revert the PR"
- Who gets paged when staging breaks vs prod

We'll keep it practical. No "world-class platform" talk.

Join link lands in your inbox an hour before we start.

— Plinthworks`,
    },
    {
      subject: 'Starting in one hour — join link inside',
      delayHours: 144,
      body: `We go live in 60 minutes.

Join here: {{webinar_link}}

Agenda (45 min):
- 10 min — the staging/on-call gap most teams miss
- 20 min — live walkthrough of the rollback + diff flow
- 15 min — your questions (especially the edge cases)

If you can't make it, reply "recording" and we'll send the replay when it's ready.

See you soon.

— Plinthworks`,
    },
  ] satisfies readonly WebinarSequenceEmailDef[],
} as const
