/**
 * Long-form docs that ship as either space items (doc-shaped custom_data)
 * or mission_deliverables. Briefs, SOPs, positioning docs, retros, proposals.
 *
 * Wave 3 fills this. P6 + P7 wire them into spaces and deliverables.
 *
 * 14 docs total — 2 per major client (12) + 2 internal.
 */
import type { DocAnchor } from './_types'
import { dateInWeek } from './timeline'

export const DOCS: readonly DocAnchor[] = [
  // ── PLINTHWORKS (acme) — 2 docs ─────────────────────────────────────────
  {
    slug: 'doc-plinthworks-onboarding-brief',
    title: 'Plinthworks — onboarding brief',
    docType: 'brief',
    campaignSlug: 'acme',
    spaceSlug: 'plinthworks-workspace',
    contentMd: `# Plinthworks — onboarding brief

**Retainer signed:** Week 1, Tuesday.
**Foundry lead:** Maya (brand) + Sara (copy).
**Plinthworks principal:** Theo (CEO + co-founder).

## What Plinthworks is

Plinthworks is an on-call coordination tool for engineering teams. It is not an incident response platform. It is the layer that decides which person actually gets paged, when, and what they see when they open the alert. The product is six months old. The founders are two ex-Datadog engineers who built the first version because their previous on-call rotation was a Notion doc and a Google Voice number.

## Who actually buys

The buyer most often pays is an engineering manager at a 50-250 person company. The user who decides whether the product survives the trial is the on-call engineer who is paged at 3am. The CEO of Plinthworks has been writing copy at the engineering manager. The data says the on-call engineer is the one we have to win.

## What the retainer is

We own the positioning, the marketing site copy, and the developer-facing top-of-funnel. That includes the docs voice (read by every trialist), every launch post, and one paid experiment per quarter against the on-call ICP. We do not own the product UI copy, and we do not own internal docs. Devon will not touch their codebase without a written approval.

## What we will not do

- We will not pitch logo work. The mark is fine. The wordmark is fine.
- We will not write copy that sounds like a 2022 monitoring tool. No "world-class", no "enterprise-grade".
- We will not run paid until the message has been pressure-tested in organic.

## First 30 days

1. **Week 1**: Sit on 8 customer calls. No drafts yet.
2. **Week 2**: Synthesize the on-call engineer voice — three verbatim quote clusters.
3. **Week 3**: Draft v2 positioning — three candidates, founder picks.
4. **Week 4**: Lock the position. Brief Sara for the homepage rewrite.

## Decision log opener

The biggest open question coming in: is the on-call engineer the buyer or the influencer? Theo says influencer. Nico's interviews say buyer in practice. We will know by end of Week 4.`,
    authorName: 'Riley',
    createdAt: dateInWeek(1, 3, 11, 30),
  },
  {
    slug: 'doc-plinthworks-positioning-v2',
    title: 'Plinthworks — positioning v2',
    docType: 'positioning',
    campaignSlug: 'acme',
    spaceSlug: 'plinthworks-workspace',
    contentMd: `# Plinthworks — positioning v2

**Author:** Maya. **Reviewed:** Garry, Nico, Theo (Plinthworks CEO).
**Locked:** Week 11.

## The position

> Plinthworks is the on-call layer for engineers who get paged at 3am.

That is the entire position. Nothing more. The engineering manager is welcome. The buyer signs the check. The on-call engineer keeps using the product or kills it in week two.

## Why this, why now

V1 sat on the manager. The manager bought it. The on-call engineer abandoned the trial in 11 of 14 cases we audited. The reason was always the same — the alerts felt written for a dashboard reviewer, not for the person who just woke up. We are moving the brand one user down. The buyer does not change. The voice does.

## The customer quote that earned this line

> "I don't need another tool to look at. I need the tool that already paged me to not be the worst part of being on-call."
> — Sasha M., staff SRE, 180-person infra co. Interview 4 of 8, Week 9.

## Three things this position must survive

1. **Pricing pressure.** Datadog and PagerDuty are bigger. The on-call engineer is the constituency neither of them is allowed to lose. We have to be specific enough that the on-call engineer can name what we do that they do not.
2. **Founder boredom.** Theo will be tempted to talk about the rollback API and the SLA layer because they are interesting to build. The position keeps the copy on the page.
3. **Channel saturation.** "Incident response" is a saturated phrase. We will not use it on the homepage. "On-call layer" is ours to own if we ship the rest of the brand against it.

## What this position refuses

- Anything about uptime as a primary benefit.
- Anything that puts the SRE manager on the hero.
- The word "platform". (We can earn it back at $20M ARR. Not now.)

## Subordinate moves

- Homepage hero rewritten against the position (Sara, Week 11).
- Docs voice rubric pinned to the position (Sara, in flight).
- Q2 paid experiment runs on Reddit r/sysadmin + r/devops, not LinkedIn (Leo, in flight).
- Every blog post answers "would the on-call engineer forward this?" before publish.

## Decision log

- **Week 9, Wednesday:** Locked the on-call engineer as the primary user.
- **Week 10, Monday:** Theo pushed back on dropping "platform". Nico held. Theo agreed by Friday.
- **Week 11, Tuesday:** v2 hero shipped. First-touch conversion read at Day 7.`,
    authorName: 'Maya',
    createdAt: dateInWeek(11, 2, 16, 30),
  },

  // ── SALTLINE & CO (beta) — 2 docs ───────────────────────────────────────
  {
    slug: 'doc-saltline-brand-voice-brief',
    title: 'Saltline — brand voice brief',
    docType: 'brief',
    campaignSlug: 'beta',
    spaceSlug: 'saltline-workspace',
    contentMd: `# Saltline & Co — brand voice brief

**Author:** Maya. **Approved:** Saltline founder Week 2 Monday.

## What Saltline is, in one paragraph

Saltline is a small-batch pantry brand. Olive oils, vinegars, salt-cured things, a slowly-growing kitchenware adjacency. The founder runs a 9-person team out of a Brooklyn warehouse and has never paid for paid social. The brand has carried itself on word of mouth and one good Bon Appetit feature. We are here because the next chapter is wholesale into a regional grocery chain, and the brand cannot drift into food-industrial-complex voice on the way there.

## The voice in one sentence

Lived-in, sensory, unhurried. Written like a friend reaching for something on the kitchen counter, not a marketer reaching for a verb.

## What lives in the voice

- **Sensory detail.** Low light, linen, crumb, flicker. The reader should be able to see the kitchen.
- **Specifics over claims.** "Hand-tied at the farm in Puglia" beats "artisanal".
- **Unhurried sentences.** Saltline does not interrupt the reader. It waits.
- **The shared table.** Everything routes back to the moment two or more people sit down with the product on the counter.

## What never lives in the voice

- **The word artisanal.** Never. Not on a label, not in a caption, not in an email.
- **"Curated", "luxurious", "elevate", "experience", "lifestyle".** Banned set.
- **Discount-stack messaging.** "Stack codes for 30% off." Not Saltline.
- **Holiday urgency tropes.** "Only 12 left." "Doors closing." None of it.

## The throughline we agreed on

> "A shared table in low light."

Every Q4 drop, every product story, every photograph routes back to that frame. The throughline is not a tagline. It is the test.

## Approval flow

- Sara writes.
- Maya signs off on voice.
- Riley sends to the Saltline founder for fact-check.
- We do not send anything to client without all three signatures.`,
    authorName: 'Maya',
    createdAt: dateInWeek(2, 1, 10, 0),
  },
  {
    slug: 'doc-saltline-q4-launch-retro',
    title: 'Saltline — Q4 holiday calendar retro',
    docType: 'retro',
    campaignSlug: 'beta',
    spaceSlug: 'saltline-workspace',
    contentMd: `# Saltline Q4 holiday calendar — retro

**Author:** Riley. **Reviewed:** Maya, Sara, Casey, Jules.
**Window:** Week 4 queue through Week 8 ship.

## What we shipped

Twelve drops across Q4, each one tied to the "shared table in low light" throughline. One short story (60-90 words) per drop, one photograph, one lifecycle email. No discount-stack messaging. The first three drops are live as of Week 8. The remaining nine are scheduled into the client's Klaviyo and shoot calendar.

## What worked

The throughline did the heavy lifting. Sara wrote 12 stories in 9 working days because she had one frame to write against, not 12 different ones. Casey's photography brief is the cleanest she has written this year because the throughline made the lighting and composition decisions for her.

The decision to refuse discount-stack messaging held. The founder pushed once in Week 6 to add a "12 days of Saltline" sequence with stacked codes. Maya wrote the one-page refusal. Founder agreed by end of day.

## What did not work

We almost lost two drops to scope creep. The founder asked in Week 5 if we could "also do the kitchenware drops" inside the same retainer. Maya scoped it. The math said it would have doubled the retainer footprint for the same fee. We killed it as a separate mission (see: \`mission-saltline-scope-rewrite\`) and held the line. That is the right call, but we burned 14 hours getting there.

Casey shipped the photography brief on Week 5, Wednesday. The first shoot happened Week 7, Tuesday. That gap is too long. Next quarter we are running the brief and the first shoot in the same week.

## Decisions logged

1. **No discount-stack messaging through Q4.** Permanent until founder writes the override.
2. **Kitchenware is a separate retainer or it does not exist.** Not a tweak. Not a scope add.
3. **Brief to shoot in 5 days, not 14.** Casey owns enforcement next quarter.

## Open questions

- Will the wholesale chain we are courting read the throughline the same way the existing customers do? We will know after the December 1 buyer meeting.
- The post-purchase email open rate dipped 4pts in Week 7. Possibly inbox saturation, possibly drift. Sara is auditing.`,
    authorName: 'Riley',
    createdAt: dateInWeek(8, 4, 17, 0),
  },

  // ── HELMSMARK (gamma) — 2 docs ──────────────────────────────────────────
  {
    slug: 'doc-helmsmark-onboarding-brief',
    title: 'Helmsmark — onboarding brief',
    docType: 'brief',
    campaignSlug: 'gamma',
    spaceSlug: 'helmsmark-workspace',
    contentMd: `# Helmsmark — onboarding brief

**Retainer signed:** Week 6, Tuesday.
**Foundry lead:** Maya (positioning) + Nico (customer interviews).
**Helmsmark principal:** Eliza (CFO + co-founder, ex-controller herself).

## What Helmsmark is

Helmsmark is a banking and reconciliation product. The v1 pitch was "small-business banking for solo founders". The actual buyers and active users are controllers and CFOs at 50-200 person companies. The founder-led copy has been scaring them away for nine months. The Series A is announcing in 12 weeks. The repositioning has to land before the round goes public or the case study writes itself the wrong way.

## What is being repositioned

We are moving Helmsmark from a founder product to a controller product. The features do not change. The buyer changes. The voice changes. The site changes. The case study program is built from scratch.

## What the retainer covers

- Repositioning narrative + v2 positioning doc (Maya).
- New site IA + copy (Sara writes, Devon builds, Casey sets type).
- Case-study program — 4 case studies in the first 90 days post-launch.
- Series A launch arc: case study, founder LinkedIn series, two podcasts.

## What we will not do

- We will not own product UI copy. Helmsmark's design team owns that.
- We will not run paid acquisition. Helmsmark is doing inbound + sales-led only.
- We will not write a single landing page until the v2 narrative is locked.

## The customer we are writing to

The controller at a 80-person Series B company who does monthly close in five days because she has duct-taped four tools together and rolls audit-trail explanations on a Google Sheet. She is reading the site at 9pm on a Sunday, deciding whether to put Helmsmark on the short list for her Q2 procurement.

## Cadence

- **Mondays 9am ET:** Maya + Nico + Eliza working call.
- **Fridays 4pm ET:** Riley sends one-screen status note.
- **Every Wednesday 11am ET:** Sara office hours for copy questions.`,
    authorName: 'Nico',
    createdAt: dateInWeek(6, 3, 11, 0),
  },
  {
    slug: 'doc-helmsmark-controller-positioning',
    title: 'Helmsmark — controller positioning v2',
    docType: 'positioning',
    campaignSlug: 'gamma',
    spaceSlug: 'helmsmark-workspace',
    contentMd: `# Helmsmark — controller positioning v2

**Author:** Maya. **Reviewed:** Garry, Nico, Eliza, Joel (Helmsmark CTO).
**Locked:** Week 11, Tuesday.

## The position

> Helmsmark is the banking layer for the controller who runs the close.

Not the founder. Not the CEO. Not the "small business owner". The person whose name is on the variance memo at the end of the month.

## Why we are moving

V1 sold the dream of a banking app that "just gets out of your way". The buyers who actually paid were not founders. They were controllers and finance leads who needed a product that respected the close cycle, the audit trail, and the reporting line into the CFO. They were buying the product despite the copy, not because of it. We are correcting course.

## The customer quote that earned this line

> "I don't want a fintech. I want something I can hand my auditor without explaining for forty minutes why the bank reconciliation report comes out of three different places."
> — Marina K., controller, 110-person SaaS company. Interview 3 of 6, Week 7.

## Three things this position must survive

1. **The CFO read.** The CFO sees the site once. We have one shot to not sound like every other "next-gen banking" pitch. We will not use the phrase. We will not use "frictionless". We will not say "magical".
2. **The auditor proof.** The product has to be defensible to an external auditor. The positioning carries that weight or it does not survive procurement.
3. **The Series A press cycle.** Three reporters will read this site in week 14. They will not be controllers. The copy has to be specific enough that they cannot rewrite it back into 2022 language.

## What this position refuses

- Anything about "small business" or "solo founder".
- Anything that puts the CEO on the hero.
- The phrase "all-in-one finance". (Specifically banned by Eliza.)
- Adjective-led copy. Every line opens with a noun or a verb.

## Subordinate moves

- Site rebuild against the v2 narrative (Sara writes, Devon builds).
- Case-study program seeded with 3 existing controllers as week-1 stories.
- Series A launch case study (\`mission-helmsmark-series-a-launch-case-study\`) is built around the repositioning bet itself.
- SOC 2 page written in the controller voice, not the security-blog voice.

## Decision log

- **Week 8, Wednesday:** Locked the controller as the primary buyer.
- **Week 9, Monday:** Joel pushed back on dropping "small business". Eliza overrode. Maya wrote the one-page rationale.
- **Week 11, Tuesday:** v2 narrative locked. Devon starts the site build.`,
    authorName: 'Maya',
    createdAt: dateInWeek(11, 1, 17, 30),
  },

  // ── CLOVERKIN HEALTH (delta) — 2 docs ───────────────────────────────────
  {
    slug: 'doc-cloverkin-onboarding-brief',
    title: 'Cloverkin Health — onboarding brief',
    docType: 'brief',
    campaignSlug: 'delta',
    spaceSlug: 'cloverkin-workspace',
    contentMd: `# Cloverkin Health — onboarding brief

**Retainer signed:** Week 6, Wednesday.
**Foundry lead:** Maya (brand) + Sara (copy).
**Cloverkin principal:** Dr. Tanvi (Chief Medical Officer + co-founder).

## What Cloverkin is

Cloverkin is a primary-care + virtual-care clinic launching in three Northeast metros — Boston, Providence, Hartford. The unique part is the care navigator: a real human assigned to every member who follows the care plan with them between visits. The competition treats navigators as a back-office feature. Cloverkin treats them as the product.

## Why this retainer matters now

The Boston launch is in 5 weeks. The current site reads like a SaaS app. The navigator is buried on a "services" page. We have to surface the navigator as the offer, write member-facing copy in a warm-clinical voice, and rebuild the new-patient onboarding sequence before the launch.

## Voice rules — non-negotiable

- **Warm. Clinical. Plainspoken.** Three at once. None at the expense of the others.
- **Never "consumer".** Cloverkin members are patients first. The word "consumer" never appears in member-facing copy.
- **Never "wellness journey".** Or "your journey". Or "transformative". The voice respects that a member is choosing a doctor, not a wellness brand.
- **Every clinical claim is reviewed by Tanvi or the medical director.** No exceptions.

## What the retainer covers

- Brand system (Maya + Casey).
- Member-facing copy across site, email, SMS, and after-hours scripts (Sara).
- New-patient onboarding sequence (\`mission-cloverkin-new-patient-onboarding-sequence\`).
- Three-metros launch site (\`mission-cloverkin-three-metros-launch-site\`).
- Care navigator hero offer (\`mission-cloverkin-care-navigator-hero-offer\`) — first priority.

## What we will not do

- We will not write PHI-adjacent copy without legal review.
- We will not run paid acquisition during the launch quarter.
- We will not ship a city page that is "Boston find-replace" for Providence.

## Compliance flow

Every member-facing piece routes through Cloverkin's compliance lead before publication. Riley owns the routing. Sara writes with the compliance flow already in mind.`,
    authorName: 'Riley',
    createdAt: dateInWeek(6, 4, 10, 30),
  },
  {
    slug: 'doc-cloverkin-care-navigator-positioning',
    title: 'Cloverkin — care navigator hero positioning',
    docType: 'positioning',
    campaignSlug: 'delta',
    spaceSlug: 'cloverkin-workspace',
    contentMd: `# Cloverkin — care navigator hero positioning

**Author:** Maya. **Reviewed:** Garry, Tanvi, Cloverkin medical director.
**Locked:** Week 11, Thursday.

## The position

> Cloverkin is the clinic where a person — not an app — follows your care plan with you.

The clinic is the offer. The navigator is the proof. The app is the wiring. We are going to put a name, a face, and a quote from a member on the hero.

## Why this is the hero

Every direct-to-patient healthtech product on the internet looks the same: a doctor in a white coat, a stethoscope, a hero subhead about "modern healthcare". Cloverkin's actual product is a person at the other end of a phone who calls you when your follow-up labs come back and explains them. That person is the entire reason members renew. Burying them on the services page is malpractice.

## The customer quote that earned this line

> "I had three primary care doctors in two years. None of them remembered I existed. Cloverkin called me on a Tuesday because my A1C went up. That is the difference."
> — Member testimonial, Boston cohort, Week 9. Used with consent. Full version on file.

## Three things this position must survive

1. **The "is this real?" read.** Every visitor will assume the navigator is a chatbot until we prove otherwise. We have to name the navigator, photograph them, and quote a member back about that specific person.
2. **The compliance read.** Every claim about navigators has to be defensible. Tanvi and the medical director sign off before any copy goes live.
3. **The scale question.** When Cloverkin grows past 3,000 members, can the navigator promise hold? We are writing the position to be honest about the ratio — one navigator per ~150 members today, and growing the team in step with the membership.

## What this position refuses

- "AI-powered care coordinator". The navigator is a human. The product depends on it.
- "Wellness journey". "Transformative healthcare". "Reimagining primary care". Banned.
- A stock photo of a doctor in a white coat. Casey shoots the actual navigators or we do not ship the hero.

## Subordinate moves

- Hero offer redesign with named navigator + portrait + member quote (shipped Week 11).
- New-patient onboarding sequence routes through the named navigator in email 2 of 4.
- City page hero per metro names the local navigator.

## Decision log

- **Week 9, Tuesday:** Locked the navigator as the hero offer.
- **Week 10, Thursday:** Cloverkin marketing lead requested adding "AI-powered" as a sub-bullet. Maya refused. Tanvi backed Maya.
- **Week 11, Thursday:** Hero went live. Day-3 read shows 2.4x time-on-page vs the previous hero.`,
    authorName: 'Maya',
    createdAt: dateInWeek(11, 3, 16, 30),
  },

  // ── THROUGHPUT GROUP (epsilon) — 2 docs ─────────────────────────────────
  {
    slug: 'doc-throughput-onboarding-brief',
    title: 'Throughput Group — onboarding brief',
    docType: 'brief',
    campaignSlug: 'epsilon',
    spaceSlug: 'throughput-workspace',
    contentMd: `# Throughput Group — onboarding brief

**Retainer signed:** Week 10, Monday.
**Foundry lead:** Maya (positioning) + Riley (account).
**Throughput principal:** Dean (COO).

## What Throughput is

Throughput is a B2B services firm. They run six service lines across operations, finance, and revenue strategy for 200-1000 person companies. The lines were grown by acquisition, and three of them overlap. The site is a capabilities deck masquerading as a homepage. The proposal kit is 40 pages and the partners admit they have not opened it in a year.

## The two things to fix first

1. **Service-line hierarchy.** Six overlapping lines becomes three flagship + two specialty + one labs. This is the positioning mission (\`mission-throughput-service-line-repackage-v1\`). Without it, every other deliverable is built on quicksand.
2. **Proposal kit.** Cut 40 pages to 8. Diagnosis, recommended pod, gross-margin assumption, billable plan, kill criteria, scope, fee, next step. Sara writes (\`mission-throughput-proposal-kit-rewrite\`).

## What the retainer covers

- Service-line hierarchy v1.
- Proposal kit rewrite.
- COO-targeted outbound sequence (\`mission-throughput-coo-outbound-sequence\`).
- One practice-lead positioning piece per quarter.

## What we will not do

- We will not write a "thought leadership" page.
- We will not run paid acquisition.
- We will not give Throughput a logo refresh in year one. Their mark is fine.

## Voice rules

- **Operator-direct. P&L-fluent. Measured.**
- **Use the language a COO uses on a Tuesday.** "Gross margin", "utilization", "pipeline coverage", "ramp", "billable", "pass-through".
- **Never "thought leadership", "transform your business", "unlock value", "world-class".**

## Hard scope question we got right

In the kickoff, Dean asked if we could also "rebrand the practice leads as individual experts". Maya scoped it. The math said the practice-lead pieces are a separate retainer. We held the line. One practice-lead piece per quarter is in scope. A full practice-lead expert brand is not.`,
    authorName: 'Riley',
    createdAt: dateInWeek(10, 1, 16, 30),
  },
  {
    slug: 'doc-throughput-service-line-positioning',
    title: 'Throughput — service line hierarchy v1',
    docType: 'positioning',
    campaignSlug: 'epsilon',
    spaceSlug: 'throughput-workspace',
    contentMd: `# Throughput Group — service line hierarchy v1

**Author:** Maya. **Reviewed:** Garry, Nico, Dean (Throughput COO).
**Status:** Draft locked, pressure-test in flight.
**Locked:** Week 11, Wednesday.

## The hierarchy

Three flagship lines. Two specialty lines. One labs line. Six lines total, none of them overlap, every one of them has a clear pod and a clear kill criterion.

### Flagship — the three lines that pay the lights

1. **RevOps & Pipeline Coverage.** For companies losing pipeline visibility past Series B. Pod: 1 practice lead + 2 senior + 2 mid. Engagement: 90 days, then renewable.
2. **Operations Diagnostic & Pod-Build.** For companies adding a new line of business and trying to staff it without breaking the existing one. Pod: 1 practice lead + 1 senior + 1 mid. Engagement: 60 days, scoped to one launch.
3. **CFO-Office Readiness.** For companies going through a finance leadership change, a Series B-to-C transition, or a first audit. Pod: 1 practice lead + 1 senior + 1 finance ops. Engagement: 120 days.

### Specialty — the two lines that sell themselves to existing flagship clients

1. **Account Expansion Strategy.** Add-on to RevOps engagements. Pod: 1 senior + 1 mid. 30-day project shape.
2. **M&A Integration Sprint.** Add-on to Operations Diagnostic. Pod: 1 practice lead + 2 senior. 45 days, twice-renewable.

### Labs — the line that earns its keep on margin, not volume

1. **Throughput Labs.** Standalone bets in adjacent operating disciplines. Engagements scoped one at a time, run by the partner who proposed them. The kill criterion is 18 months — if a Labs bet has not crossed gross-margin threshold by month 18, the line retires.

## What the hierarchy refuses

- **No more "custom engagements".** Every deal lands in one of the six. If it does not, we say no or write a new line.
- **No more practice-lead bidding wars.** A practice lead is assigned to one line, not three. Dean owns the assignment.
- **No more 40-page proposals.** The 8-page proposal kit (\`mission-throughput-proposal-kit-rewrite\`) is the only proposal format. Sara writes; the partners do not freelance.

## The decision Throughput needed to make

The hardest call: M&A Integration Sprint was a flagship in the v0 draft. Nico pushed to demote it to specialty because the engagement length and pod cost did not pencil against the flagship margin band. Dean agreed by the end of the working session. M&A is specialty.

## Open questions for the pressure-test

- Will the RevOps flagship cannibalize the Account Expansion specialty? The answer matters for the proposal kit decision tree.
- Where does the existing client base land if we re-stamp every active engagement against the new hierarchy on Monday? Owen is running the matrix.`,
    authorName: 'Maya',
    createdAt: dateInWeek(11, 2, 17, 0),
  },

  // ── ALMANAC LEARNING (zeta) — 2 docs ────────────────────────────────────
  {
    slug: 'doc-almanac-onboarding-brief',
    title: 'Almanac Learning — onboarding brief',
    docType: 'brief',
    campaignSlug: 'zeta',
    spaceSlug: 'almanac-workspace',
    contentMd: `# Almanac Learning — onboarding brief

**Retainer signed:** Week 10, Thursday.
**Foundry lead:** Sara (copy) + Maya (voice).
**Almanac principal:** Iris (founder + lead writing cohort mentor).

## What Almanac is

Almanac runs cohort-based learning programs for adults — writing, product, applied AI. The current scale is small on purpose: four mentors, 60-80 learners per cohort, three cohorts a year. The unique part is the Sunday review — every learner gets a written, personalized critique from their mentor every Sunday night. Every cohort. No exceptions.

## Why this retainer matters now

The next adult writing cohort starts in 6 weeks. The current landing page reads like every cohort-based course on the internet — "unlock your writing potential", "transform your craft". The actual buyer is a 35-year-old who has wanted to write a book for a decade and has been burned by two writing programs already. The copy is talking to a 22-year-old. The buyer is older, wiser, and more skeptical. We have to recalibrate the voice.

## The bet inside the retainer

Iris's instinct, and ours, is that the mentor reading lists are a stronger inbound asset than any course landing page can be. We are publishing them publicly with the mentor commentary (\`mission-almanac-public-reading-list-inbound-asset\`). The bet pays off if the lists drive 20% of new cohort sign-ups by the end of next quarter.

## Voice rules

- **Curious. Generous. Plain. Unpatronizing. Specific.**
- **The Almanac learner is not "unlocking" anything.** They are practicing.
- **Banned set:** "unlock your potential", "bite-sized", "gamified", "transformative", "next-gen learner", "edutainment".
- **Mentor voice over institutional voice.** Every email opens with a mentor's name, not "the Almanac team".

## What the retainer covers

- Brand voice + course-page copy system.
- Lifecycle nurture sequences (intake, matching, first-week, Sunday review).
- The public reading list as inbound asset.
- One adult-cohort landing-page rewrite per quarter.

## What we will not do

- We will not write any copy that sells "outcomes" the program cannot deliver.
- We will not run paid acquisition.
- We will not let an email go out under "the Almanac team" sender name.`,
    authorName: 'Sara',
    createdAt: dateInWeek(10, 4, 16, 0),
  },
  {
    slug: 'doc-almanac-adult-cohort-positioning',
    title: 'Almanac — adult writing cohort positioning',
    docType: 'positioning',
    campaignSlug: 'zeta',
    spaceSlug: 'almanac-workspace',
    contentMd: `# Almanac — adult writing cohort positioning

**Author:** Maya. **Reviewed:** Sara, Iris, Garry.
**Locked:** Week 12, Monday.

## The position

> Almanac is the writing program for the person who has been burned twice and is willing to try once more.

Not the aspiring writer. Not the unlocked creative. The 35-year-old who paid $1,200 for a Saturday workshop in 2019, then $2,400 for a six-week online program in 2022, and stopped after two emails because the rubric was generic and the feedback felt automated.

## The customer quote that earned this line

> "I don't need someone to tell me writing is hard. I need someone to read what I wrote on Tuesday and tell me on Sunday what I should change."
> — Almanac alum, second-cohort writing program. Interview Week 11. With permission.

## Three things this position must survive

1. **The skeptical re-read.** The buyer reads the landing page once on a phone, then re-reads on a laptop a week later. The copy has to hold both reads. Specifics over claims. Mentor names over team names. Sunday-review excerpts visible.
2. **The price comparison.** Almanac is more expensive than most cohort programs and cheaper than most MFA tracks. The position has to be specific enough that the buyer can name what they are paying for.
3. **The "did I waste my money" memory.** Every buyer is already nursing two bad experiences. The copy has to refuse the language that burned them last time. Banned: "unlock", "transform", "bite-sized", "potential".

## What this position refuses

- "Unlock your writing potential." Specifically banned forever.
- Generic mentor bios. Every mentor writes their own, in their voice.
- Any landing page that does not show one Sunday-review excerpt.
- The phrase "writing journey". The reader has already been on enough journeys.

## Subordinate moves

- Landing page rewrite against the v2 voice (\`mission-almanac-adult-writing-cohort-landing-page\`).
- Mentor matching email sequence written in mentor voice, not Almanac team voice (\`mission-almanac-mentor-matching-email-sequence\`).
- Public reading list as primary inbound (\`mission-almanac-public-reading-list-inbound-asset\`).
- The Sunday review preview email is the proof point in the nurture sequence.

## Decision log

- **Week 11, Wednesday:** Locked the "burned twice" customer as the primary buyer.
- **Week 12, Monday:** Iris signed off on showing Sunday-review excerpts publicly. (This was a privacy debate — resolved by getting alum consent for three excerpts.)`,
    authorName: 'Maya',
    createdAt: dateInWeek(12, 0, 14, 30),
  },

  // ── INTERNAL — 2 docs ───────────────────────────────────────────────────
  {
    slug: 'doc-foundry-positioning-principles',
    title: 'Foundry positioning principles',
    docType: 'positioning',
    campaignSlug: 'wiki',
    contentMd: `# Foundry positioning principles

**Author:** Maya. **Reviewed:** Garry, Nico.
**Locked:** Week 11, Monday. Living document.

The principles we keep saying out loud on every retainer call but had not written down. Each principle has one example we lived through. New agents read this in their first week and stop asking which Foundry is.

## 1. The customer quote earns the line

No headline, sub-hed, or hero ships without a verbatim customer quote behind it. If we cannot point to the interview transcript, we have not earned the line. We invented this rule on the Plinthworks v2 work in Week 9 when Sara wrote a strong line that none of us could trace to a customer. We killed the line. The replacement came directly from interview transcript 4. It is the line on the homepage now.

## 2. Brand and growth are the same conversation

A positioning doc no one runs ads against is a Notion page. A funnel that converts on language the founder would never use in a customer call is a debt. We take both halves of the loop on retainer or we do not take the retainer. Period.

## 3. The brief is a contract

Maya writes the brief. The brief names the customer, the position, the voice rules, and what we will refuse. Every deliverable answers the brief. If a deliverable drifts off the brief, we hold the deliverable. We do not relax the brief.

## 4. Refuse before you sell

A brand that means anything has to refuse something. Saltline refuses discount-stack messaging. Plinthworks refuses to put the manager on the hero. Helmsmark refuses "frictionless". The refusals are written in the brief before any line of copy is. They are the spine.

## 5. The founder voice is the floor, not the ceiling

What does the founder actually say on a podcast? That is the floor for the brand voice. We do not write below it. We write at it or above it. We do not invent a voice the founder would never use.

## 6. Three options means we have not picked yet

If we present three options to a client when two are obviously wrong, we have not done the work. We pick. We say why. We let the client push back on the pick.

## 7. Polish later, decide first

A finished piece of work answers a question. Polish that does not move the answer is procrastination. Maya catches this in retros — when a deliverable spent two days in polish without the decision having been made, we surface it.

## 8. The kill criterion is the test

Every paid experiment, every sequence, every test ships with a kill criterion written before launch. CAC over X, reply rate under Y, open rate below Z. We agree on the kill before the spend. Leo will turn off any test that misses kill by week 2 without asking.

## 9. The voice has to survive a Tuesday

A brand system that requires a senior to sign off on every Tuesday email is not a system. It is a bottleneck. Casey's design systems, Sara's voice rubrics, Maya's positioning docs — all of them have to be usable by a mid-level on a Tuesday morning without an escalation. If they are not, they are unfinished.`,
    authorName: 'Maya',
    createdAt: dateInWeek(11, 0, 16, 30),
  },
  {
    slug: 'doc-foundry-retainer-sop',
    title: 'New retainer SOP — kickoff to week-2',
    docType: 'sop',
    campaignSlug: 'internal-ops',
    contentMd: `# New retainer SOP — kickoff to week-2

**Author:** Owen. **Reviewed:** Jules, Riley, Garry.
**Locked:** Week 13, Monday. Run on the next retainer and tune.

Every kickoff up to now has been improvised. This SOP is the floor. Run it, then tune. Do not skip steps without writing a one-line override into the retainer's decision log.

## Day 0 — the day the retainer is signed

- **Riley sends the onboarding kit** within 4 hours of signature: scope summary, voice rules first draft, weekly cadence, calendar invites for first three working calls.
- **Maya scopes the brief.** First draft, not final. The brief gets refined through Week 1.
- **Owen logs the retainer in the P&L sheet.** Fee, scope, expected pod hours per week, expected gross margin band.
- **#client-channel spun up** with the right members: Maya, Sara, Riley, founder, and the client principals. Casey + Devon added only when their work is in scope.

## Week 1 — the listening week

- **3 working calls with the client principal.** Not pitches. Listening sessions.
- **Nico runs 4-8 customer interviews.** No drafts get written before the interview tape is in.
- **Riley sends the first Friday status note** in the one-screen format (\`mission-ops-weekly-status-template-overhaul\`). What we heard, what we are working on, no decisions to make yet.

## Week 2 — the brief week

- **Maya finalizes the onboarding brief.** The brief is a contract. Client signs off in writing.
- **First voice draft from Sara** — usually a single hero candidate, not a full site.
- **Casey opens a Figma library** if visual work is in scope.
- **Riley schedules the day-14 retro** on the founder's calendar.

## Day 14 — the first retro

- **Mandatory.** Even if everything is going well. Especially if everything is going well.
- **Format:** what worked, what did not, scope tripwires we are watching, the one decision we need from the client by day 21.
- **Output:** decision log entries + any scope-change-orders captured in writing.

## Scope-creep tripwires — flag immediately

Riley flags a thread to Owen if any of these appear:

1. Client adds a deliverable category not in the original scope ("can you also do…").
2. Client requests a deliverable in a voice or language outside the locked rules.
3. Client adds a new principal to the working sessions without telling us.
4. Pod hours exceed expected weekly band by >25% for two consecutive weeks.
5. A line from Maya's brief gets renegotiated after sign-off.

Any of these triggers a written scope review. We do not absorb the change into the retainer without an explicit fee + scope conversation. That is the rule that holds the line.

## What this SOP refuses

- **No verbal scope changes.** Ever. "We agreed on the call" does not exist in this SOP.
- **No drafts before interviews.** If we have not listened, we have not earned the line.
- **No first-Friday status note in the old bullet-wall format.** Use the one-screen template or rewrite.
- **No skipping the day-14 retro.** The retro is the test that the kickoff worked.`,
    authorName: 'Owen',
    createdAt: dateInWeek(13, 0, 17, 0),
  },
]
