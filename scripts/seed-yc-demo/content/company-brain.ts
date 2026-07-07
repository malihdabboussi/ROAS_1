/**
 * Company-brain cortex object anchors.
 *
 * Wave 3 target: ~20 anchor objects covering all 9 object_types (belief,
 * perspective, tension, standard, move, anti_pattern, protocol, decision,
 * retrieval_rule). P3b2 derives ~280 company_cortex_signals (4-7 per
 * object) and links them via source_signal_ids; ~90 daily-dream runs
 * across the post-cortex-enabled days.
 *
 * Authoring rules (Wave 3, Subagent C):
 *   - Every `formedAt` uses `dateInWeek(...)` — never `new Date(...)`.
 *   - Most objects formed Week 8 or later (Company Cortex enabled mid-Week 8).
 *   - Distribution by status: ~14 active, ~3 emerging, ~2 challenged, ~1 transforming.
 *   - Voice tracks AGENCY.voice: name the trade-off, lead with the position,
 *     no "we believe", no "world-class", references specific clients + agents.
 */
import type { CortexObjectAnchor } from './_types'
import { dateInWeek } from './timeline'

export const COMPANY_CORTEX_OBJECTS: readonly CortexObjectAnchor[] = [
  // ─── BELIEFS (3) ────────────────────────────────────────────────────────
  {
    slug: 'object-brand-changes-spend',
    objectType: 'belief',
    title: 'Brand work that does not change what we spend money on is not brand work',
    truth:
      "If a positioning doc doesn't end up changing which channels we buy, which words a paid ad runs, or which customers we say no to, it is a Notion page — not a brand. Every Foundry retainer either redirects spend within 60 days of repositioning or we got the position wrong.",
    evidenceNarrative:
      "Atlas pulled this together from four signals over Weeks 4-8: the Plinthworks Week 3 positioning workshop landed eight anchor memories that drove Leo to kill two underperforming Google Ads themes inside ten days; Saltline's repositioning in Week 6 changed which product launches Casey shot first; and the Week 4 retro where the founder said it out loud in a partner meeting — 'if the spend sheet doesn't move, the deck didn't work.' Maya repeated it inside three separate kickoffs the following month.",
    formedAt: dateInWeek(8, 4, 9, 30),
    status: 'active',
    confidence: 0.88,
  },
  {
    slug: 'object-position-before-paid',
    objectType: 'belief',
    title: 'Paid acquisition before message validation is debt with interest',
    truth:
      'Running paid spend against a message we have not pressure-tested in organic just teaches us, expensively, that the message was wrong. We will sit on paid budget until the organic data tells us which line of copy is doing the work.',
    evidenceNarrative:
      "Crystallized after the Week 7 Saltline retro: Leo had spent eleven days bidding against a hero line that hadn't earned a single organic save. The same week Helmsmark onboarded, the founder pre-empted the same pattern by killing a planned launch ad. Sara's Week 8 channel message — 'we are not going to bid our way out of bad copy' — became the line everyone quotes when a client pushes to launch paid early. Three more confirming signals from Plinthworks paid experiments in Weeks 9-10.",
    formedAt: dateInWeek(8, 5, 14, 0),
    status: 'active',
    confidence: 0.9,
    retrievalRule: {
      when: 'a campaign artifact, brief, or channel message proposes paid spend without a documented organic validation window',
      show: ['object-position-before-paid', 'object-rule-paid-spend-mention'],
      severity: 'block-and-discuss',
    },
  },
  {
    slug: 'object-retainers-die-at-month-three',
    objectType: 'belief',
    title: 'Most retainers fail at month three, not month one',
    truth:
      'Kickoff energy carries a retainer for sixty days. The real failure mode shows up in month three, when novelty wears off and the operating cadence either holds or quietly slips. Every retainer review at day 75 is non-negotiable.',
    evidenceNarrative:
      "Emerging — Atlas surfaced this in a Week 13 dream after noticing three Plinthworks-era signals from Weeks 9-12: the Saltline scope-creep tension first showed up at day 73, the Helmsmark second-month status note quietly dropped from weekly to bi-weekly, and Jules flagged in a Week 12 channel message that 'month three is the month I lose retainers, not month one.' Not yet acted on — Owen is drafting the day-75 review template this week.",
    formedAt: dateInWeek(13, 1, 9, 0),
    status: 'emerging',
    confidence: 0.62,
  },

  // ─── PERSPECTIVES (3) ───────────────────────────────────────────────────
  {
    slug: 'object-brain-not-vendor',
    objectType: 'perspective',
    title: 'The agency-vs-in-house frame is dead — founders want a brain, not a vendor',
    truth:
      'Founders who can afford us no longer want a deck-delivery agency or a hire-someone-cheaper-in-house play. They want a working brain that already holds the customer interviews, the brand book, and the spend history in one place and stays opinionated about all three.',
    evidenceNarrative:
      "Atlas read this off the way clients describe Foundry back to us versus how they described their previous agency. Plinthworks' founder used the word 'partner' six times on a single Week 8 call; Helmsmark's CFO said in onboarding that her last agency 'sent us files, not opinions.' Sara captured a Week 9 voice memo from the founder framing the studio as 'the place where the customer transcript and the spend report sit on the same desk.' Confirmed by Throughput choosing us in Week 10 over an in-house hire they had already pre-approved.",
    formedAt: dateInWeek(9, 1, 11, 0),
    status: 'active',
    confidence: 0.82,
  },
  {
    slug: 'object-brand-and-growth-same-job',
    objectType: 'perspective',
    title: 'Brand and growth are the same conversation, never two decks',
    truth:
      'The studios that split brand from growth ship positioning docs nobody runs ads against and paid funnels nobody can defend in a customer call. We treat them as one loop — same retainer, same operator, same Friday note.',
    evidenceNarrative:
      "Crystallized after Atlas noticed Maya and Leo had been quietly merging the brand brief and the paid creative brief into a single doc since Week 6. The founder's Week 9 channel message — 'a paid funnel that converts on language the founder would never say in a customer call is a debt' — sealed the shape. Casey + Sara's Week 11 collaboration peak (four missions co-shipped) is the operational proof. Currently challenged: Plinthworks asked in Week 12 for 'just the site redesign, skip the positioning,' which the partner team declined.",
    formedAt: dateInWeek(10, 2, 10, 0),
    status: 'challenged',
    confidence: 0.78,
  },
  {
    slug: 'object-six-clients-on-purpose',
    objectType: 'perspective',
    title: 'Six retainers a year is a ceiling, not a target',
    truth:
      "Foundry's economics work because we say no to most inbound. Past six concurrent retainers, the founder-time-per-client falls below the threshold that makes our work distinguishable from a normal growth shop. Six is a hard cap, not an aspiration.",
    evidenceNarrative:
      "Atlas tracked utilization signals across Weeks 10-12 after Throughput and Almanac onboarded. Owen's first week (Week 12) produced a P&L view showing that founder hours per retainer had compressed from 9 to 5.5 since Week 7. The partner team referenced this perspective in a Week 12 sales call where they walked away from a seventh prospect Riley had already pre-qualified. Reinforced by the founder's own line from the founding brain dump: 'six clients a year on purpose.'",
    formedAt: dateInWeek(12, 3, 15, 30),
    status: 'active',
    confidence: 0.85,
  },

  // ─── TENSIONS (2) ───────────────────────────────────────────────────────
  {
    slug: 'object-retainer-vs-project-scope',
    objectType: 'tension',
    title:
      'Retainer scope vs project scope — we keep saying retainer, our SOW reads like a project',
    truth:
      "Every Foundry SOW promises retainer-style continuity but enumerates project-style deliverables. The mismatch shows up around day 60 of every engagement, when the client asks for the 'next deliverable' and we want to talk about the operating loop.",
    evidenceNarrative:
      "Owen surfaced this in the Week 12 pricing review after pulling all six active SOWs side by side. Plinthworks, Saltline, and Helmsmark all show the same fingerprint: monthly deliverable line items that frame Foundry as a sequence of outputs instead of a sustained brain. Jules and Riley have been re-routing scope-creep emails into 'change order' language since Week 10, but the document itself still reads like a project quote. Not yet resolved — Owen is drafting v2 of the standard SOW.",
    formedAt: dateInWeek(12, 4, 11, 0),
    status: 'active',
    confidence: 0.82,
  },
  {
    slug: 'object-acme-strategy-vs-design-hours',
    objectType: 'tension',
    title: 'Plinthworks wants strategy hours, we keep shipping design hours',
    truth:
      'Plinthworks pays for positioning and gets, by hour count, a designer-led engagement. They have not complained — but the gap between what they bought and what we deliver is widening, and every rebrand mission is making it worse.',
    evidenceNarrative:
      "Atlas read the gap off Casey's mission count (eleven Plinthworks missions in Weeks 9-12) against Nico's strategy hours logged (four in the same period). The Week 11 rebrand decision compounded the imbalance. The founder flagged it informally in a Week 12 partner sync but no scope conversation has been opened with Plinthworks' founder. Riley is sitting on it until Owen has the renegotiated SOW template ready.",
    formedAt: dateInWeek(11, 5, 16, 30),
    status: 'active',
    confidence: 0.74,
  },

  // ─── STANDARDS (3) ──────────────────────────────────────────────────────
  {
    slug: 'object-three-customer-calls-before-brief',
    objectType: 'standard',
    title: 'Every brief sits in on three customer calls before a single line is written',
    truth:
      'No Foundry brief — positioning, copy, paid, or rebrand — opens with the writer typing. It opens with Maya or Sara sitting in on three customer calls for that retainer and walking back with verbatim quotes. The line we ship has to be earned by a quote.',
    evidenceNarrative:
      "Standardized in Week 11 after Atlas noticed that every retainer where a brief was written without the three-call rule (Saltline Week 2, Helmsmark Week 7) had to be re-briefed inside fourteen days. Maya's catchphrase — 'show me the customer quote that earned this line' — became the test. Casey enforced it on the Plinthworks rebrand kickoff in Week 11; the brand book that came out of it has not been re-opened since.",
    formedAt: dateInWeek(11, 1, 10, 30),
    status: 'active',
    confidence: 0.91,
  },
  {
    slug: 'object-validate-organic-before-paid',
    objectType: 'standard',
    title:
      'No retainer ships paid creative until the message is pressure-tested in organic for two weeks',
    truth:
      'Every paid campaign needs a fourteen-day organic window first — newsletter, founder posts, or owned channels — where the exact hero line gets to live without spend behind it. Leo will not open a paid account until the validation window is logged.',
    evidenceNarrative:
      "Codified in Week 11 after the Week 8 Saltline incident: Leo had bid for eleven days against an unvalidated hero line and burned $4.2k before turning it off. The standard was drafted by Leo, signed off by the founder in a Week 11 partner sync, and is now the first item on every paid kickoff. Plinthworks' Q1 paid experiment ran the window in Weeks 9-10 and produced the highest CAC test result in the studio so far.",
    formedAt: dateInWeek(11, 2, 14, 0),
    status: 'active',
    confidence: 0.89,
  },
  {
    slug: 'object-founder-reads-every-status-note',
    objectType: 'standard',
    title: 'The founder reads every retainer status note before it leaves the studio',
    truth:
      "Every Friday status note — to every client — passes the founder's eyes between 1pm and 4pm before Riley sends it. Not for approval theatre. For the read-back: if a sentence drifts off the position, it gets rewritten in the doc, not in a follow-up.",
    evidenceNarrative:
      "Made explicit in Week 11 after a Week 9 Helmsmark status note shipped with a line ('we are excited about this momentum') that the founder would never write. Riley caught a second drift two weeks later in a Cloverkin note. The standard now sits at the top of the Friday cadence protocol and has caught at least one rewrite every Friday since Week 11.",
    formedAt: dateInWeek(11, 4, 13, 0),
    status: 'active',
    confidence: 0.87,
  },

  // ─── MOVES (2) ──────────────────────────────────────────────────────────
  {
    slug: 'object-verbatim-quote-slide-two',
    objectType: 'move',
    title: 'Open every kickoff with a verbatim customer quote on slide 2',
    truth:
      "Slide 1 is the client logo. Slide 2 is one of their customers saying, in their own words, the thing the retainer is going to solve. No paraphrase, no synthesis — the actual quote with the speaker's role and the date of the call.",
    evidenceNarrative:
      'Started informally in the Plinthworks Week 3 workshop when Maya pulled a customer quote into slide 2 to redirect the room. It worked so well the founder repeated it for Saltline (Week 6), Helmsmark (Week 7), and Cloverkin (Week 7). Codified by Atlas in Week 9 after the move appeared in five out of five kickoffs. Sara now sources the quote during her three-call prep; Casey designs the slide.',
    formedAt: dateInWeek(9, 3, 10, 0),
    status: 'active',
    confidence: 0.86,
  },
  {
    slug: 'object-walk-to-owen-on-pricing-pushback',
    objectType: 'move',
    title: "When pricing pushback hits, walk into Owen's office before responding",
    truth:
      'Any client pricing pushback — scope reduction, hourly negotiation, request for a discount — goes to Owen for a P&L pass before anyone replies. The first reply sets the anchor; the anchor has to be defensible at the bottom of the sheet.',
    evidenceNarrative:
      "Emerging — formed after Owen's Week 12 onboarding when Throughput pushed back on a change order. Riley sent a reply within forty minutes that Owen's P&L pass later showed was 18% under margin. The founder named the move in a Week 12 partner sync: 'pricing pushback walks to Owen first.' Riley has used it once successfully (Almanac, Week 13), once awkwardly (Plinthworks, Week 13), and is still calibrating.",
    formedAt: dateInWeek(12, 4, 16, 0),
    status: 'emerging',
    confidence: 0.65,
  },

  // ─── ANTI_PATTERNS (3) ──────────────────────────────────────────────────
  {
    slug: 'object-async-approvals-burn-trust',
    objectType: 'anti_pattern',
    title: 'Async approvals burn trust and surface the same questions three times',
    truth:
      'Sending a deck for async approval through a Slack thread or an email — without a fifteen-minute walkthrough call first — produces the same three clarifying questions every time, delays the decision by 48-72 hours, and reads to the founder of the client as if we are not on top of the work.',
    evidenceNarrative:
      'The canonical first anti-pattern Atlas crystallized in Week 9 after counting four async-approval cycles in Weeks 7-8: Saltline brand palette (3 rounds), Plinthworks site copy (4 rounds), Cloverkin onboarding sequence (3 rounds), and Helmsmark positioning doc (5 rounds — the worst). Maya rewrote the brand approvals SOP the same week to require a synchronous walkthrough before any async send. Approval cycles since Week 9 average 1.4 rounds, down from 3.8.',
    formedAt: dateInWeek(9, 2, 14, 0),
    status: 'active',
    confidence: 0.92,
  },
  {
    slug: 'object-we-love-it-in-writing',
    objectType: 'anti_pattern',
    title: 'Saying "we love it" in writing without 24 hours of read-back time',
    truth:
      'Replying to a client deliverable with enthusiasm in writing inside the first hour locks us into a position we have not actually pressure-tested. Twenty-four hours of read-back time, then a written response. If something feels off, it almost always is.',
    evidenceNarrative:
      'Crystallized in Week 10 after Riley enthusiastically green-lit a Saltline campaign deck inside thirty minutes; Sara read it the next morning and flagged three lines that drifted from the brand book, but the client had already started production. Casey had a near-identical episode with a Cloverkin photo direction the same week. The 24-hour rule was added to the Friday cadence; Maya is the named enforcer.',
    formedAt: dateInWeek(10, 4, 9, 30),
    status: 'active',
    confidence: 0.83,
  },
  {
    slug: 'object-bidding-out-of-bad-copy',
    objectType: 'anti_pattern',
    title:
      'Bidding our way out of bad copy — it is always a creative problem dressed as a media problem',
    truth:
      'When a paid campaign underperforms, the bid is almost never the answer. Twice in Weeks 7-8 we threw budget at hero lines that organic data had already told us were soft. Both times the right move was a rewrite, not a re-bid.',
    evidenceNarrative:
      'Atlas counted three signals: the Saltline Week 7 episode (eleven days, $4.2k, no rewrite), a near-miss on Plinthworks in Week 8 (Leo caught himself before opening the account), and a Week 11 channel exchange where Leo argued for a bid test against a Helmsmark hero line that Sara had flagged as soft. Currently challenged — Leo is drafting a counter-argument that the bid test is sometimes the cheaper way to find out the copy is wrong, which the partner team is still debating.',
    formedAt: dateInWeek(11, 3, 15, 0),
    status: 'challenged',
    confidence: 0.7,
  },

  // ─── PROTOCOLS (2) ──────────────────────────────────────────────────────
  {
    slug: 'object-friday-status-cadence',
    objectType: 'protocol',
    title: 'Friday cadence: status note → Riley by 11am, founder review by 1pm, sent by 4pm',
    truth:
      "Every Friday, every retainer ships a status note. Lead operator drafts and routes to Riley by 11am. Riley QA-passes and routes to the founder by noon. Founder reads between 1pm and 4pm. Riley sends to the client by 4pm with the founder's edits applied in the doc, not in a reply.",
    evidenceNarrative:
      "First version landed in Week 11 after Jules and Riley codified what had been an informal pattern since Week 6. Currently being rewritten — Owen joined in Week 12 and is splicing a P&L line into every retainer's Friday note, which is changing the routing (Riley now passes through Owen for fintech and B2B retainers before the founder sees it). The transformation is mid-flight as of Week 13.",
    formedAt: dateInWeek(11, 4, 11, 0),
    status: 'transforming',
    confidence: 0.7,
  },
  {
    slug: 'object-new-hire-onboarding-two-weeks',
    objectType: 'protocol',
    title:
      'New-hire onboarding: read all six retainer briefs in week one, sit on every kickoff in week two',
    truth:
      'Every new agent or partner spends week one reading all six retainer briefs and the full Plinthworks-to-Almanac decision log end-to-end. Week two: they sit on every kickoff and every Friday status review across the studio. They do not own a deliverable until week three.',
    evidenceNarrative:
      'Standardized in Week 11 after Riley joined in Week 10 and was assigned a Cloverkin status note on day three — which she shipped with a line that contradicted a Week 6 positioning decision nobody had handed her. Owen joined in Week 12 and ran the protocol cleanly: read-through Weeks 12, kickoff-sit Week 13. The protocol is the reason his first P&L pass was credible by the time he made his first recommendation.',
    formedAt: dateInWeek(11, 5, 14, 30),
    status: 'active',
    confidence: 0.84,
  },

  // ─── DECISIONS (1) ──────────────────────────────────────────────────────
  {
    slug: 'object-decision-plinthworks-rebrand-q3-sunset-q4',
    objectType: 'decision',
    title: 'Plinthworks rebrand: ship the new mark in Q3, sunset the old in Q4',
    truth:
      'Plinthworks ships the new logo, type system, and marketing site in Q3. The legacy mark stays alive on docs, in-app, and existing customer-facing assets through Q4, then sunsets fully January 1. No cohabitation past that date.',
    evidenceNarrative:
      "Made in the Week 11 partner sync between the founder, Nico, Plinthworks' founder, and Casey. Three weeks of strategy work (Maya + Nico) and two weeks of mark exploration (Casey) preceded the decision. The Q3/Q4 split was the founder's call — driven by the docs site being on a separate deploy cadence and by Devon's read on the migration risk if we tried a single cutover. Decision is logged in the Plinthworks campaign brief and referenced in every brand mission since.",
    formedAt: dateInWeek(11, 3, 15, 30),
    status: 'active',
    confidence: 0.9,
  },

  // ─── RETRIEVAL RULES (1) ────────────────────────────────────────────────
  {
    slug: 'object-rule-paid-spend-mention',
    objectType: 'retrieval_rule',
    title: 'Paid-spend mentions surface the validation belief to the assignee',
    truth:
      'Any channel message, brief, or campaign artifact that mentions paid spend, ad budget, media buy, or bid strategy without a `validated:` tag attached should surface the position-before-paid belief and the organic-validation standard to the message author within five minutes.',
    evidenceNarrative:
      'Emerging — Atlas turned this on in Week 13 after counting three Week 11-12 incidents where a paid-spend message landed in a channel without anyone pulling the validation belief into the thread. Two of those threads later required the founder to step in and re-anchor the conversation. The rule fires against agent messages, founder messages, and client-facing briefs. Currently watching to see how often it fires false-positive on legitimate validated-spend conversations.',
    formedAt: dateInWeek(13, 2, 9, 15),
    status: 'emerging',
    confidence: 0.6,
    retrievalRule: {
      when: 'message body contains any of ["paid spend", "ad budget", "media buy", "bid", "CAC test", "open the account"] and does NOT contain "validated:"',
      show: ['object-position-before-paid', 'object-validate-organic-before-paid'],
      notifyRoles: ['founder', 'performance_marketer'],
      cooldownMinutes: 60,
    },
  },
]
