import type { FeaturePageDefinition } from './types'

export const socialContentFeaturePage: FeaturePageDefinition = {
  slug: 'social-content',
  metaTitle: 'Social Content | Vibey',
  metaDescription:
    'Generate social posts tied to your campaigns. Consistent voice, platform-native formats, scheduled from one workspace.',
  mockupKind: 'ads',
  heroBadges: ['LinkedIn', 'Instagram', 'Twitter/X', 'Facebook', 'Carousel', 'Scheduling'],
  hero: {
    kicker: '',
    title: 'POSTS TIED TO YOUR CAMPAIGNS',
    subtitle:
      'Vibey generates platform-native social content from the same brief that built your funnel. Consistent voice, zero tab switching.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/leads', label: 'See Leads' },
  },
  comparison: {
    title: 'Vibey social vs. standalone schedulers',
    subtitle:
      'Schedulers post content. Vibey creates content that matches your campaign narrative.',
    columns: ['Vibey', 'Standalone scheduler'],
    rows: [
      {
        label: 'Content creation',
        cells: ['AI-generated from campaign context', 'Manual copywriting'],
      },
      {
        label: 'Voice consistency',
        cells: ['Brain-enforced across all platforms', 'Depends on writer discipline'],
      },
      {
        label: 'Campaign alignment',
        cells: ['Same offer narrative as funnel and email', 'Disconnected from other channels'],
      },
      { label: 'Formats', cells: ['Text, image, carousel per platform', 'Whatever you upload'] },
      { label: 'Iteration', cells: ['Edit by talking', 'Edit in each platform field'] },
      { label: 'Scheduling', cells: ['Built-in publish scheduling', 'Core feature'] },
    ],
  },
  showcase: {
    title: 'Everything you need for social distribution',
    subtitle: 'Social posts are campaign touchpoints-not standalone content.',
    blocks: [
      {
        mockupKind: 'ads',
        title: 'Campaign-connected content',
        features: [
          {
            title: 'Inherit the narrative',
            description:
              'Posts pull messaging, proof points, and CTA from your active campaign automatically.',
          },
          {
            title: 'Platform-native formats',
            description:
              'LinkedIn thought leadership, Instagram carousels, Twitter threads-each tuned to the channel.',
          },
          {
            title: 'Brand voice enforced',
            description:
              'The Workspace Brain ensures every post sounds like you without manual style checking.',
          },
        ],
      },
      {
        mockupKind: 'studio',
        title: 'Create and schedule',
        features: [
          {
            title: 'Visual preview',
            description: 'See exactly how the post will appear on each platform before publishing.',
          },
          {
            title: 'Schedule sends',
            description: 'Set publish dates and times. Vibey handles the rest.',
          },
          {
            title: 'Multi-platform batch',
            description: 'Generate variants for multiple platforms from one prompt.',
          },
        ],
      },
      {
        mockupKind: 'brain',
        title: 'Learn and improve',
        features: [
          {
            title: 'Performance tracking',
            description: 'Engagement data feeds back into Brain so future content gets sharper.',
          },
          {
            title: 'Variant generation',
            description: 'Test different hooks and angles without rewriting from scratch.',
          },
          {
            title: 'Content calendar view',
            description: 'See all scheduled posts across platforms in one workspace view.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Your content, your platforms',
    subtitle: 'Vibey creates-you own and distribute.',
    items: [
      {
        title: 'Multi-platform',
        description: 'LinkedIn, Instagram, Twitter/X, Facebook from one workspace.',
      },
      {
        title: 'Image generation',
        description: 'AI-generated visuals and carousel slides for each post.',
      },
      {
        title: 'Scheduling',
        description: 'Set it and forget it. Posts publish on your timeline.',
      },
      {
        title: 'Voice consistency',
        description: 'Brain keeps tone aligned across every platform.',
      },
      {
        title: 'Campaign context',
        description: 'Posts reference the same offer as your funnel and email.',
      },
      { title: 'Export ready', description: 'Download content and images for use anywhere.' },
    ],
  },
  steps: {
    title: 'From campaign to social in three steps',
    items: [
      {
        title: 'Prompt',
        description: 'Tell Vibey which campaign to promote and which platforms to target.',
      },
      {
        title: 'Review',
        description: 'Preview platform-native posts. Edit by talking until they match your intent.',
      },
      { title: 'Schedule', description: 'Set publish dates and let Vibey handle distribution.' },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Which platforms are supported?',
        a: 'LinkedIn, Instagram, Twitter/X, and Facebook. More channels ship based on demand.',
      },
      {
        q: 'Can Vibey generate images?',
        a: 'Text copy and carousel layouts ship today. AI-generated visuals are on the roadmap.',
      },
      {
        q: 'Are posts connected to my campaigns?',
        a: 'Yes. Social content inherits messaging from the same Studio mission.',
      },
      {
        q: 'Can I schedule posts?',
        a: 'Yes. Set publish dates and times directly from the workspace.',
      },
      {
        q: 'How does voice consistency work?',
        a: 'The Workspace Brain applies your brand tone to every post automatically.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to align your social with your campaigns?',
    subtitle: 'Stop writing posts in isolation. Let your funnel narrative drive every platform.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
