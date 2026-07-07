/**
 * Curated Adley prod templates → Foundry demo client mapping.
 *
 * Run via: pnpm seed:yc-demo --phase=07_5d-curated-showcase
 *
 * Source rows are READ from the same Supabase project (Adley's prod artifacts).
 * Reskinned copies are INSERTed under the Foundry Creative demo org with
 * deterministic showcase IDs — no need to re-run the full seed.
 */
import { CLIENTS } from './clients'

export interface CuratedCopyReplacement {
  from: string
  to: string
}

interface CuratedTemplateBase {
  /** Stable key for deterministic demo UUIDs. */
  demoSlug: string
  /** Human-facing artifact title (client name is prefixed at insert time). */
  demoName: string
  /** Foundry client slug — must match content/clients.ts. */
  clientSlug: string
  /** Adley prod row UUID. */
  sourceProdId: string
  /** Hex colors in the source design → remapped to client.brand.accent. */
  sourceColors: readonly string[]
  /** Optional dark / background tones → remapped to client.brand.primary. */
  sourceSecondaryColors?: readonly string[]
  copyReplacements: readonly CuratedCopyReplacement[]
}

export interface CuratedPresentationSpec extends CuratedTemplateBase {
  kind: 'presentation'
}

export interface CuratedFunnelSpec extends CuratedTemplateBase {
  kind: 'funnel'
  /** Adley funnel_pages.id to clone (single-page funnels). */
  sourcePageProdId: string
}

export type CuratedTemplateSpec = CuratedPresentationSpec | CuratedFunnelSpec

