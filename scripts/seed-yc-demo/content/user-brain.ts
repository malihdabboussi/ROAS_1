/**
 * Founder (Garry Tan archetype) user-brain anchor content.
 *
 * Wave 3 target: 130 anchor memories + 40 anchor snapshots, distributed
 * along the 90-day arc via `dateInWeek` / `AGENCY_FOUNDED_AT` /
 * `CORTEX_MAX_ENABLED_AT` / `COMPANY_CORTEX_ENABLED_AT`. Every snapshot
 * cites a real memory slug in this file. Phase P3b1 expands these
 * anchors into ~450 ambient ns_memories rows and the snapshot graph.
 *
 * Voice: founder's thinking captured raw — voice memos, meeting notes,
 * channel saves, principles, observations. Tracks AGENCY.voice and
 * FOUNDER.bio: direct, opinionated, slightly wry, references real
 * clients (Plinthworks / Saltline / Helmsmark / Cloverkin / Throughput /
 * Almanac), real contacts (Devi / Eliza / June / Adaeze / Wendell /
 * Marisol / Dominic / Tomás), and real teammates (Nico / Jules / Maya /
 * Leo / Sara / Devon / Casey / Riley / Owen).
 */
import type { MemoryAnchor, SnapshotAnchor } from './_types'
import {
  AGENCY_FOUNDED_AT,
  COMPANY_CORTEX_ENABLED_AT,
  CORTEX_MAX_ENABLED_AT,
  dateInWeek,
} from './timeline'

// ─── MEMORIES (130 total, distributed across Weeks 1-13) ────────────────

