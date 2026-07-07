/**
 * Channel definitions + threaded message anchors.
 *
 * Wave 3 fills this. P8 inserts channels + channel_memberships +
 * channel_messages across the 90-day arc. Messages can reference artifact
 * IDs + avatar names. P3b2 cortex signals then cite these message IDs in
 * evidence_refs.
 *
 * 12 channels · 60 threads · ~430 messages.
 */
import type { ChannelDef, ChannelThread } from './_types'
import { dateInWeek } from './timeline'

export const CHANNELS: readonly ChannelDef[] = [
  {
    slug: 'plinthworks-channel',
    name: '#plinthworks',
    spaceSlug: 'plinthworks-workspace',
    campaignSlug: 'acme',
    members: ['Maya', 'Sara', 'Leo', 'Devon', 'Riley', 'founder', 'nico'],
  },
  {
    slug: 'saltline-channel',
    name: '#saltline',
    spaceSlug: 'saltline-workspace',
    campaignSlug: 'beta',
    members: ['Maya', 'Sara', 'Casey', 'Riley', 'founder', 'jules'],
  },
  {
    slug: 'helmsmark-channel',
    name: '#helmsmark',
    spaceSlug: 'helmsmark-workspace',
    campaignSlug: 'gamma',
    members: ['Maya', 'Sara', 'Casey', 'Devon', 'Riley', 'founder', 'nico'],
  },
  {
    slug: 'cloverkin-channel',
    name: '#cloverkin',
    spaceSlug: 'cloverkin-workspace',
    campaignSlug: 'delta',
    members: ['Maya', 'Sara', 'Casey', 'Devon', 'Riley', 'founder'],
  },
  {
    slug: 'throughput-channel',
    name: '#throughput',
    spaceSlug: 'throughput-workspace',
    campaignSlug: 'epsilon',
    members: ['Maya', 'Sara', 'Casey', 'Riley', 'founder', 'nico', 'Owen'],
  },
  {
    slug: 'almanac-channel',
    name: '#almanac',
    spaceSlug: 'almanac-workspace',
    campaignSlug: 'zeta',
    members: ['Maya', 'Sara', 'Devon', 'Riley', 'founder'],
  },
  {
    slug: 'foundry-general',
    name: '#foundry-general',
    members: ['Maya', 'Leo', 'Sara', 'Devon', 'Casey', 'Riley', 'Owen', 'founder', 'nico', 'jules'],
  },
  {
    slug: 'foundry-leadership',
    name: '#foundry-leadership',
    members: ['founder', 'nico', 'jules'],
  },
  {
    slug: 'sales-channel',
    name: '#sales',
    spaceSlug: 'sales-pipeline',
    campaignSlug: 'sales',
    members: ['Maya', 'Riley', 'founder', 'nico', 'Owen'],
  },
  {
    slug: 'wiki-discussion',
    name: '#wiki',
    campaignSlug: 'wiki',
    members: ['Maya', 'Sara', 'Owen', 'founder', 'nico'],
  },
  {
    slug: 'design-crit',
    name: '#design-crit',
    members: ['Casey', 'Maya', 'Sara', 'Devon'],
  },
  {
    slug: 'pricing-and-margins',
    name: '#pricing-and-margins',
    members: ['Owen', 'Riley', 'founder', 'nico', 'jules'],
  },
]

