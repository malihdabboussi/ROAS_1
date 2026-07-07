import type { FeaturePageDefinition } from './types'

export const emailSequencesFeaturePage: FeaturePageDefinition = {
  slug: 'email-sequences',
  metaTitle: 'Email Sequences | Vibey',
  metaDescription:
    'Build nurture flows from the same conversation that created your funnel. Aligned messaging, zero context switching.',
  mockupKind: 'studio',
  heroBadges: ['Drip campaigns', 'Welcome series', 'Nurture flows', 'Broadcasts', 'Scheduling'],
  hero: {
    kicker: '',
    title: 'NURTURE FLOWS FROM ONE THREAD',
    subtitle:
      'Describe the journey once. Vibey writes the sequence, schedules the sends, and keeps every email aligned with your funnel and offer.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/social-content', label: 'See Social Content' },
  },
  comparison: {
    title: 'Vibey sequences vs. standalone email tools',
    subtitle:
      'Most email tools know nothing about your funnel. Vibey keeps the whole story connected.',
    columns: ['Vibey', 'Standalone email'],
    rows: [
      { label: 'Context', cells: ['Inherits funnel, offer, and Brain', 'Starts from blank'] },
      { label: 'Copy', cells: ['AI-written, voice-matched', 'Manual copywriting'] },
      {
        label: 'Alignment',
        cells: ['Same thread as landing page', 'Separate tool, separate brief'],
      },
      { label: 'Iteration', cells: ['Edit by talking', 'Click through each email'] },
      { label: 'Scheduling', cells: ['Built-in send timing', 'Platform-dependent'] },
      { label: 'Analytics', cells: ['Workspace-level tracking', 'Siloed per tool'] },
    ],
  },
  showcase: {
    title: 'Everything you need for lifecycle email',
    subtitle: 'Sequences are not standalone-they extend the campaign you already built in Studio.',
    blocks: [
      {
        mockupKind: 'studio',
        title: 'Sequences from conversation',
        features: [
          {
            title: 'Describe the flow',
            description:
              'Tell Vibey the goal-welcome, nurture, re-engage-and it drafts the full sequence.',
          },
          {
            title: 'Voice-matched copy',
            description:
              'The Workspace Brain ensures every email sounds like your brand without re-explaining tone.',
          },
          {
            title: 'Funnel-aligned messaging',
            description:
              'Emails reference the same offer, proof points, and CTA as your landing page.',
          },
        ],
      },
      {
        mockupKind: 'studio',
        title: 'Send with confidence',
        features: [
          {
            title: 'Smart scheduling',
            description:
              'Vibey suggests optimal send times based on audience patterns stored in Brain.',
          },
          {
            title: 'Preview before sending',
            description: 'See exactly what recipients will get. Approve or revise in conversation.',
          },
          {
            title: 'Broadcast support',
            description:
              'One-off sends to your full list or targeted segments alongside drip flows.',
          },
        ],
      },
      {
        mockupKind: 'brain',
        title: 'Iterate and improve',
        features: [
          {
            title: 'Edit any email by talking',
            description:
              'Change subject lines, swap sections, or adjust tone without clicking through each email.',
          },
          {
            title: 'Performance insights',
            description:
              'Open rates, click-throughs, and engagement feed back into Brain for smarter future sequences.',
          },
          {
            title: 'Variant testing',
            description:
              'Generate subject line and body variants for split testing from the same brief.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Your emails, your control',
    subtitle: 'Full ownership of every sequence you create.',
    items: [
      {
        title: 'Sender identity',
        description: 'Send from your domain with verified sender addresses.',
      },
      {
        title: 'Segment targeting',
        description: 'Target specific contact segments or your full list.',
      },
      {
        title: 'Template freedom',
        description: 'AI-generated structure you can refine-not locked templates.',
      },
      { title: 'Export ready', description: 'Take your sequences anywhere. No vendor lock-in.' },
      {
        title: 'Compliance built in',
        description: 'Unsubscribe handling and CAN-SPAM compliance by default.',
      },
      {
        title: 'Team collaboration',
        description: 'Share sequences with teammates for review before sending.',
      },
    ],
  },
  steps: {
    title: 'From brief to inbox in three steps',
    items: [
      {
        title: 'Describe',
        description:
          'Tell Vibey who the audience is, what the goal is, and how many emails you want.',
      },
      {
        title: 'Review',
        description:
          'Preview every email in the sequence. Edit by talking until it matches your intent.',
      },
      {
        title: 'Schedule',
        description: 'Set timing and go live. Track performance from your workspace dashboard.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Can I use my own sending domain?',
        a: 'Yes. Connect your domain and verified sender identity in workspace settings.',
      },
      {
        q: 'Does Vibey handle unsubscribes?',
        a: 'Yes. CAN-SPAM compliant unsubscribe links are included by default.',
      },
      {
        q: 'How many emails can a sequence have?',
        a: 'As many as you need. Vibey drafts the full flow and you adjust.',
      },
      {
        q: 'Can I send one-off broadcasts?',
        a: 'Yes. Broadcasts to your full list or segments alongside drip sequences.',
      },
      {
        q: 'Are emails connected to my funnel?',
        a: 'Yes. Sequences inherit context from the same Studio mission that built your landing page.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to build sequences that match your funnel?',
    subtitle: 'Stop writing emails in a vacuum. Let your campaign context drive every send.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