export const USER_BRAIN_MEMORIES: readonly MemoryAnchor[] = [
  // ─── Week 1 — Foundry founded (18 memories) ───────────────────────────
  {
    slug: 'um-w1-founding-decision',
    content:
      'Day one. The thing I keep coming back to is that I am not starting an agency to do better decks. I am starting it because the last four years taught me that brand work that does not change what a company spends money on is not brand work. If we hold that line, Foundry has a reason to exist. If we do not, we are just another shop in lower Manhattan with a nicer typeface.',
    memoryType: 'principle',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — founding day, Tribeca walk-up',
    capturedAt: AGENCY_FOUNDED_AT,
    significance: 0.98,
    confidence: 0.95,
    tags: ['principle', 'positioning', 'brand'],
    emotion: { label: 'clear', valence: 0.8, intensity: 0.9 },
  },
  {
    slug: 'um-w1-resignation-monday',
    content:
      'Wrote the resignation on the 6 train Wednesday night. They offered me partner track on the Tuesday and by Wednesday I knew the pitch deck I had built to earn it was the cleanest thing I had ever made — and the moment I realized I had spent four years getting paid to make companies sound like other companies. The deck was the symptom. The resignation was the fix.',
    memoryType: 'reflection',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — the resignation, in retrospect',
    capturedAt: dateInWeek(1, 0, 11, 30),
    significance: 0.86,
    confidence: 0.94,
    tags: ['principle', 'positioning'],
    emotion: { label: 'resolved', valence: 0.7, intensity: 0.8 },
  },
  {
    slug: 'um-w1-nico-call',
    content:
      "Called Nico the same night. He picked up on the third ring and let me get six sentences in before he said 'OK, what do you actually want to build'. That is the version of him I want in every important room — the one who slows me down long enough to make me name the thing.",
    memoryType: 'observation',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Nico call, late',
    capturedAt: dateInWeek(1, 0, 22, 15),
    significance: 0.84,
    confidence: 0.92,
    tags: ['nico', 'hiring', 'principle'],
    emotion: { label: 'aligned', valence: 0.75, intensity: 0.75 },
  },
  {
    slug: 'um-w1-tribeca-walkup',
    content:
      'Signed the lease on the Tribeca walk-up this morning. Two rooms, terrible heat, the kind of stairs that filter out the wrong kind of visitor. We will not stay here long but I want the brand to have started in a place that was a little inconvenient on purpose.',
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — Tuesday morning',
    capturedAt: dateInWeek(1, 1, 8, 0),
    significance: 0.55,
    confidence: 0.92,
    tags: ['ops'],
  },
  {
    slug: 'um-w1-six-on-purpose',
    content:
      'Six retainers a year. On purpose. Not because we cannot land more — because the day we take the seventh is the day the founder-hours-per-client number drops below the line that makes our work different from a normal growth shop. Nico and I agreed on this before we agreed on the name.',
    memoryType: 'principle',
    sourceType: 'manual',
    sourceTitle: 'Notes — founding principles draft',
    capturedAt: dateInWeek(1, 1, 16, 30),
    significance: 0.94,
    confidence: 0.93,
    tags: ['principle', 'positioning', 'retainer'],
  },
  {
    slug: 'um-w1-no-logo-pitches',
    content:
      'We do not pitch on logo work. If the first ask is a mark, the second ask will be a mark, and we will be back where I just walked away from. Mark is the by-product of figuring out the position. Anyone who reverses that order is buying the wrong thing from us.',
    memoryType: 'principle',
    sourceType: 'manual',
    sourceTitle: 'Notes — sales rules of the road',
    capturedAt: dateInWeek(1, 2, 10, 0),
    significance: 0.9,
    confidence: 0.95,
    tags: ['principle', 'sales', 'brand', 'kill'],
  },
  {
    slug: 'um-w1-three-customer-calls',
    content:
      'No brief opens with us typing. Every brief — positioning, copy, paid, the lot — opens with Maya or Sara or me sitting in on three customer calls for that retainer and walking back with verbatim quotes. The first line we ship has to be earned by a quote. If we cannot get to three calls, we have not earned the brief.',
    memoryType: 'principle',
    sourceType: 'manual',
    sourceTitle: 'Notes — three-call rule, drafted',
    capturedAt: dateInWeek(1, 2, 15, 0),
    significance: 0.93,
    confidence: 0.95,
    tags: ['principle', 'positioning', 'customer-quote'],
  },
  {
    slug: 'um-w1-brand-and-growth-same-job',
    content:
      'Brand and growth are the same job. A positioning doc nobody runs ads against is a Notion page. A paid funnel that converts on language the founder would never say in a customer call is debt. The studios that split them ship both halves badly. Foundry takes both on retainer or it takes neither.',
    memoryType: 'principle',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — brand-and-growth thesis',
    capturedAt: dateInWeek(1, 3, 9, 0),
    significance: 0.96,
    confidence: 0.95,
    tags: ['principle', 'positioning', 'brand', 'growth'],
  },
  {
    slug: 'um-w1-maya-hire-decision',
    content:
      'Maya in as Head of Brand, day one. She reads three customer interviews before she opens a brief and she has more taste in a sentence than most strategists have in a deck. We do not have a single retainer signed yet and I am hiring the brand head first on purpose — because if the brand brain is not the first hire, the agency is just a sales shop with a logo refresh attached.',
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Maya hire memo',
    capturedAt: dateInWeek(1, 3, 14, 30),
    significance: 0.92,
    confidence: 0.94,
    tags: ['hiring', 'maya', 'decision', 'brand'],
  },
  {
    slug: 'um-w1-plinthworks-sign',
    content:
      'Plinthworks signed the retainer at 4:30pm. Their head of platform — Devi Ramanathan — said in the kickoff call she did not want another landing page that explained what an API is. She wanted one that explained why theirs does not page the on-call. The retainer was sold on that sentence; the SOW is just the wrapper.',
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Plinthworks kickoff call — Wed',
    capturedAt: dateInWeek(1, 2, 16, 30),
    significance: 0.9,
    confidence: 0.95,
    tags: ['acme', 'sales', 'retainer'],
  },
  {
    slug: 'um-w1-devi-observability-six-times',
    content:
      "Counted six 'observability' uses in the Plinthworks kickoff. Most prospects say it once and mean nothing by it. Devi means the dashboards she watches at 2am. Note for the customer brain — she is the buyer who will not let us write the word as marketing language without earning it.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Plinthworks kickoff call — Wed',
    capturedAt: dateInWeek(1, 2, 17, 0),
    significance: 0.78,
    confidence: 0.92,
    tags: ['acme', 'customer-quote', 'positioning'],
  },
  {
    slug: 'um-w1-saltline-sign',
    content:
      "Saltline & Co signed Friday morning. Eliza Marchetti put it twelve minutes into the kickoff: she would rather miss a launch window than ship a campaign that smells like everyone else's brand. Said it without flinching. That is the kind of founder we sign for — the one who will defend voice over deadline, every time.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Saltline kickoff call — Fri',
    capturedAt: dateInWeek(1, 4, 12, 0),
    significance: 0.92,
    confidence: 0.95,
    tags: ['beta', 'sales', 'retainer', 'customer-quote'],
  },
  {
    slug: 'um-w1-eliza-launch-window-quote',
    content:
      "Eliza's line is going on the wall: 'I would rather miss a launch window than ship a campaign that smells like everyone else's brand.' That is also the test for whether we have done our job at Saltline — if a competitor could paste a single Foundry-shipped line under their logo, we ship it again.",
    memoryType: 'insight',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — walk back from Saltline kickoff',
    capturedAt: dateInWeek(1, 4, 12, 30),
    significance: 0.9,
    confidence: 0.95,
    tags: ['beta', 'customer-quote', 'principle', 'brand'],
  },
  {
    slug: 'um-w1-brand-book-v0',
    content:
      "Maya and I shipped the Foundry brand book v0 in 48 hours. One column on what we are, one on what we are not. The 'what we are not' column is twice as long on purpose. A brand book that does not refuse anything is wallpaper.",
    memoryType: 'fact',
    sourceType: 'doc',
    sourceTitle: 'Foundry brand book v0 — kickoff draft',
    capturedAt: dateInWeek(1, 4, 22, 0),
    significance: 0.85,
    confidence: 0.94,
    tags: ['brand', 'maya', 'principle'],
  },
  {
    slug: 'um-w1-who-we-are-not',
    content:
      "The 'who we are not' list, written tonight: not a deck-delivery shop, not a logo refresh shop, not the cheaper-in-house alternative, not the firm with the loudest case-study reel. Every one of those is somebody's real positioning. Three of them are profitable. None of them is what I just quit a job to build.",
    memoryType: 'principle',
    sourceType: 'doc',
    sourceTitle: 'Foundry brand book v0 — anti-positioning',
    capturedAt: dateInWeek(1, 5, 10, 30),
    significance: 0.9,
    confidence: 0.95,
    tags: ['principle', 'positioning', 'kill'],
  },
  {
    slug: 'um-w1-position-before-paid-seed',
    content:
      "Wrote it in the brand book draft tonight, half-formed: 'We do not run paid until the message has been pressure-tested in organic.' Not a slogan. A rule. The whole reason CAC eats agencies alive is that they let paid ride on copy nobody read in a newsletter first. Saying it now so I cannot pretend later it was an afterthought.",
    memoryType: 'principle',
    sourceType: 'doc',
    sourceTitle: 'Foundry brand book v0 — growth principles',
    capturedAt: dateInWeek(1, 5, 16, 0),
    significance: 0.92,
    confidence: 0.93,
    tags: ['principle', 'growth', 'leo', 'kill'],
  },
  {
    slug: 'um-w1-no-world-class',
    content:
      "Brand voice cheatsheet, ten minutes' work, will save us a year of bad copy: no 'world-class', no 'best-in-class', no 'committed to excellence', no 'unlock value', no 'leverage' as a verb. If a sentence we write could end up in a Fortune 500 press release, it does not leave the studio. Sara will hold the line on this harder than I will.",
    memoryType: 'principle',
    sourceType: 'doc',
    sourceTitle: 'Foundry voice cheatsheet — banned list',
    capturedAt: dateInWeek(1, 6, 14, 0),
    significance: 0.85,
    confidence: 0.95,
    tags: ['principle', 'sara', 'copy', 'brand'],
  },
  {
    slug: 'um-w1-monday-morning-test',
    content:
      'Test I keep running on every brief draft this week: who is actually going to do this on Monday morning? If the answer is fuzzy, the brief is not finished. The work is not the deck — the work is the calendar the deck implies. I am writing this down so Jules is not the only one who asks the question once she gets here.',
    memoryType: 'principle',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Sunday night, before week 2',
    capturedAt: dateInWeek(1, 6, 16, 30),
    significance: 0.86,
    confidence: 0.93,
    tags: ['principle', 'jules', 'ops'],
  },

  // ─── Week 2 — GTM motion designed (12 memories) ───────────────────────
  {
    slug: 'um-w2-leo-hire',
    content:
      "Leo in as performance marketing lead. He was the only candidate who asked, in his first interview, 'what is the kill criterion'. That is the question I want naming every paid line item we run for the next decade. Closed the loop with him over breakfast — he starts Monday.",
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Leo hire memo',
    capturedAt: dateInWeek(2, 1, 10, 0),
    significance: 0.88,
    confidence: 0.94,
    tags: ['hiring', 'leo', 'growth', 'decision'],
  },
  {
    slug: 'um-w2-leo-cac-only',
    content:
      "Leo's first channel message inside the studio: 'CAC or it did not happen.' Within an hour the whole growth channel had pinned it. Two hours after that he was already arguing — politely, the way he argues — that the Plinthworks paid plan needed to wait until the docs voice was locked. He gets it.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#growth — Leo first day',
    capturedAt: dateInWeek(2, 1, 14, 0),
    significance: 0.78,
    confidence: 0.92,
    tags: ['leo', 'growth', 'principle'],
  },
  {
    slug: 'um-w2-jules-joins-realization',
    content:
      'Jules signed the partner agreement this morning. The first two retainers onboarded a week faster than Nico and I planned for and the delivery side was already starting to drift. Hired her ten days earlier than the original org chart had her — the right move. She is the reason status notes go out on time starting next Friday.',
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Jules partner memo',
    capturedAt: dateInWeek(2, 2, 9, 30),
    significance: 0.92,
    confidence: 0.94,
    tags: ['hiring', 'jules', 'decision', 'ops'],
  },
  {
    slug: 'um-w2-jules-monday-morning',
    content:
      "Jules walked into the studio at 9, asked four questions about the Saltline kickoff, and by 10:30 had drafted a kickoff doc template, a Friday cadence outline, and a retro template. Twenty-four hours in and the delivery side has a shape it did not have yesterday. The question she keeps asking — 'who is actually going to do this on Monday morning?' — is going to keep us honest.",
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — Jules day one',
    capturedAt: dateInWeek(2, 2, 11, 15),
    significance: 0.82,
    confidence: 0.93,
    tags: ['jules', 'ops', 'principle'],
  },
  {
    slug: 'um-w2-first-campaigns',
    content:
      'Spun up the first campaign records this morning — Plinthworks brand + Saltline brand, both retainer-shaped, both with founder-Garry / Nico / Maya assigned and a Leo seat on the growth side. Jules is wiring the Friday cadence into both. The work is real now, not just the deck.',
    memoryType: 'fact',
    sourceType: 'manual',
    sourceTitle: 'Notes — campaign kickoff',
    capturedAt: dateInWeek(2, 3, 10, 0),
    significance: 0.74,
    confidence: 0.95,
    tags: ['ops', 'retainer', 'acme', 'beta'],
  },
  {
    slug: 'um-w2-channels-per-client',
    content:
      'Decided we run one private channel per client inside the studio, mirroring the retainer scope: brand, growth, ops sub-threads under a parent channel keyed off the slug. Tempting to keep everything in one chat — bad idea by month three. We will thank ourselves once Riley shows up.',
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — channel architecture',
    capturedAt: dateInWeek(2, 3, 14, 0),
    significance: 0.7,
    confidence: 0.92,
    tags: ['ops', 'decision'],
  },
  {
    slug: 'um-w2-eliza-pinterest',
    content:
      "Eliza on the lifecycle audit: 'Pinterest does not pay our rent. The third email after the welcome does.' She named the lifecycle slot that was leaking revenue before I did. Most DTC founders at her stage do not know their funnel that well — note her in the customer brain as the rare brand-first founder who is also funnel-fluent.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Saltline lifecycle audit',
    capturedAt: dateInWeek(2, 3, 17, 0),
    significance: 0.84,
    confidence: 0.93,
    tags: ['beta', 'customer-quote', 'growth'],
  },
  {
    slug: 'um-w2-june-kowalski-retainer-sold',
    content:
      "June Kowalski, Eliza's brand lead, in the first working session: 'I am tired of arguing with our agency about whether a recipe card is a brand asset. It is the whole brand. Tell me you understand that.' Sara and I both nodded a little too hard. The retainer was sold in that exchange, not in the proposal.",
    memoryType: 'insight',
    sourceType: 'meeting',
    sourceTitle: 'Saltline brand intensive — Mon',
    capturedAt: dateInWeek(2, 1, 11, 0),
    significance: 0.86,
    confidence: 0.93,
    tags: ['beta', 'customer-quote', 'sales'],
  },
  {
    slug: 'um-w2-leo-paid-too-early-warning',
    content:
      "Leo wrote in the growth channel today: 'we are not going to bid our way out of bad copy.' Saved it. That sentence will earn its keep three times before Q2. Already he is pushing back on a Saltline founder ad we had floated for week three — wants the organic version of the line to land first.",
    memoryType: 'principle',
    sourceType: 'channel',
    sourceTitle: '#growth — Leo on paid timing',
    capturedAt: dateInWeek(2, 4, 15, 30),
    significance: 0.85,
    confidence: 0.92,
    tags: ['principle', 'leo', 'growth', 'kill'],
  },
  {
    slug: 'um-w2-saltline-paid-window',
    content:
      'Held off on opening the Saltline paid account. Eliza was ready to test a hero line that has not run organic anywhere. Walked her through it — gave the line a two-week organic window in her newsletter and on her own founder posts first. If it does not save organically, we are not bidding against it. She got it on the first sentence.',
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Saltline paid kickoff — postponed',
    capturedAt: dateInWeek(2, 4, 16, 30),
    significance: 0.84,
    confidence: 0.92,
    tags: ['beta', 'decision', 'growth', 'leo'],
  },
  {
    slug: 'um-w2-plinthworks-icp-correction',
    content:
      "Devi corrected me twice in the Monday ICP review: 'we are not selling to indie devs anymore. The buyer is the head of platform at a Series B who has been paged twice this quarter for our category.' She will not let the funnel keep speaking to the previous buyer. Our positioning brief is half-written before we have opened the doc.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Plinthworks ICP review — Mon',
    capturedAt: dateInWeek(2, 1, 10, 30),
    significance: 0.86,
    confidence: 0.93,
    tags: ['acme', 'customer-quote', 'positioning'],
  },
  {
    slug: 'um-w2-tribeca-walkup-quiet',
    content:
      'Studio is quiet on a Saturday evening. Two clients live, three humans in, two agent hires onboarded, a brand book, a voice cheatsheet, a Friday cadence doc. Nine days in. I do not want to forget what it felt like to be this small — there is a version of Foundry six months from now that is louder and worse, and the thing that keeps it from happening is choosing to stay this deliberate.',
    memoryType: 'reflection',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Saturday studio, late',
    capturedAt: dateInWeek(2, 5, 18, 0),
    significance: 0.7,
    confidence: 0.9,
    tags: ['principle', 'ops'],
    emotion: { label: 'grounded', valence: 0.6, intensity: 0.6 },
  },

  // ─── Week 3 — Content engine launched (10 memories) ───────────────────
  {
    slug: 'um-w3-sara-hire',
    content:
      'Sara starts today as senior copywriter. The interview test I ran on her — rewrite this Helmsmark draft for me — came back with the cleanest cut I have seen all year. She removed three sentences I would have argued for and the page was stronger without them. She will fight me on copy and she will be right most of the time.',
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Sara hire memo',
    capturedAt: dateInWeek(3, 2, 11, 0),
    significance: 0.88,
    confidence: 0.94,
    tags: ['hiring', 'sara', 'decision', 'copy'],
  },
  {
    slug: 'um-w3-sara-whose-voice',
    content:
      "Sara's first studio question on every brief: 'whose voice is this in?' She made Maya answer it for Plinthworks before she would write a line. We rewrote the homepage twice in twenty-four hours and the second version is in Devi's voice, not ours. The discipline is contagious — Maya is already asking the same question on Saltline drafts.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#sara-onboarding — Tue',
    capturedAt: dateInWeek(3, 2, 14, 30),
    significance: 0.82,
    confidence: 0.92,
    tags: ['sara', 'maya', 'principle', 'copy'],
  },
  {
    slug: 'um-w3-plinthworks-positioning-workshop',
    content:
      "Plinthworks positioning workshop landed eight anchor memories in a single afternoon. Devi was on for three hours straight, no break, no slide deck, just transcripts and a whiteboard. The hero line we left with — 'observability that does not page the on-call' — came directly from her own kickoff sentence. We earned the line by listening to her say it for the second time.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Plinthworks positioning workshop',
    capturedAt: dateInWeek(3, 3, 10, 0),
    significance: 0.9,
    confidence: 0.94,
    tags: ['acme', 'positioning', 'customer-quote', 'maya'],
  },
  {
    slug: 'um-w3-devi-api-quote',
    content:
      "The quote from Devi I keep coming back to: 'I do not need another landing page that explains what an API is. I need one that explains why ours does not page the on-call.' That is the kill criterion for every hero variant we write. If a draft loses that line's spine, the draft goes back to Sara.",
    memoryType: 'insight',
    sourceType: 'meeting',
    sourceTitle: 'Plinthworks positioning workshop',
    capturedAt: dateInWeek(3, 3, 11, 30),
    significance: 0.92,
    confidence: 0.95,
    tags: ['acme', 'customer-quote', 'positioning', 'principle'],
  },
  {
    slug: 'um-w3-saltline-pinterest-third-email',
    content:
      'Eliza named her own leaky funnel slot before we did — the third email after the welcome is where Saltline is losing revenue, not on Pinterest. We dropped the planned Pinterest test and put Sara on the welcome-three rewrite the same afternoon. The founder knowing her funnel that well saves us a quarter.',
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Saltline lifecycle audit — debrief',
    capturedAt: dateInWeek(3, 1, 10, 30),
    significance: 0.84,
    confidence: 0.92,
    tags: ['beta', 'decision', 'growth', 'sara'],
  },
  {
    slug: 'um-w3-june-shoulder-season',
    content:
      "June rewrote the Saltline content calendar in one working session: 'shoulder season is the calendar. Black Friday is not.' That single framing killed the BFCM creative sprint Leo was about to scope and rebuilt the Q4 plan around seasonal cooking moments. Brand leads who can edit the calendar are rarer than brand leads who can edit copy.",
    memoryType: 'observation',
    sourceType: 'doc',
    sourceTitle: 'Saltline content calendar v2 — review',
    capturedAt: dateInWeek(3, 2, 16, 0),
    significance: 0.82,
    confidence: 0.93,
    tags: ['beta', 'customer-quote', 'growth', 'kill'],
  },
  {
    slug: 'um-w3-channel-per-client-decision-stick',
    content:
      "The one-channel-per-client decision from Week 2 is already paying. The Plinthworks brand thread is clean; the Saltline brand thread is clean; we can grep both without scrolling through a fire hose. If we had run a single 'clients' channel we would already be regretting it.",
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — channel architecture, two weeks in',
    capturedAt: dateInWeek(3, 4, 9, 30),
    significance: 0.68,
    confidence: 0.92,
    tags: ['ops'],
  },
  {
    slug: 'um-w3-friday-status-note-informal',
    content:
      "First informal Friday status notes went out today. Jules drafted them, I read them, we sent them. Two retainers, four paragraphs each, no slide decks, no 'we are excited to share'. Plinthworks replied within the hour; Eliza replied tomorrow morning with a single line — 'this is the right amount.' That is the shape of the cadence I want for the next ten years.",
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — first Friday cadence',
    capturedAt: dateInWeek(3, 4, 16, 0),
    significance: 0.74,
    confidence: 0.93,
    tags: ['ops', 'jules', 'retainer'],
  },
  {
    slug: 'um-w3-sara-rewrites-linkedin',
    content:
      "Sara quietly rewrote my LinkedIn draft at 5pm on Friday. Sent it back with three lines and the note 'shorter or do not post'. I posted the shorter one. The thing I am paying her for is exactly this — the willingness to make me cut.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#sara — Fri',
    capturedAt: dateInWeek(3, 4, 17, 30),
    significance: 0.7,
    confidence: 0.92,
    tags: ['sara', 'copy', 'principle'],
  },
  {
    slug: 'um-w3-nico-systems-thinking',
    content:
      "Nico in the Saturday partner sync: 'before you commit to the positioning, name the three forces it has to survive.' That is his contribution every time and I would not trade it. He named pricing pressure, channel saturation, and the founder's own boredom — and made me argue the position against all three before he agreed.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Partner sync — Saturday',
    capturedAt: dateInWeek(3, 5, 11, 0),
    significance: 0.84,
    confidence: 0.93,
    tags: ['nico', 'principle', 'positioning'],
  },

  // ─── Week 4 — First retro (10 memories) ───────────────────────────────
  {
    slug: 'um-w4-first-retro-positioning-muddier',
    content:
      "First retro tonight, all three partners plus Maya plus Sara plus Leo. The honest take: our positioning to clients is sharper than our positioning to ourselves. We have been saying 'brand-only' in pitches and quietly doing brand + growth on every retainer. The deck and the work do not match. We either rewrite the deck or we admit the work is the truth.",
    memoryType: 'reflection',
    sourceType: 'meeting',
    sourceTitle: 'Foundry retro — week 4',
    capturedAt: dateInWeek(4, 4, 16, 0),
    significance: 0.94,
    confidence: 0.94,
    tags: ['retro', 'positioning', 'tension'],
    emotion: { label: 'honest', valence: 0.5, intensity: 0.75 },
  },
  {
    slug: 'um-w4-brand-only-challenged',
    content:
      "Marked the 'we are brand-only' belief as challenged tonight. Three retainer weeks of evidence and we have run paid plans, lifecycle copy, and a content calendar on every client. The pitch deck is lying for us. Either we change the pitch or we have a category problem inside our own brand. Decided in the retro: change the pitch.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Foundry retro — week 4',
    capturedAt: dateInWeek(4, 4, 17, 0),
    significance: 0.92,
    confidence: 0.93,
    tags: ['retro', 'decision', 'positioning', 'brand', 'growth'],
  },
  {
    slug: 'um-w4-saltline-scope-creep',
    content:
      'Saltline scope-creep showing up early. Eliza asked for a packaging review on Tuesday; June asked for a wholesale pitch deck on Wednesday. Both outside scope, both small, both the kind of yes that quietly rewrites a retainer into a project. Jules flagged it the same day. We are going to need a change-order vocabulary before week six.',
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#saltline-brand — Tue',
    capturedAt: dateInWeek(4, 1, 15, 0),
    significance: 0.78,
    confidence: 0.9,
    tags: ['beta', 'tension', 'ops', 'jules'],
  },
  {
    slug: 'um-w4-maya-sara-voice-consistency-rule',
    content:
      "Maya and Sara paired on a voice consistency rule this afternoon — every retainer keeps a one-page 'voice anchor' doc with five customer quotes, three banned words, and one 'if a competitor could paste this under their logo' test. Lightweight, durable, exactly the kind of artifact that survives a Tuesday. Now standard for new retainers.",
    memoryType: 'fact',
    sourceType: 'doc',
    sourceTitle: 'Voice anchor doc — template v1',
    capturedAt: dateInWeek(4, 3, 14, 0),
    significance: 0.84,
    confidence: 0.93,
    tags: ['maya', 'sara', 'brand', 'copy', 'principle'],
  },
  {
    slug: 'um-w4-eliza-killed-influencer',
    content:
      "Eliza killed the influencer line item in ninety seconds when Leo presented the seven-day cohort. 'They post once, our cohort does not move, we have spent rent on a story we did not own.' No defense, no debate. Filed as the spend-discipline anchor — note in the customer brain that this founder will read a cohort report.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Saltline media plan review',
    capturedAt: dateInWeek(4, 3, 11, 45),
    significance: 0.84,
    confidence: 0.93,
    tags: ['beta', 'customer-quote', 'kill', 'pricing', 'leo'],
  },
  {
    slug: 'um-w4-devi-soc2-stats-killed',
    content:
      "Devi killed three SOC 2 stats from the Plinthworks about page herself — 'we have three customers who passed an audit, that is not a stat'. Trust-discipline at the founder level is rare and the customer brain should treat it as a Foundry-shaped behavior. We are not the only ones holding the line here; she is.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#plinthworks-brand — Tue',
    capturedAt: dateInWeek(4, 1, 16, 15),
    significance: 0.78,
    confidence: 0.92,
    tags: ['acme', 'customer-quote', 'kill', 'maya'],
  },
  {
    slug: 'um-w4-june-shorter-headlines',
    content:
      "June rewrote three of Sara's headlines on Friday and her version was always shorter. She is the kind of brand lead who hates 'storytelling' as a verb and ships story as a noun. Sara is taking notes — and the voice anchor doc for Saltline now cites June's edits directly, not a style guide.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#saltline-brand — Fri',
    capturedAt: dateInWeek(4, 4, 17, 30),
    significance: 0.78,
    confidence: 0.92,
    tags: ['beta', 'customer-quote', 'sara', 'copy'],
  },
  {
    slug: 'um-w4-retro-no-templates',
    content:
      "Retro decision: no templates for the things that have to be in the founder's voice. We will template the Friday cadence, the kickoff doc, the retro doc. We will not template a hero line, a positioning paragraph, or an outbound email. The minute we template the voice the agency starts producing wallpaper.",
    memoryType: 'principle',
    sourceType: 'meeting',
    sourceTitle: 'Foundry retro — week 4',
    capturedAt: dateInWeek(4, 4, 18, 0),
    significance: 0.88,
    confidence: 0.93,
    tags: ['retro', 'principle', 'copy', 'kill'],
  },
  {
    slug: 'um-w4-saltline-photography-direction',
    content:
      "We do not have a designer yet and Saltline already needs photography direction. Sketched it in a Loom for Eliza tonight — real kitchens, real morning light, no staged linen. Eliza replied with one line: 'yes, this is the brand.' Casey will inherit this when she joins.",
    memoryType: 'observation',
    sourceType: 'voice_memo',
    sourceTitle: 'Loom — Saltline photography direction v0',
    capturedAt: dateInWeek(4, 2, 14, 0),
    significance: 0.72,
    confidence: 0.9,
    tags: ['beta', 'design', 'casey', 'brand'],
  },
  {
    slug: 'um-w4-foundry-voice-test',
    content:
      "The competitor-paste test is becoming the simplest QA check we have. Wrote it in the brand book draft today: 'If a competitor could paste this sentence under their logo without anyone noticing, it does not belong under ours.' Run it on every hero, every email subject, every paid headline. It catches more drift than any voice doc.",
    memoryType: 'principle',
    sourceType: 'doc',
    sourceTitle: 'Foundry brand book v0.2 — competitor-paste test',
    capturedAt: dateInWeek(4, 5, 11, 0),
    significance: 0.86,
    confidence: 0.94,
    tags: ['principle', 'brand', 'copy', 'kill'],
  },

  // ─── Week 5 — Cortex Max enabled (8 memories) ────────────────────────
  {
    slug: 'um-w5-cortex-max-flipped',
    content:
      'Flipped cortex_max ON on the user brain this afternoon. The reason is simple: I have been carrying every principle, kill criterion, and customer quote in my head for thirty-eight days and the head is getting full. If the brain can hold the spine of the studio, the partners can hold the calendar. Nico has been pushing for this for ten days. He was right.',
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — cortex_max enable memo',
    capturedAt: CORTEX_MAX_ENABLED_AT,
    significance: 0.94,
    confidence: 0.93,
    tags: ['decision', 'cortex-max', 'nico', 'principle'],
  },
  {
    slug: 'um-w5-devon-hire',
    content:
      "Devon in as web engineer. The interview question that closed it: I asked him what he would do if a launch landing page hit Friday with two hundred broken links from a migration. He answered, deadpan, 'roll the migration back, ship the page behind a flag, then fix the links by Monday.' Right answer.",
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Devon hire memo',
    capturedAt: dateInWeek(5, 6, 10, 0),
    significance: 0.86,
    confidence: 0.93,
    tags: ['hiring', 'devon', 'decision', 'web'],
  },
  {
    slug: 'um-w5-devon-shipped-behind-flag',
    content:
      "Devon's first PR went up forty minutes after onboarding finished — a Plinthworks docs nav fix, shipped behind a flag, two states designed, accessibility audit passing. Comment on the PR was three words: 'logged. linked. closed.' The web side of the studio just acquired a spine.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#devon — Sat',
    capturedAt: dateInWeek(5, 6, 11, 0),
    significance: 0.78,
    confidence: 0.93,
    tags: ['devon', 'web', 'principle'],
  },
  {
    slug: 'um-w5-atlas-narrative-pages',
    content:
      "Atlas started synthesizing narrative pages off the founding-week brain dump tonight. First page back was a synthesis of the 'who we are not' list against the Plinthworks positioning workshop notes and the Saltline founder kickoff — it read like Maya wrote it. The brain is now an editor, not just a notebook.",
    memoryType: 'reflection',
    sourceType: 'manual',
    sourceTitle: 'Notes — first Atlas synthesis',
    capturedAt: dateInWeek(5, 6, 18, 0),
    significance: 0.86,
    confidence: 0.9,
    tags: ['cortex-max', 'maya', 'principle'],
  },
  {
    slug: 'um-w5-brain-library-sync',
    content:
      "First brain_library_sync ran clean tonight — Maya and Sara's agent brains now pull from the user-brain anchors, and Sara already redirected a draft based on the 'no world-class' rule without me reminding her. The studio's principles are no longer my problem to remember. They are an editor in the loop.",
    memoryType: 'fact',
    sourceType: 'manual',
    sourceTitle: 'Notes — first brain_library_sync',
    capturedAt: dateInWeek(5, 6, 17, 30),
    significance: 0.84,
    confidence: 0.92,
    tags: ['cortex-max', 'sara', 'maya', 'principle'],
  },
  {
    slug: 'um-w5-saltline-bundle-killed-by-theo',
    content:
      "Theo killed the 'kitchen kit' bundle SKU in one sentence — 'three SKUs, three pickers, no.' Operations as a brand-safety function. Note for the customer brain: the Saltline ops director will tell us what the warehouse can ship before marketing can promise it. Treat his nod as a launch dependency.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#saltline-ops — Tue',
    capturedAt: dateInWeek(5, 1, 16, 30),
    significance: 0.72,
    confidence: 0.92,
    tags: ['beta', 'customer-quote', 'kill', 'ops'],
  },
  {
    slug: 'um-w5-marcus-thought-leadership-thread',
    content:
      "Marcus Holloway closed a Plinthworks Slack thread about 'thought-leadership posts' with one line: 'if we are writing posts our own engineers would not read, we are wasting Devi's time.' Devi reacted with a single check-mark emoji. That was the editorial policy decision — undocumented but binding. Sara has it in the voice anchor.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#plinthworks-brand — Tue',
    capturedAt: dateInWeek(5, 1, 13, 30),
    significance: 0.78,
    confidence: 0.92,
    tags: ['acme', 'customer-quote', 'sara', 'copy', 'kill'],
  },
  {
    slug: 'um-w5-june-williams-sonoma-line',
    content:
      "June's email reply on the welcome series v4: 'if the email could be sent by Williams Sonoma, it is not ours. Write it again with less polish.' Going on the wall in the copy room. That single line resolved a forty-minute argument about whether the welcome series was 'too quiet'.",
    memoryType: 'insight',
    sourceType: 'email',
    sourceTitle: 'Email — June on welcome series v4',
    capturedAt: dateInWeek(5, 3, 9, 45),
    significance: 0.86,
    confidence: 0.94,
    tags: ['beta', 'customer-quote', 'copy', 'principle', 'sara'],
  },

  // ─── Week 6 — Two more clients sign (10 memories) ─────────────────────
  {
    slug: 'um-w6-casey-hire',
    content:
      'Casey in as brand designer. Closed it over a Sunday espresso at the bottom of the studio stairs. Her portfolio was tidy; her crit of three pages I sent her in advance was tidier — she circled four kerning sins on a hero I had personally approved. The first hire who has corrected me before signing the offer.',
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Casey hire memo',
    capturedAt: dateInWeek(6, 0, 10, 0),
    significance: 0.86,
    confidence: 0.94,
    tags: ['hiring', 'casey', 'decision', 'design'],
  },
  {
    slug: 'um-w6-helmsmark-sign',
    content:
      "Helmsmark signed the retainer this afternoon. Adaeze Okonkwo opened the kickoff with one sentence that sold the work: 'our site still talks to bookkeepers, our actual buyer is the controller at a Series B fintech, we have been writing copy to a customer we no longer want.' That is the entire repositioning brief in one paragraph.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark kickoff call — Wed',
    capturedAt: dateInWeek(6, 2, 14, 0),
    significance: 0.92,
    confidence: 0.95,
    tags: ['gamma', 'sales', 'retainer', 'positioning'],
  },
  {
    slug: 'um-w6-adaeze-kickoff-quote',
    content:
      "Adaeze in the kickoff: 'I do not want a brand refresh. I want our homepage to stop apologizing for being a finance tool.' Maya has been quoting it back in every Helmsmark working session since. The positioning brief writes itself when the founder hands you the line on a slide.",
    memoryType: 'insight',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark kickoff call — Wed',
    capturedAt: dateInWeek(6, 2, 14, 30),
    significance: 0.9,
    confidence: 0.94,
    tags: ['gamma', 'customer-quote', 'positioning', 'maya'],
  },
  {
    slug: 'um-w6-wendell-on-brand-call',
    content:
      "Wendell Brockman — Helmsmark's CFO — sat in on the brand kickoff. Most CFOs do not. He said in the second hour: 'I am here because the wrong website costs us six months of pipeline, that is a number I can defend on my board, which is why I am paying attention.' That is the kind of co-buyer we will not have to chase later.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark CFO sync — slide 12',
    capturedAt: dateInWeek(6, 2, 15, 30),
    significance: 0.9,
    confidence: 0.94,
    tags: ['gamma', 'customer-quote', 'sales', 'pricing'],
  },
  {
    slug: 'um-w6-cloverkin-sign',
    content:
      "Cloverkin Health signed the retainer this morning. Dr. Marisol Vega opened the kickoff with: 'our patients are not consumers; the minute the brand starts treating them that way, the trust we have built in three cities is gone.' The retainer is going to be more constrained than any we have signed and that is the reason to take it.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Cloverkin onboarding call',
    capturedAt: dateInWeek(6, 3, 10, 0),
    significance: 0.92,
    confidence: 0.95,
    tags: ['delta', 'sales', 'retainer', 'positioning'],
  },
  {
    slug: 'um-w6-marisol-not-consumers',
    content:
      "Marisol's 'our patients are not consumers' is a constraint, not a tagline. It means: no consumer-style send windows, no consumer-style urgency, no 'magical', no 'frictionless', no 'wellness journey'. The voice anchor for Cloverkin is going to be the shortest and the strictest of any retainer. That is correct.",
    memoryType: 'principle',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Cloverkin walk back',
    capturedAt: dateInWeek(6, 3, 10, 30),
    significance: 0.9,
    confidence: 0.95,
    tags: ['delta', 'principle', 'sara', 'copy', 'kill'],
  },
  {
    slug: 'um-w6-marisol-continuity',
    content:
      "Marisol used the word 'continuity' four times in the first hour. The Cloverkin product is not the app — it is the same care team showing up week three, week six, week twenty. Continuity is the proof; everything else is the feature list. Maya rewrote the brief outline before we left the call.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Cloverkin onboarding call',
    capturedAt: dateInWeek(6, 3, 11, 30),
    significance: 0.84,
    confidence: 0.93,
    tags: ['delta', 'customer-quote', 'positioning', 'maya'],
  },
  {
    slug: 'um-w6-customer-brain-emerging',
    content:
      "The customer brain is starting to shape up as a real thing, not just a folder of notes. Atlas surfaced the first ns_belief_pattern tonight — a cluster around 'founders who will defend voice over deadline' that ties Eliza, June, Marisol, and the first hints of Adaeze together. The customer brain is going to be the part of Foundry that compounds.",
    memoryType: 'reflection',
    sourceType: 'manual',
    sourceTitle: 'Notes — first ns_belief_pattern surfaced',
    capturedAt: dateInWeek(6, 4, 17, 0),
    significance: 0.86,
    confidence: 0.91,
    tags: ['cortex-max', 'principle', 'beta', 'delta', 'gamma'],
  },
  {
    slug: 'um-w6-eliza-kitchen-rule',
    content:
      "Sara discovered Eliza's quiet rule by accident: no copy ships until she reads it aloud in her kitchen on a Thursday afternoon. We now send drafts Thursday morning. Approvals are clearing inside a 24-hour window for the first time. The cadence is the only thing we changed.",
    memoryType: 'observation',
    sourceType: 'email',
    sourceTitle: 'Email — Saltline approval cadence note',
    capturedAt: dateInWeek(6, 2, 9, 30),
    significance: 0.74,
    confidence: 0.92,
    tags: ['beta', 'customer-quote', 'sara', 'ops'],
  },
  {
    slug: 'um-w6-saltline-content-cadence',
    content:
      'Locked the Saltline content cadence with June and Eliza: drafts Thursday AM, kitchen read Thursday PM, send Friday or Monday. We moved one variable — the send day — and approval cycle times halved. Will template the cadence shape, not the copy. (Holding the line from the week-4 retro.)',
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Saltline cadence v1 — locked',
    capturedAt: dateInWeek(6, 5, 11, 0),
    significance: 0.78,
    confidence: 0.93,
    tags: ['beta', 'decision', 'ops', 'jules'],
  },

  // ─── Week 7 — First customer avatar emerges (8 memories) ──────────────
  {
    slug: 'um-w7-first-avatar-emerged',
    content:
      "Atlas pushed the first customer_avatar.status = active tonight: the 'DTC operators with taste' cluster — Eliza, June, and the early Saltline ops signal. The narrative page is, honestly, the best thing the brain has produced. Not because I trained it on the right anchors. Because the anchors were honest in the first place.",
    memoryType: 'reflection',
    sourceType: 'manual',
    sourceTitle: 'Notes — first active customer avatar',
    capturedAt: dateInWeek(7, 3, 15, 0),
    significance: 0.88,
    confidence: 0.92,
    tags: ['cortex-max', 'beta', 'maya', 'principle'],
  },
  {
    slug: 'um-w7-maya-shared-brief-format',
    content:
      "Maya proposed a shared brand brief format across all four retainers — same three sections, same competitor-paste test, same 'show me the customer quote that earned this line' check at the top. We were inventing the shape on every kickoff. With four clients live and two more in conversation, that ends today.",
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Shared brand brief format v1',
    capturedAt: dateInWeek(7, 1, 14, 0),
    significance: 0.84,
    confidence: 0.93,
    tags: ['maya', 'brand', 'decision', 'ops'],
  },
  {
    slug: 'um-w7-saltline-paid-burn-saltline-incident',
    content:
      'Saltline paid incident: Leo had been bidding for eleven days against a hero line that had not earned a single organic save. Burned $4.2k before he caught it and turned it off himself. The right move was a rewrite, not a re-bid. This is the case study for the validate-organic-before-paid rule we have been describing as a principle — it is now an episode with a number attached.',
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#saltline-growth — Mon',
    capturedAt: dateInWeek(7, 1, 10, 0),
    significance: 0.92,
    confidence: 0.94,
    tags: ['beta', 'leo', 'kill', 'growth', 'principle'],
    emotion: { label: 'instructive', valence: -0.1, intensity: 0.75 },
  },
  {
    slug: 'um-w7-eliza-olive-oil-personality',
    content:
      "Eliza in the brand book review: 'our customer is the woman who is annoyed that olive oil is now a personality, we are the brand that takes the personality back out and gives her the bottle.' That is the entire positioning in one sentence. Maya has been quoting it inside the studio for two weeks. Going on slide 2 of every Saltline kickoff.",
    memoryType: 'reflection',
    sourceType: 'meeting',
    sourceTitle: 'Saltline brand book review v3',
    capturedAt: dateInWeek(7, 3, 13, 0),
    significance: 0.94,
    confidence: 0.95,
    tags: ['beta', 'customer-quote', 'positioning', 'principle'],
  },
  {
    slug: 'um-w7-wendell-bloomberg-headline',
    content:
      "Wendell's review of the Helmsmark hero variants: 'if your headline survives a Bloomberg headline cycle, it is ours. If it sounds like a Series A press release, it is not.' Filed as the headline-survival rule on the Helmsmark site — Sara cites it in every copy review. It will graduate into a studio-wide principle by Q3.",
    memoryType: 'principle',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark hero variants review',
    capturedAt: dateInWeek(7, 4, 14, 30),
    significance: 0.88,
    confidence: 0.93,
    tags: ['gamma', 'customer-quote', 'sara', 'copy', 'principle'],
  },
  {
    slug: 'um-w7-marisol-48-hour-send-window',
    content:
      "Marisol in the Cloverkin lifecycle planning: 'I would rather lose the visit than send a marketing email a patient finds in their inbox the day after a hard appointment.' That is the bar for lifecycle copy here. Sara baked it into the send-window SOP — no marketing sends within 48 hours of any visit. Holds across both lifecycle and broadcast.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Cloverkin lifecycle planning',
    capturedAt: dateInWeek(7, 2, 14, 0),
    significance: 0.9,
    confidence: 0.95,
    tags: ['delta', 'customer-quote', 'decision', 'sara', 'ops'],
  },
  {
    slug: 'um-w7-june-killed-staged-linen',
    content:
      "June killed a beautiful editorial photo because 'the linen is staged, the kitchen is not'. Casey learned more in that fifteen-minute review than from any moodboard. We now shoot in real kitchens with real morning light — the photography direction is locked. Casey is the operator who will keep it from drifting in Q3.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Saltline photo direction review',
    capturedAt: dateInWeek(7, 2, 13, 30),
    significance: 0.82,
    confidence: 0.92,
    tags: ['beta', 'customer-quote', 'casey', 'design', 'kill'],
  },
  {
    slug: 'um-w7-adaeze-controllers-not-aspiration',
    content:
      "Adaeze pushed back on Maya's first Helmsmark positioning draft: 'controllers do not buy on aspiration, they buy because the close took eleven days last quarter and they want it to take six.' We rewrote the value prop after that call — the number became the headline anchor. The controller-as-buyer thesis is now the spine of the entire repositioning.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark positioning review v1',
    capturedAt: dateInWeek(7, 1, 10, 30),
    significance: 0.88,
    confidence: 0.94,
    tags: ['gamma', 'customer-quote', 'positioning', 'maya', 'decision'],
  },

  // ─── Week 8 — Company Cortex turned on (10 memories) ──────────────────
  {
    slug: 'um-w8-company-cortex-enabled',
    content:
      'Turned on company_cortex daily dream this morning. The decision was straightforward: the user brain has been catching the principles, but the patterns between clients — the things only visible when Plinthworks, Saltline, Helmsmark, and Cloverkin are on the same dashboard — were getting missed. Schedule: daily, 02:00 UTC. Owen-shaped move, even though Owen is not here yet.',
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — company_cortex enable memo',
    capturedAt: COMPANY_CORTEX_ENABLED_AT,
    significance: 0.94,
    confidence: 0.93,
    tags: ['decision', 'cortex-max', 'principle'],
  },
  {
    slug: 'um-w8-first-dream-3-signals',
    content:
      'First company dream run completed tonight — three signals. One: the Saltline scope-creep tension is real, with four data points across three weeks. Two: every async-approval cycle has cost us more than a synchronous one. Three: we have shipped paid before organic validation twice and it has burned cash both times. The brain found three things I knew separately and had not connected.',
    memoryType: 'fact',
    sourceType: 'manual',
    sourceTitle: 'Notes — first dream run output',
    capturedAt: dateInWeek(8, 6, 20, 0),
    significance: 0.88,
    confidence: 0.92,
    tags: ['cortex-max', 'tension', 'anti-pattern', 'beta'],
  },
  {
    slug: 'um-w8-saltline-scope-creep-surfaces',
    content:
      "The Saltline scope-creep tension surfaced in the dream as a structural signal, not an isolated complaint. Six small yeses across week 3-7 have quietly turned the retainer into a project. Jules and Riley do not have a change-order vocabulary yet. We need one before the next packaging request lands — that is this week's job.",
    memoryType: 'reflection',
    sourceType: 'manual',
    sourceTitle: 'Notes — Saltline scope tension, dream-flagged',
    capturedAt: dateInWeek(8, 6, 20, 15),
    significance: 0.86,
    confidence: 0.91,
    tags: ['beta', 'tension', 'ops', 'jules', 'cortex-max'],
  },
  {
    slug: 'um-w8-wendell-killed-ai-powered',
    content:
      "Wendell killed the 'AI-powered' line in the Helmsmark hero himself: 'no CFO has ever wired more money because something was AI-powered. They wire money because the variance report is shorter.' The line that replaced it cites the variance number — his suggestion. The customer brain just got a verbatim CFO objection-killer.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark site review v2',
    capturedAt: dateInWeek(8, 1, 11, 30),
    significance: 0.88,
    confidence: 0.94,
    tags: ['gamma', 'customer-quote', 'kill', 'copy', 'sara'],
  },
  {
    slug: 'um-w8-bidding-out-of-bad-copy-realization',
    content:
      'Counted in the dream digest: twice in weeks 7-8 we threw budget at hero lines that organic had already told us were soft. Both times the right move was a rewrite, not a re-bid. The pattern is clearer than the principle — bidding our way out of bad copy is the move I most want Leo to refuse on my behalf. It is always a creative problem dressed as a media problem.',
    memoryType: 'insight',
    sourceType: 'manual',
    sourceTitle: 'Notes — bidding-out-of-bad-copy pattern',
    capturedAt: dateInWeek(8, 4, 9, 30),
    significance: 0.9,
    confidence: 0.93,
    tags: ['leo', 'growth', 'anti-pattern', 'principle'],
  },
  {
    slug: 'um-w8-brand-changes-spend-belief',
    content:
      "Crystallizing the belief I have been saying out loud since founding: brand work that does not change what we spend money on is not brand work. The Plinthworks workshop drove Leo to kill two underperforming Google Ads themes inside ten days. Saltline's reposition changed which product launches Casey shot first. If the spend sheet does not move, the deck did not work. Going in the brand book as a non-negotiable.",
    memoryType: 'principle',
    sourceType: 'doc',
    sourceTitle: 'Foundry brand book v0.3 — brand-changes-spend',
    capturedAt: dateInWeek(8, 4, 10, 0),
    significance: 0.95,
    confidence: 0.94,
    tags: ['principle', 'brand', 'growth', 'positioning'],
  },
  {
    slug: 'um-w8-validated-organic-window-locked',
    content:
      'Locked the rule, finally, in the partner sync: every paid campaign needs a 14-day organic window first. Newsletter, founder posts, owned channels — the exact hero line gets to live without spend behind it. Leo will not open a paid account until the validation window is logged. We are not going to bid our way out of bad copy, on record.',
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Partner sync — paid validation rule',
    capturedAt: dateInWeek(8, 5, 14, 0),
    significance: 0.92,
    confidence: 0.94,
    tags: ['decision', 'principle', 'leo', 'growth', 'kill'],
  },
  {
    slug: 'um-w8-marisol-no-consumer-word-list',
    content:
      "Marisol added 'partner' to the Cloverkin no-words list this week — she dislikes the asymmetry the word implies. The full list is now: consumer, partner, wellness journey, magical, frictionless. She has the strongest no-words list of any client we have. The Cloverkin voice anchor cites her rejections, not a style guide.",
    memoryType: 'fact',
    sourceType: 'email',
    sourceTitle: 'Email — Cloverkin avoid-list update',
    capturedAt: dateInWeek(8, 1, 9, 30),
    significance: 0.78,
    confidence: 0.95,
    tags: ['delta', 'customer-quote', 'kill', 'sara', 'copy'],
  },
  {
    slug: 'um-w8-june-wellness-app-question',
    content:
      "June, point-blank in the Saltline positioning sync: 'why do all the other DTC brands sound like a wellness app now?' Then she answered herself: 'because they hired the same five people'. Useful framing for the positioning doc and for the DTC-operators-with-taste avatar narrative. We are not hiring those five people.",
    memoryType: 'insight',
    sourceType: 'meeting',
    sourceTitle: 'Saltline positioning sync',
    capturedAt: dateInWeek(8, 1, 11, 0),
    significance: 0.84,
    confidence: 0.92,
    tags: ['beta', 'customer-quote', 'positioning', 'principle'],
  },
  {
    slug: 'um-w8-jules-system-tightens',
    content:
      'Jules tightened the Friday cadence this afternoon: status note draft to her by 11am, founder review 1-4pm, sent by 4pm. Six retainers will fit through that funnel without anyone working past 6 on a Friday. The cadence is now a real system, not an informal habit. She is exactly what I hired her to do.',
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#ops — Wed',
    capturedAt: dateInWeek(8, 3, 15, 30),
    significance: 0.78,
    confidence: 0.94,
    tags: ['jules', 'ops', 'principle'],
  },

  // ─── Week 9 — First anti-pattern crystallizes (12 memories) ───────────
  {
    slug: 'um-w9-async-approvals-anti-pattern',
    content:
      'The dream pulled it together overnight and it is the first real anti-pattern crystallized in the company brain: async approvals burn trust and surface the same three clarifying questions every time. Four cycles in weeks 7-8 — Saltline brand palette (3 rounds), Plinthworks site copy (4 rounds), Cloverkin onboarding sequence (3 rounds), Helmsmark positioning doc (5 rounds, the worst). The same questions, every time.',
    memoryType: 'insight',
    sourceType: 'manual',
    sourceTitle: 'Notes — async-approvals anti-pattern surfaced',
    capturedAt: dateInWeek(9, 1, 11, 0),
    significance: 0.94,
    confidence: 0.94,
    tags: ['anti-pattern', 'ops', 'cortex-max', 'tension'],
  },
  {
    slug: 'um-w9-maya-brand-approvals-sop',
    content:
      'Maya rewrote the brand approvals SOP same week: no deck goes async for approval without a fifteen-minute walkthrough call first. Sounds small. It is not — async approvals were costing us 48-72 hours per cycle and reading to the client as if we were not on top of the work. Walkthrough first, async send second. Locked in across all four active retainers tonight.',
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Brand approvals SOP v2 — Maya',
    capturedAt: dateInWeek(9, 2, 9, 30),
    significance: 0.9,
    confidence: 0.94,
    tags: ['decision', 'maya', 'ops', 'principle', 'anti-pattern'],
  },
  {
    slug: 'um-w9-plinthworks-rebrand-begins',
    content:
      "Plinthworks rebrand work officially started tonight. Devi's brief, in her own words: 'I am not paying for a logo, I am paying for the fact that our hiring page stops sounding like a startup that has not figured out who it is yet.' The success metric is recruiting funnel quality, not the mark. Casey is leading mark exploration; Maya is leading the positioning rewrite; Nico is leading the system audit.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Plinthworks rebrand kickoff',
    capturedAt: dateInWeek(9, 0, 14, 0),
    significance: 0.9,
    confidence: 0.94,
    tags: ['acme', 'brand', 'casey', 'maya', 'nico'],
  },
  {
    slug: 'um-w9-helmsmark-5-rounds-async',
    content:
      'The Helmsmark positioning doc went five rounds async before we got a walkthrough on the calendar. Five. The fifth round was Wendell asking a question Maya could have answered in ninety seconds on a call. The walkthrough resolved everything in twelve minutes. Filing this as the canonical evidence for the SOP.',
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — Helmsmark approval audit',
    capturedAt: dateInWeek(9, 0, 9, 30),
    significance: 0.78,
    confidence: 0.93,
    tags: ['gamma', 'anti-pattern', 'ops', 'maya'],
  },
  {
    slug: 'um-w9-cloverkin-3-rounds-async',
    content:
      "Cloverkin onboarding sequence: 3 async rounds, all the same question from a different stakeholder ('what does the 48-hour send-window mean for the welcome series?'). One synchronous call with Marisol and James would have closed it day one. Pattern is consistent across four retainers — async is the trap, not the channel.",
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — Cloverkin approval audit',
    capturedAt: dateInWeek(9, 0, 11, 0),
    significance: 0.74,
    confidence: 0.92,
    tags: ['delta', 'anti-pattern', 'ops'],
  },
  {
    slug: 'um-w9-saltline-3-rounds-async',
    content:
      'Saltline brand palette: 3 async rounds, same fight three times about whether the accent color reads warm enough at 14px. Casey opened a walkthrough on the third round and we decided the palette in under twenty minutes. The walkthrough is the SOP fix. Async is the failure mode.',
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — Saltline palette audit',
    capturedAt: dateInWeek(9, 0, 11, 30),
    significance: 0.72,
    confidence: 0.92,
    tags: ['beta', 'anti-pattern', 'casey', 'design'],
  },
  {
    slug: 'um-w9-plinthworks-4-rounds-async',
    content:
      "Plinthworks site copy: 4 async rounds before the walkthrough. Marcus and Devi each surfaced the same technical-claim question on rounds 2 and 4, and one engineer's nod on a fifteen-minute call would have collapsed both rounds into one. Logged. The rebrand kickoff will run synchronous from day one.",
    memoryType: 'observation',
    sourceType: 'manual',
    sourceTitle: 'Notes — Plinthworks copy audit',
    capturedAt: dateInWeek(9, 0, 10, 30),
    significance: 0.74,
    confidence: 0.92,
    tags: ['acme', 'anti-pattern', 'sara', 'copy'],
  },
  {
    slug: 'um-w9-sara-no-bidding-line',
    content:
      "Sara dropped a line in the growth channel that ended a forty-minute argument: 'we are not going to bid our way out of bad copy.' Leo pinned it. The studio's principles are starting to write themselves out of the dialogue, not just out of my brain. That is the cortex doing exactly what I bought it for.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#growth — Thu',
    capturedAt: dateInWeek(9, 3, 11, 0),
    significance: 0.8,
    confidence: 0.93,
    tags: ['sara', 'leo', 'principle', 'growth'],
  },
  {
    slug: 'um-w9-saltline-q4-no-gift-bid',
    content:
      'Eliza on the Saltline Q4 plan: \'if our brand has to bid on the word "gift" in December, we did the first ten months wrong.\' That is now the constraint on the Q4 media plan — Leo budgeted accordingly. Saltline is the cleanest example of a retainer where the brand kills paid line items the moment the brand starts speaking honestly.',
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Saltline Q4 plan review',
    capturedAt: dateInWeek(9, 1, 14, 30),
    significance: 0.86,
    confidence: 0.94,
    tags: ['beta', 'customer-quote', 'kill', 'leo', 'growth'],
  },
  {
    slug: 'um-w9-cloverkin-3-navigator-calls',
    content:
      'Marisol made Sara sit through three patient-navigator calls before writing a single line of onboarding copy. The version we shipped is unrecognizable from draft one. Three calls. Three rewrites. This is the bar for any healthtech retainer we ever sign — listen before language.',
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Cloverkin patient navigator shadow',
    capturedAt: dateInWeek(9, 4, 13, 0),
    significance: 0.86,
    confidence: 0.93,
    tags: ['delta', 'sara', 'principle', 'copy'],
  },
  {
    slug: 'um-w9-marisol-sat-us-through-3-calls',
    content:
      "Reflection from the Cloverkin shadow shift: Marisol's three-navigator-call rule is not a Cloverkin rule. It is the three-customer-call rule I wrote in Week 1, sharpened by a clinician. We have been doing it informally on every retainer; codifying it as a studio standard this week. Every brief sits in on three customer calls before a single line gets written.",
    memoryType: 'principle',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — three-call rule, formalized',
    capturedAt: dateInWeek(9, 4, 14, 0),
    significance: 0.92,
    confidence: 0.94,
    tags: ['principle', 'delta', 'sara', 'maya', 'positioning'],
  },
  {
    slug: 'um-w9-adaeze-cfos-friends',
    content:
      'Adaeze runs standing 1:1s with three friendly customer CFOs. She has done more customer research in a month than most marketing leads do in a year. The Helmsmark case-study program should plug straight into her cadence — she already has the access we would otherwise spend a quarter earning. The buyer-research effort is the unlock.',
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#helmsmark-brand — Mon',
    capturedAt: dateInWeek(9, 0, 15, 30),
    significance: 0.8,
    confidence: 0.92,
    tags: ['gamma', 'maya', 'growth', 'sales'],
  },

  // ─── Week 10 — Two more clients + Riley joins (12 memories) ───────────
  {
    slug: 'um-w10-throughput-sign',
    content:
      "Throughput Group signed the retainer. Dominic Ferraro's opener was the cleanest sales conversation I have had in a year: 'I have six service lines and a website that explains zero of them, I want the homepage to make my COO stop apologizing for our positioning in board prep.' Repositioning brief in one sentence. Closed the SOW at the bottom of the second meeting.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Throughput kickoff call — Mon',
    capturedAt: dateInWeek(10, 1, 14, 0),
    significance: 0.92,
    confidence: 0.95,
    tags: ['epsilon', 'sales', 'retainer', 'positioning'],
  },
  {
    slug: 'um-w10-almanac-sign',
    content:
      "Almanac Learning signed Thursday morning. Tomás Reinhardt: 'I have run six cohorts, two changed people, four were nice, I want the brand to make sure the next twelve are the first kind.' That is a positioning brief written from the syllabus side, not the marketing side. Took the retainer for the framing alone.",
    memoryType: 'fact',
    sourceType: 'meeting',
    sourceTitle: 'Almanac onboarding call — Thurs',
    capturedAt: dateInWeek(10, 4, 10, 0),
    significance: 0.92,
    confidence: 0.95,
    tags: ['zeta', 'sales', 'retainer', 'positioning'],
  },
  {
    slug: 'um-w10-dominic-margins-slide-three',
    content:
      'Dominic gave us gross margin per service line on slide three of his own deck. Most prospects guard that number for three meetings. He led with it because he wanted us to price the work properly — and because he wanted us to know which practice was the loss leader. That is a P&L-fluent buyer Foundry was built for. He is the cleanest version of the services-firm avatar we are about to write.',
    memoryType: 'insight',
    sourceType: 'meeting',
    sourceTitle: 'Throughput kickoff call — Mon',
    capturedAt: dateInWeek(10, 1, 15, 0),
    significance: 0.9,
    confidence: 0.94,
    tags: ['epsilon', 'customer-quote', 'pricing', 'positioning'],
  },
  {
    slug: 'um-w10-tomas-six-cohorts',
    content:
      "Tomás's six-cohort framing is going on the wall: two changed people, four were nice, the brand has to make sure the next twelve are the first kind. He has a no-words list as long as Marisol's — gamified, bite-sized, unlock, transformative. The discipline rhymes across two verticals. The customer brain just got its second strong cross-vertical signal.",
    memoryType: 'insight',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Almanac walk back',
    capturedAt: dateInWeek(10, 4, 10, 15),
    significance: 0.88,
    confidence: 0.93,
    tags: ['zeta', 'customer-quote', 'delta', 'principle', 'kill'],
  },
  {
    slug: 'um-w10-riley-hire',
    content:
      "Riley in as account manager. The trigger was simple — six retainers, two of them onboarding in the same week, and the partner team's calendar was the bottleneck before the work was. Her first day she audited every active client channel and surfaced two scope-creep emails Jules and I had both missed. She is the right hire two weeks too late.",
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Riley hire memo',
    capturedAt: dateInWeek(10, 4, 16, 0),
    significance: 0.88,
    confidence: 0.94,
    tags: ['hiring', 'riley', 'decision', 'ops'],
  },
  {
    slug: 'um-w10-customer-brain-18-contacts',
    content:
      'The customer brain crossed eighteen contacts across six clients tonight. Atlas grouped them into seven avatar candidates in the latest dream; five are clean clusters, two are blurry. The blurry ones are interesting — one of them is a cross-vertical disqualified-leads pattern that I had been seeing anecdotally for three weeks. The brain saw it before I had a name for it.',
    memoryType: 'reflection',
    sourceType: 'manual',
    sourceTitle: 'Notes — customer brain at 18 contacts',
    capturedAt: dateInWeek(10, 5, 9, 0),
    significance: 0.84,
    confidence: 0.92,
    tags: ['cortex-max', 'principle'],
  },
  {
    slug: 'um-w10-we-love-it-anti-pattern',
    content:
      "Anti-pattern of the week: Riley enthusiastically green-lit a Saltline campaign deck inside thirty minutes — 'we love it'. Sara read it the next morning and flagged three lines that drifted from the brand book, but the client had already started production. Casey had a near-identical episode on a Cloverkin photo direction the same week. Lesson: no 'we love it' in writing without 24 hours of read-back time.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#riley — Thu',
    capturedAt: dateInWeek(10, 3, 16, 0),
    significance: 0.84,
    confidence: 0.93,
    tags: ['anti-pattern', 'riley', 'casey', 'principle', 'ops'],
  },
  {
    slug: 'um-w10-casey-cloverkin-photo-near-miss',
    content:
      "Casey near-miss on a Cloverkin patient-facing photo direction — enthusiastic email reply to Marisol on Wednesday morning, second look on Wednesday night flagged the framing as 'too consumer'. Pulled back before production. Two near-misses in one week is a pattern. The 24-hour rule is going in the Friday cadence protocol.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#casey-cloverkin — Wed',
    capturedAt: dateInWeek(10, 3, 11, 0),
    significance: 0.78,
    confidence: 0.92,
    tags: ['delta', 'casey', 'anti-pattern', 'design'],
  },
  {
    slug: 'um-w10-six-clients-cap-realization',
    content:
      "Six retainers active. The number I wrote in Week 1 — six clients a year on purpose — turned out to be a ceiling, not an aspiration. Founder hours per retainer have compressed from 9 to 5.5 since Week 7. Owen is not here yet to put a P&L line under it, but the pattern is obvious. We are at the cap and the next prospect call is a 'no'.",
    memoryType: 'principle',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Tuesday afternoon, six retainers in',
    capturedAt: dateInWeek(10, 2, 16, 0),
    significance: 0.92,
    confidence: 0.94,
    tags: ['principle', 'retainer', 'pricing', 'kill'],
  },
  {
    slug: 'um-w10-dominic-no-template-outbound',
    content:
      "Dominic on the Throughput outbound program: 'no template. If the email could have been sent to ten other COOs, do not send it. Send three a week, not three hundred.' Volume-allergic, signal-only outbound. Owen will love this when he shows up — it matches our own no-template stance from the week-4 retro perfectly.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Throughput outbound program kickoff',
    capturedAt: dateInWeek(10, 5, 10, 30),
    significance: 0.84,
    confidence: 0.93,
    tags: ['epsilon', 'customer-quote', 'kill', 'sales', 'principle'],
  },
  {
    slug: 'um-w10-helmsmark-three-cfo-case-studies',
    content:
      "Adaeze cut our planned Helmsmark case-study cadence in half — correctly. 'I do not need ten testimonials. I need three that another CFO will believe.' Three named CFO case studies, not ten unnamed quotes. The case study count is a quality metric, not a volume one. Sara is loving this.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark case-study planning',
    capturedAt: dateInWeek(10, 1, 11, 0),
    significance: 0.82,
    confidence: 0.93,
    tags: ['gamma', 'customer-quote', 'pricing', 'sara', 'sales'],
  },
  {
    slug: 'um-w10-three-customer-calls-standardized',
    content:
      "Made the three-customer-call rule a written standard tonight — not just a principle. Every retainer where we ignored it (Saltline week 2, Helmsmark week 7) needed a re-brief inside two weeks. Maya's catchphrase is the test: 'show me the customer quote that earned this line.' Casey will enforce it on the Plinthworks rebrand kickoff next week.",
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Studio standard — three customer calls before brief',
    capturedAt: dateInWeek(10, 5, 15, 0),
    significance: 0.9,
    confidence: 0.94,
    tags: ['decision', 'principle', 'maya', 'sara', 'casey', 'positioning'],
  },

  // ─── Week 11 — Operating standards crystallize (8 memories) ───────────
  {
    slug: 'um-w11-plinthworks-rebrand-q3-q4',
    content:
      "Plinthworks rebrand decision logged in the partner sync: ship the new mark, type system, and marketing site in Q3; the legacy mark stays alive on docs, in-app, and existing customer-facing assets through Q4, then sunsets fully January 1. No cohabitation past that date. Driven by docs being on a separate deploy cadence and Devon's read on migration risk for a single cutover.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Plinthworks rebrand — Q3/Q4 decision sync',
    capturedAt: dateInWeek(11, 3, 15, 30),
    significance: 0.92,
    confidence: 0.94,
    tags: ['acme', 'decision', 'casey', 'devon', 'nico', 'brand'],
  },
  {
    slug: 'um-w11-three-customer-calls-standard',
    content:
      'Three-customer-calls-before-brief is now an active standard in the company cortex, not just an informal rule. Every retainer where we have skipped it has needed a re-brief; every retainer where we have honored it has shipped a brand book that has not been reopened. Casey enforced it on the Plinthworks rebrand kickoff this week — the brand book that came out has not been re-opened since.',
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Company cortex standard — three-call rule formalized',
    capturedAt: dateInWeek(11, 1, 10, 30),
    significance: 0.92,
    confidence: 0.94,
    tags: ['decision', 'principle', 'maya', 'sara', 'casey'],
  },
  {
    slug: 'um-w11-organic-validation-standard',
    content:
      'Codified the 14-day organic validation window as a hard standard tonight. Drafted by Leo, signed off in the partner sync, first item on every paid kickoff from now on. The Saltline incident is the case study attached — eleven days, $4.2k, the right move was a rewrite. Plinthworks Q1 paid ran the window and produced the cleanest CAC test we have so far. Cause and effect, written down.',
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Studio standard — 14-day organic validation',
    capturedAt: dateInWeek(11, 2, 14, 0),
    significance: 0.9,
    confidence: 0.93,
    tags: ['decision', 'principle', 'leo', 'growth', 'beta', 'acme'],
  },
  {
    slug: 'um-w11-founder-reads-every-status',
    content:
      "Made it explicit in the Friday cadence protocol: I read every retainer status note between 1pm and 4pm before Riley sends it. Not for approval theatre — for the read-back. The trigger was a week-9 Helmsmark note that shipped with 'we are excited about this momentum' (a line I would never write) and a week-10 Cloverkin note Riley caught herself. The standard pays for itself the first time it catches one drift.",
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Friday cadence — founder read-pass standard',
    capturedAt: dateInWeek(11, 4, 13, 0),
    significance: 0.88,
    confidence: 0.93,
    tags: ['decision', 'principle', 'ops', 'riley', 'retainer'],
  },
  {
    slug: 'um-w11-new-hire-onboarding-protocol',
    content:
      'New-hire onboarding protocol locked: week one, read all six retainer briefs and the full Plinthworks-to-Almanac decision log; week two, sit on every kickoff and every Friday status review; week three is the first owned deliverable. Triggered by Riley shipping a Cloverkin status note on day three that contradicted a Week 6 positioning decision nobody handed her. Will not happen with Owen.',
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Protocol — new-hire onboarding, two-week reader phase',
    capturedAt: dateInWeek(11, 5, 14, 30),
    significance: 0.84,
    confidence: 0.93,
    tags: ['decision', 'hiring', 'ops', 'riley'],
  },
  {
    slug: 'um-w11-friday-cadence-protocol',
    content:
      'Friday cadence protocol, v1 — written down, finally. Status note draft to Riley by 11am, founder read 1-4pm, sent to client by 4pm with founder edits applied in the doc, not in a reply. Jules and Riley have been running this informally since Week 6. Will likely need a v2 once Owen joins next week and starts splicing P&L lines into the fintech and B2B notes.',
    memoryType: 'decision',
    sourceType: 'doc',
    sourceTitle: 'Friday cadence protocol — v1',
    capturedAt: dateInWeek(11, 4, 11, 0),
    significance: 0.86,
    confidence: 0.93,
    tags: ['decision', 'jules', 'riley', 'ops'],
  },
  {
    slug: 'um-w11-casey-sara-collaboration-peak',
    content:
      'Casey and Sara shipped four missions together this week. The pattern is clean: Sara writes the line, Casey designs the surface, Casey hands back the surface with one or two copy edits Sara would have made herself. They do not argue about whose idea was first. The Plinthworks brand book, the Saltline product PDP, the Cloverkin onboarding sequence, and the Helmsmark controller page all moved this week. Best operating week the brand team has had.',
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#brand — Wed',
    capturedAt: dateInWeek(11, 3, 18, 0),
    significance: 0.84,
    confidence: 0.93,
    tags: ['casey', 'sara', 'brand', 'design', 'copy'],
  },
  {
    slug: 'um-w11-tomas-reading-list-bar',
    content:
      "Sat with Tomás's framing for an hour this afternoon: 'a reading list is a free course. If it is not the best thing on the internet for that topic, do not publish it.' The Almanac public reading list is going to be the brand's flagship inbound object, not a content marketing line item. Maya is treating it as the spine of the inbound plan. Bar is raised studio-wide — content as flagship object, never as filler.",
    memoryType: 'insight',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Thursday afternoon, on Tomás',
    capturedAt: dateInWeek(11, 4, 15, 0),
    significance: 0.88,
    confidence: 0.92,
    tags: ['zeta', 'maya', 'principle', 'growth'],
  },

  // ─── Week 12 — Pricing review tension (7 memories) ────────────────────
  {
    slug: 'um-w12-owen-hire',
    content:
      "Owen in as ops lead. The trigger was the pricing review I did not have the tools to run — six SOWs in front of me, six different shapes, no margin view I could trust. He showed me a P&L cross-section of the studio in his first three days that made my coffee cold. He is the calm voice in the partner meeting that will say 'OK, but at this margin, no.'",
    memoryType: 'decision',
    sourceType: 'manual',
    sourceTitle: 'Notes — Owen hire memo',
    capturedAt: dateInWeek(12, 2, 11, 0),
    significance: 0.9,
    confidence: 0.94,
    tags: ['hiring', 'owen', 'decision', 'ops', 'pricing'],
  },
  {
    slug: 'um-w12-pricing-review-retainer-vs-project',
    content:
      "Pricing review surfaced a real tension: every SOW we have written promises retainer-style continuity but enumerates project-style deliverables. Plinthworks, Saltline, Helmsmark all show the same fingerprint — monthly deliverable line items that frame us as a sequence of outputs instead of a sustained brain. Jules and Riley have been re-routing scope-creep emails into 'change order' language since Week 10, but the document itself is the source of the bug. Owen is drafting v2 of the standard SOW.",
    memoryType: 'insight',
    sourceType: 'meeting',
    sourceTitle: 'Pricing review — Thursday partner sync',
    capturedAt: dateInWeek(12, 4, 11, 0),
    significance: 0.92,
    confidence: 0.92,
    tags: ['tension', 'pricing', 'retainer', 'owen', 'jules', 'riley'],
  },
  {
    slug: 'um-w12-walk-to-owen-pricing-move',
    content:
      "New move, formed under pressure: pricing pushback walks to Owen for a P&L pass before anyone replies. Triggered by Riley's forty-minute Throughput reply on a change order that turned out to be 18% under margin once Owen ran the numbers. The first reply sets the anchor; the anchor has to be defensible at the bottom of the sheet. Said it out loud to the partner team this afternoon.",
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Partner sync — pricing-pushback protocol',
    capturedAt: dateInWeek(12, 4, 16, 0),
    significance: 0.86,
    confidence: 0.92,
    tags: ['decision', 'owen', 'riley', 'pricing', 'principle'],
  },
  {
    slug: 'um-w12-walked-away-seventh-prospect',
    content:
      'Walked away from a seventh prospect this morning that Riley had pre-qualified. Reasonable budget, founder I would have enjoyed working with, clean fit on paper. The reason was the six-clients-a-year cap, written down two months ago, defended this morning. The cap is real because we said it was real. The minute we make an exception, the principle stops being a principle.',
    memoryType: 'decision',
    sourceType: 'meeting',
    sourceTitle: 'Sales review — seventh prospect declined',
    capturedAt: dateInWeek(12, 3, 14, 30),
    significance: 0.9,
    confidence: 0.93,
    tags: ['decision', 'sales', 'principle', 'kill', 'retainer'],
  },
  {
    slug: 'um-w12-dominic-utility-over-polish',
    content:
      "Dominic on the Throughput proposal kit review: 'every page of this needs to be useful even if we lose the deal. If we lose, I want them to remember we wrote the only useful proposal they got that quarter.' That is the bar for the proposal template — utility over polish. The proposal is a content artifact, not a sales artifact.",
    memoryType: 'observation',
    sourceType: 'meeting',
    sourceTitle: 'Throughput proposal kit review',
    capturedAt: dateInWeek(12, 1, 10, 30),
    significance: 0.84,
    confidence: 0.93,
    tags: ['epsilon', 'customer-quote', 'sales', 'principle'],
  },
  {
    slug: 'um-w12-yuki-tactics-first-disqualified',
    content:
      'Yuki at Throughput pushed for SDR sequences before the positioning was locked. The minute we drafted them, Dominic asked us to pause. The buyer pattern is clear: she wants tactics, he wants posture. Filing as the canonical disqualified-leads pattern — the tactics-first stakeholder inside an otherwise Foundry-shaped account. Useful avatar diff.',
    memoryType: 'observation',
    sourceType: 'email',
    sourceTitle: 'Email — Yuki on SDR sequences draft',
    capturedAt: dateInWeek(12, 2, 10, 0),
    significance: 0.78,
    confidence: 0.91,
    tags: ['epsilon', 'customer-quote', 'sales', 'kill'],
  },
  {
    slug: 'um-w12-acme-strategy-vs-design-hours',
    content:
      'Owen surfaced a tension Atlas had been quietly counting: Plinthworks is paying for positioning hours and getting, by hour count, a designer-led engagement. Eleven Casey missions in weeks 9-12, four Nico strategy hours in the same period. They have not complained, but the gap is widening and the rebrand decision compounded it. Riley is sitting on the scope conversation until Owen has the renegotiated SOW template ready.',
    memoryType: 'insight',
    sourceType: 'meeting',
    sourceTitle: 'Partner sync — Plinthworks hours audit',
    capturedAt: dateInWeek(12, 5, 16, 30),
    significance: 0.86,
    confidence: 0.9,
    tags: ['acme', 'tension', 'pricing', 'owen', 'nico', 'casey'],
  },

  // ─── Week 13 — This week, active and alive (5 memories) ───────────────
  {
    slug: 'um-w13-month-three-belief-emerging',
    content:
      'Emerging belief, half-formed but worth writing down before it gets away: most retainers fail at month three, not month one. Kickoff energy carries a retainer for sixty days. The real failure mode shows up when novelty wears off and the operating cadence either holds or quietly slips. Saltline scope-creep first showed up at day 73, Helmsmark status notes quietly went bi-weekly at day 65, Jules said it in channel last week. Day-75 retainer review is going to be non-negotiable. Owen is drafting the template.',
    memoryType: 'reflection',
    sourceType: 'voice_memo',
    sourceTitle: 'Voice memo — Tuesday morning, month-three thesis',
    capturedAt: dateInWeek(13, 1, 9, 0),
    significance: 0.88,
    confidence: 0.82,
    tags: ['principle', 'retainer', 'owen', 'jules', 'tension'],
  },
  {
    slug: 'um-w13-tomas-quiet-call-twenty',
    content:
      "Tomás on a quiet call this morning: 'I would rather run a cohort of twenty than fill one of fifty with the wrong twenty.' Renewal-class signal — he is selecting the audience as carefully as the audience selects him. Same shape as Eliza on launch windows, as Marisol on paid acquisition, as Dominic on outbound templates. The Foundry-shaped buyer keeps writing the same constraint in different vocabularies.",
    memoryType: 'observation',
    sourceType: 'channel',
    sourceTitle: '#almanac-strategy — Mon',
    capturedAt: dateInWeek(13, 0, 14, 0),
    significance: 0.86,
    confidence: 0.93,
    tags: ['zeta', 'customer-quote', 'principle', 'beta', 'delta', 'epsilon'],
  },
  {
    slug: 'um-w13-wendell-board-debrief',
    content:
      "Wendell told the Helmsmark board the brand refresh paid for itself in a single enterprise deal that closed because the prospect's controller forwarded the homepage internally. That is the case study we cannot write but he will tell forever. Renewal-class signal — flag in the retainer file. The 'brand changes what we spend money on' belief just got its cleanest external data point.",
    memoryType: 'reflection',
    sourceType: 'meeting',
    sourceTitle: 'Helmsmark board prep — debrief',
    capturedAt: dateInWeek(13, 1, 10, 30),
    significance: 0.94,
    confidence: 0.94,
    tags: ['gamma', 'customer-quote', 'principle', 'brand', 'sales'],
    emotion: { label: 'vindicated', valence: 0.8, intensity: 0.75 },
  },
  {
    slug: 'um-w13-cross-vertical-disqualified-pattern',
    content:
      "Atlas pushed the cross-vertical disqualified-leads avatar to status='shifting' tonight. Priya at Plinthworks, Yuki at Throughput, Sebastian at Almanac — three secondary stakeholders, three verticals, identical reflex: chase the easy-to-measure number, push tactical execution before posture is locked. The pattern is now the disqualification rubric for prospect calls. Riley is using it as a buffer pattern inside existing accounts.",
    memoryType: 'insight',
    sourceType: 'manual',
    sourceTitle: 'Notes — disqualified-leads avatar shifted',
    capturedAt: dateInWeek(13, 3, 10, 0),
    significance: 0.88,
    confidence: 0.91,
    tags: ['cortex-max', 'sales', 'riley', 'principle', 'acme', 'epsilon', 'zeta'],
  },
  {
    slug: 'um-w13-dominic-loss-leader-pick-us',
    content:
      "Dominic told Riley quietly that he picked Foundry over a larger shop because we were the only firm that asked which service line was the loss leader before we wrote a line of copy. P&L-fluent buyers want P&L-fluent vendors. Owen being here changes the shape of the answer we give the next services-firm prospect. The avatar's decision criterion is now in writing.",
    memoryType: 'insight',
    sourceType: 'channel',
    sourceTitle: '#throughput-account — Mon',
    capturedAt: dateInWeek(13, 0, 9, 0),
    significance: 0.9,
    confidence: 0.93,
    tags: ['epsilon', 'customer-quote', 'pricing', 'owen', 'riley', 'sales'],
  },
]

