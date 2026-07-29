import type { FeaturePageDefinition } from './types'

export const studioFeaturePage: FeaturePageDefinition = {
  slug: 'studio',
  metaTitle: 'ROAS Studio | ROAS',
  metaDescription:
    'One conversation builds funnels, emails, and offers. Real-time artifacts, no template maze.',
  mockupKind: 'app-studio',
  heroBadges: ['Landing pages', 'Email sequences', 'Lead magnets', 'Offers', 'PDFs', 'Ad copy'],
  hero: {
    kicker: '',
    title: 'YOUR MARKETING COMMAND CENTER',
    subtitle:
      'Describe the outcome. ROAS runs the strategy conversation, then materializes landing pages, sequences, and lead magnets as you watch. No templates. No forms. Just talk.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/integrations', label: 'See Integrations' },
  },
  showcase: {
    title: 'Everything you need to build, launch & grow',
    subtitle:
      'Studio is not a chat window with a marketing label. It is a full workspace that creates campaign assets from conversation.',
    blocks: [
      {
        mockupKind: 'prompt-preview',
        title: 'Full campaign from a single prompt',
        features: [
          {
            title: 'Describe your goal',
            description:
              'Share your offer, audience, and channel. ROAS asks clarifying questions, then starts building-no templates, no forms.',
          },
          {
            title: 'Artifacts appear in real time',
            description:
              'Landing pages, PDFs, and email sequences materialize in the sidebar as structured, editable deliverables-not text walls.',
          },
          {
            title: 'Iterate without context switching',
            description:
              'Change copy, swap sections, or adjust tone by talking. The artifact updates in place while you watch.',
          },
        ],
      },
      {
        mockupKind: 'infrastructure-radar',
        title: 'Real marketing infrastructure, not just text',
        features: [
          {
            title: 'Funnel preview + publish',
            description:
              'Preview your landing page exactly as visitors will see it. Push live to ROAS hosting or your custom domain with one click.',
            link: { href: '/features/funnels', label: 'Learn more' },
          },
          {
            title: 'Brand-aware output',
            description:
              'ROAS pulls voice, positioning, and audience insights from The Workspace Brain so every asset matches your brand without re-explaining.',
            link: { href: '/features/brain', label: 'Learn more' },
          },
          {
            title: 'Email sequences & lead magnets',
            description:
              'Drip campaigns and downloadable PDFs ship from the same conversation. No separate tool for each deliverable.',
          },
        ],
      },
      {
        mockupKind: 'analytics',
        title: "Know what's working",
        features: [
          {
            title: 'Funnel analytics',
            description:
              'Page views, visits, and conversions for every published funnel-tracked automatically, no extra setup.',
          },
          {
            title: 'Email performance',
            description:
              'Open rates, click rates, and deliverability for every email sequence-see what content drives action.',
          },
          {
            title: 'Ad reporting',
            description:
              'Impressions, clicks, and cost-per-lead across your ad campaigns-so you know exactly where budget converts.',
          },
        ],
      },
      {
        mockupKind: 'leads',
        title: 'Capture and manage every lead',
        features: [
          {
            title: 'Automatic lead capture',
            description:
              'Every funnel form and lead magnet download feeds into your lead list-no Zapier, no CSV exports.',
          },
          {
            title: 'Source tracking',
            description:
              "See exactly which funnel, email, or ad brought each lead in. Know what's converting before you scale.",
          },
          {
            title: 'CRM sync',
            description:
              'Push leads to GoHighLevel, ActiveCampaign, or your existing CRM with a single OAuth connection.',
            link: { href: '/features/integrations', label: 'Learn more' },
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What is ROAS Studio?',
        a: 'ROAS Studio is a conversational marketing workspace where you build campaign assets in real-time. Unlike a standard chatbot, Studio materializes "artifacts" like landing pages, email sequences, and branded PDFs that you can preview, edit, and publish directly.',
      },
      {
        q: 'What can I send to ROAS in the Studio?',
        a: 'ROAS understands text, URLs, documents (PDFs, spreadsheets), videos (Loom or files), and images. You can drop a link to analyze a competitor or upload a recording to turn it into a week of social content.',
      },
      {
        q: 'When should I use Studio vs. Missions?',
        a: 'Use Studio when you want to be hands-on: brainstorming, refining copy, or steering a build in real-time. Use Missions when you want to hand off a defined goal to your specialist agents to execute in the background.',
      },
      {
        q: 'What are Capability Chips?',
        a: 'Quick-action buttons at the bottom of the chat that kick off common workflows, such as the 6-step Offer Builder, Funnel Creation, or Ad Copy generation. They help guide the conversation toward specific outcomes.',
      },
      {
        q: 'How does Studio use my brand voice?',
        a: 'Every Studio conversation is tied to a campaign. ROAS automatically pulls your brand guidelines, audience insights, and past winners from The Workspace Brain so every new asset sounds like you.',
      },
      {
        q: 'Can I publish directly from the Studio?',
        a: 'Yes. You can push funnels live to ROAS hosting or your custom domain, and send email sequences or ad campaigns directly to connected platforms like SendGrid and Meta.',
      },
      {
        q: 'Is my business data kept private?',
        a: 'Yes. ROAS uses tenant-isolated storage. Your conversations and campaign data are strictly your own and are never used to train public AI models.',
      },
    ],
  },
  standaloneVideo: {
    title: 'Studio walkthrough',
    subtitle: 'See how campaigns come together from brief to launch in one workspace.',
    videoSrc:
      'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/videos/1775544834375-Studio.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvdmlkZW9zLzE3NzU1NDQ4MzQzNzUtU3R1ZGlvLm1wNCIsImlhdCI6MTc3NTU0NDk1MiwiZXhwIjoyMDkwOTA0OTUyfQ.7uYGej2O3mJhba5AEaX20SkzSr9ccgKSFSuQjNp56eM',
  },
  finalCta: {
    title: 'Ready to build your next campaign?',
    subtitle:
      'Join thousands of founders and growth teams using Studio to launch faster than ever.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