export const CURATED_SHOWCASE_TEMPLATES: readonly CuratedTemplateSpec[] = [
  // ── Presentations ──────────────────────────────────────────────────────
  {
    kind: 'presentation',
    demoSlug: 'operator-keynote',
    demoName: 'Operator Keynote — How to Become Unignorable',
    clientSlug: 'epsilon',
    sourceProdId: '808f44aa-50c2-4677-8ca5-8ed603d3b76a',
    sourceColors: ['#DC2626', '#dc2626', 'red-600', 'red-500', '#EF4444'],
    sourceSecondaryColors: ['#0A0A0A', '#0a0a0a', '#000000'],
    copyReplacements: [
      { from: 'HOW TO BECOME', to: 'HOW TO BECOME' },
      {
        from: 'ABSOLUTELY UNIGNORABLE',
        to: 'THE OPERATOR YOUR MARKET CANNOT IGNORE',
      },
      { from: 'Founder Forum 2026', to: 'Services Operator Summit 2026' },
      { from: '45-Minute Keynote', to: '45-Minute Keynote' },
      {
        from: 'In an AI era where every competitor has the same tools, the only sustainable edge is an audience that already trusts you before they ever take a sales call.',
        to: 'When every firm pitches the same utilization story, the only durable edge is a reputation that precedes your proposal — operators who already know your name before the RFP lands.',
      },
      {
        from: 'You Could Have the Cure to Cancer.',
        to: 'You Could Have the Best Delivery Model in Your Vertical.',
      },
      {
        from: "It Wouldn't Matter If Nobody Knew You Existed.",
        to: "It Wouldn't Matter If No COO Had Heard of You.",
      },
      {
        from: "Visibility isn't a marketing tactic. It's the first domino that has to fall.",
        to: "Reputation isn't a branding exercise. It's the first domino that has to fall.",
      },
      { from: '76B+', to: '240+' },
      {
        from: 'Views generated for Viralish clients and brands using one repeatable formula',
        to: 'Services firms advised on positioning, pipeline, and gross-margin recovery',
      },
      { from: 'I Made Videos Nobody Watched', to: 'I Ran Engagements Nobody Referenced' },
      { from: 'for 8 Years.', to: 'for 8 Years.' },
      {
        from: 'attention was the most valuable currency in the world',
        to: 'trust was the most valuable currency in the market',
      },
      { from: 'Where Attention Goes,', to: 'Where Trust Goes,' },
      { from: 'Money Flows.', to: 'Margin Flows.' },
      { from: 'Viralish', to: '{{client_name}}' },
      { from: 'VIRALISH', to: 'THROUGHPUT GROUP' },
      { from: 'creator', to: 'operator' },
      { from: 'creators', to: 'operators' },
      { from: 'content', to: 'positioning' },
      { from: 'organic content', to: 'inbound pipeline' },
    ],
  },
  {
    kind: 'presentation',
    demoSlug: 'brand-partnership-pitch',
    demoName: 'Brand Partnership Pitch Deck',
    clientSlug: 'gamma',
    sourceProdId: '735cc3d0-a5b5-4c7b-bf72-ca42579e67b8',
    sourceColors: ['#3DEC5A', '#3dec5a', '#a3f7b5', '#6ee7b7', '#10b981'],
    sourceSecondaryColors: ['#0A0A0A', '#0a0a0a'],
    copyReplacements: [
      { from: 'VIRALISH', to: 'HELMSMARK' },
      { from: 'Viralish', to: '{{client_name}}' },
      {
        from: 'The creator competition show where your brand is the challenge, the prize, and the story.',
        to: 'The controller roundtable series where your brand is the case study, the proof point, and the story.',
      },
      {
        from: 'Brand Partnership Opportunity',
        to: 'Strategic Finance Partnership Opportunity',
      },
      { from: 'Hosted by Adley Kinsman', to: 'Hosted by Helmsmark' },
      { from: '10M+ Guaranteed Views', to: 'Controller-Grade Reach' },
      { from: 'YouTube + Vertical', to: 'Webinar + CFO Briefings' },
      {
        from: 'The biggest brands in the world stopped running ads.',
        to: 'The most trusted finance teams stopped buying generic demand gen.',
      },
      {
        from: 'Branded content vs. traditional digital ads',
        to: 'Controller-trusted content vs. generic fintech ads',
      },
      { from: 'Creator Economy', to: 'Finance Ops' },
      { from: 'creator', to: 'controller' },
      { from: 'creators', to: 'CFOs' },
      { from: 'Creator Intake', to: 'Controller Intake' },
      { from: 'The Clip Machine', to: 'The Proof Library' },
      { from: 'viral', to: 'trusted' },
    ],
  },
  {
    kind: 'presentation',
    demoSlug: 'patient-awareness-proposal',
    demoName: 'Patient Awareness Campaign Proposal',
    clientSlug: 'delta',
    sourceProdId: 'bc014dce-0b2e-4629-b29d-df0bc4e40cc4',
    sourceColors: ['#3DEC5A', '#3dec5a', '#10B981'],
    sourceSecondaryColors: ['#0A0A0A', '#0a0a0a', '#111111'],
    copyReplacements: [
      { from: 'WE MAKE MOVIES', to: 'WE PUT PATIENTS' },
      { from: 'GO VIRAL', to: 'FIRST' },
      { from: 'Movie Clipping Proposal', to: 'Patient Awareness Proposal' },
      { from: 'Movie Clipping', to: 'Patient Story Distribution' },
      { from: 'What We Do For Films', to: 'What We Do For Care Programs' },
      {
        from: 'We turn your footage into cultural moments that distributors cannot ignore.',
        to: 'We turn your care stories into trusted moments that patients and PCPs cannot ignore.',
      },
      {
        from: 'Ever wonder why some films get millions talking and others disappear?',
        to: 'Ever wonder why some clinics fill their calendar and others stay invisible in-network?',
      },
      { from: 'We have the recipe.', to: 'We have the playbook.' },
      { from: 'films', to: 'care programs' },
      { from: 'film', to: 'clinic' },
      { from: 'PER MILLION VIEWS', to: 'PER CAMPAIGN WAVE' },
      { from: 'MINIMUM VIEWS DELIVERED', to: 'MINIMUM TOUCHPOINTS DELIVERED' },
      { from: 'Viralish', to: '{{client_name}}' },
      { from: 'viral', to: 'trusted' },
      { from: 'Viral', to: 'Trusted' },
    ],
  },

  // ── Funnels ────────────────────────────────────────────────────────────
  {
    kind: 'funnel',
    demoSlug: 'on-call-webinar',
    demoName: 'Ship Faster Without Breaking On-Call — Webinar',
    clientSlug: 'acme',
    sourceProdId: 'dd4296ba-15a5-4da5-8de3-e6cd8730443b',
    sourcePageProdId: 'bfecdd5c-5d57-4ecd-b9c3-d7aea378b536',
    sourceColors: ['#10B981', '#10b981', '#7AF0FF'],
    copyReplacements: [
      { from: '10x Your Reach', to: 'Ship Faster Without Breaking On-Call' },
      { from: '10X YOUR REACH', to: 'SHIP FASTER WITHOUT BREAKING ON-CALL' },
      { from: 'Free Live Training — May 6th', to: 'Free Live Briefing — This Week' },
      { from: 'Save My Spot', to: 'Reserve My Seat' },
      {
        from: "Why Your Content Isn't Getting the Reach It Deserves",
        to: 'Why Your Deploy Pipeline Keeps Waking On-Call',
      },
      {
        from: 'The Reach Multiplier: Getting 10x More Eyes on Content You Already Made',
        to: 'The Rollback Multiplier: Shipping 10x More Often With the Same On-Call Load',
      },
      {
        from: 'Turn Any Piece of Content Into a Discovery Machine',
        to: 'Turn Every Release Into a Boring, Predictable Deploy',
      },
      { from: '3B+', to: '400+' },
      { from: 'Organic views/month', to: 'Incidents/month prevented' },
      { from: '500+', to: '120+' },
      { from: 'Businesses coached', to: 'Platform teams coached' },
      { from: '100M', to: '99.95%' },
      { from: 'Views from one training', to: 'Uptime after one sprint' },
      { from: 'Viralish', to: '{{client_name}}' },
      { from: 'content', to: 'deployments' },
      { from: 'algorithm', to: 'observability stack' },
      { from: 'video', to: 'release' },
      { from: 'creator', to: 'engineer' },
    ],
  },
  {
    kind: 'funnel',
    demoSlug: 'pantry-club-vsl',
    demoName: 'The Pantry Club — Membership',
    clientSlug: 'beta',
    sourceProdId: 'c7ac38eb-c27d-4391-a05c-8203cdd5fd4d',
    sourcePageProdId: 'ca57ef5d-2822-4ce6-bcea-6c36c14f4c47',
    sourceColors: ['#E63946', '#e63946', '#FF3131', '#FFF0F1'],
    copyReplacements: [
      { from: 'V CLUB', to: 'PANTRY CLUB' },
      { from: 'V Club', to: 'Pantry Club' },
      { from: 'VClub', to: 'PantryClub' },
      { from: 'by Viralish', to: 'by Saltline & Co' },
      { from: 'Viralish', to: '{{client_name}}' },
      {
        from: "You've found the group behind social media's most viral brands",
        to: "You've found the studio behind the internet's most copied pantry rituals",
      },
      {
        from: 'Brands pay us $35,000+/month for these agency tools.',
        to: 'Retailers pay us $35,000+/month for this launch playbook.',
      },
      {
        from: 'Join 30,000+ Creators & Entrepreneurs Who Are Done Being Invisible',
        to: 'Join 30,000+ Home Cooks Who Are Done With Boring Weeknight Dinners',
      },
      { from: '30,000+ Creators', to: '30,000+ Home Cooks' },
      { from: '79B+', to: '2M+' },
      { from: 'Organic Views Generated', to: 'Meals Shared' },
      { from: '45M+', to: '18K+' },
      { from: 'Followers Built', to: 'Newsletter Readers' },
      { from: '1B+', to: '500+' },
      { from: 'Organic Views Per Month', to: 'Recipes Tested Per Season' },
      { from: 'Creators Coached', to: 'Members Coached' },
      { from: 'Join V Club Now', to: 'Join Pantry Club Now' },
      { from: 'Join Now', to: 'Join the Club' },
      { from: 'creator', to: 'home cook' },
      { from: 'creators', to: 'members' },
      { from: 'content', to: 'recipes' },
      { from: 'viral', to: 'shared' },
    ],
  },
  {
    kind: 'funnel',
    demoSlug: 'writing-cohort-checkout',
    demoName: 'Writing Cohort — Enrollment Checkout',
    clientSlug: 'zeta',
    sourceProdId: 'bf28f759-4403-49a0-9afa-720e7d51b848',
    sourcePageProdId: '5d92b20f-faad-4cbd-86b2-c0c1f819beb2',
    sourceColors: ['#10B981', '#10b981'],
    copyReplacements: [
      { from: '6X Your Reach', to: 'Almanac Writing Cohort' },
      { from: '6X YOUR REACH', to: 'ALMANAC WRITING COHORT' },
      { from: 'V Club Member', to: 'Alumni Member' },
      { from: 'Email List', to: 'Newsletter Reader' },
      { from: 'Masterclass Attendee', to: 'Open House Attendee' },
      { from: 'General Public', to: 'General Enrollment' },
      { from: 'The 6X Content System', to: 'The Almanac Draft System' },
      {
        from: 'The exact packaging, hook, and structure framework Viralish uses to generate over 3 billion organic views per month.',
        to: 'The exact syllabus, feedback loop, and revision framework Almanac uses to move adult learners from blank page to shipped essay in six weeks.',
      },
      { from: 'Weekly Live Coaching with Adley', to: 'Weekly Live Studio with Your Mentor' },
      { from: 'Adley reviews', to: 'Your mentor reviews' },
      { from: 'Adley will personally', to: 'Your mentor will personally' },
      { from: 'V Club comes first', to: 'Almanac Circle comes first' },
      { from: 'difference between V Club', to: 'difference between Almanac Circle' },
      { from: 'Your Price (V Club tier)', to: 'Your Price (Alumni tier)' },
      { from: "'vclub'", to: "'alumni'" },
      { from: 'vclub', to: 'alumni' },
      { from: 'The Algorithm Advantage Blueprint', to: 'The Reader-First Structure Blueprint' },
      { from: 'Content Audit + Personalized Roadmap', to: 'Draft Audit + Personalized Roadmap' },
      { from: 'Shareability Engineering Framework', to: 'Clarity Engineering Framework' },
      { from: 'Private Sprint Community', to: 'Private Cohort Community' },
      { from: '6-week', to: '6-week' },
      {
        from: 'Instagram, TikTok, and YouTube Shorts',
        to: 'essays, newsletters, and long-form posts',
      },
      { from: 'Viralish', to: '{{client_name}}' },
      { from: 'content coaching', to: 'writing coaching' },
      { from: 'content', to: 'writing' },
      { from: 'video', to: 'draft' },
      { from: 'creator', to: 'learner' },
      { from: 'creators', to: 'learners' },
      { from: 'reach', to: 'readership' },
      { from: 'views', to: 'reads' },
    ],
  },
] as const

export function clientForSlug(slug: string) {
  const client = CLIENTS.find((c) => c.slug === slug)
  if (!client) throw new Error(`Unknown client slug: ${slug}`)
  return client
}