// ─── SNAPSHOTS (40 total, distributed Weeks 2-13) ───────────────────────

export const USER_BRAIN_SNAPSHOTS: readonly SnapshotAnchor[] = [
  // ─── Weeks 2-3 — early crystallization (5) ────────────────────────────
  {
    slug: 'snap-belief-six-clients-on-purpose',
    type: 'Belief',
    name: 'Six retainers is a ceiling, not a target',
    core: 'Foundry runs six concurrent retainers a year on purpose; past six, the founder-time-per-client falls below the line that makes our work distinguishable from a normal growth shop.',
    oneLiner: 'Six is a cap, not an aspiration.',
    story:
      'On the founding weekend I kept catching myself doing the math: how many retainers could we run before the founder hours per client compressed to nothing? Nico had the same math. We named the ceiling before we named the studio because the only thing worse than building Foundry to scale would be building it and then forgetting why we kept it small.',
    moment:
      'Sunday afternoon of Week 1, Tribeca walk-up, three principles on a whiteboard and the partner conversation that locked the number at six.',
    method:
      'Every prospect call inside the studio is qualified against the six-cap. Sales never quotes more than three open conversations at a time. The partner team holds the line in the moment a seventh feels reasonable.',
    steps:
      "1) Count active retainers monthly. 2) If at five, decide who the sixth client looks like before opening conversations. 3) If at six, all new conversations stall in 'pre-qualified' and inform the founder. 4) The seventh is declined in writing.",
    filter:
      'Apply when an inbound prospect, partner referral, or founder-personal lead would push the active retainer count past six.',
    challenge:
      'The strongest pressure on the cap is from prospects who are obvious-fit and have budget. The discipline is to decline them anyway and write a recommendation note instead.',
    breakTest:
      'If the studio is running fewer than six and revenue holds, the cap is still on. If we have six and revenue is tight, the answer is pricing, not volume.',
    risks:
      'Risk: declining a prospect who later signs with a competitor and refers two more. Mitigated by recommendation notes and a follow-up cadence we maintain even on the no.',
    proof:
      'Walked away from a seventh prospect in Week 12, citing this snapshot in the partner sync. Founder hours per retainer recovered from 5.5 back toward 7 the following week.',
    sourceMemorySlug: 'um-w1-six-on-purpose',
    crystallizedAt: dateInWeek(2, 1, 11, 0),
    significanceScore: 0.94,
    confidence: 0.93,
    tags: ['principle', 'positioning', 'retainer', 'pricing'],
  },
  {
    slug: 'snap-principle-no-logo-pitches',
    type: 'Principle',
    name: 'We do not pitch on logo work',
    core: 'Mark and identity are the by-product of figuring out the position. If a prospect leads with a logo refresh, they are buying the wrong thing from us and the engagement will be wrong inside ninety days.',
    oneLiner: 'No logo pitches — position first, mark later.',
    story:
      "The reason this is a principle and not a preference is that I spent four years inside two growth shops watching engagements that started with 'let us refresh the logo' end with a Notion page nobody acted on. Every one of them rewarded the agency that sold the logo. None of them changed what the client did on Monday morning.",
    moment:
      "Week 1 sales-rules drafting session, when I almost wrote 'we lead with brand identity work' and Maya stopped me — 'we do not lead with the mark, we lead with what the mark has to refuse.'",
    method:
      'Every inbound conversation gets a positioning conversation first. The mark is on the table in week four of an engagement, never in week one. If a prospect cannot tolerate the order, they are not a Foundry retainer.',
    filter:
      "Apply when a prospect's first ask is identity, mark, logo refresh, or 'rebrand'. Re-frame to positioning before quoting scope.",
    challenge:
      'Some prospects will leave for a shop that will sell them the mark first. That is the right outcome for everyone.',
    breakTest:
      'If we keep losing prospects on this principle, the studio is still right. If we sign them on logo work and the engagement quietly falls apart by month three, the principle was correct and we broke it.',
    risks:
      'Risk: short-term revenue loss. Mitigated by the fact that the engagements we would have lost were not Foundry-shaped retainers in the first place.',
    proof:
      'Plinthworks signed in Week 1 with no logo conversation — the mark exploration starts in Week 9 as part of the rebrand. Same shape on every retainer since.',
    sourceMemorySlug: 'um-w1-no-logo-pitches',
    crystallizedAt: dateInWeek(2, 2, 14, 0),
    significanceScore: 0.9,
    confidence: 0.95,
    tags: ['principle', 'sales', 'brand', 'kill'],
  },
  {
    slug: 'snap-principle-three-customer-calls',
    type: 'Principle',
    name: 'Three customer calls before a brief',
    core: 'No Foundry brief — positioning, copy, paid, or rebrand — opens with the writer typing. It opens with Maya or Sara or me sitting in on three customer calls for that retainer and walking back with verbatim quotes. The first line has to be earned by a quote.',
    oneLiner: 'Three customer calls, then the cursor moves.',
    story:
      "The fastest way I know to write a brief in the client's voice is to listen to their customers say the thing the brief is going to claim. Three calls is the floor — fewer than three and the temptation to fill in the gaps with our own opinions wins.",
    moment:
      'Week 1, drafting the sales rules with Nico, when we both realized we had been doing this informally at our previous shop and never naming it.',
    method:
      'Every retainer starts with three customer calls before the brief opens. Maya or Sara is on each call. Verbatim quotes go into the voice anchor doc the same week. The hero line of every deliverable has to point to a specific quote.',
    steps:
      '1) Retainer kickoff includes a customer-call scheduling block. 2) Three calls land in week one. 3) Voice anchor doc receives five verbatim quotes by end of week one. 4) Brief writing begins in week two.',
    filter:
      'Apply on every retainer kickoff. The only exception is if the customer-call audio archive is already three-plus calls deep and reviewed.',
    challenge:
      'Some clients want the deliverable in two weeks and resist the customer-call schedule. The pushback is the signal — the retainer needs the calls more, not less.',
    breakTest:
      'Every retainer where we ignored the rule (Saltline week 2, Helmsmark week 7) needed a re-brief inside fourteen days. Every retainer where we honored it shipped a brand book that has not been re-opened.',
    risks:
      'Risk: slower kickoff perceived as slow studio. Mitigated by surfacing the calls as the first deliverable and treating the customer-quote document itself as a billable artifact.',
    proof:
      "Codified as a company cortex standard in Week 11 (object-three-customer-calls-before-brief). Maya enforces it on every kickoff; the test sentence is 'show me the customer quote that earned this line.'",
    sourceMemorySlug: 'um-w1-three-customer-calls',
    crystallizedAt: dateInWeek(2, 2, 16, 30),
    significanceScore: 0.93,
    confidence: 0.95,
    tags: ['principle', 'positioning', 'customer-quote', 'maya', 'sara'],
  },
  {
    slug: 'snap-belief-brand-and-growth-same-job',
    type: 'Belief',
    name: 'Brand and growth are the same conversation',
    core: 'A positioning doc nobody runs ads against is a Notion page. A paid funnel that converts on language the founder would never say in a customer call is debt. Studios that split them ship both halves badly.',
    oneLiner: 'Brand and growth, one retainer, one operator, one Friday note.',
    story:
      'The original wound of the previous shop was watching the brand team write a positioning doc and the growth team run a campaign that contradicted it in the same week. Both halves were technically excellent. Both were lying about the company they were selling. Foundry exists to refuse that split.',
    moment:
      "Week 1, the brand-and-growth thesis voice memo on Wednesday morning, when I named the studio's whole reason for existing in one sentence.",
    method:
      'Every retainer is brand + growth, one operator (founder), one Friday note. Maya and Leo share a doc. The paid creative brief and the brand brief live in the same file. Hero lines run organic before they run paid.',
    filter:
      "Apply when a prospect asks for 'just brand' or 'just growth'. Re-frame to the loop or decline the engagement.",
    challenge:
      "Currently challenged: Plinthworks asked in Week 12 for 'just the site redesign, skip the positioning'. The partner team declined. The pressure to split will keep returning.",
    breakTest:
      'If we run brand-only engagements and they hold, the belief is wrong. So far every brand-only engagement we have refused has been correct.',
    risks:
      'Risk: prospects who only want one half walk away. Acceptable — they were not Foundry-shaped to begin with.',
    proof:
      "Casey + Sara's Week 11 collaboration peak (four missions co-shipped) is the operational proof; the founder's Week 9 channel message — 'a paid funnel that converts on language the founder would never say in a customer call is a debt' — sealed the shape.",
    sourceMemorySlug: 'um-w1-brand-and-growth-same-job',
    crystallizedAt: dateInWeek(3, 0, 10, 0),
    significanceScore: 0.96,
    confidence: 0.95,
    tags: ['principle', 'positioning', 'brand', 'growth'],
  },
  {
    slug: 'snap-method-monday-morning-test',
    type: 'Method',
    name: 'The Monday-morning test',
    core: 'Every brief, deck, and recommendation has to answer one question before it leaves the studio: who is actually going to do this on Monday morning? If the answer is fuzzy, the work is not finished.',
    oneLiner: 'Who does this on Monday? If unclear, the work is not done.',
    story:
      'The instinct to ship polish instead of finish is the death of brand work. I borrowed the Monday-morning test from how Jules talks about delivery — it is the cleanest filter I have for separating a deck that looks good from a deck that names a thing.',
    moment:
      'Sunday night of Week 1, before Jules had even officially joined, when I realized the question was the principle and I needed to write it down before she did.',
    method:
      'Before any deliverable leaves the studio, the lead operator names — in one sentence — what the client does with it on Monday morning. If the sentence cannot be written, the deliverable goes back into the doc.',
    steps:
      '1) Lead operator drafts the Monday-morning sentence at the bottom of the deliverable. 2) Friday cadence reviewer checks the sentence. 3) Sentence is shared with the client at handoff.',
    filter:
      'Apply on every deliverable type: brief, deck, copy doc, paid creative kit, photo direction, proposal.',
    challenge:
      "The test fails on aspirational work — strategy docs that are 'meant to inspire'. That is usually the signal that the doc needs a specific recommendation instead of inspiration.",
    breakTest:
      'If a deliverable passes the Monday-morning test and the client still does not act on it, the test was the wrong test. So far that has not happened.',
    risks:
      'Risk: forcing premature specificity onto a deliverable that benefits from breathing room. Mitigated by writing the Monday-morning sentence as a recommendation, not a prescription, when appropriate.',
    proof:
      'Jules institutionalized the test in the Friday cadence template in Week 6; Riley now applies it to every status note before founder review.',
    sourceMemorySlug: 'um-w1-monday-morning-test',
    crystallizedAt: dateInWeek(2, 6, 14, 0),
    significanceScore: 0.86,
    confidence: 0.93,
    tags: ['principle', 'jules', 'ops', 'riley'],
  },

  // ─── Week 4 — Post-retro (3) ──────────────────────────────────────────
  {
    slug: 'snap-frame-positioning-muddier',
    type: 'Frame',
    name: 'Our self-positioning lags our work by three weeks',
    core: "Foundry's positioning to clients is sharper than its positioning to itself. The deck and the work do not match — we have been saying 'brand-only' in pitches and doing brand + growth on every retainer.",
    oneLiner: 'The deck is lying for us. Update the deck.',
    story:
      'The first retro surfaced the lie I had been telling sales prospects without noticing. The work was honest; the pitch was three weeks behind it. The retro made it impossible to keep both stories in the room at once.',
    moment:
      "Week 4 retro, Thursday evening, when Maya and Leo independently pointed out that the 'brand-only' line had not survived contact with reality.",
    method:
      'Run a self-positioning audit at every retro: what are we telling prospects vs. what does the work actually look like across active retainers? Reconcile the deck to the work, not the work to the deck.',
    filter:
      'Apply at every monthly retro. Trigger automatically when a prospect call requires us to mis-describe an active retainer.',
    challenge:
      'Updating the deck means re-pitching active prospects who bought the old story. We will lose one in three when the story changes.',
    breakTest:
      'If the new pitch wins more retainers than the old one — even at lower volume — the frame was correct.',
    risks:
      'Risk: chasing self-positioning while the work itself drifts. Mitigated by anchoring the audit to the actual retainer deliverables, not to a separate brand exercise.',
    proof:
      "Week 4 retro decision to mark 'we are brand-only' as challenged led directly to the rewritten sales conversation that closed Helmsmark in Week 6 — explicitly brand + growth.",
    sourceMemorySlug: 'um-w4-first-retro-positioning-muddier',
    crystallizedAt: dateInWeek(4, 5, 14, 0),
    significanceScore: 0.9,
    confidence: 0.92,
    tags: ['retro', 'positioning', 'tension', 'principle'],
  },
  {
    slug: 'snap-belief-brand-only-challenged',
    type: 'Belief',
    name: '"We are brand-only" is dead',
    core: "Foundry is brand + growth on every retainer, by the work we actually do. The 'brand-only' positioning is dead and the sales story changes to match.",
    oneLiner: 'Brand-only was the pitch; brand-and-growth is the work.',
    story:
      'The belief was a relic from the version of Foundry I had imagined in the founding week before the first retainers were running. Three retainers in, we had run paid plans, lifecycle copy, and content calendars on every client. The belief was no longer describing the studio it was meant to describe.',
    moment:
      'Week 4 retro, after the positioning-muddier reflection forced an explicit decision — change the pitch or pretend the work is something it is not.',
    method:
      'Mark the old belief as challenged in the company brain. Rewrite the sales deck and the public-facing positioning to match the work within seven days.',
    filter:
      'Apply whenever a long-held belief shows three or more contradicting data points inside a thirty-day window.',
    challenge:
      'The risk is that we keep the old belief politely because it sounds tidier than the new one. The retro caught it; the protocol catches the next one.',
    breakTest:
      'If the rewritten pitch closes retainers, the belief change was correct. If it does not, the belief was right and the work needs to change.',
    risks:
      'Risk: clients who signed for the brand-only version feel mis-sold. Mitigated by the fact that the actual scope already included growth — the deliverable shape is unchanged, the framing is honest.',
    proof:
      'Helmsmark signed in Week 6 on the rewritten pitch — explicitly brand + growth, with marketing-and-finance as the buying coalition.',
    sourceMemorySlug: 'um-w4-brand-only-challenged',
    crystallizedAt: dateInWeek(4, 6, 10, 0),
    significanceScore: 0.9,
    confidence: 0.93,
    tags: ['retro', 'decision', 'positioning', 'brand', 'growth'],
  },
  {
    slug: 'snap-principle-no-templates',
    type: 'Principle',
    name: 'No templates for the things in the founder voice',
    core: 'Foundry templates the cadence — kickoff doc, Friday status, retro template. Foundry does not template a hero line, a positioning paragraph, or an outbound email. Templating the voice produces wallpaper.',
    oneLiner: 'Template the cadence. Never template the voice.',
    story:
      'The temptation as the studio scales is to template the deliverables. Other shops do — that is why their deliverables read the same across clients. The retro forced us to name what we will and will not template before we have to.',
    moment:
      'Week 4 retro, end of the meeting, when someone asked if we should template the positioning paragraph format. The answer was no and the principle wrote itself.',
    method:
      "Maintain two lists: 'templated' (cadence artifacts, ops docs, status formats) and 'never templated' (voice-bearing deliverables). Every new internal artifact is classified before it ships. The 'never' list is owned by Maya and Sara jointly.",
    filter:
      "Apply when anyone proposes templating a deliverable type. Default 'no' unless the deliverable is structural, not voice-bearing.",
    challenge:
      'Pressure to template grows with retainer count. Six retainers will produce louder pressure than three. The principle has to survive Owen.',
    breakTest:
      "If a templated deliverable still feels in-voice across three clients, the template was structural. If two of three feel like wallpaper, the template needs to come back to the 'never' list.",
    risks:
      'Risk: re-inventing voice work every retainer costs hours. Mitigated by the voice anchor doc, which gives each retainer a specific reference without becoming a template.',
    proof:
      'Six retainers in, no two hero lines look like each other. The Friday cadence template, by contrast, has been stable since Week 6 and has scaled cleanly to six clients without rewriting.',
    sourceMemorySlug: 'um-w4-retro-no-templates',
    crystallizedAt: dateInWeek(4, 6, 11, 30),
    significanceScore: 0.88,
    confidence: 0.93,
    tags: ['retro', 'principle', 'copy', 'kill', 'maya', 'sara'],
  },

  // ─── Weeks 5-7 — Cortex Max era (9) ───────────────────────────────────
  {
    slug: 'snap-decision-cortex-max-on',
    type: 'Decision',
    name: 'Cortex Max enabled on the user brain',
    core: 'The user brain holds the spine of the studio. After 38 days of carrying every principle, kill criterion, and customer quote in my head, cortex_max is on so the brain can do the holding and the partners can do the calendar.',
    oneLiner: 'Cortex Max on — the brain holds the principles now.',
    story:
      'Nico had been pushing for this for ten days. The honest reason for waiting was that I wanted the founding-week brain dump to be raw, not synthesized, before Atlas started reasoning over it. Once the founding principles were stable, the case for enabling cortex_max was trivial.',
    moment:
      'Week 5 Saturday afternoon, after the Plinthworks positioning workshop and the brand-only belief retirement gave the brain enough anchor density to synthesize against.',
    method:
      'cortex_max runs continuously over the user brain. Atlas synthesizes narrative pages from anchor memories and snapshots. brain_library_sync pushes the synthesized pages into agent brains weekly.',
    filter:
      'Activated permanently. Re-evaluate only if the synthesis quality degrades or if the brain produces a hallucination class we have to debug.',
    challenge:
      'Risk that Atlas synthesizes a pattern that is not yet a pattern. Mitigated by significance/confidence scoring and by founder-pass on first three narrative pages of any new topic.',
    breakTest:
      'If agents start citing principles that were never written down, the brain is hallucinating. So far, every cited principle has a memory anchor.',
    risks:
      'Risk: over-reliance on synthesized narrative pages instead of the underlying anchors. Mitigated by surface UX that always shows the source memories under any synthesized page.',
    proof:
      "First brain_library_sync ran clean on Week 5 Saturday night. Sara redirected a draft based on the 'no world-class' rule the next morning without being reminded.",
    sourceMemorySlug: 'um-w5-cortex-max-flipped',
    crystallizedAt: dateInWeek(6, 1, 10, 0),
    significanceScore: 0.94,
    confidence: 0.93,
    tags: ['decision', 'cortex-max', 'nico', 'principle'],
  },
  {
    slug: 'snap-principle-shipped-behind-flag',
    type: 'Principle',
    name: 'Web work ships behind a flag, two states designed',
    core: 'Every web deliverable Devon ships goes behind a flag with both the loaded and empty states designed. The empty state is the design. Lighthouse and accessibility scores are non-negotiable. Migrations roll back cleanly.',
    oneLiner: 'Behind a flag, two states, both designed.',
    story:
      "The principle came in with Devon and it is the right one. Web work at agencies usually ships in one of two ways: cowboy or paralyzed. Devon's middle path — behind a flag, both states designed, rollback clean — is the way we want every retainer's web layer to run.",
    moment:
      "Devon's first PR forty minutes after onboarding finished — Plinthworks docs nav fix, behind a flag, two states designed, accessibility passing. He set the bar without being asked.",
    method:
      'Every web change ships behind a flag. Both loaded and empty states are designed in Figma before code is written. Lighthouse score required at 90+ before flag-flip. Accessibility audit required before sign-off. Migration must roll back cleanly.',
    steps:
      '1) Figma design includes both states. 2) PR opens behind a flag. 3) Lighthouse + a11y audit. 4) Flag flip after sign-off. 5) Rollback path documented in PR description.',
    filter:
      'Apply on every Foundry-shipped web change — landing pages, marketing site updates, lifecycle pages, signup flows.',
    challenge:
      "Some clients want a 'just push it' web change. The principle does not bend. Behind a flag adds 30 minutes; saves the next Saturday.",
    breakTest:
      'If we ever ship without a flag and have to roll back manually, the principle was right and we broke it.',
    risks:
      'Risk: feature-flag debt across retainers. Mitigated by a monthly flag cleanup pass owned by Devon.',
    proof:
      'Six retainers, zero web rollbacks, zero accessibility regressions since Devon joined. Plinthworks docs migration in Week 9 ran clean because of the flag architecture.',
    sourceMemorySlug: 'um-w5-devon-shipped-behind-flag',
    crystallizedAt: dateInWeek(6, 2, 14, 0),
    significanceScore: 0.82,
    confidence: 0.93,
    tags: ['principle', 'devon', 'web', 'design'],
  },
  {
    slug: 'snap-belief-customer-brain-is-the-product',
    type: 'Belief',
    name: 'The customer brain is the part of Foundry that compounds',
    core: "The thing that gets harder for competitors to replicate every month is not the deliverables. It is the customer brain — the structured, in-voice library of what our clients' customers actually say, want, refuse, and reward. That is the compounding asset.",
    oneLiner: 'The customer brain is the moat.',
    story:
      'I noticed it the first time Atlas surfaced a cross-client belief pattern in Week 6. The pattern (founders who will defend voice over deadline — Eliza, June, Marisol, the first hint of Adaeze) was not visible in any one retainer. It was only visible because the customer brain held them in the same data structure.',
    moment:
      "Week 6 Thursday night, when the first ns_belief_pattern surfaced and made obvious what had been implicit since Week 3 — the brain is the studio's most durable competitive asset.",
    method:
      "Every customer call, every approval thread, every founder quote enters the customer brain in structured form. Atlas runs pattern surfacing weekly. Customer avatars formalize the strongest patterns into narrative pages. The brain is treated as the studio's most-defended artifact.",
    filter:
      'Apply on every client touchpoint that contains a verbatim quote, a kill criterion, an objection, or a decision signal.',
    challenge:
      'The challenge is privacy and discretion — the brain holds confidential client material. Access controls are partner-only. Synthesized narrative pages can be summarized for proposals; raw quotes never leave the brain without explicit client consent.',
    breakTest:
      'If competitors start landing retainers that look like ours, either the moat is failing or we are not extracting it. Currently retainers come to us because of the work, not the brain — but the next twelve months will show whether the brain becomes the visible reason.',
    risks:
      'Risk: the brain becomes a vanity asset that nobody references in production. Mitigated by the brain_library_sync into agent brains — Sara and Maya actively retrieve from it weekly.',
    proof:
      'First active customer avatar (dtc-operators-with-taste) emerged from the brain in Week 7 and produced the framing that won the Saltline brand book review.',
    sourceMemorySlug: 'um-w6-customer-brain-emerging',
    crystallizedAt: dateInWeek(7, 1, 10, 0),
    significanceScore: 0.88,
    confidence: 0.91,
    tags: ['principle', 'cortex-max', 'beta', 'delta', 'gamma', 'maya', 'sara'],
  },
  {
    slug: 'snap-method-shared-brief-format',
    type: 'Method',
    name: 'Shared brand brief format across retainers',
    core: 'Every retainer brief uses the same three-section structure, the same competitor-paste test, and the same "show me the customer quote that earned this line" check at the top. Format is shared; voice is per-retainer.',
    oneLiner: 'Same brief shape, every retainer. Voice is the variable.',
    story:
      'We had been inventing the brief format on every kickoff for four retainers running. Maya proposed the shared format the morning we were about to invent it for the fifth time. The format saves us four hours per kickoff and removes a class of inconsistency that was starting to show in cross-retainer reviews.',
    moment:
      'Week 7 Monday afternoon, when Maya walked into the studio with a one-page template and a list of the duplicate work we were about to repeat for the fifth time.',
    method:
      'Three sections: (1) the customer quote that earned this brief, (2) the positioning we are testing, (3) the kill criterion. Competitor-paste test at the bottom. Two-week revisit cadence baked into every brief.',
    steps:
      '1) Maya opens the shared template per kickoff. 2) Customer quote pulled from the three-call audio. 3) Positioning paragraph drafted with Sara. 4) Kill criterion named explicitly. 5) Competitor-paste test run by Casey or Sara.',
    filter:
      'Apply on every brand brief across every retainer. Allowed exceptions: emergency hotfix briefs that are explicitly out-of-scope.',
    challenge:
      'Risk that the format becomes a checklist nobody thinks behind. Mitigated by the kill-criterion section, which forces an explicit conviction.',
    breakTest:
      'If two retainer briefs produced from the format look interchangeable, the format is templating the voice. So far they do not.',
    risks:
      'Risk: kickoff slowdown if the customer quote is not ready by brief-writing day. Mitigated by enforcing the three-call rule before the brief opens.',
    proof:
      'Used on the Plinthworks rebrand kickoff (Week 9), Helmsmark controller page (Week 10), and Almanac course-page intensive (Week 11). All three briefs shipped without needing a re-brief.',
    sourceMemorySlug: 'um-w7-maya-shared-brief-format',
    crystallizedAt: dateInWeek(7, 5, 10, 0),
    significanceScore: 0.84,
    confidence: 0.93,
    tags: ['maya', 'brand', 'principle', 'ops'],
  },
  {
    slug: 'snap-frame-paid-without-validation-burns',
    type: 'Frame',
    name: 'Unvalidated paid is the most expensive way to find out the copy is wrong',
    core: 'Running paid spend against a hero line that has not earned a single organic save is debt with interest. The Saltline incident — 11 days, $4.2k, the right move was a rewrite — is the case study, not the principle.',
    oneLiner: 'Unvalidated paid burns rent on a story we did not own.',
    story:
      'The principle existed in the founding-week brand book draft. The incident gave it teeth. Leo had been bidding for eleven days against a Saltline hero line that had not earned a single organic save. He caught it himself and turned the campaign off. The lesson was not that he should not have run it — it was that the studio needed the rule to be written, not just believed.',
    moment:
      "Week 7 Monday morning, when Leo's #saltline-growth channel message named the burn without defending it. The frame crystallized from his honesty about it.",
    method:
      'Treat any paid campaign without a 14-day organic validation window as debt. Account for the burn rate as an expected cost of unvalidated paid, not as a surprise.',
    filter:
      'Apply when a campaign brief proposes paid spend without an organic validation log attached.',
    challenge:
      'Sometimes the bid test is genuinely faster than the organic test. Leo is the one who decides when. The frame defaults to organic-first; Leo can override with explicit justification.',
    breakTest:
      'If a paid campaign without validation produces a positive CAC test result, the frame is wrong. The Saltline incident says it does not.',
    risks:
      'Risk: over-rigid application slowing legitimate test cycles. Mitigated by treating the frame as a default, not a law.',
    proof:
      'Plinthworks Q1 paid experiment ran the 14-day organic window in Weeks 9-10 and produced the cleanest CAC test in the studio so far.',
    sourceMemorySlug: 'um-w7-saltline-paid-burn-saltline-incident',
    crystallizedAt: dateInWeek(7, 4, 10, 0),
    significanceScore: 0.9,
    confidence: 0.93,
    tags: ['principle', 'leo', 'growth', 'beta', 'anti-pattern'],
  },
  {
    slug: 'snap-principle-48-hour-send-window-healthcare',
    type: 'Principle',
    name: 'No marketing sends within 48 hours of any patient visit',
    core: 'Healthtech retainers operate on a 48-hour send-window rule. No marketing email, no lifecycle touchpoint, no broadcast lands in a patient inbox within 48 hours of a visit. The rule is non-negotiable for Cloverkin and any future clinical retainer.',
    oneLiner: '48 hours after a visit, no marketing send. Period.',
    story:
      'Marisol said it in lifecycle planning and the principle wrote itself. The bar for healthtech is that every marketing send has to survive being read by a scared patient on a hard day. The 48-hour window is the operational version of that bar.',
    moment:
      "Week 7 Wednesday afternoon, in the Cloverkin lifecycle planning session, when Marisol named the constraint as 'I would rather lose the visit than send a marketing email a patient finds in their inbox the day after a hard appointment.'",
    method:
      'Send-window check is the first step in every Cloverkin lifecycle deploy. Sara owns the SOP. Patient visit data feeds the send-eligibility flag. Marketing platform respects the 48-hour suppression window.',
    steps:
      '1) Lifecycle event triggers send candidate. 2) Patient visit history is checked. 3) If a visit occurred within 48 hours, send is suppressed and logged. 4) Suppression is reviewed monthly to catch false positives.',
    filter:
      'Apply on every Cloverkin lifecycle send. Generalize to any future healthtech retainer at kickoff.',
    challenge:
      'Risk that legitimate care-coordination sends get suppressed alongside marketing. Mitigated by tagging clinical sends separately and exempting them from the marketing-window rule.',
    breakTest:
      'If patients complain about a marketing send post-visit, the rule was broken. Zero complaints since the SOP went live.',
    risks:
      'Risk: suppressed sends reduce campaign volume. Acceptable trade-off — the brand promise is the constraint.',
    proof:
      'SOP has been live since Week 7. Zero post-visit marketing complaints. Marisol cited it specifically in the Week 12 patient story note as evidence the retainer is operating as designed.',
    sourceMemorySlug: 'um-w7-marisol-48-hour-send-window',
    crystallizedAt: dateInWeek(7, 5, 11, 30),
    significanceScore: 0.9,
    confidence: 0.95,
    tags: ['principle', 'delta', 'sara', 'ops', 'customer-quote'],
  },
  {
    slug: 'snap-principle-staged-photography-no',
    type: 'Principle',
    name: 'Real kitchens, real morning light',
    core: 'Saltline photography direction: real kitchens, real morning light, no staged linen. The brand register is lived-in, not editorial. Casey owns enforcement.',
    oneLiner: 'Staged linen is not Saltline. Shoot real kitchens.',
    story:
      'June killed a beautiful editorial photo in fifteen minutes because the linen was staged and the kitchen was not. Casey learned more from that review than any moodboard. The principle is now the photography direction for the entire Saltline retainer.',
    moment:
      "Week 7 Wednesday afternoon, in the Saltline photo direction review, when June's correction collapsed a forty-minute moodboard conversation into a single sentence.",
    method:
      'Every Saltline photo brief specifies real kitchens, real morning light, no staged linen. Casey reviews every shoot day plan. Editorial-style polish is explicitly out of bounds; the register is lived-in.',
    filter:
      'Apply on every Saltline photography deliverable. Generalize to any DTC retainer where the brand voice is sensory and lived-in.',
    challenge:
      "Risk that the principle reads as 'no production value'. The right read is 'production value invisible'.",
    breakTest:
      'If a Saltline photo looks editorial, June will flag it before we do. So far she has not had to.',
    risks:
      'Risk: longer shoot days when conditions (light, kitchen availability) do not cooperate. Acceptable — the principle protects the brand.',
    proof:
      "Every Saltline shoot since Week 7 has run real-kitchen, real-morning-light. Eliza's brand book review in the same week explicitly called the photography direction 'the thing the brand needed to lock'.",
    sourceMemorySlug: 'um-w7-june-killed-staged-linen',
    crystallizedAt: dateInWeek(7, 6, 14, 0),
    significanceScore: 0.82,
    confidence: 0.92,
    tags: ['principle', 'beta', 'casey', 'design', 'customer-quote'],
  },
  {
    slug: 'snap-belief-customer-quote-on-slide-2',
    type: 'Belief',
    name: 'Slide 2 is always a verbatim customer quote',
    core: "Slide 1 is the client logo. Slide 2 is one of their customers saying, in their own words, the thing the retainer is going to solve. No paraphrase, no synthesis — the actual quote with the speaker's role and the date of the call.",
    oneLiner: 'Slide 1 is the logo. Slide 2 is the customer. No exceptions.',
    story:
      'The move started informally in the Plinthworks Week 3 workshop, when Maya pulled a customer quote into slide 2 to redirect the room. It worked so well that the founder repeated it for Saltline, Helmsmark, and Cloverkin. By Week 7 it was in five out of five kickoffs.',
    moment:
      "Week 7 Wednesday afternoon, when Eliza said 'our customer is the woman who is annoyed that olive oil is now a personality' — and the slide-2 pattern became the slide-2 belief.",
    method:
      "Slide 2 of every kickoff deck is a verbatim customer quote, with the speaker's role and date. Sara sources the quote during three-call prep. Casey designs the slide so the quote reads, not the design.",
    steps:
      '1) Three-call prep identifies the slide-2 quote. 2) Quote captured with role + date. 3) Casey designs the slide. 4) Slide 2 leads the kickoff conversation.',
    filter: 'Apply on every retainer kickoff, every quarterly review, every rebrand kickoff.',
    challenge:
      'Risk that the quote is the only thing the client remembers. Mitigated by the slide being the lead, not the takeaway.',
    breakTest:
      'If a kickoff without a slide-2 quote produces the same alignment as one with, the belief is wrong. So far every quote-led kickoff has shortened the alignment time by half.',
    risks:
      'Risk: the quote is misattributed or out of context. Mitigated by founder-pass on every slide-2 before the meeting.',
    proof:
      'Codified by Atlas in Week 9 as object-verbatim-quote-slide-two after the move appeared in five out of five kickoffs.',
    sourceMemorySlug: 'um-w7-eliza-olive-oil-personality',
    crystallizedAt: dateInWeek(7, 6, 16, 0),
    significanceScore: 0.88,
    confidence: 0.94,
    tags: ['principle', 'beta', 'maya', 'sara', 'casey', 'customer-quote'],
  },
  {
    slug: 'snap-principle-bloomberg-headline-test',
    type: 'Principle',
    name: 'The Bloomberg headline test',
    core: 'A Helmsmark headline survives the Bloomberg headline cycle, or it does not ship. If the line sounds like a Series A press release, it is not ours. The test is the kill criterion for every hero variant on the controller-facing site.',
    oneLiner: 'Survives a Bloomberg cycle or it does not ship.',
    story:
      'Wendell named the test in the hero variants review. The Helmsmark site is sold to controllers and CFOs; the language has to survive being read in a board prep meeting. The Bloomberg headline cycle is the cleanest stress-test for that register.',
    moment:
      'Week 7 Thursday afternoon, in the Helmsmark hero variants review, when Wendell killed three variants in one minute and named the test in the second.',
    method:
      'Every Helmsmark hero, every controller-page headline, every CFO-facing line gets read against a Bloomberg headline cycle by Sara before it ships. If the line would not survive being quoted in a Bloomberg article, it does not ship.',
    filter:
      'Apply on every Helmsmark copy deliverable. Generalize to any fintech or B2B retainer with a CFO or controller buyer.',
    challenge:
      "Risk that the test reads as 'no personality'. The right read is 'no Series A pretense'.",
    breakTest:
      'If Wendell signs off on a line that fails the test in retrospect, the test was right and we missed.',
    risks:
      'Risk: over-applying the test to clients whose buyer is not Bloomberg-shaped. Mitigated by retainer-level voice anchor docs that specify which tests apply.',
    proof:
      "Every Helmsmark hero variant since Week 7 has run the test. The line that replaced 'AI-powered' in Week 8 — citing the variance number — survived the test and survived Wendell.",
    sourceMemorySlug: 'um-w7-wendell-bloomberg-headline',
    crystallizedAt: dateInWeek(7, 6, 9, 30),
    significanceScore: 0.86,
    confidence: 0.93,
    tags: ['principle', 'gamma', 'sara', 'copy', 'customer-quote'],
  },

  // ─── Weeks 8-10 — Cortex consolidating (12) ───────────────────────────
  {
    slug: 'snap-decision-company-cortex-on',
    type: 'Decision',
    name: 'Company Cortex daily dream enabled',
    core: 'company_cortex_settings.enabled = true, schedule = daily 02:00 UTC. The user brain catches principles; the company cortex catches patterns between clients that only appear when Plinthworks, Saltline, Helmsmark, and Cloverkin are on the same dashboard.',
    oneLiner: 'Daily dream on — the brain looks across clients now.',
    story:
      'I had been seeing patterns across retainers that I could not have surfaced without putting them in the same data structure. The user brain was holding principles fine. The cross-client signals — Saltline scope creep, async approvals, paid-before-validation — needed the cortex to see them together.',
    moment:
      'Week 8 Sunday morning, after eight weeks of accumulating cross-client signals had built enough density for the daily dream to produce real synthesis instead of noise.',
    method:
      'Company cortex daily dream runs at 02:00 UTC. Produces signals daily, surfaces patterns weekly, crystallizes cortex objects when signal density and confidence cross threshold.',
    filter:
      'Activated permanently. Re-evaluate only if dream output is consistently low-signal or if it produces a false-positive class that wastes partner time.',
    challenge:
      'Risk that the dream surfaces a pattern that is not yet a pattern. Mitigated by confidence scoring and by partner pass on emerging cortex objects.',
    breakTest:
      'If the dream surfaces five high-confidence patterns and only one survives partner review, the threshold is too low. So far the survival rate is high.',
    risks:
      'Risk: partner time spent reviewing low-value dreams. Mitigated by digest format that surfaces only objects above significance threshold.',
    proof:
      'First dream run on Week 8 Sunday night produced three signals: Saltline scope-creep (real), async approvals burn trust (real), paid-before-validation has burned cash twice (real). All three later crystallized into cortex objects.',
    sourceMemorySlug: 'um-w8-company-cortex-enabled',
    crystallizedAt: dateInWeek(9, 2, 10, 0),
    significanceScore: 0.94,
    confidence: 0.93,
    tags: ['decision', 'cortex-max', 'principle'],
  },
  {
    slug: 'snap-belief-brand-changes-spend',
    type: 'Belief',
    name: 'Brand work that does not change what we spend money on is not brand work',
    core: 'If a positioning doc does not end up changing which channels we buy, which words a paid ad runs, or which customers we say no to, it is a Notion page. Every Foundry retainer either redirects spend within 60 days of repositioning or the position was wrong.',
    oneLiner: 'If the spend sheet does not move, the deck did not work.',
    story:
      'I have been saying it out loud since founding. The Week 8 dream produced enough evidence to crystallize it: Plinthworks workshop drove Leo to kill two underperforming Google Ads themes inside ten days. Saltline reposition changed which product launches Casey shot first. The belief has earned its place in the brand book as non-negotiable.',
    moment:
      'Week 8 Thursday morning, when the dream digest counted four signals across four weeks and the partner team agreed it was no longer just a saying.',
    method:
      'Every repositioning engagement explicitly identifies the spend changes it implies. The 60-day check is part of the retainer cadence. If the spend has not moved, the position is revisited.',
    steps:
      '1) Positioning brief names the spend implications. 2) Leo or partner team logs the spend-change checklist. 3) 60-day review confirms or revisits.',
    filter:
      'Apply on every retainer engagement that includes positioning work. Generalize to any brand-strategy deliverable.',
    challenge:
      'Risk that the spend-change check forces premature optimization. Mitigated by treating 60 days as the floor, not the deadline.',
    breakTest:
      'If a retainer has a strong positioning win without a spend change at 60 days, the belief is wrong. So far every successful repositioning has moved the spend.',
    risks:
      'Risk: spend-change framing reduces brand work to performance work. Mitigated by treating spend as the proof, not the goal.',
    proof:
      'Plinthworks (Leo killed two Google Ads themes), Saltline (Casey re-prioritized launch shoots), Helmsmark (the AI-powered hero killed by Wendell). All three retainers moved spend within 60 days of repositioning.',
    sourceMemorySlug: 'um-w8-brand-changes-spend-belief',
    crystallizedAt: dateInWeek(9, 1, 9, 30),
    significanceScore: 0.95,
    confidence: 0.94,
    tags: ['principle', 'brand', 'growth', 'positioning'],
  },
  {
    slug: 'snap-standard-validated-organic-window',
    type: 'Standard',
    name: '14-day organic validation window before any paid spend',
    core: 'No retainer ships paid creative until the message is pressure-tested in organic for 14 days — newsletter, founder posts, owned channels. Leo will not open a paid account until the validation window is logged.',
    oneLiner: '14 days organic. Then paid.',
    story:
      'The Saltline incident in Week 7 was the case study. The Week 8 dream made the rule a partner-team decision. The standard was drafted by Leo, signed off in a partner sync, and is now the first item on every paid kickoff.',
    moment:
      'Week 8 Friday afternoon, in the partner sync, when Leo presented the rule and nobody argued.',
    method:
      'Every paid campaign requires a 14-day organic window with the exact hero line running on owned channels first. Leo logs the window before opening the paid account. The validation log is part of the campaign artifact.',
    steps:
      '1) Hero line ships on newsletter, founder posts, owned channels. 2) Engagement is logged daily. 3) Day 14 review by Leo + Sara. 4) Decision to launch paid or rewrite. 5) Paid account opens only if validation log passes.',
    filter:
      'Apply on every paid campaign across every retainer. Allowed exception: a client-defined emergency with founder approval.',
    challenge:
      'Risk that the window slows time-to-market for genuinely well-tested ideas. Mitigated by treating prior organic data (existing newsletter performance) as eligible validation.',
    breakTest:
      'If a paid campaign without the window produces a CAC test result better than one with, the standard is wrong. The Saltline incident says it does not.',
    risks:
      'Risk: 14 days is sometimes too long for time-sensitive launches. Mitigated by founder override with explicit risk acceptance.',
    proof:
      'Plinthworks Q1 paid experiment ran the 14-day organic window in Weeks 9-10 and produced the cleanest CAC test in the studio so far. Zero paid budget burned on unvalidated hero lines since Week 8.',
    sourceMemorySlug: 'um-w8-validated-organic-window-locked',
    crystallizedAt: dateInWeek(9, 2, 11, 0),
    significanceScore: 0.9,
    confidence: 0.94,
    tags: ['decision', 'principle', 'leo', 'growth', 'beta', 'acme'],
  },
  {
    slug: 'snap-anti-pattern-bidding-out-of-bad-copy',
    type: 'AntiPattern',
    name: 'Bidding our way out of bad copy',
    core: 'When a paid campaign underperforms, the bid is almost never the answer. Twice in Weeks 7-8 we threw budget at hero lines that organic had already told us were soft. Both times the right move was a rewrite, not a re-bid.',
    oneLiner: 'It is always a creative problem dressed as a media problem.',
    story:
      'Leo named the anti-pattern after counting the cost of two episodes — Saltline Week 7 ($4.2k) and a near-miss on Plinthworks in Week 8 (caught himself before opening the account). The pattern is clear: when copy is soft, more bids do not save it; they amplify the softness.',
    moment:
      'Week 8 Thursday morning, when the dream surfaced the pattern as a structural signal across two clients in two weeks.',
    method:
      'Default response to underperforming paid: rewrite the hero before re-bidding. Bid tests are explicitly justified in writing if Leo wants to try one.',
    filter: 'Apply on every underperforming paid campaign before any media-strategy intervention.',
    challenge:
      'Currently challenged: Leo is drafting a counter-argument that the bid test is sometimes the cheaper way to find out the copy is wrong. The partner team is debating it.',
    breakTest:
      'If three bid-test interventions in a row produce CAC improvements without rewrites, the anti-pattern is over-stated. Leo is tracking.',
    risks:
      "Risk: blanket refusal of bid tests when a bid test is genuinely the right call. Mitigated by Leo's override authority with explicit justification.",
    proof:
      'Saltline Week 7 ($4.2k burn, the right move was a rewrite). Plinthworks Week 8 (Leo caught himself before opening the account, rewrote the hero, paid landed clean in Week 10).',
    sourceMemorySlug: 'um-w8-bidding-out-of-bad-copy-realization',
    crystallizedAt: dateInWeek(9, 4, 11, 0),
    significanceScore: 0.9,
    confidence: 0.92,
    tags: ['anti-pattern', 'leo', 'growth', 'principle'],
  },
  {
    slug: 'snap-anti-pattern-async-approvals',
    type: 'AntiPattern',
    name: 'Async approvals burn trust',
    core: 'Sending a deck for async approval through a Slack thread or an email — without a 15-minute walkthrough call first — produces the same three clarifying questions every time, delays the decision by 48-72 hours, and reads to the client as if we are not on top of the work.',
    oneLiner: 'Walkthrough first. Async send second. Always.',
    story:
      'The first real anti-pattern Atlas crystallized. Four async approval cycles in Weeks 7-8 — Saltline brand palette (3 rounds), Plinthworks site copy (4 rounds), Cloverkin onboarding (3 rounds), Helmsmark positioning doc (5 rounds, the worst). Same questions, every time.',
    moment:
      'Week 9 Tuesday morning, when the dream digest counted the cycles side by side and the pattern was undeniable.',
    method:
      'Maya rewrote the brand approvals SOP same week: no deck goes async for approval without a 15-minute walkthrough call first. Walkthrough is the first step; async send is the second.',
    steps:
      '1) Deliverable ready for client. 2) Schedule 15-minute walkthrough. 3) Walk through deck live. 4) Send async with notes only after live decision context exists.',
    filter:
      'Apply on every client-facing approval — brand books, positioning docs, copy decks, lifecycle sequences, brand palettes.',
    challenge:
      'Some clients prefer async-only. The SOP holds — we propose the walkthrough; we do not skip it.',
    breakTest:
      'If a deliverable approved purely async takes fewer than 1.4 rounds, the SOP is over-rigid. So far the post-SOP average is 1.4 rounds vs 3.8 pre-SOP.',
    risks:
      'Risk: scheduling 15-minute walkthroughs across six retainers eats partner time. Mitigated by Riley owning the scheduling.',
    proof:
      'Approval cycles since Week 9 average 1.4 rounds, down from 3.8 in Weeks 7-8. Helmsmark positioning doc v2 closed in one round.',
    sourceMemorySlug: 'um-w9-async-approvals-anti-pattern',
    crystallizedAt: dateInWeek(9, 2, 14, 0),
    significanceScore: 0.94,
    confidence: 0.94,
    tags: ['anti-pattern', 'ops', 'cortex-max', 'maya'],
  },
  {
    slug: 'snap-protocol-brand-approvals-sop',
    type: 'Protocol',
    name: 'Brand approvals SOP v2 — walkthrough first',
    core: 'Every client-facing brand deliverable goes through a 15-minute walkthrough call before any async send. Async follows the walkthrough, never precedes it. Maya owns the SOP.',
    oneLiner: 'Walkthrough first. Async second. Maya owns it.',
    story:
      'Once the async-approvals anti-pattern crystallized, the SOP wrote itself. The hard part was getting partner-team agreement that the walkthrough was non-negotiable, not just preferred. Maya led the rewrite. The partner team signed off in the Week 9 sync.',
    moment:
      'Week 9 Wednesday morning, when Maya brought the rewritten SOP to the partner sync and walked through the round-count data.',
    method:
      'Walkthrough is scheduled by Riley as soon as the deliverable is ready. Walkthrough length: 15 minutes default, 30 minutes max. Async send happens within 4 hours of walkthrough end. Round-count is logged per cycle.',
    steps:
      '1) Lead operator marks deliverable ready. 2) Riley schedules 15-minute walkthrough within 48 hours. 3) Walkthrough runs live. 4) Async send within 4 hours. 5) Round-count logged.',
    filter:
      'Apply on every brand deliverable across every retainer. Apply to copy decks, brand palettes, lifecycle sequences, photo direction decks, positioning docs.',
    challenge:
      'Clients who insist on async-only get a recommendation and a respectful escalation to the founder. We do not break the SOP.',
    breakTest:
      "If a retainer's average round-count stays above 2.5 with the SOP in place, the SOP is not the constraint and something else is wrong.",
    risks:
      'Risk: walkthrough scheduling delays the cycle by 24-48 hours up front. Acceptable trade-off — the cycle is shorter overall.',
    proof:
      'Live across all six retainers since Week 9. Round-count average 1.4. Helmsmark positioning doc closed in one round; Cloverkin onboarding sequence in 1.5.',
    sourceMemorySlug: 'um-w9-maya-brand-approvals-sop',
    crystallizedAt: dateInWeek(9, 4, 10, 30),
    significanceScore: 0.9,
    confidence: 0.94,
    tags: ['decision', 'maya', 'ops', 'principle', 'anti-pattern', 'riley'],
  },
  {
    slug: 'snap-principle-three-navigator-calls',
    type: 'Principle',
    name: 'Three navigator calls before any healthtech copy',
    core: 'For Cloverkin and any healthtech retainer: Sara sits on three patient-navigator calls before writing a single line of onboarding or lifecycle copy. The pattern is the healthtech instance of the three-customer-call rule, sharpened by a clinician.',
    oneLiner: 'Three navigator calls. Then the cursor moves.',
    story:
      'Marisol made Sara sit through three navigator calls before any onboarding copy. The version we shipped is unrecognizable from draft one. The principle generalizes — for any clinical retainer, the listen-before-language threshold is three.',
    moment:
      'Week 9 Friday afternoon, after the third call wrapped and Sara walked back with three pages of verbatim quotes and a completely different brief.',
    method:
      'Every healthtech retainer kickoff includes three patient-navigator (or patient-facing-staff) calls before copy work begins. Sara owns attendance. Voice anchor doc receives quotes from each call.',
    steps:
      '1) Retainer kickoff schedules three navigator calls in week one. 2) Sara attends all three. 3) Verbatim quotes captured into the voice anchor doc. 4) Brief writing begins after the third call.',
    filter:
      'Apply on every healthtech or clinical retainer. Generalize to any retainer where the buyer-side conversation has a specialist intermediary.',
    challenge:
      "Risk that 'three navigator calls' becomes a checkbox. Mitigated by founder-pass on the voice anchor doc before the brief opens.",
    breakTest:
      'If a healthtech retainer shipped without three calls and the copy held, the rule is wrong. Cloverkin says it is right.',
    risks:
      'Risk: scheduling three calls in week one slows kickoff. Acceptable trade-off — the alternative is a re-brief in week three.',
    proof:
      'Cloverkin onboarding shipped at draft 4 after three calls and has not been re-opened. Compare to Saltline where draft 1 was inadequate because we had not done the listening yet.',
    sourceMemorySlug: 'um-w9-marisol-sat-us-through-3-calls',
    crystallizedAt: dateInWeek(10, 0, 11, 30),
    significanceScore: 0.9,
    confidence: 0.94,
    tags: ['principle', 'delta', 'sara', 'maya', 'positioning'],
  },
  {
    slug: 'snap-anti-pattern-we-love-it',
    type: 'AntiPattern',
    name: 'Saying "we love it" in writing without 24 hours of read-back time',
    core: 'Replying to a client deliverable with enthusiasm in writing inside the first hour locks us into a position we have not actually pressure-tested. 24 hours of read-back time, then a written response. If something feels off, it almost always is.',
    oneLiner: '24 hours of read-back. Then the reply.',
    story:
      'Riley enthusiastically green-lit a Saltline deck inside 30 minutes; Sara flagged three drifted lines the next morning, but the client had already started production. Casey had a near-identical episode on a Cloverkin photo direction the same week. Two near-misses in one week is a pattern.',
    moment:
      'Week 10 Friday morning, when the Saltline and Cloverkin near-misses landed back-to-back and the pattern surfaced in the dream digest the same night.',
    method:
      'No written enthusiastic response to a client deliverable inside the first 24 hours. Acknowledge receipt without commitment. Pressure-test against the voice anchor doc. Respond after 24 hours with a position.',
    steps:
      "1) Receive client deliverable. 2) Acknowledge receipt with a deadline ('reading carefully, will respond by [date]'). 3) Read against the voice anchor doc within 24 hours. 4) Respond with a position.",
    filter:
      'Apply on every client deliverable. Generalize to internal deliverables from junior team members under pressure.',
    challenge:
      'Risk that the 24-hour rule reads as slow or non-responsive. Mitigated by explicit acknowledgement of receipt with a stated response window.',
    breakTest:
      "If a 'we love it' inside the hour holds up after 24 hours of read-back three times in a row, the rule is over-strict. So far it does not.",
    risks:
      'Risk: clients expect rapid responses. Mitigated by the acknowledgement protocol that sets the response window expectation.',
    proof:
      'Live across all six retainers since Week 10. Zero post-acknowledgement reversals since.',
    sourceMemorySlug: 'um-w10-we-love-it-anti-pattern',
    crystallizedAt: dateInWeek(10, 4, 9, 30),
    significanceScore: 0.84,
    confidence: 0.93,
    tags: ['anti-pattern', 'riley', 'casey', 'principle', 'ops'],
  },
  {
    slug: 'snap-perspective-six-clients-cap',
    type: 'Perspective',
    name: 'Six retainers is the ceiling, defended weekly',
    core: "Foundry's economics work because we say no to most inbound. Past six concurrent retainers, founder-time-per-client falls below the threshold that makes our work distinguishable from a normal growth shop. Six is a hard cap, not an aspiration.",
    oneLiner: 'Six is the cap, defended in real time.',
    story:
      "The Week 1 principle became operational reality once the studio hit six retainers in Week 10. The founder-hour math (9 to 5.5 per retainer between Week 7 and Week 10) made the perspective measurable. Owen's first P&L pass in Week 12 confirmed it.",
    moment:
      'Week 10 Tuesday afternoon, when I caught myself doing the math and realized the cap was a present-tense constraint, not a future-tense aspiration.',
    method:
      'Active retainer count is a partner-team metric reviewed weekly. Any inbound conversation that would push the count past six is declined or held in pre-qualified state. Sales pipeline is pruned proactively to maintain the cap.',
    filter:
      'Apply on every inbound prospect, partner referral, and founder-personal lead. Re-evaluate the cap annually only.',
    challenge:
      "Pressure to make exceptions for 'obvious-fit' prospects is constant. The discipline is to recognize that obvious-fit pressure is the strongest form of cap-erosion.",
    breakTest:
      'If we take a seventh and founder hours per retainer hold above 6, the cap may be soft. Currently the founder-hour math says it is not.',
    risks:
      'Risk: turning away prospects who later sign with competitors. Acceptable — they were not Foundry-shaped, or they were and we will see them again.',
    proof:
      "Walked away from a seventh prospect in Week 12. Founder hours per retainer recovered toward 7 the following week. Owen's P&L pass confirmed the cap is economically correct.",
    sourceMemorySlug: 'um-w10-six-clients-cap-realization',
    crystallizedAt: dateInWeek(10, 5, 11, 0),
    significanceScore: 0.92,
    confidence: 0.94,
    tags: ['principle', 'retainer', 'pricing', 'kill', 'owen'],
  },
  {
    slug: 'snap-decision-riley-hire',
    type: 'Decision',
    name: 'Riley hired as account manager',
    core: 'Six retainers, two onboarding in the same week, partner-team calendar as the bottleneck. Riley joins to handle day-to-day client relationship across all retainers — first scope-creep detector, calendar discipline owner, the buffer between late-night founder messages and the rest of the team.',
    oneLiner: 'Riley in — the calendar gets a spine.',
    story:
      "The trigger was simple: the studio hit six retainers and two of them onboarded in the same week. The partner team was the calendar bottleneck before the work was. Riley's first-day audit of every client channel surfaced two scope-creep emails Jules and I had both missed.",
    moment:
      'Week 10 Thursday afternoon, when the Throughput and Almanac kickoffs landed two days apart and the calendar visibly broke.',
    method:
      'Riley owns day-to-day client relationship across all six retainers. First scope-creep detector. Calendar owner. Friday status note QA pass before founder review. Two-week reader phase before owning a deliverable.',
    filter: 'Apply to any net-new client-facing operations work across retainers.',
    challenge:
      "Risk that Riley's enthusiasm leads to premature 'we love it' responses. The Week 10 Saltline near-miss surfaced this immediately; the 24-hour rule now applies.",
    breakTest:
      "If Riley's hire does not reduce founder hours per retainer within two weeks, the hire was misdiagnosed. Founder hours dropped from 9 to 5.5 in the four weeks following her hire.",
    risks:
      "Risk: account management drifts into being a meeting layer instead of a value layer. Mitigated by Jules' supervision and the Friday status QA discipline.",
    proof:
      'First-day scope-creep catch on two retainers Jules and I had missed. Founder hours per retainer compressed to 5.5 within four weeks of her hire.',
    sourceMemorySlug: 'um-w10-riley-hire',
    crystallizedAt: dateInWeek(10, 6, 14, 0),
    significanceScore: 0.88,
    confidence: 0.94,
    tags: ['hiring', 'riley', 'decision', 'ops', 'jules'],
  },
  {
    slug: 'snap-method-three-customer-calls-codified',
    type: 'Method',
    name: 'Three-customer-call rule codified as studio standard',
    core: 'The three-customer-call rule moves from informal principle to written studio standard. Every retainer where we ignored it needed a re-brief inside two weeks. Every retainer where we honored it shipped a brand book that has not been re-opened.',
    oneLiner: 'Three calls. Written down. Maya enforces.',
    story:
      'The rule has been operating informally since Week 1 and explicitly since Week 9 (in healthtech). Week 10 made it studio-wide and written. The triggering data was the gap between retainers that honored the rule and retainers that did not.',
    moment:
      'Week 10 Friday afternoon, when the contrast between Cloverkin (three calls, no re-brief) and Saltline week 2 (zero calls, re-brief in fourteen days) was too obvious to leave unwritten.',
    method:
      "Every retainer kickoff schedules three customer calls in week one. Maya or Sara attends each. Voice anchor doc receives five verbatim quotes by end of week one. Brief writing begins in week two. Maya's test: 'show me the customer quote that earned this line.'",
    steps:
      '1) Retainer kickoff includes call-scheduling block. 2) Three calls land in week one. 3) Voice anchor doc receives quotes. 4) Brief writing begins in week two. 5) Maya verifies quote-line traceability before brief ships.',
    filter:
      'Apply on every retainer. Apply on every new brief inside an existing retainer that introduces a new audience or buyer.',
    challenge:
      'Risk that the rule slows kickoff perception. Mitigated by surfacing the calls as the first billable deliverable.',
    breakTest:
      'If a retainer ships a brief without three calls and the brief holds for 30 days without re-brief, the rule is over-strict. So far every shortcut has cost us a re-brief.',
    risks:
      'Risk: under-scheduled customer calls during onboarding rush. Mitigated by Riley owning the scheduling discipline.',
    proof:
      'Casey enforced it on the Plinthworks rebrand kickoff in Week 11; the brand book that came out has not been re-opened. Plinthworks, Cloverkin, Almanac all honor the rule. Saltline week 2 (skipped) and Helmsmark week 7 (skipped) both required re-briefs.',
    sourceMemorySlug: 'um-w10-three-customer-calls-standardized',
    crystallizedAt: dateInWeek(11, 1, 10, 30),
    significanceScore: 0.92,
    confidence: 0.94,
    tags: ['decision', 'principle', 'maya', 'sara', 'casey', 'positioning'],
  },
  {
    slug: 'snap-principle-no-template-outbound',
    type: 'Principle',
    name: 'No template outbound — three a week, not three hundred',
    core: "Throughput-shape outbound: if the email could have been sent to ten other COOs, do not send it. Three a week, not three hundred. Volume-allergic, signal-only outbound. Matches the studio's own no-template stance.",
    oneLiner: 'Three a week. Each one specific. Or do not send.',
    story:
      'Dominic named the principle in the Throughput outbound program kickoff. It matches the Foundry no-templates principle from Week 4. The principle is the right shape for services-firm outbound and likely for B2B outbound generally.',
    moment:
      'Week 10 Friday morning, in the Throughput outbound program kickoff, when Dominic shut down the volume conversation in one sentence.',
    method:
      'Outbound campaigns for services-firm-shape retainers are scoped at three sends per week, each personally researched. Templated outbound is explicitly out of scope. Riley does not send anything that could have been sent to ten other COOs.',
    steps:
      '1) Identify three target buyers per week. 2) Research each individually. 3) Draft three distinct emails. 4) Riley reviews and sends. 5) Track responses individually.',
    filter:
      'Apply on every services-firm retainer. Generalize to any B2B retainer where the buyer is sophisticated and templated outreach is the disqualifier.',
    challenge:
      'Yuki at Throughput pushes for volume. The principle holds against her — and Dominic supports it.',
    breakTest:
      'If three-per-week outbound produces zero responses for four weeks, the principle is wrong. Currently it produces 1-2 responses per week, which is what the retainer was sold on.',
    risks:
      'Risk: volume pressure from biz-dev stakeholders inside the client. Mitigated by founder-level alignment with the actual buyer (managing partner).',
    proof:
      "Throughput outbound program has produced two qualified meetings per week since Week 11. Yuki's volume-blitz proposal in the kickoff was correctly shut down.",
    sourceMemorySlug: 'um-w10-dominic-no-template-outbound',
    crystallizedAt: dateInWeek(10, 6, 14, 0),
    significanceScore: 0.84,
    confidence: 0.93,
    tags: ['epsilon', 'principle', 'sales', 'kill', 'riley'],
  },

  // ─── Weeks 11-13 — Operating system locks (11) ───────────────────────
  {
    slug: 'snap-decision-plinthworks-rebrand-q3-q4',
    type: 'Decision',
    name: 'Plinthworks rebrand — Q3 ship, Q4 sunset',
    core: 'Plinthworks ships the new logo, type system, and marketing site in Q3. The legacy mark stays alive on docs, in-app, and existing customer-facing assets through Q4, then sunsets fully January 1. No cohabitation past that date.',
    oneLiner: 'New mark Q3. Legacy off January 1. No cohabitation.',
    story:
      "Three weeks of strategy work (Maya + Nico) and two weeks of mark exploration (Casey) preceded the decision. The Q3/Q4 split was the founder's call — driven by the docs site being on a separate deploy cadence and Devon's read on the migration risk if we tried a single cutover.",
    moment:
      "Week 11 Thursday afternoon, in the partner sync between the founder, Nico, Plinthworks' founder, and Casey.",
    method:
      'Q3 ships the new mark, type system, and marketing site behind a flag with rollback. Q4 runs the legacy mark on docs, in-app, and existing customer-facing assets while migration completes. January 1 is the hard sunset date.',
    steps:
      '1) Q3 mark exploration completes (Casey). 2) Q3 marketing site launch behind flag (Devon). 3) Q3 founder approval. 4) Q4 docs migration. 5) Q4 in-app migration. 6) January 1 legacy sunset.',
    filter:
      'Decision is specific to Plinthworks. Generalize the staged-cohabitation pattern to other rebrand engagements only if the client has separate deploy cadences for product surfaces.',
    challenge:
      'Risk that the legacy mark in Q4 confuses customers who see both. Mitigated by clear in-app communication and a single sunset date.',
    breakTest:
      'If Plinthworks customers report mark confusion in Q4, the staged approach was wrong and a single cutover would have been cleaner.',
    risks:
      'Risk: scope creep on the Q4 migration. Mitigated by Devon owning the migration plan with a no-change-after-October-1 freeze.',
    proof:
      "Decision logged in the Plinthworks campaign brief and referenced in every brand mission since. Casey's mark exploration completed Week 12; Q3 ship is on schedule.",
    sourceMemorySlug: 'um-w11-plinthworks-rebrand-q3-q4',
    crystallizedAt: dateInWeek(11, 5, 10, 0),
    significanceScore: 0.92,
    confidence: 0.94,
    tags: ['acme', 'decision', 'casey', 'devon', 'nico', 'brand'],
  },
  {
    slug: 'snap-standard-three-calls-before-brief',
    type: 'Standard',
    name: 'Three customer calls before any brief (formalized)',
    core: 'Studio-wide standard: every brief — positioning, copy, paid, or rebrand — sits in on three customer calls for that retainer before a single line is written. Maya enforces. No exceptions without founder approval.',
    oneLiner: 'Three calls. Written. Enforced.',
    story:
      'The rule had been operating informally since founding, more rigorously since Week 9 (healthtech), and as written studio standard since Week 10. Week 11 makes it the canonical company-cortex standard with retrieval rules.',
    moment:
      'Week 11 Monday morning, when the company cortex object was crystallized and pushed into agent brains via brain_library_sync.',
    method:
      "Three customer calls in week one of every retainer. Voice anchor doc receives five verbatim quotes by end of week one. Maya's test — 'show me the customer quote that earned this line' — is the brief-shipping gate.",
    steps:
      '1) Kickoff schedules three calls in week one. 2) Maya or Sara attends each. 3) Voice anchor doc receives quotes. 4) Brief opens in week two only after quotes are logged. 5) Maya verifies traceability before brief ships.',
    filter:
      'Apply on every retainer. Apply on every new brief within an existing retainer that introduces a new audience.',
    challenge:
      'Onboarding rush pressure tempts shortcuts. Mitigated by Riley owning the call-scheduling discipline.',
    breakTest:
      'If a brief without three calls holds without re-brief for 30 days, the rule is over-strict. Saltline week 2 and Helmsmark week 7 both required re-briefs after skipping the rule.',
    risks:
      'Risk: customer call scheduling delays slow week-one onboarding. Acceptable — the alternative is a week-three re-brief.',
    proof:
      'Every retainer that has honored the rule since Week 9 has shipped a brand book that has not been re-opened. Plinthworks rebrand kickoff in Week 11 honored the rule; the resulting brand book is the cleanest the studio has produced.',
    sourceMemorySlug: 'um-w11-three-customer-calls-standard',
    crystallizedAt: dateInWeek(11, 4, 11, 0),
    significanceScore: 0.92,
    confidence: 0.94,
    tags: ['decision', 'principle', 'maya', 'sara', 'casey', 'positioning'],
  },
  {
    slug: 'snap-standard-organic-validation-window-14d',
    type: 'Standard',
    name: '14-day organic validation window (formalized)',
    core: 'Codified standard: every paid campaign requires a 14-day organic validation window with the exact hero line running on owned channels first. Leo will not open a paid account until the validation window is logged.',
    oneLiner: '14 days organic, logged. Then paid.',
    story:
      "The standard had been operating since Week 8 as a partner-team decision. Week 11 formalized it as a company cortex standard with retrieval rules, pushed into Leo's agent brain via brain_library_sync.",
    moment:
      'Week 11 Tuesday afternoon, when Leo presented the documented version to the partner team and we signed off.',
    method:
      'Hero line ships on owned channels (newsletter, founder posts) for 14 days. Engagement is logged daily. Day 14 review by Leo + Sara decides launch or rewrite. Paid account opens only after the validation log passes.',
    steps:
      '1) Hero line ships organic. 2) Daily engagement log. 3) Day 14 review. 4) Decision: launch or rewrite. 5) Paid account opens with validation log attached.',
    filter:
      'Apply on every paid campaign across every retainer. Exception only with explicit founder override.',
    challenge:
      'Time-sensitive launches sometimes cannot wait 14 days. Founder override is allowed with explicit risk acceptance.',
    breakTest:
      'If a paid campaign without the 14-day window produces a CAC test result better than one with, the standard is wrong. Saltline incident says it does not.',
    risks: 'Risk: 14 days is sometimes too long. Mitigated by founder override.',
    proof:
      'Plinthworks Q1 paid experiment ran the window in Weeks 9-10 — cleanest CAC test in the studio. Zero unvalidated paid budget burned since Week 8.',
    sourceMemorySlug: 'um-w11-organic-validation-standard',
    crystallizedAt: dateInWeek(11, 5, 14, 0),
    significanceScore: 0.9,
    confidence: 0.94,
    tags: ['decision', 'principle', 'leo', 'growth'],
  },
  {
    slug: 'snap-standard-founder-reads-every-status',
    type: 'Standard',
    name: 'Founder reads every retainer status note before send',
    core: "Every Friday status note — to every client — passes the founder's eyes between 1pm and 4pm before Riley sends it. Not for approval theatre. For the read-back: if a sentence drifts off the position, it gets rewritten in the doc, not in a follow-up.",
    oneLiner: 'Founder reads every status. Drift gets rewritten, not corrected later.',
    story:
      "Triggered by a Week 9 Helmsmark status note that shipped with 'we are excited about this momentum' (a line I would never write) and a Week 10 Cloverkin note Riley caught herself. Two drifts in two weeks made the standard non-negotiable.",
    moment:
      'Week 11 Thursday afternoon, when the partner sync formalized the read-pass slot in the Friday cadence.',
    method:
      'Founder receives all six retainer status notes between 1pm and 4pm Friday. Drift is rewritten in the doc, not corrected in a reply. Riley sends to client by 4pm with founder edits applied.',
    steps:
      '1) Lead operator drafts status. 2) Riley QA-passes by 11am. 3) Founder reads 1-4pm. 4) Founder edits in doc. 5) Riley sends by 4pm.',
    filter:
      'Apply on every Friday status note. Apply on every quarterly recap. Apply on every retainer renewal letter.',
    challenge:
      "Risk that founder read-pass becomes a bottleneck on busy weeks. Mitigated by Riley pre-passing and by Owen's P&L-line splice for fintech/B2B notes (a separate sub-protocol).",
    breakTest:
      'If a status note ships drift-free without founder read-pass for four consecutive weeks, the standard may be over-needed.',
    risks: 'Risk: founder time consumed on routine notes. Mitigated by tight 1-4pm slot.',
    proof:
      'Every Friday since Week 11 has caught at least one rewrite. Zero post-send drift complaints from clients since the standard went live.',
    sourceMemorySlug: 'um-w11-founder-reads-every-status',
    crystallizedAt: dateInWeek(12, 0, 9, 30),
    significanceScore: 0.88,
    confidence: 0.93,
    tags: ['decision', 'principle', 'ops', 'riley', 'retainer'],
  },
  {
    slug: 'snap-protocol-new-hire-onboarding',
    type: 'Protocol',
    name: 'New-hire onboarding — two-week reader phase',
    core: 'Every new agent or partner spends week one reading all six retainer briefs and the full Plinthworks-to-Almanac decision log. Week two: they sit on every kickoff and every Friday status review across the studio. They do not own a deliverable until week three.',
    oneLiner: 'Two weeks of reading. Then ownership.',
    story:
      'Triggered by Riley shipping a Cloverkin status note on day three that contradicted a Week 6 positioning decision nobody had handed her. The protocol prevents the same failure with Owen and every future hire.',
    moment:
      "Week 11 Friday afternoon, when the partner team formalized the protocol after Riley's near-miss surfaced the gap.",
    method:
      'Week one is exclusively reading: all six retainer briefs, the full decision log, the company cortex object list, every voice anchor doc. Week two is exclusively observation: every kickoff, every Friday status review, every partner sync. Week three is first owned deliverable.',
    steps:
      '1) Day one: reading list assigned. 2) Week one daily check-ins on questions arising from the reading. 3) Week two kickoff attendance schedule. 4) Week three first deliverable with founder pass.',
    filter:
      'Apply to every net-new hire across every team. Applies to humans and to agent onboarding.',
    challenge:
      'Risk that two weeks of read-only feels slow for an experienced hire. Acceptable trade-off — the alternative is a Cloverkin-class drift.',
    breakTest:
      'If a hire onboarded under the protocol still drifts off a positioning decision in their first owned deliverable, the protocol is insufficient.',
    risks: 'Risk: two weeks of non-billable hire time. Acceptable cost of the discipline.',
    proof:
      'Owen joined in Week 12, ran the protocol cleanly: read-through Week 12, kickoff-sit Week 13. His first P&L pass was credible by the time he made his first recommendation.',
    sourceMemorySlug: 'um-w11-new-hire-onboarding-protocol',
    crystallizedAt: dateInWeek(12, 1, 11, 0),
    significanceScore: 0.84,
    confidence: 0.93,
    tags: ['decision', 'hiring', 'ops', 'riley', 'owen'],
  },
  {
    slug: 'snap-protocol-friday-cadence',
    type: 'Protocol',
    name: 'Friday cadence v1 — 11am draft, 1pm review, 4pm send',
    core: 'Every Friday, every retainer ships a status note. Lead operator drafts and routes to Riley by 11am. Riley QA-passes and routes to the founder by noon. Founder reads between 1pm and 4pm. Riley sends to the client by 4pm with the founder edits applied in the doc, not in a reply.',
    oneLiner: '11 — 1 — 4. Same pattern, every retainer, every Friday.',
    story:
      'The cadence had been operating informally since Week 6. Jules and Riley codified what they had been doing. The Week 11 version is v1; v2 is already being drafted now that Owen is splicing P&L lines into fintech and B2B notes.',
    moment:
      'Week 11 Thursday morning, when Jules and Riley wrote up the pattern they had been running by feel for five weeks.',
    method:
      'Lead operator drafts retainer status by 11am Friday. Riley QA-passes to founder by noon. Founder reads 1-4pm. Riley sends to client by 4pm with founder edits applied in doc.',
    steps:
      '1) Lead operator drafts by 11am. 2) Riley QA-pass by noon. 3) Founder reads 1-4pm. 4) Founder edits in doc. 5) Riley sends to client by 4pm.',
    filter:
      'Apply on every retainer every Friday. Exception only if a retainer is in an explicit pause.',
    challenge:
      'Currently transforming — Owen is splicing P&L lines into fintech and B2B notes, which changes the routing (Riley passes through Owen before founder for those retainers).',
    breakTest:
      'If a Friday note misses 4pm send three times in a quarter, the cadence is broken and the protocol needs revision.',
    risks:
      'Risk: Friday-afternoon partner-team time consumed. Mitigated by the tight slot architecture.',
    proof:
      "Six retainers, zero missed Friday sends since Week 11. Owen's P&L splice for fintech/B2B notes already in flight.",
    sourceMemorySlug: 'um-w11-friday-cadence-protocol',
    crystallizedAt: dateInWeek(11, 6, 10, 0),
    significanceScore: 0.86,
    confidence: 0.92,
    tags: ['decision', 'jules', 'riley', 'ops', 'owen'],
  },
  {
    slug: 'snap-perspective-reading-list-as-flagship',
    type: 'Perspective',
    name: 'Content as flagship object, never as filler',
    core: "Tomás's reading-list framing — 'a reading list is a free course, if it is not the best thing on the internet for that topic, do not publish it' — generalizes to a studio-wide perspective: content is a flagship object, never a content-marketing line item.",
    oneLiner: 'Best on the internet for the topic, or do not publish.',
    story:
      "Tomás named the bar in the Almanac reading list working session. I sat with it for an afternoon and realized it was the right bar for every retainer's inbound content, not just Almanac's. The perspective rewrites how Maya scopes content across the studio.",
    moment:
      'Week 11 Thursday afternoon, when the framing landed and Maya started rewriting the Plinthworks docs voice doc to honor the same bar.',
    method:
      "Every piece of public-facing content scoped for any retainer has to pass a 'best on the internet for this topic' filter. If it does not pass, it does not ship. Maya owns the filter.",
    filter:
      'Apply on every public-facing content deliverable. Newsletter, docs, reading lists, case studies, blog posts, public Loom videos.',
    challenge:
      'The bar is high. Most content from most studios does not pass. The discipline is to publish less and ship sharper.',
    breakTest:
      'If a piece of content passes the filter but produces no inbound or trust signal in 90 days, the filter is wrong or the topic was wrong.',
    risks:
      'Risk: content cadence slows to zero on hard topics. Mitigated by treating cadence as the variable, not the bar.',
    proof:
      "Almanac public reading list is being treated as the brand's flagship inbound object. Plinthworks docs voice doc rewrite in progress against the same bar.",
    sourceMemorySlug: 'um-w11-tomas-reading-list-bar',
    crystallizedAt: dateInWeek(12, 1, 14, 30),
    significanceScore: 0.88,
    confidence: 0.92,
    tags: ['zeta', 'maya', 'principle', 'growth', 'acme'],
  },
  {
    slug: 'snap-tension-retainer-vs-project',
    type: 'Tension',
    name: 'Retainer scope vs project scope — SOW reads like a project',
    core: 'Every Foundry SOW promises retainer-style continuity but enumerates project-style deliverables. The mismatch shows up around day 60 of every engagement, when the client asks for the next deliverable and we want to talk about the operating loop.',
    oneLiner: 'We sell retainer; the SOW reads project. Rewrite the document.',
    story:
      'Owen surfaced this in the Week 12 pricing review after pulling all six active SOWs side by side. Plinthworks, Saltline, and Helmsmark all show the same fingerprint — monthly deliverable line items that frame us as a sequence of outputs instead of a sustained brain.',
    moment:
      'Week 12 Thursday morning, in the pricing review, when Owen put the three SOWs on screen and the fingerprint was undeniable.',
    method:
      "Owen drafting v2 of the standard SOW. Frames continuity explicitly; treats deliverables as evidence of the operating loop, not as the loop itself. Riley and Jules re-routing scope-creep conversations into 'change order' language in the interim.",
    filter: 'Apply on every new SOW and every renewal SOW starting in Week 14.',
    challenge:
      'Current SOWs are signed; rewriting mid-engagement requires client agreement. Owen handling.',
    breakTest:
      'If v2 of the SOW does not reduce scope-creep emails by 50% within two quarters, the document was not the problem.',
    risks:
      'Risk: clients react to the framing change as a price-increase signal. Mitigated by Owen handling the conversation with explicit positioning.',
    proof:
      'Currently active — Owen drafting v2. Three retainers (Plinthworks, Saltline, Helmsmark) carry the fingerprint. The tension itself is the proof that the document is the bug.',
    sourceMemorySlug: 'um-w12-pricing-review-retainer-vs-project',
    crystallizedAt: dateInWeek(12, 5, 10, 0),
    significanceScore: 0.92,
    confidence: 0.91,
    tags: ['tension', 'pricing', 'retainer', 'owen', 'jules', 'riley'],
  },
  {
    slug: 'snap-move-walk-to-owen-on-pricing',
    type: 'Move',
    name: 'Pricing pushback walks to Owen first',
    core: 'Any client pricing pushback — scope reduction, hourly negotiation, request for a discount — goes to Owen for a P&L pass before anyone replies. The first reply sets the anchor; the anchor has to be defensible at the bottom of the sheet.',
    oneLiner: 'Pricing pushback walks to Owen. Then the reply.',
    story:
      "Formed under pressure in Week 12 after Owen joined. Triggered by Riley's forty-minute Throughput reply on a change order that Owen's P&L pass later showed was 18% under margin. The move puts the P&L pass between the pushback and the response.",
    moment:
      'Week 12 Thursday afternoon, in the partner sync, when I named the move out loud and the partner team agreed without debate.',
    method:
      "Riley flags pricing pushback to Owen within an hour of receipt. Owen runs P&L pass within four hours. Riley replies to client with Owen's anchor. Founder consulted only if the P&L pass surfaces a strategic question.",
    steps:
      "1) Riley receives pricing pushback. 2) Riley flags to Owen within one hour. 3) Owen runs P&L pass within four hours. 4) Riley drafts reply with Owen's anchor. 5) Riley sends.",
    filter:
      'Apply on every client pricing pushback across every retainer. Apply on every change-order request that touches scope.',
    challenge:
      'Emerging — Riley has used the move once successfully (Almanac, Week 13) and once awkwardly (Plinthworks, Week 13). Still calibrating.',
    breakTest:
      "If three pricing replies sent before Owen's P&L pass hold up at the bottom of the sheet, the move is over-rigid.",
    risks:
      "Risk: four-hour delay reads as slow client response. Mitigated by Riley's acknowledgement protocol.",
    proof:
      "Almanac Week 13 pricing reply (with Owen's pass) closed at our quoted margin. Throughput Week 12 reply (without pass) was 18% under.",
    sourceMemorySlug: 'um-w12-walk-to-owen-pricing-move',
    crystallizedAt: dateInWeek(13, 0, 11, 0),
    significanceScore: 0.86,
    confidence: 0.92,
    tags: ['decision', 'owen', 'riley', 'pricing', 'principle'],
  },
  {
    slug: 'snap-tension-plinthworks-strategy-vs-design',
    type: 'Tension',
    name: 'Plinthworks wants strategy hours, we keep shipping design hours',
    core: 'Plinthworks pays for positioning and gets, by hour count, a designer-led engagement. They have not complained, but the gap between what they bought and what we deliver is widening, and every rebrand mission is making it worse.',
    oneLiner: 'They bought strategy. They are receiving design. Rewrite the SOW.',
    story:
      "Atlas read the gap off Casey's mission count (eleven Plinthworks missions in Weeks 9-12) against Nico's strategy hours logged (four in the same period). The Week 11 rebrand decision compounded the imbalance. The founder flagged it informally in a Week 12 partner sync but no scope conversation has been opened with Devi yet.",
    moment:
      "Week 12 Friday afternoon, when Owen's mission-count analysis put the hours-vs-scope mismatch on a single screen.",
    method:
      'Riley sitting on the scope conversation until Owen has the renegotiated SOW template ready. The conversation with Devi happens with a new SOW in hand, not as an open question. Casey continues delivering design hours in the interim — they are wanted, just mis-categorized in the SOW.',
    filter:
      'Apply specifically to Plinthworks. Generalize the pattern detection (mission-count by team vs SOW line items) to all retainers as a quarterly check.',
    challenge:
      'Risk that Devi pushes back on the renegotiated SOW because the current one is working from her side. Owen handling the framing.',
    breakTest:
      "If Devi's scope expectations match the current SOW line items, the tension is internal-only and the rewrite is for our P&L, not theirs.",
    risks:
      "Risk: opening the scope conversation triggers a broader renegotiation. Mitigated by the renegotiated SOW being net-neutral to Plinthworks' total spend.",
    proof:
      "Currently active. Owen drafting renegotiated SOW. Casey continues delivering design hours; Nico's strategy hours scheduled to increase in the rebrand Q3 ship phase.",
    sourceMemorySlug: 'um-w12-acme-strategy-vs-design-hours',
    crystallizedAt: dateInWeek(13, 1, 14, 30),
    significanceScore: 0.84,
    confidence: 0.9,
    tags: ['acme', 'tension', 'pricing', 'owen', 'nico', 'casey', 'riley'],
  },
  {
    slug: 'snap-belief-retainers-die-month-three',
    type: 'Belief',
    name: 'Most retainers fail at month three, not month one',
    core: 'Kickoff energy carries a retainer for 60 days. The real failure mode shows up in month three, when novelty wears off and the operating cadence either holds or quietly slips. Every retainer review at day 75 is non-negotiable.',
    oneLiner: 'Month three is the month retainers die. Day-75 review is non-negotiable.',
    story:
      "Half-formed for weeks, written down in Week 13 before it got away. The trigger was three Week 9-12 signals: Saltline scope-creep first showed up at day 73, Helmsmark second-month status notes quietly dropped from weekly to bi-weekly, and Jules said it in channel last week — 'month three is the month I lose retainers, not month one.'",
    moment: 'Week 13 Tuesday morning, when the voice memo named the pattern explicitly.',
    method:
      'Day-75 retainer review is mandatory for every active retainer. Owen drafting the template this week. Review checks: operating cadence, scope alignment, P&L health, customer-brain signal quality, founder hours.',
    steps:
      '1) Day-75 calendar lock per retainer. 2) Owen runs the review template. 3) Findings to partner sync. 4) Renegotiation conversation triggered if any indicator is below threshold.',
    filter: 'Apply on every retainer. Apply at exact day-75 mark, not approximate.',
    challenge:
      'Emerging — not yet acted on. Owen drafting the template this week. The belief is at confidence 0.62; it will rise as the first day-75 reviews land.',
    breakTest:
      'If the first three day-75 reviews surface no significant findings, the belief is over-stated and the trigger threshold should move.',
    risks: "Risk: day-75 reviews become routine theatre. Mitigated by Owen's P&L-first framing.",
    proof:
      "Three confirming signals already: Saltline scope-creep at day 73, Helmsmark cadence drift at day 65, Jules' Week 12 channel message. First day-75 review scheduled for Plinthworks in Week 14.",
    sourceMemorySlug: 'um-w13-month-three-belief-emerging',
    crystallizedAt: dateInWeek(13, 4, 10, 0),
    significanceScore: 0.88,
    confidence: 0.82,
    tags: ['principle', 'retainer', 'owen', 'jules', 'tension'],
  },
]
