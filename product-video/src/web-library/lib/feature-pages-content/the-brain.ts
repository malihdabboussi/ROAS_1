import type { FeaturePageDefinition } from './types'

export const theBrainFeaturePage: FeaturePageDefinition = {
  slug: 'the-brain',
  metaTitle: 'The Brain | Vibey',
  metaDescription:
    'Three layers of persistent memory that compound over time. Brand voice, audience insights, conversion patterns: applied to every campaign.',
  mockupKind: 'brain',
  heroBadges: [
    'Brand voice',
    'Audience insights',
    'Conversion patterns',
    'Guardrails',
    'Document import',
    'Video transcripts',
    'Meeting recordings',
  ],
  hero: {
    kicker: '',
    title: 'MEMORY THAT COMPOUNDS',
    subtitle:
      'Every approved insight becomes a reusable signal. Vibey applies brand voice, ICP notes, and winning angles automatically: so every campaign gets sharper.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/autopilot', label: 'See Autopilot' },
  },
  comparison: {
    title: 'The Brain vs. stateless AI',
    columns: ['The Brain', 'Stateless AI'],
    rows: [
      {
        label: 'Brand voice',
        cells: ['Learned and enforced automatically', 'Re-explained each session'],
      },
      { label: 'Audience data', cells: ['Crystallized and reusable', 'Lost when the chat ends'] },
      { label: 'Campaign quality', cells: ['Improves over time', 'Flat baseline every time'] },
      { label: 'Handoffs', cells: ['Shared across agents and teammates', 'Isolated per thread'] },
      {
        label: 'Onboarding',
        cells: ['Once: Brain carries it forward', 'Every session is onboarding'],
      },
      {
        label: 'Compliance',
        cells: ['Guardrails persist across all output', 'Re-applied manually'],
      },
    ],
  },
  showcase: {
    title: 'Everything your agents need to know about your business',
    subtitle:
      'The Brain stores, organizes, and applies the context that makes AI output actually useful.',
    blocks: [
      {
        mockupKind: 'memory-stack',
        title: 'Three layers that work together',
        features: [
          {
            title: 'Your Brain',
            description:
              'Everything about you as an individual: your voice, preferences, personal knowledge. All agents, all campaigns.',
          },
          {
            title: 'Agent Brain',
            description:
              'Expert knowledge for one agent\u2019s specialty: the best copywriting frameworks for your copywriter, financial models for your finance agent.',
          },
          {
            title: 'Campaign Knowledge',
            description:
              'Everything about a specific project: brand guidelines, audience profiles, offer documents, SOPs.',
          },
        ],
      },
      {
        mockupKind: 'raw-to-signal',
        title: 'Feed it anything',
        features: [
          {
            title: 'Documents and files',
            description:
              'PDFs, Word docs, spreadsheets, text files, CSV, JSON, XML: uploaded and indexed instantly.',
          },
          {
            title: 'Video and audio',
            description:
              'YouTube links, uploaded files, meeting recordings from Fathom or Fireflies: transcribed and analyzed.',
          },
          {
            title: 'Manual entries',
            description:
              'Paste notes, frameworks, SOPs directly. Import from Google Drive or Dropbox.',
          },
        ],
      },
      {
        mockupKind: 'atlas-voice',
        title: 'The knowledge graph',
        features: [
          {
            title: 'Connected, not flat',
            description:
              'Memories link to each other through relationships. Clusters of related knowledge form naturally.',
          },
          {
            title: 'Search and manage',
            description:
              'Semantic, graph, or hybrid search across all your memories. Delete single memories or entire sources.',
          },
          {
            title: 'Talk to Atlas',
            description:
              'Voice conversations with your Brain Scholar agent about what you know, what is missing, and what to add next.',
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
        q: 'What is The Brain?',
        a: 'Persistent memory: brand voice, audience insights, conversion patterns, guardrails. Applied automatically to every campaign.',
      },
      {
        q: 'Can I delete a memory?',
        a: 'Yes. Edit or remove any entry so agents stop applying outdated guidance.',
      },
      {
        q: 'Does every teammate share the same Brain?',
        a: 'By default, yes. Enterprise customers can segment by team or brand.',
      },
      {
        q: 'Is my data used to train public models?',
        a: 'No. Vibey isolates tenant context. Refer to the privacy policy for specifics.',
      },
      {
        q: 'What can I import?',
        a: 'Documents, CSVs, Notion pages, Google Drive files, Slack threads, HubSpot data, videos, meeting recordings.',
      },
      {
        q: 'Is there a memory limit?',
        a: 'Generous limits per workspace tier. Enterprise plans have unlimited storage.',
      },
    ],
  },
  standaloneVideo: {
    title: 'Your business memory',
    subtitle: 'Watch how The Brain stores, connects, and surfaces your knowledge.',
    videoSrc:
      'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/videos/1775544377564-thebrian.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvdmlkZW9zLzE3NzU1NDQzNzc1NjQtdGhlYnJpYW4ubXA0IiwiaWF0IjoxNzc1NTQ0NTc5LCJleHAiOjIwOTA5MDQ1Nzl9.x71bRf09yPkP3ceJ3Tsg3tz-3v3Vw0e4PtUQyp8fnSA',
  },
  finalCta: {
    title: 'Stop re-explaining your business',
    subtitle: 'Let The Brain carry your context forward so every campaign starts smarter.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
