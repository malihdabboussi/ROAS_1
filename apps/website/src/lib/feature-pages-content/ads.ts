import type { FeaturePageDefinition } from './types'

export const adsFeaturePage: FeaturePageDefinition = {
  slug: 'ads',
  metaTitle: 'Ads & Distribution | ROAS',
  metaDescription:
    'Draft channel-specific creative from the same brief that built your funnel-keep messaging aligned end to end.',
  mockupKind: 'ads',
  heroBadges: ['Meta Ads', 'Google Ads', 'LinkedIn Ads', 'Copy variants', 'Creative briefs'],
  hero: {
    kicker: '',
    title: 'CREATIVE THAT MATCHES THE FUNNEL',
    subtitle:
      'ROAS pulls proof points and offers straight from your campaign so ads, landing pages, and emails tell one story. No more creative drift.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/funnels', label: 'See Funnels' },
  },
  comparison: {
    title: 'ROAS ads vs. disconnected tools',
    subtitle:
      'Most teams write ads in a separate tool and pray the messaging matches. ROAS keeps everything aligned.',
    columns: ['ROAS', 'Siloed stack'],
    rows: [
      {
        label: 'Brief',
        cells: ['Inherited from the same Studio mission', 'Re-written per tool'],
      },
      {
        label: 'Creative',
        cells: ['Variant suggestions in campaign context', 'Manual doc shuffling'],
      },
      {
        label: 'Channel targeting',
        cells: ['Platform-aware constraints built in', 'Generic copy pasted everywhere'],
      },
      {
        label: 'Learnings',
        cells: ['Fed back into The Workspace Brain', 'Stuck in the ad platform UI'],
      },
      {
        label: 'Handoff',
        cells: ['Same workspace as funnel + email', 'Export chains and email threads'],
      },
      {
        label: 'Iteration',
        cells: ['Change copy in conversation', 'Edit in each platform separately'],
      },
    ],
  },
  showcase: {
    title: 'Everything you need to create, test & optimize ads',
    subtitle:
      'Ads are not standalone-they are the first impression of your funnel. ROAS keeps them aligned.',
    blocks: [
      {
        mockupKind: 'ads',
        title: 'Channel-aware creative from one brief',
        features: [
          {
            title: 'Inherit the campaign context',
            description:
              'ROAS reads your live funnel, offer, and audience from the same mission. No separate brief needed.',
          },
          {
            title: 'Platform-specific variants',
            description:
              'Generate ad copy tuned for Meta (short, hook-driven), Google (keyword-aligned), and LinkedIn (professional tone) from one input.',
          },
          {
            title: 'Multiple angles',
            description:
              'ROAS suggests headline variations, hook alternatives, and CTA options so you can test without starting from scratch.',
          },
        ],
      },
      {
        mockupKind: 'funnels',
        title: 'Connected to your conversion path',
        features: [
          {
            title: 'Funnel alignment',
            description:
              'Ad copy references the same proof points, positioning, and CTA as your landing page-zero message mismatch.',
            link: { href: '/features/funnels', label: 'See Funnel Builder' },
          },
          {
            title: 'Email sequence sync',
            description:
              'The nurture sequence ROAS built matches the ad promise, so post-click experience is consistent.',
          },
          {
            title: 'Brand voice enforcement',
            description: 'The Workspace Brain ensures every channel speaks in the same voice.',
            link: { href: '/features/brain', label: 'See The Workspace Brain' },
          },
        ],
      },
      {
        mockupKind: 'brain',
        title: 'Launch, learn, iterate',
        features: [
          {
            title: 'Export to ad accounts',
            description:
              'Push approved copy to connected Meta, Google, and LinkedIn ad accounts via integrations.',
            link: { href: '/features/integrations', label: 'See integrations' },
          },
          {
            title: 'Performance loop',
            description:
              'When results come back, learnings flow into The Workspace Brain-better angles, better copy, better ROI.',
          },
          {
            title: 'Continuous iteration',
            description:
              'Ask Pixel for new variants anytime. The campaign context persists-no re-onboarding.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Control over your creative pipeline',
    subtitle: 'ROAS drafts. You approve. Nothing spends without your sign-off.',
    items: [
      {
        title: 'Human in the loop',
        description:
          'ROAS generates-you approve. No budget is spent without explicit authorization.',
      },
      {
        title: 'Multi-platform output',
        description: 'Meta, Google, LinkedIn variants from one brief. More channels coming.',
      },
      {
        title: 'A/B variant generation',
        description: 'Multiple angles and hooks per campaign for easy split testing.',
      },
      {
        title: 'Integration ready',
        description: 'Push creative to connected ad accounts with OAuth-scoped permissions.',
      },
      {
        title: 'Voice consistency',
        description: 'The Workspace Brain enforces brand voice across every channel and format.',
      },
      {
        title: 'Learnings captured',
        description: 'Performance insights auto-flow into Brain for compounding improvements.',
      },
    ],
  },
  steps: {
    title: 'Launch paid tests faster',
    items: [
      {
        title: 'Confirm the offer',
        description:
          'ROAS locks the hook, proof points, and CTA from your live funnel so the ad matches the landing page.',
      },
      {
        title: 'Generate variants',
        description:
          'Platform-specific angles for Meta, Google, and LinkedIn-with character limits and best practices built in.',
      },
      {
        title: 'Export and track',
        description:
          'Push copy to connected ad accounts, launch your test, and monitor performance centrally.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Does ROAS spend my ad budget automatically?',
        a: 'No. You approve creative and set budgets inside the ad platforms. ROAS generates the copy and creative briefs.',
      },
      {
        q: 'Which ad networks are supported?',
        a: 'Meta, Google, and LinkedIn to start. More channels are prioritized by customer demand.',
      },
      {
        q: 'Can ROAS read performance data?',
        a: 'With integrations connected, results flow back into The Workspace Brain so future creative improves.',
      },
      {
        q: 'How are variants generated?',
        a: 'ROAS creates multiple headline, body, and CTA options per platform using your campaign context and Brain insights.',
      },
      {
        q: 'What if I want to change an ad after generating?',
        a: 'Edit in conversation. ROAS revises the copy while preserving platform constraints.',
      },
      {
        q: 'Do ads stay aligned with my funnel?',
        a: 'Yes. Ad copy inherits positioning, proof points, and CTA directly from the mission that built your landing page.',
      },
      {
        q: 'Can I generate image creative?',
        a: 'Text creative and layout briefs ship today. Visual asset generation is on the roadmap.',
      },
      {
        q: 'Is there a limit on variants?',
        a: 'Generate as many angles as your plan allows. Enterprise plans have unlimited variant generation.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to stop guessing at ad copy?',
    subtitle: 'Let your funnel context write the ads. Aligned messaging, faster tests, better ROI.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
