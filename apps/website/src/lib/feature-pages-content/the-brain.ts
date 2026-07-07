import type { FeaturePageDefinition } from './types'

export const theBrainFeaturePage: FeaturePageDefinition = {
  slug: 'the-brain',
  metaTitle: 'The Brain | Vibey',
  metaDescription:
    'Vibey structures the knowledge scattered across your organization into four living brains: User, Agent, Company, and Customer. So your AI agents can operate on it, not just search through it.',
  mockupKind: 'brain',
  heroBadges: [
    'User Brain',
    'Agent Brain',
    'Company Brain',
    'Customer Brain',
    'Files',
    'Meetings',
    'Slack',
    'Gmail',
    'Atlas',
  ],
  hero: {
    kicker: '',
    title: 'YOUR DOMAIN KNOWLEDGE, EXECUTABLE BY AI',
    subtitle:
      'Vibey pulls the knowledge scattered across your people, tools, and processes and structures it into four living brains: User, Agent, Company, and Customer. So your AI agents can operate on it, not just search through it.',
    primaryCta: { href: '/waitlist', label: 'Get Early Access' },
  },
  comparison: {
    title: 'The Brain vs. stateless AI',
    columns: ['With the Brain', 'Without it'],
    rows: [
      {
        label: 'Domain knowledge',
        cells: ['Structured, current, and executable by agents', 'Scattered across people, tools, and documents'],
      },
      {
        label: 'Agent context',
        cells: ['Pulled automatically from the right brain', 'Re-explained every session'],
      },
      {
        label: 'Organizational memory',
        cells: ['Shared across every agent in the workspace', 'Locked in individual threads'],
      },
      {
        label: 'New agent onboarding',
        cells: ['Instant — Brain carries the context', 'Weeks of manual briefing'],
      },
      {
        label: 'Customer knowledge',
        cells: ['Built from real signals and interactions', 'Fabricated avatars and assumptions'],
      },
      {
        label: 'Knowledge decay',
        cells: ['Brain stays current as the org evolves', 'Goes stale the moment someone leaves'],
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
        title: 'Four brains, one memory layer',
        features: [
          {
            title: 'User Brain',
            description:
              'Everything about the individual: how they work, decide, communicate, and what they know. Applied across every agent they interact with.',
          },
          {
            title: 'Agent Brain',
            description:
              'Role-specific expertise built from real sources. What a great support agent knows, how a great sales agent thinks. Not a prompt pretending to have it.',
          },
          {
            title: 'Company Brain',
            description:
              'How the organization works: how decisions get made, how processes run, how exceptions get handled. The institutional knowledge AI agents need to act reliably.',
          },
          {
            title: 'Customer Brain',
            description:
              'Real customer signals from real interactions. Not fabricated avatars. What customers actually say, need, object to, and care about.',
          },
        ],
      },
      {
        mockupKind: 'raw-to-signal',
        title: 'Feed it anything',
        features: [
          {
            title: 'Files and documents',
            description:
              'PDFs, Word docs, spreadsheets, and presentations. Uploaded and indexed instantly.',
          },
          {
            title: 'Meetings and conversations',
            description:
              'Fathom, Zoom, and Fireflies recordings. Slack threads, Gmail, and Outlook. Decisions and signals from where your team already works, captured automatically.',
          },
          {
            title: 'Cloud storage and direct input',
            description:
              'Google Drive, Notion, and Dropbox for what already exists. Paste notes, frameworks, or SOPs directly for everything else.',
          },
        ],
      },
      {
        mockupKind: 'atlas-voice',
        title: 'Meet Atlas, your Brain Scholar',
        features: [
          {
            title: 'Maps what the Brain knows',
            description:
              'Atlas periodically reviews every brain in your workspace, finds patterns, surfaces gaps, and keeps the knowledge current.',
          },
          {
            title: 'Talk to it directly',
            description:
              'Ask Atlas what your organization knows, what is missing, or what should be captured next. Voice or text.',
          },
          {
            title: 'Keeps agents sharp',
            description:
              'Because Atlas maintains the brains, every agent always operates on accurate, organized context — not outdated assumptions.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Get Early Access',
  },
  articlePromo: {
    title: 'A brain that builds a real identity',
    subtitle:
      'The Brain does not just store information. Over time, memories form beliefs, beliefs form perspectives, and perspectives form a worldview. Read how Vibey builds identity for agents, users, and organizations.',
    ctaLabel: 'Read the full story',
    ctaHref: '/blog/the-brain',
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What is the difference between the four brains?',
        a: 'The User Brain holds everything about an individual: how they work, decide, and communicate. The Agent Brain holds role-specific expertise for a particular agent. The Company Brain captures how the organization operates: processes, decisions, and institutional knowledge. The Customer Brain is built from real customer signals — what they say, need, and object to — not fabricated personas.',
      },
      {
        q: 'What is a memory?',
        a: 'A memory is a structured piece of knowledge stored with context: what was captured, when, from which source, and what emotion or significance was attached to it. Memories are the raw material the Brain learns from.',
      },
      {
        q: 'How does the Brain get smarter over time?',
        a: 'As memories accumulate, Atlas detects recurring patterns and surfaces them as beliefs. Clusters of related beliefs form perspectives. Together they give agents an increasingly accurate picture of how your organization thinks and operates.',
      },
      {
        q: 'What is Atlas?',
        a: 'Atlas is the Brain Scholar agent. It maps what each brain knows, identifies gaps and outdated knowledge, and keeps everything organized so agents always operate on accurate context.',
      },
      {
        q: 'What can I feed into the Brain?',
        a: 'Files and documents, meeting recordings from Fathom or Zoom, Slack threads, Gmail and Outlook conversations, Google Drive, Notion, Dropbox, and direct manual input.',
      },
      {
        q: 'Is my data used to train public models?',
        a: 'No. Every brain is tenant-isolated. Your organizational knowledge is never used to train public AI models.',
      },
      {
        q: 'Can I delete or edit a memory?',
        a: 'Yes. You have full control. Edit or remove any memory at any time so agents stop applying outdated or incorrect context.',
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
    ctaLabel: 'Get Early Access',
  },
}