export const CHANNEL_THREADS: readonly ChannelThread[] = [
  // ── PLINTHWORKS — 5 threads ─────────────────────────────────────────────
  {
    slug: 'thread-plinthworks-v04-launch-post-final',
    channelSlug: 'plinthworks-channel',
    campaignSlug: 'acme',
    spaceSlug: 'plinthworks-workspace',
    topic: 'v0.4 launch post — final read-through before HN cross-post',
    startedAt: dateInWeek(7, 3, 14, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'v0.4 launch post is in the doc. Wrote it three ways. The shortest one is right. Asking for one read before it goes up at 9am tomorrow.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Reading now. The rollback API snippet has to be above the fold or the engineer scrolls past.',
        minuteOffset: 18,
      },
      {
        speaker: 'Devon',
        body: 'I will move the snippet up before lunch. Four-line change.',
        minuteOffset: 27,
      },
      {
        speaker: 'founder',
        body: 'Read it. Two notes. Line 3 of paragraph 2 — "unlocks staged rollouts" — kill it. They do not need to be unlocked.',
        minuteOffset: 45,
      },
      {
        speaker: 'Sara',
        body: 'Cut. "Staged rollouts ship in v0.4." Done.',
        minuteOffset: 52,
      },
      {
        speaker: 'founder',
        body: 'Second note. The kill criterion at the bottom is the best line in the post. Keep it.',
        minuteOffset: 58,
      },
      {
        speaker: 'Riley',
        body: 'Confirmed with Theo — they will retweet at 9:05am after we post. Cross-post to HN at 9:10.',
        minuteOffset: 95,
      },
      {
        speaker: 'Sara',
        body: 'Locked. Logged. Ship tomorrow 9am.',
        minuteOffset: 120,
      },
    ],
  },
  {
    slug: 'thread-plinthworks-v2-positioning-debate',
    channelSlug: 'plinthworks-channel',
    campaignSlug: 'acme',
    spaceSlug: 'plinthworks-workspace',
    topic: 'v2 positioning — manager vs on-call engineer',
    startedAt: dateInWeek(9, 1, 10, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'Theo wants the v2 hero to stay on the engineering manager. The data does not. Eleven of fourteen trial drops are the on-call engineer abandoning week two.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'The manager is the buyer. The on-call engineer is the user who kills the trial. Two different jobs. The hero has to pick the user.',
        minuteOffset: 11,
      },
      {
        speaker: 'Sara',
        body: "Show me the customer quote that earns either line. I'll write whichever we pick.",
        minuteOffset: 24,
      },
      {
        speaker: 'Maya',
        body: 'Interview 4. Sasha M., staff SRE: "I don\'t need another tool to look at. I need the tool that already paged me to not be the worst part of being on-call."',
        minuteOffset: 33,
      },
      {
        speaker: 'founder',
        body: 'That is the line. The manager keeps writing checks if the on-call engineer stops abandoning the trial. We are moving the brand one user down. Maya owns it.',
        minuteOffset: 41,
      },
      {
        speaker: 'Maya',
        body: 'On it. v2 candidates in the doc by Friday. Pressure-test with Theo Monday.',
        minuteOffset: 48,
      },
      {
        speaker: 'Riley',
        body: 'Theo is on the Monday 9am ET call. I will resend the doc Sunday night so he reads it cold.',
        minuteOffset: 67,
      },
    ],
  },
  {
    slug: 'thread-plinthworks-v2-hero-ship',
    channelSlug: 'plinthworks-channel',
    campaignSlug: 'acme',
    spaceSlug: 'plinthworks-workspace',
    topic: 'v2 hero shipping — final read + flag flip',
    startedAt: dateInWeek(11, 2, 9, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'Hero copy locked. "The on-call layer for engineers who get paged at 3am." Three-up subs underneath. Asking for one last read.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Read it. If a competitor could paste this under their logo, it does not belong under ours. Nobody else can claim this line. Ship.',
        minuteOffset: 22,
      },
      {
        speaker: 'Casey',
        body: 'Type pass done. Two weights. One accent. Showed it at 14px and at billboard. Both hold.',
        minuteOffset: 35,
      },
      {
        speaker: 'Devon',
        body: 'Hero behind a flag on staging. Split test wired against current. 10% traffic to start.',
        minuteOffset: 51,
      },
      {
        speaker: 'founder',
        body: "Flip it to 50% by Thursday. I want the day-7 cohort by next Tuesday's call.",
        minuteOffset: 80,
      },
      {
        speaker: 'Leo',
        body: 'Cohort or it did not happen. I will pull the read Tuesday morning before the call.',
        minuteOffset: 91,
      },
      {
        speaker: 'Devon',
        body: 'Shipped behind a flag. Logged. Linked. Closed.',
        minuteOffset: 240,
      },
    ],
  },
  {
    slug: 'thread-plinthworks-docs-voice-audit-kickoff',
    channelSlug: 'plinthworks-channel',
    campaignSlug: 'acme',
    spaceSlug: 'plinthworks-workspace',
    topic: 'Docs voice audit — kickoff and rubric',
    startedAt: dateInWeek(12, 1, 10, 30),
    messages: [
      {
        speaker: 'Sara',
        body: 'First 200 docs pages are in three voices. New visitor hits the quickstart and feels three different companies. Drafting a 4-axis rubric: voice, audience, specificity, drift.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Send the rubric before you tag a single page. The rubric is the contract.',
        minuteOffset: 14,
      },
      {
        speaker: 'Sara',
        body: 'Rubric in the doc. First 10 concept pages tagged against it. The quickstart is the worst offender.',
        minuteOffset: 180,
      },
      {
        speaker: 'Riley',
        body: 'Looping you in for visibility — Plinthworks docs lead asked when we will be done with the audit. Told her end of Week 13. Confirmed in writing.',
        minuteOffset: 1320,
      },
      {
        speaker: 'Sara',
        body: 'On track. Five sample rewrites going up tomorrow to show the tier system.',
        minuteOffset: 1380,
      },
      {
        speaker: 'Maya',
        body: 'Polish later. Decide on the tier system first. Once the tier system is locked, the rewrites are mechanical.',
        minuteOffset: 1410,
      },
    ],
  },
  {
    slug: 'thread-plinthworks-q2-paid-experiment-plan',
    channelSlug: 'plinthworks-channel',
    campaignSlug: 'acme',
    spaceSlug: 'plinthworks-workspace',
    topic: 'Q2 paid experiment — Reddit hypothesis',
    startedAt: dateInWeek(12, 3, 14, 0),
    messages: [
      {
        speaker: 'Leo',
        body: 'Q2 plan in the doc. Hypothesis: the on-call engineer is on Reddit, not LinkedIn. r/sysadmin + r/devops, $4k cap, two weeks, kill criterion CAC > $1200 on day 10.',
        minuteOffset: 0,
      },
      {
        speaker: 'founder',
        body: 'I will run it for two weeks and then I am turning it off — is that you talking or me?',
        minuteOffset: 12,
      },
      {
        speaker: 'Leo',
        body: 'Both. Written into the kill criterion this time.',
        minuteOffset: 18,
      },
      {
        speaker: 'Maya',
        body: 'Three creative variants — every line has to pass the on-call engineer voice rubric. No "world-class" anywhere.',
        minuteOffset: 40,
      },
      {
        speaker: 'Sara',
        body: "Drafted the three. Shortest one is the one I'm putting in. Read it aloud and there was no stumble.",
        minuteOffset: 85,
      },
      {
        speaker: 'Riley',
        body: 'Theo budget approval — I will get him on a call before this turns into a thread.',
        minuteOffset: 130,
      },
      {
        speaker: 'Leo',
        body: 'Approval and we launch Monday. Day-10 read on the Friday call.',
        minuteOffset: 180,
      },
    ],
  },

  // ── SALTLINE — 5 threads ────────────────────────────────────────────────
  {
    slug: 'thread-saltline-kitchenware-scope-creep',
    channelSlug: 'saltline-channel',
    campaignSlug: 'beta',
    spaceSlug: 'saltline-workspace',
    topic: 'Kitchenware scope ask — handling the no',
    startedAt: dateInWeek(4, 0, 10, 30),
    messages: [
      {
        speaker: 'Riley',
        body: 'Saltline founder just asked on the Friday call if we can "also do the kitchenware drops" inside the existing retainer. Different voice, different calendar. Bringing it here before it turns into a Notion thread.',
        minuteOffset: 0,
      },
      {
        speaker: 'jules',
        body: 'That is a change order, not a tweak. Who is actually going to do that on Monday morning?',
        minuteOffset: 15,
      },
      {
        speaker: 'Maya',
        body: 'Scoped it last night. Kitchenware is a separate voice exploration, a separate photography brief, and a separate calendar. Math doubles the retainer for the same fee.',
        minuteOffset: 28,
      },
      {
        speaker: 'founder',
        body: 'We do not absorb the change. A retainer with no scope is a project with no end date. Riley sends the no with the option to scope it as a second retainer.',
        minuteOffset: 41,
      },
      {
        speaker: 'Riley',
        body: 'On it. I will get them on a call before this turns into a thread. Will send the one-page rationale Maya wrote so they have the framing.',
        minuteOffset: 50,
      },
      {
        speaker: 'jules',
        body: 'Log this. This is the kind of ask that comes back in Week 9. We want the rationale on file.',
        minuteOffset: 78,
      },
      {
        speaker: 'Maya',
        body: 'Filed as cancelled mission with the rationale in the decision log. Future retainer expansion asks route through Owen first.',
        minuteOffset: 240,
      },
    ],
  },
  {
    slug: 'thread-saltline-q4-throughline-lock',
    channelSlug: 'saltline-channel',
    campaignSlug: 'beta',
    spaceSlug: 'saltline-workspace',
    topic: 'Q4 calendar — locking the throughline',
    startedAt: dateInWeek(5, 1, 11, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'Q4 throughline candidate: "a shared table in low light." Every drop, every photo, every email tests against it. Not a tagline. The test.',
        minuteOffset: 0,
      },
      {
        speaker: 'Sara',
        body: 'Whose voice is this in? Reads to me — and it reads like the founder on a Sunday morning, not like a marketer.',
        minuteOffset: 12,
      },
      {
        speaker: 'Casey',
        body: 'If the throughline holds, the photography brief writes itself. Low light, table not studio, never the product alone.',
        minuteOffset: 18,
      },
      {
        speaker: 'founder',
        body: 'Lock it. The throughline does the heavy lifting all quarter or we change it before Drop 4.',
        minuteOffset: 33,
      },
      {
        speaker: 'Maya',
        body: 'Locked. Sara writes 12 stories against it. Casey shoots 12 stills against it. Riley schedules.',
        minuteOffset: 47,
      },
      {
        speaker: 'Sara',
        body: 'A brand that means anything has to refuse something. We are refusing discount-stack messaging through all of Q4. Putting that in the brief now.',
        minuteOffset: 60,
      },
    ],
  },
  {
    slug: 'thread-saltline-pantry-story-draft',
    channelSlug: 'saltline-channel',
    campaignSlug: 'beta',
    spaceSlug: 'saltline-workspace',
    topic: 'Pantry small-batch story — first draft read',
    startedAt: dateInWeek(8, 1, 14, 30),
    messages: [
      {
        speaker: 'Sara',
        body: 'First draft of the small-batch pantry story is up. 600 words. No "artisanal", no "curated", no "elevate". Read once aloud — one stumble at the third paragraph. Cut it.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Reading. The line about hand-tying at the farm in Puglia is the one. Everything else is in service to that line.',
        minuteOffset: 28,
      },
      {
        speaker: 'Casey',
        body: 'Photography brief is two stills against that line, three against the kitchen-counter scene. Five total. Shoot Friday.',
        minuteOffset: 41,
      },
      {
        speaker: 'Riley',
        body: 'Saltline founder reading it tonight. We get the fact-check back Monday morning.',
        minuteOffset: 78,
      },
      {
        speaker: 'founder',
        body: 'Sara, the closing line — "set the bottle on the table and let dinner come to it" — that is the brand voice in seven words. Keep it.',
        minuteOffset: 140,
      },
      {
        speaker: 'Sara',
        body: 'A line is doing work or it is not. That one is. Keeping.',
        minuteOffset: 168,
      },
    ],
  },
  {
    slug: 'thread-saltline-photography-direction-refresh',
    channelSlug: 'saltline-channel',
    campaignSlug: 'beta',
    spaceSlug: 'saltline-workspace',
    topic: 'Photography direction refresh — three-rule doc',
    startedAt: dateInWeek(12, 1, 10, 30),
    messages: [
      {
        speaker: 'Casey',
        body: 'Photography has been drifting toward overhead-shot white-background for six months. Six months. Drafting a three-rule direction doc: low light, at the table not the studio, never the product alone.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Photography is fifty percent of the brand. Treat it like it. The three rules are the brand surviving without a Casey signature on every shot.',
        minuteOffset: 17,
      },
      {
        speaker: 'Sara',
        body: 'The system has to survive a Tuesday — copy and shots both. If the Saltline in-house photographer can shoot against the three rules on a Tuesday without calling you, the brief is finished.',
        minuteOffset: 28,
      },
      {
        speaker: 'Casey',
        body: 'Exactly the test. Figma library going up by Wednesday with reference grids. Sample shoot Friday with their in-house. Pressure test.',
        minuteOffset: 42,
      },
      {
        speaker: 'Riley',
        body: 'I will block the founder for the Friday sample shoot read. Confirmed in writing or it did not happen.',
        minuteOffset: 71,
      },
    ],
  },
  {
    slug: 'thread-saltline-lifecycle-email-rewrite',
    channelSlug: 'saltline-channel',
    campaignSlug: 'beta',
    spaceSlug: 'saltline-workspace',
    topic: 'Lifecycle email rewrite — welcome series read',
    startedAt: dateInWeek(12, 2, 14, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'Welcome series rewrite. Four emails. No "your journey", no "we believe". Read aloud, no stumbles. Asking for one read before I move to post-purchase.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Email 1 opens too softly. The subject line is doing the work; the first sentence should not repeat it.',
        minuteOffset: 22,
      },
      {
        speaker: 'Sara',
        body: 'Cut the adjective. Keep the noun. Email 1 opens with the bottle on the table now.',
        minuteOffset: 31,
      },
      {
        speaker: 'Casey',
        body: 'Email 3 has the new photography in it — please use the Friday shoot set, not the old library.',
        minuteOffset: 64,
      },
      {
        speaker: 'Riley',
        body: 'Devon — when can the new flows go live in Klaviyo? Saltline founder wants the new welcome on the next sign-up batch.',
        minuteOffset: 110,
      },
      {
        speaker: 'Devon',
        body: 'Welcome series wired by Thursday. Post-purchase next week. Two states, both designed.',
        minuteOffset: 135,
      },
    ],
  },

  // ── HELMSMARK — 5 threads ───────────────────────────────────────────────
  {
    slug: 'thread-helmsmark-controller-interview-kickoff',
    channelSlug: 'helmsmark-channel',
    campaignSlug: 'gamma',
    spaceSlug: 'helmsmark-workspace',
    topic: 'Controller interviews — kickoff and questions',
    startedAt: dateInWeek(7, 1, 10, 0),
    messages: [
      {
        speaker: 'nico',
        body: "Starting controller interviews this week. Six controllers, four ride-alongs. The question I'm leading with: what would have to be true for you to put Helmsmark on the procurement short list for Q2?",
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Good lead. Save the "what burns you at month-end close" question for minute 30 — that is where the verbatim quotes live.',
        minuteOffset: 24,
      },
      {
        speaker: 'nico',
        body: 'Agreed. And I want one ride-along where I sit silently for an hour while she does the close. Listening, not asking. The audit-trail blind spot will surface on its own.',
        minuteOffset: 38,
      },
      {
        speaker: 'founder',
        body: 'I want the third interview transcript on my desk before the Monday strategy call. The first two will be polite. The third is where the controller stops performing.',
        minuteOffset: 90,
      },
      {
        speaker: 'Riley',
        body: 'Eliza has cleared three controllers from her network for the ride-alongs. I have it. Stand down on coordination.',
        minuteOffset: 130,
      },
      {
        speaker: 'nico',
        body: 'First interview is Wednesday. Will share the transcript Thursday morning.',
        minuteOffset: 200,
      },
    ],
  },
  {
    slug: 'thread-helmsmark-controller-position-debate',
    channelSlug: 'helmsmark-channel',
    campaignSlug: 'gamma',
    spaceSlug: 'helmsmark-workspace',
    topic: 'Controller positioning — dropping "small business"',
    startedAt: dateInWeek(9, 0, 10, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'Position candidates in the doc. All three drop "small business" and put the controller on the hero. Joel (Helmsmark CTO) pushed back yesterday — wants to keep small-business in the deck.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'The interviews say the buyer is not a small-business owner. The buyer is a controller at a 50-200 person company. Keeping "small business" on the hero is asking the wrong customer to read the page.',
        minuteOffset: 22,
      },
      {
        speaker: 'founder',
        body: 'That is a feature, not a position. Joel is selling a feature he is proud of. Maya is selling the buyer the position. Maya is right.',
        minuteOffset: 35,
      },
      {
        speaker: 'Maya',
        body: 'Writing the one-page rationale for the demotion. Will route to Eliza first — she was a controller herself, she will back it.',
        minuteOffset: 50,
      },
      {
        speaker: 'Riley',
        body: 'Eliza is on the Wednesday 9am ET call. I will get the rationale in front of her Tuesday night so she reads it cold.',
        minuteOffset: 88,
      },
      {
        speaker: 'Sara',
        body: 'Once the position locks, the homepage rewrite is mostly mechanical. I will have hero candidates by Friday.',
        minuteOffset: 140,
      },
      {
        speaker: 'Maya',
        body: 'Polish later. Decide first. We pick the position Wednesday or we slip the site launch.',
        minuteOffset: 195,
      },
    ],
  },
  {
    slug: 'thread-helmsmark-v2-narrative-lock',
    channelSlug: 'helmsmark-channel',
    campaignSlug: 'gamma',
    spaceSlug: 'helmsmark-workspace',
    topic: 'v2 narrative locked — site IA kickoff',
    startedAt: dateInWeek(11, 1, 17, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'v2 narrative locked. "Helmsmark is the banking layer for the controller who runs the close." Eliza signed off. Joel is in.',
        minuteOffset: 0,
      },
      {
        speaker: 'founder',
        body: 'Good. The next test is whether every Helmsmark page sits under that line. If a page reads like a 2022 fintech, it does not ship.',
        minuteOffset: 11,
      },
      {
        speaker: 'Devon',
        body: 'IA in the doc. Home, product (recon / cash / audit trail), pricing, security, customers, blog. Component library next week.',
        minuteOffset: 28,
      },
      {
        speaker: 'Casey',
        body: 'Type scale: a single serif at three weights, one accent. Pick the type and live with it for a year. Sending the Figma frame tonight.',
        minuteOffset: 60,
      },
      {
        speaker: 'Sara',
        body: 'Home + product copy v1 by Thursday. SOC 2 page in the controller voice, not the security-blog voice — that is the hardest one.',
        minuteOffset: 90,
      },
    ],
  },
  {
    slug: 'thread-helmsmark-site-copy-v1-read',
    channelSlug: 'helmsmark-channel',
    campaignSlug: 'gamma',
    spaceSlug: 'helmsmark-workspace',
    topic: 'Site copy v1 — first read-through',
    startedAt: dateInWeek(12, 1, 14, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'Home + product copy v1 in the doc. Read aloud — one stumble at the audit-trail block. Rewrote shorter. Asking for one read.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Reading. The reconciliation block is the line of the page. The audit-trail block still leads with an adjective — kill it.',
        minuteOffset: 30,
      },
      {
        speaker: 'Sara',
        body: 'Cut. Reads cleaner now. The reconciliation block opens with "Bank reconciliation in the format your auditor reads first." Holding that.',
        minuteOffset: 42,
      },
      {
        speaker: 'nico',
        body: 'The reconciliation line is the line. That is the one Marina (interview 3) gave us almost verbatim.',
        minuteOffset: 71,
      },
      {
        speaker: 'Devon',
        body: 'Staging by Friday. Behind a flag. Will share the staging link in this thread.',
        minuteOffset: 120,
      },
      {
        speaker: 'Casey',
        body: 'Type scale holding. Showed it at 14px and at billboard. The serif handles the audit-trail block better than I expected.',
        minuteOffset: 200,
      },
    ],
  },
  {
    slug: 'thread-helmsmark-cfo-sync-prep',
    channelSlug: 'helmsmark-channel',
    campaignSlug: 'gamma',
    spaceSlug: 'helmsmark-workspace',
    topic: 'CFO sync prep — what does Nico want to test',
    startedAt: dateInWeek(13, 0, 16, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'Eliza CFO sync is Wednesday 10am ET. Agenda lock by EOD Monday. What do we want her to walk out having decided?',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'Three tests. One: does the v2 narrative survive a CFO read with no Foundry in the room. Two: which two of the three case studies are series-A-launch viable. Three: SOC 2 page voice — is the controller voice defensible to her auditor.',
        minuteOffset: 18,
      },
      {
        speaker: 'Maya',
        body: 'I want the third one resolved on the call. The auditor read is the test the SOC 2 page either passes or fails. We are not relitigating it at series-A press time.',
        minuteOffset: 40,
      },
      {
        speaker: 'founder',
        body: 'Agreed. Bring the printed page to the call. We read it in the room. Eliza calls her audit lead from the table if she has to.',
        minuteOffset: 60,
      },
      {
        speaker: 'Riley',
        body: "Confirmed with Eliza's assistant — she has 90 minutes blocked. Looping you in for visibility: she also asked if we want to bring Joel.",
        minuteOffset: 95,
      },
      {
        speaker: 'nico',
        body: 'Joel comes for the case studies, not for the SOC 2 question. Bring him in at minute 45.',
        minuteOffset: 120,
      },
    ],
  },

  // ── CLOVERKIN — 5 threads ───────────────────────────────────────────────
  {
    slug: 'thread-cloverkin-navigator-hero-kickoff',
    channelSlug: 'cloverkin-channel',
    campaignSlug: 'delta',
    spaceSlug: 'cloverkin-workspace',
    topic: 'Care navigator hero offer — kickoff',
    startedAt: dateInWeek(9, 1, 11, 0),
    messages: [
      {
        speaker: 'Maya',
        body: "Cloverkin's actual product is the care navigator. The current site buries it on the services page. We are putting a name, a face, and a member quote on the hero.",
        minuteOffset: 0,
      },
      {
        speaker: 'Sara',
        body: 'Whose voice is the hero in — the member quoting the navigator, or the navigator describing the work? I want to write both and pick.',
        minuteOffset: 16,
      },
      {
        speaker: 'Maya',
        body: "Member quoting the navigator. The proof point is the member's voice. The navigator is the answer, not the salesperson.",
        minuteOffset: 24,
      },
      {
        speaker: 'Casey',
        body: 'Portrait direction: warm, clinical, lived-in. Same three at once as the voice rules. No stethoscope. No white coat backdrop. The navigator in their actual office.',
        minuteOffset: 41,
      },
      {
        speaker: 'founder',
        body: 'Name and photograph one navigator first. Make sure Tanvi can defend the choice to the medical director before we shoot.',
        minuteOffset: 65,
      },
      {
        speaker: 'Riley',
        body: 'Tanvi cleared Devi (lead navigator, Boston). Consent paperwork in motion. Confirmed in writing.',
        minuteOffset: 110,
      },
      {
        speaker: 'Maya',
        body: 'Shoot Tuesday. Hero candidates Friday. Cloverkin medical director review next Monday.',
        minuteOffset: 180,
      },
    ],
  },
  {
    slug: 'thread-cloverkin-hero-first-draft',
    channelSlug: 'cloverkin-channel',
    campaignSlug: 'delta',
    spaceSlug: 'cloverkin-workspace',
    topic: 'Navigator hero — first draft read',
    startedAt: dateInWeek(10, 4, 14, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'Hero draft in the doc. Member quote: "Cloverkin called me on a Tuesday because my A1C went up. That is the difference." Devi\'s portrait above. Sub-hed names her.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'That is the line. Read it three ways — that is the shortest one and the right one.',
        minuteOffset: 14,
      },
      {
        speaker: 'Casey',
        body: 'Portrait holds at hero scale. Lit warm. Tanvi\'s office, not the studio. Member would read this and think "real person", not "stock photo".',
        minuteOffset: 30,
      },
      {
        speaker: 'founder',
        body: 'The Cloverkin marketing lead asked if we can add "AI-powered care coordinator" as a sub-bullet. Answer is no. Maya, write the one-page rationale for Tanvi.',
        minuteOffset: 70,
      },
      {
        speaker: 'Maya',
        body: 'On it. The navigator is a human. The product depends on it. "AI-powered" undermines the entire hero.',
        minuteOffset: 82,
      },
      {
        speaker: 'Riley',
        body: 'Tanvi backed Maya in the Monday call. The sub-bullet is out. Locking the hero this week.',
        minuteOffset: 600,
      },
    ],
  },
  {
    slug: 'thread-cloverkin-onboarding-sequence-first-draft',
    channelSlug: 'cloverkin-channel',
    campaignSlug: 'delta',
    spaceSlug: 'cloverkin-workspace',
    topic: 'New-patient onboarding sequence — first 4 emails',
    startedAt: dateInWeek(12, 0, 11, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'First four emails of the new-patient sequence in the doc. Email 2 opens with Devi by name — "Hi, I am Devi, the care navigator who will follow your care plan with you." No "your journey".',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: "That opens correctly. Email 2 is the proof point in the whole sequence — once the member sees Devi's name, every later touchpoint can route through her.",
        minuteOffset: 22,
      },
      {
        speaker: 'Riley',
        body: 'Cloverkin compliance needs to read every clinical claim before we wire the sequence live. I will route Emails 2 and 3 first because they have the most claims.',
        minuteOffset: 40,
      },
      {
        speaker: 'founder',
        body: 'Email 1 has the line "we will not lose track of you" — is that defensible? Tanvi has to back it or we cut it.',
        minuteOffset: 78,
      },
      {
        speaker: 'Sara',
        body: 'I asked Tanvi. She said yes if we name the mechanism — the navigator pulls labs every two weeks. Putting that line in the email itself.',
        minuteOffset: 130,
      },
      {
        speaker: 'Riley',
        body: 'Compliance turnaround is 48 hours. I have it. Stand down on follow-up.',
        minuteOffset: 240,
      },
    ],
  },
  {
    slug: 'thread-cloverkin-three-metros-site-progress',
    channelSlug: 'cloverkin-channel',
    campaignSlug: 'delta',
    spaceSlug: 'cloverkin-workspace',
    topic: 'Three-metros launch site — Boston first',
    startedAt: dateInWeek(12, 2, 9, 30),
    messages: [
      {
        speaker: 'Devon',
        body: 'City page template is built. Boston, Providence, Hartford route through the same template with different navigator, in-network plans, member testimonial. Two states, both designed.',
        minuteOffset: 0,
      },
      {
        speaker: 'Sara',
        body: "Boston copy first because it's the launch market. Drafting now. Will not just swap city names — each page has its own navigator and its own testimonial.",
        minuteOffset: 18,
      },
      {
        speaker: 'Casey',
        body: 'Hero photo direction per metro is on me. Each metro shoots its own navigator on location. No stock backdrops.',
        minuteOffset: 32,
      },
      {
        speaker: 'Riley',
        body: 'Cloverkin compliance review on in-network claims — I am routing per metro. Each metro has different payer relationships. Will not let the page go live without compliance sign-off per metro.',
        minuteOffset: 64,
      },
      {
        speaker: 'Devon',
        body: 'Staging behind a flag for Boston. Will share the link Friday.',
        minuteOffset: 100,
      },
      {
        speaker: 'Sara',
        body: 'Reading the Boston draft aloud — one stumble on the in-network paragraph. Compliance language reads dense. Cutting and clarifying.',
        minuteOffset: 240,
      },
    ],
  },
  {
    slug: 'thread-cloverkin-clinical-review-delay',
    channelSlug: 'cloverkin-channel',
    campaignSlug: 'delta',
    spaceSlug: 'cloverkin-workspace',
    topic: 'Clinical review delay — one copy line stuck',
    startedAt: dateInWeek(12, 4, 11, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'Email 3 of the onboarding sequence is stuck in clinical review. One line — "we coordinate with your specialists" — Tanvi wants the mechanism named, not the claim.',
        minuteOffset: 0,
      },
      {
        speaker: 'Sara',
        body: 'Rewriting. "Your navigator sends your specialist a summary after every visit and asks them three questions before your next." Specific. Defensible.',
        minuteOffset: 25,
      },
      {
        speaker: 'Maya',
        body: 'That is the line. Specifics over claims. The reader knows what is actually happening.',
        minuteOffset: 38,
      },
      {
        speaker: 'Riley',
        body: 'Tanvi back-read. Cleared. Email 3 goes live Monday with the launch.',
        minuteOffset: 240,
      },
      {
        speaker: 'founder',
        body: 'Good catch. Add that mechanism-naming rule to the Cloverkin brief — every member-facing claim names the mechanism or it does not ship.',
        minuteOffset: 300,
      },
      {
        speaker: 'Maya',
        body: 'Added. Logged in the decision log.',
        minuteOffset: 360,
      },
    ],
  },

  // ── THROUGHPUT — 5 threads ──────────────────────────────────────────────
  {
    slug: 'thread-throughput-kickoff-audit',
    channelSlug: 'throughput-channel',
    campaignSlug: 'epsilon',
    spaceSlug: 'throughput-workspace',
    topic: 'Throughput kickoff — service line audit',
    startedAt: dateInWeek(10, 1, 14, 30),
    messages: [
      {
        speaker: 'Riley',
        body: 'Throughput retainer signed. Dean (COO) wants the first deliverable to be the service-line hierarchy. The 40-page proposal kit comes second.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: "Six lines today, three of them overlap. The site is a capabilities deck. The position is going to come from the practice-lead interviews, not from Dean's deck.",
        minuteOffset: 30,
      },
      {
        speaker: 'nico',
        body: "I will run the six practice-lead interviews. The question I'm leading with: what kind of deal do you say no to today?",
        minuteOffset: 50,
      },
      {
        speaker: 'founder',
        body: 'Hard scope question for Dean: are we allowed to retire a service line if the math says it should retire?',
        minuteOffset: 88,
      },
      {
        speaker: 'Riley',
        body: 'I asked. Dean said yes, as long as he sees the math first. Confirmed in writing.',
        minuteOffset: 110,
      },
      {
        speaker: 'Owen',
        body: 'What does this look like at the bottom of the P&L? I want gross margin by line before we name the hierarchy.',
        minuteOffset: 145,
      },
    ],
  },
  {
    slug: 'thread-throughput-ma-demotion-debate',
    channelSlug: 'throughput-channel',
    campaignSlug: 'epsilon',
    spaceSlug: 'throughput-workspace',
    topic: 'Service line hierarchy — M&A as specialty, not flagship',
    startedAt: dateInWeek(11, 2, 11, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'v0 hierarchy draft has M&A Integration Sprint as a flagship. Nico is pushing to demote it to specialty. Disagreement on the table.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'M&A engagement length and pod cost do not pencil against the flagship margin band. Owen ran the numbers — flagship band is 42-48% gross. M&A averages 34%.',
        minuteOffset: 14,
      },
      {
        speaker: 'Owen',
        body: 'Confirmed. M&A as a flagship would drag the band. As a specialty it is fine — 34% on a 45-day engagement renews twice.',
        minuteOffset: 22,
      },
      {
        speaker: 'founder',
        body: 'Three options means we have not picked yet. Demote M&A. Specialty. Done.',
        minuteOffset: 48,
      },
      {
        speaker: 'Maya',
        body: 'Demoted. Re-stamping the hierarchy. Dean on the Wednesday call to lock.',
        minuteOffset: 68,
      },
      {
        speaker: 'Riley',
        body: 'Dean cleared. Final hierarchy lock at Wednesday 11am ET. I will resend the doc Tuesday night.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-throughput-proposal-kit-kickoff',
    channelSlug: 'throughput-channel',
    campaignSlug: 'epsilon',
    spaceSlug: 'throughput-workspace',
    topic: 'Proposal kit rewrite — 40 pages to 8',
    startedAt: dateInWeek(12, 2, 14, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'Proposal kit outline in the doc. 8 pages: diagnosis, recommended pod, gross-margin assumption, billable plan, kill criteria, scope, fee, next step. Asking for one read on the outline before I write.',
        minuteOffset: 0,
      },
      {
        speaker: 'Owen',
        body: 'The gross-margin assumption page is the page Dean reads first. Make it the third page, not the fifth.',
        minuteOffset: 20,
      },
      {
        speaker: 'Maya',
        body: 'Agreed. The diagnosis and recommended pod come first because they justify the margin. Then the margin. Then the plan.',
        minuteOffset: 35,
      },
      {
        speaker: 'Casey',
        body: 'Type and grid: one serif, one sans, one accent. The kit has to print clean and read clean on a laptop. A grid is a promise.',
        minuteOffset: 60,
      },
      {
        speaker: 'Sara',
        body: 'Drafting the four narrative sections this week. Sample dry-run on a current Throughput pipeline deal once the kit holds together.',
        minuteOffset: 105,
      },
      {
        speaker: 'Devon',
        body: 'I will stage an editable template in their CRM once Sara locks the structure. Four-line CRM change. Will do it before lunch when she signs off.',
        minuteOffset: 180,
      },
    ],
  },
  {
    slug: 'thread-throughput-practice-lead-scope-tension',
    channelSlug: 'throughput-channel',
    campaignSlug: 'epsilon',
    spaceSlug: 'throughput-workspace',
    topic: 'Practice-lead branding ask — holding the line',
    startedAt: dateInWeek(12, 3, 10, 30),
    messages: [
      {
        speaker: 'Riley',
        body: 'Dean asked yesterday if we can "also rebrand the practice leads as individual experts" inside the existing retainer. Bringing it here before it turns into a thread.',
        minuteOffset: 0,
      },
      {
        speaker: 'Owen',
        body: 'A retainer with no scope is a project with no end date. We scoped this at kickoff. One practice-lead piece per quarter is in scope. Full expert brand is not.',
        minuteOffset: 12,
      },
      {
        speaker: 'Maya',
        body: 'That is a feature, not a position. The expert brand is a separate retainer, not a tweak to this one.',
        minuteOffset: 24,
      },
      {
        speaker: 'founder',
        body: 'I would rather lose the deal than win it at this margin. Hold the line. Riley sends the no with the option to scope it as a second retainer next year.',
        minuteOffset: 44,
      },
      {
        speaker: 'Riley',
        body: 'On it. I will get Dean on a call before this turns into a Slack thread. We agreed to that on the kickoff. I will resend the doc.',
        minuteOffset: 60,
      },
      {
        speaker: 'Owen',
        body: 'Log this as the second scope-creep tripwire we held. Patterns. The expansion ask is going to come back in Q2.',
        minuteOffset: 95,
      },
    ],
  },
  {
    slug: 'thread-throughput-coo-outbound-templates',
    channelSlug: 'throughput-channel',
    campaignSlug: 'epsilon',
    spaceSlug: 'throughput-workspace',
    topic: 'COO outbound — first-touch templates',
    startedAt: dateInWeek(13, 0, 10, 0),
    messages: [
      {
        speaker: 'Leo',
        body: '200-1000 person services firm audience is built. 1,400 COOs across 280 firms. Reply-rate kill criterion: under 6% by week 4 and we kill the sequence and start over.',
        minuteOffset: 0,
      },
      {
        speaker: 'Sara',
        body: 'Three first-touch variants in the doc. Each one names the operating reality the COO is in — pipeline coverage, ramp, utilization. No "thought leadership". No "unlock value".',
        minuteOffset: 28,
      },
      {
        speaker: 'Maya',
        body: 'Variant 2 is the strongest. It opens with the line "Your bench is the third-largest line item on your P&L and the one you can least describe to your board."',
        minuteOffset: 50,
      },
      {
        speaker: 'Owen',
        body: 'That is the COO voice. CAC or it did not happen — I want the reply-rate read at week 2 and week 4.',
        minuteOffset: 70,
      },
      {
        speaker: 'Riley',
        body: 'Throughput SDR brief lockup with me. Reply routing through their CRM. Launching Monday.',
        minuteOffset: 120,
      },
    ],
  },

  // ── ALMANAC — 5 threads ─────────────────────────────────────────────────
  {
    slug: 'thread-almanac-reading-list-format-debate',
    channelSlug: 'almanac-channel',
    campaignSlug: 'zeta',
    spaceSlug: 'almanac-workspace',
    topic: 'Public reading list format — what makes the cut',
    startedAt: dateInWeek(11, 1, 10, 30),
    messages: [
      {
        speaker: 'Sara',
        body: 'Reading list format draft. Book, why it is on the list, mentor note (3-5 sentences). Iris reviewed — wants the mentor note to be optional on some entries. I am pushing back.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'The mentor note is the inbound asset. Without it, the list is a Goodreads page. With it, it is Almanac.',
        minuteOffset: 14,
      },
      {
        speaker: 'Sara',
        body: 'Will hold the line. Iris will agree once she sees four entries with the mentor note vs four without.',
        minuteOffset: 22,
      },
      {
        speaker: 'Devon',
        body: 'Page template is two states — with mentor note, without mentor note. Will design both. The empty state without a mentor note is the design.',
        minuteOffset: 50,
      },
      {
        speaker: 'Riley',
        body: 'Iris cleared four writing-cohort lists to publish first. I have consent paperwork from three of the four mentors.',
        minuteOffset: 88,
      },
      {
        speaker: 'Sara',
        body: 'Four lists this week. Two-week read on referral traffic before we publish the next four.',
        minuteOffset: 140,
      },
    ],
  },
  {
    slug: 'thread-almanac-burned-twice-insight',
    channelSlug: 'almanac-channel',
    campaignSlug: 'zeta',
    spaceSlug: 'almanac-workspace',
    topic: 'Burned-twice customer — the buyer Almanac actually has',
    startedAt: dateInWeek(11, 3, 14, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'Re-read all 8 alum interviews. The pattern is sharp — every single one paid for a writing workshop or cohort program before Almanac, and every single one quit it within two emails.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'That is the customer. Not the aspiring writer. The 35-year-old who has been burned twice and is willing to try once more.',
        minuteOffset: 14,
      },
      {
        speaker: 'founder',
        body: 'That is a position. Write it. Show me the customer quote that earned it.',
        minuteOffset: 28,
      },
      {
        speaker: 'Sara',
        body: 'Interview 7: "I don\'t need someone to tell me writing is hard. I need someone to read what I wrote on Tuesday and tell me on Sunday what I should change."',
        minuteOffset: 42,
      },
      {
        speaker: 'Maya',
        body: 'That is the Sunday-review preview email in the nurture sequence. The customer quote earns the line. Locking the position.',
        minuteOffset: 60,
      },
      {
        speaker: 'Riley',
        body: 'Iris consent on the quote for public use. Will have it by Friday.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-almanac-landing-page-hero-draft',
    channelSlug: 'almanac-channel',
    campaignSlug: 'zeta',
    spaceSlug: 'almanac-workspace',
    topic: 'Adult writing cohort — landing page hero',
    startedAt: dateInWeek(12, 1, 11, 30),
    messages: [
      {
        speaker: 'Sara',
        body: 'Hero candidate in the doc. "Almanac is the writing program for the person who has been burned twice and is willing to try once more." Sub-hed names the Sunday review.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'That is the line. Read it three times. Shortest of the three is right.',
        minuteOffset: 17,
      },
      {
        speaker: 'founder',
        body: 'The sub-hed naming the Sunday review is doing the proof work. Keep it.',
        minuteOffset: 35,
      },
      {
        speaker: 'Devon',
        body: 'Page build by Thursday. Behind a flag. Sunday-review excerpt block needs three alum consents — Riley?',
        minuteOffset: 70,
      },
      {
        speaker: 'Riley',
        body: 'Three alum consents in motion. I will confirm in writing.',
        minuteOffset: 90,
      },
      {
        speaker: 'Sara',
        body: 'Mentor bios in their own voice — I will not write them as templates. Each mentor writes their own; I edit lightly.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-almanac-mentor-matching-sequence-kickoff',
    channelSlug: 'almanac-channel',
    campaignSlug: 'zeta',
    spaceSlug: 'almanac-workspace',
    topic: 'Mentor matching sequence — voice-per-mentor',
    startedAt: dateInWeek(13, 0, 14, 0),
    messages: [
      {
        speaker: 'Sara',
        body: 'Mentor matching email sequence kickoff. Three emails: a personal intro from the matched mentor, a syllabus walk, and a Sunday-review preview. Each mentor writes their own intro.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: "The mentor-voice rule is the system. Not the team voice. Not the Almanac voice. The mentor's voice — full stop.",
        minuteOffset: 20,
      },
      {
        speaker: 'Riley',
        body: 'Iris cleared the four mentors to write their own intros. I will collect drafts by next Friday.',
        minuteOffset: 50,
      },
      {
        speaker: 'Sara',
        body: 'I edit lightly. The mentor sounds like the mentor. The Sunday review preview is the only piece I write end-to-end.',
        minuteOffset: 90,
      },
      {
        speaker: 'Devon',
        body: 'Sequence wiring is a 6-line setup. Will wire once Sara locks the three email shapes.',
        minuteOffset: 200,
      },
    ],
  },
  {
    slug: 'thread-almanac-friday-status',
    channelSlug: 'almanac-channel',
    campaignSlug: 'zeta',
    spaceSlug: 'almanac-workspace',
    topic: 'Friday status — what is publishing tomorrow',
    startedAt: dateInWeek(13, 4, 16, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'Friday status. Shipping tomorrow morning: 4 public reading lists, the landing page hero behind a flag, mentor matching sequence drafts in review.',
        minuteOffset: 0,
      },
      {
        speaker: 'Sara',
        body: 'Landing page hero ready for the flag flip. Sunday-review excerpts cleared by Riley. Need founder one-read before staging goes 50%.',
        minuteOffset: 14,
      },
      {
        speaker: 'founder',
        body: 'Read it. Ship behind the flag at 50%. The day-7 cohort lands on next Friday.',
        minuteOffset: 35,
      },
      {
        speaker: 'Devon',
        body: 'Flag at 50% tomorrow 9am ET. Logged. Linked. Closed.',
        minuteOffset: 60,
      },
      {
        speaker: 'Maya',
        body: 'Reading lists are the bet. Day-7 referral traffic read on the Friday call.',
        minuteOffset: 130,
      },
    ],
  },

  // ── FOUNDRY-GENERAL — 5 threads ─────────────────────────────────────────
  {
    slug: 'thread-foundry-general-maya-welcome',
    channelSlug: 'foundry-general',
    topic: 'Maya is here — day-one onboarding',
    startedAt: dateInWeek(1, 0, 14, 0),
    messages: [
      {
        speaker: 'founder',
        body: 'Maya joins today as Head of Brand. First hire. The bar is set here. Welcome.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'Maya — your first task is the Plinthworks brief. Read the eight interview transcripts before you open a doc. The brief is a contract, not a brainstorm.',
        minuteOffset: 15,
      },
      {
        speaker: 'Maya',
        body: 'Reading. Will not draft until I have read all eight. I want one customer quote on slide two of every deck or it does not ship.',
        minuteOffset: 65,
      },
      {
        speaker: 'founder',
        body: 'That is the rule. We are going to lose deals for it. We are going to win deals because of it.',
        minuteOffset: 88,
      },
    ],
  },
  {
    slug: 'thread-foundry-general-cortex-max-on',
    channelSlug: 'foundry-general',
    topic: 'cortex_max enabled — what we expect to see',
    startedAt: dateInWeek(5, 4, 17, 0),
    messages: [
      {
        speaker: 'founder',
        body: 'cortex_max is on as of 5pm today. Atlas starts synthesizing narrative pages this week. First brain_library_sync ran successfully an hour ago.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'Watching for the first principle to crystallize from a memory cluster. The Plinthworks v2 conversation is the densest cluster — that is where I expect the first one.',
        minuteOffset: 30,
      },
      {
        speaker: 'Maya',
        body: 'If Atlas surfaces a principle I do not recognize, I want to see it before it lands in the wiki. Looping me in for visibility, not for action.',
        minuteOffset: 60,
      },
      {
        speaker: 'Sara',
        body: 'Same for any voice rule it synthesizes. The voice rules are the contract. They do not get rewritten by an autosynth.',
        minuteOffset: 95,
      },
      {
        speaker: 'founder',
        body: 'Agreed. Atlas can propose. Maya, Sara, and I sign off.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-foundry-general-first-customer-avatar',
    channelSlug: 'foundry-general',
    topic: 'First customer avatar emerged — boutique DTC operators',
    startedAt: dateInWeek(7, 2, 11, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'Atlas surfaced the first customer avatar this morning. "Boutique DTC operators". Members: Saltline founder, Saltline founder\'s ops lead, Cloverkin marketing lead. Three primaries clustered tight.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'That is the right cluster. The discriminator strength on "reference frame" and "identity" is 0.91. Strongest I have seen across the customer brain so far.',
        minuteOffset: 22,
      },
      {
        speaker: 'founder',
        body: 'Maya — propose the shared brand brief format for that avatar. We use it on Saltline first.',
        minuteOffset: 45,
      },
      {
        speaker: 'Maya',
        body: 'On it. Will draft the avatar-anchored brief by Friday.',
        minuteOffset: 60,
      },
      {
        speaker: 'jules',
        body: 'Who is actually going to use that brief on Monday? I want Sara and Casey on the brief draft before it leaves the room.',
        minuteOffset: 95,
      },
      {
        speaker: 'Sara',
        body: 'In. The brief has to survive a Tuesday or it is not a brief.',
        minuteOffset: 120,
      },
    ],
  },
  {
    slug: 'thread-foundry-general-owen-joins',
    channelSlug: 'foundry-general',
    topic: 'Owen joins — ops lead',
    startedAt: dateInWeek(12, 2, 11, 0),
    messages: [
      {
        speaker: 'founder',
        body: 'Owen joins today as ops lead. Pricing review is week one. He owns the retainer SOP and the renewal cadence. He is here because we are not going to bid our way out of bad margins.',
        minuteOffset: 0,
      },
      {
        speaker: 'Owen',
        body: 'Hi. First read: I want gross margin by retainer by Friday. What does this look like at the bottom of the P&L for each of the six.',
        minuteOffset: 20,
      },
      {
        speaker: 'jules',
        body: 'Riley will pull the utilization and pod hours per retainer. I have the renewal dates by retainer.',
        minuteOffset: 38,
      },
      {
        speaker: 'Riley',
        body: 'On it. Will pull the numbers by Thursday EOD. Confirmed in writing.',
        minuteOffset: 55,
      },
      {
        speaker: 'Owen',
        body: 'Good. Renewals do not renegotiate themselves. Throughput renewal is the first one up.',
        minuteOffset: 90,
      },
    ],
  },
  {
    slug: 'thread-foundry-general-friday-status-who-publishing',
    channelSlug: 'foundry-general',
    topic: 'Friday status — who is publishing what',
    startedAt: dateInWeek(13, 4, 16, 30),
    messages: [
      {
        speaker: 'Riley',
        body: "Friday status round. Tomorrow's publishing slate: Plinthworks Q2 paid kicks off, Cloverkin Boston city page goes 50% behind flag, Almanac reading lists publish at 9am.",
        minuteOffset: 0,
      },
      {
        speaker: 'Leo',
        body: 'Plinthworks paid launches 9am ET Monday, not Saturday. Two-week test. Kill criterion CAC > $1200 day 10.',
        minuteOffset: 12,
      },
      {
        speaker: 'Devon',
        body: 'Cloverkin Boston flag at 50% tomorrow. Three-metros template is wired but only Boston has finished copy.',
        minuteOffset: 25,
      },
      {
        speaker: 'Sara',
        body: 'Almanac reading lists are the bet I am most curious about. Day-7 referral traffic read next Friday.',
        minuteOffset: 40,
      },
      {
        speaker: 'Maya',
        body: 'Three publishes, three kill criteria, three reads on the next Friday call. That is the cadence.',
        minuteOffset: 55,
      },
      {
        speaker: 'founder',
        body: 'Good cadence. Riley — Helmsmark CFO sync is Wednesday. Make sure the v2 narrative is in front of Eliza Tuesday night.',
        minuteOffset: 70,
      },
      {
        speaker: 'Riley',
        body: 'I have it. Stand down.',
        minuteOffset: 78,
      },
    ],
  },

  // ── FOUNDRY-LEADERSHIP — 5 threads ──────────────────────────────────────
  {
    slug: 'thread-leadership-founding-moment',
    channelSlug: 'foundry-leadership',
    topic: 'Founding moment — the call after the resignation',
    startedAt: dateInWeek(1, 0, 21, 0),
    messages: [
      {
        speaker: 'founder',
        body: 'Walked out today. Wrote the letter on the train. Calling you tonight to start the studio. The premise is the one I have been writing in my head for a year — brand and growth are the same job.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: "I'm in. Three forces this has to survive: pricing pressure, channel saturation, our own boredom. If we can name how we hold against all three, we have a studio.",
        minuteOffset: 25,
      },
      {
        speaker: 'founder',
        body: 'Pricing — we pick six clients a year. Channel — we own the loop, not a channel. Boredom — we refuse work that bores us, even at scale.',
        minuteOffset: 50,
      },
      {
        speaker: 'nico',
        body: 'The boredom test is the one most studios fail. We agree to write that into the principles before we sign a client.',
        minuteOffset: 78,
      },
      {
        speaker: 'founder',
        body: 'Agreed. We file it as principle 0. Boredom kills brand work. We refuse it before we take the money.',
        minuteOffset: 110,
      },
    ],
  },
  {
    slug: 'thread-leadership-beta-scope-creep',
    channelSlug: 'foundry-leadership',
    topic: "We need to talk about Beta's scope",
    startedAt: dateInWeek(4, 1, 15, 0),
    messages: [
      {
        speaker: 'jules',
        body: 'We need to talk about Beta. The kitchenware ask is the third scope-adjacent request in four weeks. The retainer is not sized for what they are asking.',
        minuteOffset: 0,
      },
      {
        speaker: 'founder',
        body: 'Maya scoped it. The math is clear — it would double the retainer footprint for the same fee. We are killing the ask, not the relationship.',
        minuteOffset: 18,
      },
      {
        speaker: 'nico',
        body: 'The deeper pattern is the founder treating the retainer as elastic. We have to put a tripwire on this before Week 6 — every scope-adjacent ask routes through Owen when he joins, full stop.',
        minuteOffset: 35,
      },
      {
        speaker: 'jules',
        body: 'Agreed. I will draft the tripwire language for the retainer SOP. Riley flags every scope-adjacent ask to me until Owen is on.',
        minuteOffset: 60,
      },
      {
        speaker: 'founder',
        body: 'And the belief we have been holding — "we are brand-only" — is challenged. The Beta scope-creep is the test case. We are still a brand and growth studio. We just refuse expansion that doubles scope for the same fee.',
        minuteOffset: 105,
      },
      {
        speaker: 'nico',
        body: 'Mark the belief as challenged in the cortex. The protocol that replaces it is the scope-tripwire SOP.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-leadership-cortex-on',
    channelSlug: 'foundry-leadership',
    topic: 'Company Cortex turned on — the first dream',
    startedAt: dateInWeek(8, 1, 17, 30),
    messages: [
      {
        speaker: 'founder',
        body: 'Company Cortex is on. Daily schedule. First dream run completes overnight. We will know tomorrow morning what it surfaces.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'I expect the first signal to be on Beta scope-creep. We have logged enough channel-message and decision evidence that the pattern should crystallize.',
        minuteOffset: 25,
      },
      {
        speaker: 'jules',
        body: 'If the dream surfaces a tension I have not already named to you two, I want to know. The point of the cortex is not to confirm what we already see.',
        minuteOffset: 50,
      },
      {
        speaker: 'founder',
        body: 'Agreed. The interesting signals will be the ones we have not seen yet. We do not relitigate the ones we already named.',
        minuteOffset: 80,
      },
      {
        speaker: 'nico',
        body: 'Reviewing the dream output every morning at 8:30 ET. We surface anything new in this channel before it lands in #foundry-general.',
        minuteOffset: 110,
      },
    ],
  },
  {
    slug: 'thread-leadership-async-approvals-anti-pattern',
    channelSlug: 'foundry-leadership',
    topic: 'Anti-pattern: async approvals burn trust — formal write-up',
    startedAt: dateInWeek(9, 2, 11, 0),
    messages: [
      {
        speaker: 'founder',
        body: 'Cortex flagged it overnight. Async approvals burn trust. This is the moment the pattern crystallizes. Maya should write the formal anti-pattern doc.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'The evidence is dense — five client threads where an async approval ask sat in Slack for over 24 hours, three of them led to a re-litigation of a settled decision. We have the data.',
        minuteOffset: 30,
      },
      {
        speaker: 'jules',
        body: 'The protocol that replaces it is the live-decision rule. No client approval lives in Slack longer than 24 hours. After 24 hours, Riley schedules a call.',
        minuteOffset: 55,
      },
      {
        speaker: 'founder',
        body: 'Locked. Maya writes the anti-pattern. The live-decision rule goes into the retainer SOP. Riley owns enforcement.',
        minuteOffset: 90,
      },
      {
        speaker: 'nico',
        body: 'First anti-pattern. This is the kind of crystallization the cortex is for. File it.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-leadership-pricing-tension',
    channelSlug: 'foundry-leadership',
    topic: 'Pricing review tension — Owen joining',
    startedAt: dateInWeek(12, 0, 17, 0),
    messages: [
      {
        speaker: 'founder',
        body: 'Owen starts Tuesday. The pricing review tension surfaced in the dream last night — retainer scope vs project scope on Plinthworks and Throughput.',
        minuteOffset: 0,
      },
      {
        speaker: 'jules',
        body: 'Both retainers are running 25%+ over expected pod hours. We have absorbed it for three retainers in a row. That is the tension — we hold the line on scope or we re-price.',
        minuteOffset: 30,
      },
      {
        speaker: 'nico',
        body: 'We have to name the tension before we resolve it. Owen runs the renumeration on the first Tuesday. We do not pre-decide which retainer gets re-priced first.',
        minuteOffset: 60,
      },
      {
        speaker: 'founder',
        body: 'Agreed. Owen reads the numbers cold. I would rather lose a retainer than win it at this margin — that is the principle we are holding.',
        minuteOffset: 90,
      },
      {
        speaker: 'jules',
        body: 'The Throughput renewal is up in 5 weeks. That is the first conversation Owen will have to lead. He has to be ready.',
        minuteOffset: 130,
      },
    ],
  },

  // ── SALES — 5 threads ───────────────────────────────────────────────────
  {
    slug: 'thread-sales-helmsmark-sign',
    channelSlug: 'sales-channel',
    campaignSlug: 'sales',
    spaceSlug: 'sales-pipeline',
    topic: 'Helmsmark — sign or pass?',
    startedAt: dateInWeek(5, 2, 14, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'Helmsmark CFO Eliza on the discovery call yesterday. Pre-Series A. Wants the controller repositioning before they announce. Decision needed: sign in week 6 or pass.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'The repositioning bet is the kind of work the studio exists for. The Series A timeline is the test — can we deliver the new narrative in 5 weeks. That is the scope question.',
        minuteOffset: 30,
      },
      {
        speaker: 'Maya',
        body: 'I can deliver v2 narrative in 4 weeks if Nico runs the controller interviews in parallel with the brief. Site copy + IA needs 6 more weeks after that.',
        minuteOffset: 60,
      },
      {
        speaker: 'founder',
        body: 'We sign. The bet pays out if the repositioning is the story of the Series A. If it is not the story, we have done the work anyway.',
        minuteOffset: 110,
      },
      {
        speaker: 'Riley',
        body: 'On it. Will get the retainer paperwork in front of Eliza by EOD. Confirmed in writing.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-sales-throughput-qualifying',
    channelSlug: 'sales-channel',
    campaignSlug: 'sales',
    spaceSlug: 'sales-pipeline',
    topic: 'Throughput qualifying call recap',
    startedAt: dateInWeek(9, 4, 15, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'Throughput Group qualifying call this morning. Dean (COO). Six service lines, 40-page proposal kit nobody opens. Strong fit for the studio. Bringing it here for the qualifying read.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'The fit is real but the hard scope question is the service-line retirement. If Dean is not allowed to retire a line, the repackage will fail. I want that on the table before we sign.',
        minuteOffset: 25,
      },
      {
        speaker: 'founder',
        body: 'Riley — ask Dean directly. Are we allowed to retire a line if the math says it should retire? If the answer is no, we pass.',
        minuteOffset: 50,
      },
      {
        speaker: 'Riley',
        body: 'I will get him on a call before this turns into an email chain. Will report back tomorrow.',
        minuteOffset: 75,
      },
      {
        speaker: 'Riley',
        body: 'Update — Dean said yes. We are allowed to retire a line if the math holds. He wants to see the math first. Agreed.',
        minuteOffset: 1380,
      },
      {
        speaker: 'founder',
        body: 'We sign. Sign Week 10 Monday.',
        minuteOffset: 1410,
      },
    ],
  },
  {
    slug: 'thread-sales-icp-playbook-draft',
    channelSlug: 'sales-channel',
    campaignSlug: 'sales',
    spaceSlug: 'sales-pipeline',
    topic: 'ICP playbook — first draft',
    startedAt: dateInWeek(11, 0, 14, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'First draft of the ICP playbook. ICP in two sentences: founder-led companies between Series A and Series B who refuse to sound like their competitors. Disqualify fast or sign.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'The disqualification criteria are the most important page. If we are not willing to say no in week one, we will be saying no in week eight at much higher cost.',
        minuteOffset: 30,
      },
      {
        speaker: 'nico',
        body: 'Channel map — where these founders actually read. Two newsletters, two podcasts, two Slacks. Not LinkedIn.',
        minuteOffset: 55,
      },
      {
        speaker: 'founder',
        body: 'The first-touch message has to refuse the standard agency pitch. Open with the position, not the introduction.',
        minuteOffset: 80,
      },
      {
        speaker: 'Riley',
        body: 'Three variants in the doc. Running the playbook on 12 prospects week-13. Two-week reply-rate read.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-sales-pipeline-tightening',
    channelSlug: 'sales-channel',
    campaignSlug: 'sales',
    spaceSlug: 'sales-pipeline',
    topic: 'Pipeline tightening — 2 disqualified, 1 advances',
    startedAt: dateInWeek(12, 3, 11, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'Pipeline read. Three calls this week. Two disqualified, one advances to proposal. Disqualified — too early (no positioning to refine) and not founder-led (board-driven). One advance — Series A SaaS, founder-led.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'The disqualification on "not founder-led" is the correct one. Board-driven engagements drift. The customer brain confirms it across our six retainers.',
        minuteOffset: 30,
      },
      {
        speaker: 'founder',
        body: 'The Series A advance — what is the position they need? Read the call notes back to me.',
        minuteOffset: 55,
      },
      {
        speaker: 'Riley',
        body: 'They are a B2B analytics tool. Current copy is everything-for-everyone. Founder wants to narrow to controllers, but the GTM lead is fighting it.',
        minuteOffset: 75,
      },
      {
        speaker: 'Maya',
        body: 'Sounds exactly like Helmsmark in Week 7. We have the playbook. I want a discovery call before we send the proposal.',
        minuteOffset: 100,
      },
      {
        speaker: 'Riley',
        body: 'Scheduling. Will get you 60 minutes with the founder before the proposal goes out.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-sales-discovery-framework-questions',
    channelSlug: 'sales-channel',
    campaignSlug: 'sales',
    spaceSlug: 'sales-pipeline',
    topic: 'Discovery framework — the three positioning questions',
    startedAt: dateInWeek(13, 1, 11, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'Discovery framework draft. Three positioning questions: who is the buyer you are most embarrassed to have, what is the customer quote that sells the product today, what would you refuse to say on a podcast.',
        minuteOffset: 0,
      },
      {
        speaker: 'founder',
        body: 'Question 3 is the test. Most founders cannot answer it. The ones who can are the founders we sign.',
        minuteOffset: 28,
      },
      {
        speaker: 'nico',
        body: 'Two operating questions — current pod size, current month-end report. The hard scope question — what is the deliverable they would refuse to ship under the agency relationship.',
        minuteOffset: 55,
      },
      {
        speaker: 'Maya',
        body: 'The hard scope question is the one most agencies skip. We do not skip it. If they refuse, we know what shape the retainer needs to be in writing before we sign.',
        minuteOffset: 80,
      },
      {
        speaker: 'Riley',
        body: 'Running the framework on the next 3 discovery calls and tuning. Will pull the read in two weeks.',
        minuteOffset: 130,
      },
    ],
  },

  // ── WIKI-DISCUSSION — 5 threads ─────────────────────────────────────────
  {
    slug: 'thread-wiki-async-approvals-anti-pattern',
    channelSlug: 'wiki-discussion',
    campaignSlug: 'wiki',
    topic: 'Anti-pattern: async approvals burn trust — formal write-up',
    startedAt: dateInWeek(9, 3, 10, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'Formal anti-pattern write-up in the wiki. Async approvals burn trust. The evidence narrative covers the five client threads where the pattern formed. The protocol that replaces it is the live-decision rule.',
        minuteOffset: 0,
      },
      {
        speaker: 'nico',
        body: 'The retrieval rule on this object — anything tagged "approval" or "sign-off" with a 24-hour-plus latency should surface against this anti-pattern automatically.',
        minuteOffset: 24,
      },
      {
        speaker: 'founder',
        body: 'Locked. The protocol: no client approval lives in Slack longer than 24 hours. After 24, Riley schedules a call. No exceptions.',
        minuteOffset: 50,
      },
      {
        speaker: 'Maya',
        body: 'Added to the SOPs Owen is going to inherit. The first anti-pattern we crystallized. There will be more.',
        minuteOffset: 80,
      },
      {
        speaker: 'Sara',
        body: 'The write-up reads correctly. One note — the evidence narrative is dense in the middle. Cut paragraph 3. The pattern is clearer without it.',
        minuteOffset: 130,
      },
      {
        speaker: 'Maya',
        body: 'Cut. Polish later. Decide first. The pattern is locked.',
        minuteOffset: 145,
      },
    ],
  },
  {
    slug: 'thread-wiki-positioning-principles-sketch',
    channelSlug: 'wiki-discussion',
    campaignSlug: 'wiki',
    topic: 'Foundry positioning principles — opening sketch',
    startedAt: dateInWeek(10, 1, 14, 0),
    messages: [
      {
        speaker: 'Maya',
        body: 'Opening sketch for the principles page. Nine principles. The ones we keep saying out loud on every retainer call but have never written down. Read the first 9 weeks of channel transcripts to cluster them.',
        minuteOffset: 0,
      },
      {
        speaker: 'founder',
        body: 'Send me the cluster list before you name the principles. Naming is a position, not a brainstorm.',
        minuteOffset: 25,
      },
      {
        speaker: 'nico',
        body: 'The principles have to survive a new-agent read. If a new agent finishes the page and still cannot tell which Foundry is, we have not finished writing it.',
        minuteOffset: 50,
      },
      {
        speaker: 'Maya',
        body: 'Test: I will hand the v1 draft to the next hire (Owen) and watch him read it. If he asks me to explain a principle, we rewrite that principle.',
        minuteOffset: 70,
      },
      {
        speaker: 'founder',
        body: 'Right test. Each principle gets one example we lived through. Not a hypothetical.',
        minuteOffset: 100,
      },
      {
        speaker: 'Sara',
        body: 'I want to be a reader on every principle before it locks. The voice rules are downstream of these principles.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-wiki-principle-customer-quote-earns-the-line',
    channelSlug: 'wiki-discussion',
    campaignSlug: 'wiki',
    topic: 'Principle 1 — the customer quote earns the line',
    startedAt: dateInWeek(11, 0, 11, 0),
    messages: [
      {
        speaker: 'Maya',
        body: "Principle 1 candidate: 'The customer quote earns the line.' The example we lived through — Plinthworks v2, Week 9. Sara wrote a strong line, none of us could trace it to a transcript, we killed it.",
        minuteOffset: 0,
      },
      {
        speaker: 'Sara',
        body: 'Accurate. The replacement line came from interview 4. It is on the Plinthworks homepage now.',
        minuteOffset: 20,
      },
      {
        speaker: 'nico',
        body: 'This is the principle the rest of the agency depends on. Without it, the brand drifts in 12 weeks.',
        minuteOffset: 45,
      },
      {
        speaker: 'founder',
        body: 'Lock it. Principle 1 is non-negotiable. We are going to lose proposals because of it. We are going to win retainers because of it.',
        minuteOffset: 80,
      },
      {
        speaker: 'Maya',
        body: 'Locked. Filing in the wiki.',
        minuteOffset: 110,
      },
    ],
  },
  {
    slug: 'thread-wiki-principle-survive-a-tuesday',
    channelSlug: 'wiki-discussion',
    campaignSlug: 'wiki',
    topic: 'Principle 9 — the voice has to survive a Tuesday',
    startedAt: dateInWeek(11, 0, 16, 0),
    messages: [
      {
        speaker: 'Casey',
        body: "Principle 9 candidate is mine. 'The system has to survive a Tuesday.' Brand systems that require a senior on every decision are bottlenecks, not systems.",
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'The example we lived through — the Saltline photography direction. We rebuilt it around three rules so the in-house photographer could shoot against them on a Tuesday without calling Casey.',
        minuteOffset: 24,
      },
      {
        speaker: 'Sara',
        body: 'Same principle on voice rubrics. The rubric has to be useful to a mid-level on a Tuesday morning, not just a senior on a Wednesday afternoon.',
        minuteOffset: 50,
      },
      {
        speaker: 'founder',
        body: 'Lock it. Principle 9. The "survives a Tuesday" test is the maturity test for any system we ship.',
        minuteOffset: 85,
      },
      {
        speaker: 'Casey',
        body: 'Logged. Two weights. One accent. Done.',
        minuteOffset: 110,
      },
    ],
  },
  {
    slug: 'thread-wiki-anti-pattern-catalog-start',
    channelSlug: 'wiki-discussion',
    campaignSlug: 'wiki',
    topic: 'Anti-pattern catalog — Owen starts the page',
    startedAt: dateInWeek(13, 1, 14, 0),
    messages: [
      {
        speaker: 'Owen',
        body: 'Starting the anti-pattern catalog. Every anti-pattern the cortex has crystallized goes in with: formation moment, symptom, protocol that replaced it. Living document.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'The async approvals one is the first entry. The scope-creep tripwire one is the second. The third — I am not sure we have crystallized it yet.',
        minuteOffset: 25,
      },
      {
        speaker: 'nico',
        body: 'The "retainer treated as elastic" pattern is a third candidate. I would write it up once we have one more piece of evidence from the next quarter.',
        minuteOffset: 60,
      },
      {
        speaker: 'Owen',
        body: 'Agreed. Two entries in the catalog this week. Reviewed monthly. Write the SOP once, run it twice, then trust it.',
        minuteOffset: 95,
      },
      {
        speaker: 'founder',
        body: 'Good. The catalog is the artifact a new agent reads in week one and learns what we have already paid for.',
        minuteOffset: 130,
      },
    ],
  },

  // ── DESIGN-CRIT — 5 threads ─────────────────────────────────────────────
  {
    slug: 'thread-crit-casey-arrives',
    channelSlug: 'design-crit',
    topic: 'Casey arrives — first crit cadence',
    startedAt: dateInWeek(6, 0, 14, 0),
    messages: [
      {
        speaker: 'Casey',
        body: 'Joining today. Crit cadence proposal — Wednesdays 2pm ET, 45 minutes, three pieces per session. Maya and Sara are the standing crit pair. Devon joins when web is on the table.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'In. The crit holds the design system from drifting. Without it, every retainer becomes its own brand in three months.',
        minuteOffset: 22,
      },
      {
        speaker: 'Sara',
        body: 'Voice + design crit together. I want to be in the room when the type and the copy land at the same time.',
        minuteOffset: 40,
      },
      {
        speaker: 'Casey',
        body: 'Agreed. First crit Wednesday — Plinthworks hero type system, Saltline drop visual, one open Helmsmark thread.',
        minuteOffset: 70,
      },
    ],
  },
  {
    slug: 'thread-crit-saltline-brand-mark',
    channelSlug: 'design-crit',
    topic: 'Saltline brand mark options — final read',
    startedAt: dateInWeek(8, 2, 14, 0),
    messages: [
      {
        speaker: 'Casey',
        body: 'Three brand mark options for Saltline in the Figma. Option A is the wordmark variant the founder requested. Option B is the monogram. Option C is the salt-crystal symbol I would not let her see if I had a choice.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Option C is a sticker, not a brand mark. Kill it before it leaves the room.',
        minuteOffset: 18,
      },
      {
        speaker: 'Sara',
        body: 'Option A holds at 14px and at a billboard. The wordmark is the brand. The monogram is a useful flex for packaging but it is not the primary mark.',
        minuteOffset: 35,
      },
      {
        speaker: 'Casey',
        body: 'Agreed. Locking Option A as primary, Option B as packaging-only flex. Option C is dead.',
        minuteOffset: 50,
      },
      {
        speaker: 'Maya',
        body: 'Right call. The Saltline founder will push for C in the meeting. We are not changing our minds.',
        minuteOffset: 80,
      },
    ],
  },
  {
    slug: 'thread-crit-helmsmark-type-scale',
    channelSlug: 'design-crit',
    topic: 'Helmsmark type scale — serif or sans for the controller',
    startedAt: dateInWeek(11, 2, 15, 0),
    messages: [
      {
        speaker: 'Casey',
        body: 'Helmsmark type scale crit. The controller voice on the body, the audit-trail block, the SOC 2 page. The question is whether the body type is a serif or a sans. Strong opinion either way?',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'Serif. The controller is reading a banking site, not a 2022 fintech. Sober. Trust-coded. The serif carries the audit-trail block better than a sans will.',
        minuteOffset: 24,
      },
      {
        speaker: 'Sara',
        body: 'I read the audit-trail block in both. The serif holds. Two stumbles in the sans, none in the serif.',
        minuteOffset: 45,
      },
      {
        speaker: 'Devon',
        body: 'The serif renders cleanly on slow 3G or it does not ship. I have tested both — the serif Casey picked renders fine.',
        minuteOffset: 80,
      },
      {
        speaker: 'Casey',
        body: 'Locked. Pick the type and live with it for a year. Serif at three weights, sans monospaced for code samples only.',
        minuteOffset: 110,
      },
    ],
  },
  {
    slug: 'thread-crit-cloverkin-navigator-portrait',
    channelSlug: 'design-crit',
    topic: 'Cloverkin navigator portrait — final crit',
    startedAt: dateInWeek(11, 2, 14, 0),
    messages: [
      {
        speaker: 'Casey',
        body: 'Devi (Cloverkin lead navigator, Boston) portrait. Shot in her actual office, warm light, lived-in. Asking for one crit before Cloverkin medical director review.',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'The portrait is the right portrait. She looks like a person, not a stock photo. The lighting reads warm without going soft.',
        minuteOffset: 22,
      },
      {
        speaker: 'Sara',
        body: 'The portrait carries the voice rules — warm, clinical, lived-in. All three. None at the expense of the others.',
        minuteOffset: 45,
      },
      {
        speaker: 'Casey',
        body: 'Photography is fifty percent of the brand. Treat it like it. The Cloverkin hero is this portrait or it is nothing.',
        minuteOffset: 70,
      },
      {
        speaker: 'Maya',
        body: 'Send to Tanvi tonight. We want the medical director read by Friday.',
        minuteOffset: 100,
      },
    ],
  },
  {
    slug: 'thread-crit-throughput-proposal-type',
    channelSlug: 'design-crit',
    topic: 'Throughput proposal kit type direction',
    startedAt: dateInWeek(13, 2, 14, 0),
    messages: [
      {
        speaker: 'Casey',
        body: 'Throughput proposal kit type direction in the Figma. One serif (cover + section heads), one sans (body), one accent (the gross-margin assumption page only).',
        minuteOffset: 0,
      },
      {
        speaker: 'Maya',
        body: 'The accent reserved for the gross-margin page is the right call. That page is the page Dean reads first. The visual emphasis matches the read order.',
        minuteOffset: 22,
      },
      {
        speaker: 'Sara',
        body: 'The cover treatment is the strongest I have seen Casey ship this quarter. Holds without an image.',
        minuteOffset: 40,
      },
      {
        speaker: 'Casey',
        body: 'A grid is a promise. The kit prints clean and reads clean on a laptop. Two weights. One accent. Done.',
        minuteOffset: 65,
      },
      {
        speaker: 'Devon',
        body: 'I will stage the editable template in their CRM Monday. Sara, send me the locked structure today and I will wire it before lunch.',
        minuteOffset: 90,
      },
    ],
  },

  // ── PRICING-AND-MARGINS — 5 threads ─────────────────────────────────────
  {
    slug: 'thread-pricing-owen-first-read',
    channelSlug: 'pricing-and-margins',
    topic: 'Owen first read — gross margin by retainer',
    startedAt: dateInWeek(12, 3, 11, 0),
    messages: [
      {
        speaker: 'Owen',
        body: 'First read across the six retainers. Plinthworks and Saltline are the two longest engagements — both running 12 weeks. Plinthworks margin: 38%. Saltline: 41%. Both below the expected 45-48% band.',
        minuteOffset: 0,
      },
      {
        speaker: 'Riley',
        body: 'Pod hours per retainer for the trailing 4 weeks — Plinthworks is 28% over expected, Saltline is 22% over. Helmsmark is on band. Cloverkin is on band. Throughput just started so the math is noisy.',
        minuteOffset: 30,
      },
      {
        speaker: 'jules',
        body: 'The pod-hours overage on Plinthworks is the docs voice audit. It is in scope but the scope was undersized. We did not price for 200 pages.',
        minuteOffset: 55,
      },
      {
        speaker: 'Owen',
        body: 'That is a process problem dressed as a people problem. We re-scope at renewal. Riley — flag every retainer where the trailing pod hours exceed expected by more than 25% for two consecutive weeks.',
        minuteOffset: 85,
      },
      {
        speaker: 'founder',
        body: 'Renewals do not renegotiate themselves. Throughput is up first. Owen — that is your first conversation.',
        minuteOffset: 130,
      },
      {
        speaker: 'Owen',
        body: 'On it. I will have the renumeration math by Friday.',
        minuteOffset: 165,
      },
    ],
  },
  {
    slug: 'thread-pricing-throughput-renewal',
    channelSlug: 'pricing-and-margins',
    topic: 'Throughput renewal — pricing review',
    startedAt: dateInWeek(12, 4, 10, 0),
    messages: [
      {
        speaker: 'Owen',
        body: 'Throughput renewal math. Current monthly: $42k. Pod hours running 14% under expected (they are easier to work with than the founder told us). The math says we can hold pricing or come in slightly under.',
        minuteOffset: 0,
      },
      {
        speaker: 'founder',
        body: 'Hold pricing. We do not come in under for a retainer that is delivering correctly. The pricing is the position too.',
        minuteOffset: 22,
      },
      {
        speaker: 'jules',
        body: 'Agreed. Going under signals we were over-priced at signing. We were not.',
        minuteOffset: 38,
      },
      {
        speaker: 'Riley',
        body: 'Dean (Throughput COO) is on the renewal call Wednesday. He has not asked for a discount. Looping you in for visibility.',
        minuteOffset: 65,
      },
      {
        speaker: 'Owen',
        body: 'I would rather lose the deal than win it at this margin — and we are not losing it. Renewing at hold.',
        minuteOffset: 90,
      },
    ],
  },
  {
    slug: 'thread-pricing-beta-margin-tension',
    channelSlug: 'pricing-and-margins',
    topic: 'Saltline retainer — below expected margin band',
    startedAt: dateInWeek(12, 4, 15, 0),
    messages: [
      {
        speaker: 'Owen',
        body: 'Saltline is below band. 41% gross. Expected 45-48%. The pod-hours overage is the photography direction refresh — Casey is over by 18 hours.',
        minuteOffset: 0,
      },
      {
        speaker: 'jules',
        body: 'The refresh is a 6-week project absorbed into the retainer. We should not have absorbed it. That is the lesson.',
        minuteOffset: 30,
      },
      {
        speaker: 'founder',
        body: 'Owen, what is your read on the renewal? Saltline renews in 14 weeks.',
        minuteOffset: 60,
      },
      {
        speaker: 'Owen',
        body: 'We renew at +12% with a tighter scope. The photography refresh, if it surfaces again, is a change order. Not a tweak.',
        minuteOffset: 85,
      },
      {
        speaker: 'Riley',
        body: 'I will rebuild the Saltline scope summary against the new tripwire SOP. The first month of the renewal cycle is the test.',
        minuteOffset: 120,
      },
      {
        speaker: 'founder',
        body: 'Right call. We do not punish the founder for our scoping error. We rebuild the contract.',
        minuteOffset: 165,
      },
    ],
  },
  {
    slug: 'thread-pricing-new-retainer-floor',
    channelSlug: 'pricing-and-margins',
    topic: 'New retainer pricing floor — first draft',
    startedAt: dateInWeek(13, 0, 11, 0),
    messages: [
      {
        speaker: 'Owen',
        body: 'New retainer pricing floor draft. Minimum $38k/month for a 6-month engagement. Sub-floor below that is a project, not a retainer. A retainer with no scope is a project with no end date.',
        minuteOffset: 0,
      },
      {
        speaker: 'jules',
        body: 'Agreed on the floor. The 6-month minimum is the test — anything shorter is a project. We have been blurring that line and it shows up in the margins.',
        minuteOffset: 28,
      },
      {
        speaker: 'founder',
        body: 'Locked. New retainer floor is $38k. Anything below is a project. Owen — write the SOP and put it in the sales playbook.',
        minuteOffset: 55,
      },
      {
        speaker: 'Owen',
        body: 'On it. Write the SOP once, run it twice, then trust it.',
        minuteOffset: 80,
      },
      {
        speaker: 'Riley',
        body: 'I will route every new retainer ask through this floor before discovery call number two.',
        minuteOffset: 130,
      },
    ],
  },
  {
    slug: 'thread-pricing-utilization-read',
    channelSlug: 'pricing-and-margins',
    topic: 'Utilization read across all 6 retainers',
    startedAt: dateInWeek(13, 3, 14, 0),
    messages: [
      {
        speaker: 'Riley',
        body: 'Trailing 4-week utilization by agent. Maya 87%. Sara 91% (too high). Casey 78%. Devon 82%. Leo 65% (too low). Riley 88%. Owen 70%.',
        minuteOffset: 0,
      },
      {
        speaker: 'Owen',
        body: 'Sara at 91% is a re-balancing problem. Leo at 65% is a sequencing problem — we have not had a paid experiment in flight for two weeks. Both are fixable next sprint.',
        minuteOffset: 28,
      },
      {
        speaker: 'jules',
        body: 'Sara — what is the next mission you would offload to keep your utilization sustainable?',
        minuteOffset: 55,
      },
      {
        speaker: 'founder',
        body: 'The Helmsmark Series A case study is the right one to offload to a second writer once we have one. Until then Sara owns it.',
        minuteOffset: 90,
      },
      {
        speaker: 'Owen',
        body: 'Filing the utilization read. Trailing-4-week read every Friday going forward. Show me utilization, then we will talk scope.',
        minuteOffset: 130,
      },
      {
        speaker: 'Riley',
        body: 'Confirmed. Friday utilization read is on my calendar weekly.',
        minuteOffset: 160,
      },
    ],
  },
]
