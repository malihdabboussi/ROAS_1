/**
 * Agent 1:1 chat threads for the YC demo (Recent Conversations on Home + Team).
 * Titles match the opening user intent; exchanges are short but substantive.
 */

export interface AgentConversationExchange {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentConversationBrief {
  slug: string
  title: string
  agentKey: string
  /** Resolved at seed time via campaigns.name in the org. */
  campaignName: string | null
  /** Days before "now" when the thread started. */
  startedDaysAgo: number
  exchanges: AgentConversationExchange[]
}

export const AGENT_CONVERSATIONS: readonly AgentConversationBrief[] = [
  {
    slug: 'vibey-discovery',
    title: 'Vibey Discovery',
    agentKey: 'vibey',
    campaignName: null,
    startedDaysAgo: 6,
    exchanges: [
      {
        role: 'user',
        content:
          'Onboarding: First conversation after user signed up. Here is what we know from signup: Foundry Creative is a Tribeca brand studio with six retainers. Use your onboarding-discovery skill — research us, then run the discovery protocol.',
      },
      {
        role: 'assistant',
        content:
          'I pulled your site, LinkedIn, and the Plinthworks + Saltline case blurbs. Before I draft a scorecard: who is the buyer you are optimizing for on the next retainer — founder, CMO, or ops?',
      },
      {
        role: 'user',
        content: 'Founder on every retainer. CMO shows up on Helmsmark but Devi still signs.',
      },
      {
        role: 'assistant',
        content:
          'Got it. I will anchor the Business Analysis doc on founder-led buying and flag Helmsmark as a dual-stakeholder retainer. Starting the scorecard now.',
      },
    ],
  },
  {
    slug: 'plinthworks-headline',
    title: 'Plinthworks pricing headline rewrite',
    agentKey: 'vibey',
    campaignName: 'Plinthworks Retainer',
    startedDaysAgo: 4,
    exchanges: [
      {
        role: 'user',
        content:
          'Rewrite the pricing page headline for Plinthworks v2. Name the trade-off in one line — pipeline buyers vs. design-led teams.',
      },
      {
        role: 'assistant',
        content:
          'Draft: "Pipeline software that design teams actually want to open." Trade-off is explicit: buyer metric (pipeline) vs. user experience (design). Want a sharper fintech variant?',
      },
    ],
  },
  {
    slug: 'saltline-q4-calendar',
    title: 'Saltline Q4 drop calendar',
    agentKey: 'maya',
    campaignName: 'Saltline & Co Retainer',
    startedDaysAgo: 12,
    exchanges: [
      {
        role: 'user',
        content:
          'Build the Q4 launch calendar for Saltline — holiday drops, gifting, and the November anthology. No paid until we validate the bundle hook.',
      },
      {
        role: 'assistant',
        content:
          'Mapped four drops: early Nov anthology, Black Friday bundle, gifting window, pantry restock. Paid tests gated behind June’s bundle quote test — want me to slot channel mix per drop?',
      },
    ],
  },
  {
    slug: 'helmsmark-compliance',
    title: 'Helmsmark compliance page draft',
    agentKey: 'sara',
    campaignName: 'Helmsmark Retainer',
    startedDaysAgo: 18,
    exchanges: [
      {
        role: 'user',
        content:
          'Draft the Helmsmark compliance landing section. Clinical review is the gate — nothing ships without the med-affairs pass.',
      },
      {
        role: 'assistant',
        content:
          'Outline ready: indication framing, fair balance block, med-affairs review callout, and CTA to request the full brief. I kept claims tied to the approved evidence doc.',
      },
    ],
  },
  {
    slug: 'throughput-homepage',
    title: 'Throughput homepage positioning',
    agentKey: 'vibey',
    campaignName: 'Throughput Group Retainer',
    startedDaysAgo: 22,
    exchanges: [
      {
        role: 'user',
        content:
          'Dominic wants the homepage to make his COO stop apologizing in board prep. One sentence positioning, no six-service-line sprawl.',
      },
      {
        role: 'assistant',
        content:
          'Working line: "One story for six service lines — so operations and sales stop telling different versions." I will pressure-test with his COO quote from discovery.',
      },
    ],
  },
  {
    slug: 'almanac-completion-metric',
    title: 'Almanac completion rate pushback',
    agentKey: 'leo',
    campaignName: 'Almanac Learning Retainer',
    startedDaysAgo: 28,
    exchanges: [
      {
        role: 'user',
        content:
          'Sebastian wants completion rate as the hero metric on the course page. Tomás passed on the leaderboard — help me push back without sounding dismissive.',
      },
      {
        role: 'assistant',
        content:
          'Frame it as a learning-outcome metric vs. a vanity leaderboard. Propose "modules completed with assessment pass" and tie it to the pilot cohort data you already have.',
      },
    ],
  },
  {
    slug: 'cloverkin-clinical',
    title: 'Cloverkin clinical review assets',
    agentKey: 'casey',
    campaignName: 'Cloverkin Health Retainer',
    startedDaysAgo: 35,
    exchanges: [
      {
        role: 'user',
        content:
          'Package the Cloverkin patient-education visuals for clinical review. Every claim needs a citation footnote.',
      },
      {
        role: 'assistant',
        content:
          'Exported PDF set with numbered footnotes mapped to the evidence table. Flagged two lines that need med-affairs rewrite before you send.',
      },
    ],
  },
  {
    slug: 'ops-pricing-review',
    title: 'Q1 retainer pricing review',
    agentKey: 'owen',
    campaignName: 'Internal Ops',
    startedDaysAgo: 40,
    exchanges: [
      {
        role: 'user',
        content:
          'Run the six-week pricing review for Foundry. Plinthworks is underpriced; I need margin numbers before the partner sync.',
      },
      {
        role: 'assistant',
        content:
          'Margin sheet updated: Plinthworks −11 pts vs. studio target, Throughput at target, Saltline +4. Recommendation: renegotiate Plinthworks at renewal with a design-hours line item.',
      },
    ],
  },
  {
    slug: 'pipeline-brooklyn-inbound',
    title: 'Brooklyn DTC inbound reply',
    agentKey: 'riley',
    campaignName: 'Sales & Pipeline',
    startedDaysAgo: 45,
    exchanges: [
      {
        role: 'user',
        content:
          'Reply to the inbound from the Brooklyn DTC operator. Qualify for positioning-first retainer or nurture out.',
      },
      {
        role: 'assistant',
        content:
          'Draft reply asks for one customer quote and whether the founder is in the room weekly. If not, I will route to nurture with the case study link.',
      },
    ],
  },
  {
    slug: 'atlas-plinthworks-scope',
    title: 'Plinthworks scope drift signal',
    agentKey: 'atlas',
    campaignName: 'Plinthworks Retainer',
    startedDaysAgo: 50,
    exchanges: [
      {
        role: 'user',
        content:
          'You flagged Plinthworks scope drift — eleven Casey missions vs. four strategy hours. Summarize for the partner sync.',
      },
      {
        role: 'assistant',
        content:
          'Signal: design throughput exceeded strategy allocation post-rebrand decision. Suggest opening scope conversation with renegotiated SOW before Week 14 deliverables lock.',
      },
    ],
  },
  {
    slug: 'wiki-kickoff-sop',
    title: 'Wiki kickoff SOP refresh',
    agentKey: 'vibey',
    campaignName: 'Company Wiki',
    startedDaysAgo: 55,
    exchanges: [
      {
        role: 'user',
        content:
          'Refresh the Foundry kickoff SOP in the wiki — same three sections on every retainer, competitor-paste test on slide 2.',
      },
      {
        role: 'assistant',
        content:
          'Updated SOP draft: pre-read, live kickoff agenda, and post-kickoff capture. Added the customer-quote gate on slide 2 per Maya’s cross-retainer standard.',
      },
    ],
  },
  {
    slug: 'throughput-outbound',
    title: 'Throughput outbound experiment plan',
    agentKey: 'devon',
    campaignName: 'Throughput Group Retainer',
    startedDaysAgo: 60,
    exchanges: [
      {
        role: 'user',
        content:
          'Draft the Q1 outbound experiment for Throughput — Dominic shut down volume. What is the smallest test that proves positioning?',
      },
      {
        role: 'assistant',
        content:
          'Proposed test: five founder LinkedIn posts using the COO story line, one landing page variant, measure booked discovery calls — no SDR blast.',
      },
    ],
  },
]
