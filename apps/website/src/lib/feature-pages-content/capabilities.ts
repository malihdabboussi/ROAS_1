import type { FeaturePageDefinition } from './types'

export const capabilitiesFeaturePage: FeaturePageDefinition = {
  slug: 'capabilities',
  metaTitle: 'Capabilities | ROAS',
  metaDescription:
    'Everything your AI team can produce: funnels, email, ads, video, images, audio, apps, dashboards, research, and more.',
  mockupKind: 'capabilities-carousel',
  heroBadges: [
    'Funnels',
    'Email',
    'Ads',
    'Social',
    'Video',
    'Images',
    'Audio',
    'Apps',
    'Analytics',
    'Presentations',
  ],
  hero: {
    kicker: '',
    title: 'THE LIMIT IS WHAT YOU CAN TEACH',
    subtitle:
      'If you can describe a workflow and show your agents what great looks like, they can learn it, repeat it, and improve on it. Marketing, media, operations, development: and whatever comes next.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/skills', label: 'See Skills' },
  },
  showcase: {
    title: 'Everything your team can produce',
    subtitle:
      'Marketing is the deepest vertical. But the platform works across your entire operation.',
    blocks: [
      {
        mockupKind: 'capabilities-showcase-gtm',
        title: 'Marketing and go-to-market',
        features: [
          {
            title: 'Offers and funnels',
            description:
              'Six-step offer workbooks, landing pages published to your domain, lead magnets, call booking, webinars, and ecommerce.',
          },
          {
            title: 'Ads and social',
            description:
              'Structured ad campaigns published to Meta, plus social content created, scheduled, and published to LinkedIn and Instagram.',
          },
          {
            title: 'Email and presentations',
            description:
              'Multi-email nurture series sent via SendGrid, plus branded slide-based documents exportable as PDF or PPTX.',
          },
        ],
      },
      {
        mockupKind: 'capabilities-showcase-media',
        title: 'Media and production',
        features: [
          {
            title: 'Video generation',
            description:
              'Create high-fidelity videos from text or image prompts using Veo, Kling, and more.',
          },
          {
            title: 'Video editing',
            description:
              'Trim, merge, extract audio, add soundtracks, resize, and convert between formats with real ffmpeg tools.',
          },
          {
            title: 'Images and audio',
            description:
              'AI-generated images powered by Gemini and Imagen. Text-to-speech with natural voices from ElevenLabs, OpenAI, and Edge. High-fidelity transcription with Deepgram.',
          },
        ],
      },
      {
        mockupKind: 'capabilities-showcase-ops',
        title: 'Business operations and beyond',
        features: [
          {
            title: 'Apps and dashboards',
            description:
              'Build full web applications, custom dashboards with widgets, and import projects from GitHub.',
          },
          {
            title: 'Research and reports',
            description:
              'Competitor analysis, market research, financial reports, status updates, and client deliverables at scale.',
          },
          {
            title: 'The open frontier',
            description:
              'People use ROAS to manage client work, coordinate teams, generate training materials, build internal tools, and run operations we never anticipated.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Real infrastructure, not suggestions',
    subtitle: 'Everything publishes, sends, and tracks: not just previews.',
    items: [
      {
        title: 'Built-in marketing engine',
        description: 'Funnels, email, ads, social, and leads all ship as infrastructure.',
      },
      {
        title: 'Real tools',
        description:
          'Video editing, image generation, and audio production on a dedicated cloud computer.',
      },
      {
        title: 'Domain-agnostic',
        description:
          'Marketing is the deepest vertical but the platform works across any business function.',
      },
      {
        title: 'Everything publishes',
        description: 'Funnels to your domain, emails from your domain, ads to your ad accounts.',
      },
      {
        title: 'Analytics included',
        description:
          'Page views, email opens, ad performance, and attribution tracked automatically.',
      },
      {
        title: 'Extensible',
        description:
          'If your agents have the right skills, brain, and tools, they can do the work.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What can ROAS actually build?',
        a: 'Funnels, websites, email sequences, ad campaigns, social content, presentations, video, images, audio, apps, dashboards, research reports, and more.',
      },
      {
        q: 'Is this just for marketing?',
        a: 'Marketing is the deepest vertical with a built-in engine. But agents handle content production, business operations, client management, development, and anything you teach them.',
      },
      {
        q: 'Do funnels actually publish?',
        a: 'Yes. To ROAS hosting or your custom domain. Live, with lead capture and analytics.',
      },
      { q: 'Do emails actually send?', a: 'Yes. From your verified domain via SendGrid.' },
      {
        q: 'Can agents edit video?',
        a: 'Yes. Trim, merge, resize, add soundtracks, extract audio using real ffmpeg tools on the cloud computer.',
      },
      {
        q: 'What are the limits?',
        a: 'The platform is limited by your agents\u2019 skills, brain content, and connected integrations. The more you invest in training, the more they can do.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to see what your team can build?',
    subtitle: 'Marketing, media, operations, development: the limit is what you can teach.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
