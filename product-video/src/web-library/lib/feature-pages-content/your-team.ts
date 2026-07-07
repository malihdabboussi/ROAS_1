import type { FeaturePageDefinition } from './types'

export const yourTeamFeaturePage: FeaturePageDefinition = {
  slug: 'your-team',
  metaTitle: 'Your Team | Vibey',
  metaDescription:
    'Specialist AI agents you hire, train, and manage. Each with their own role, personality, memory, tools, and performance score.',
  mockupKind: 'team',
  heroBadges: [
    'Copywriter',
    'Designer',
    'Analyst',
    'Developer',
    'Project Manager',
    'Ads Manager',
    'Social Media',
    'Support',
  ],
  hero: {
    kicker: '',
    title: 'YOUR TEAM. THEIR EXPERTISE.',
    subtitle:
      'Specialist agents you hire, train, and manage. Each with their own role, personality, memory, tools, and a performance score. They get better over time.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/missions', label: 'See Missions' },
  },
  showcase: {
    title: 'How your team operates',
    subtitle:
      'You hire them, train them, and manage them. They execute with real tools and real memory.',
    blocks: [
      {
        mockupKind: 'marketing-org',
        title: 'Meet your specialists',
        features: [
          {
            title: 'Roles and domains',
            description:
              'Marketing, analyst, developer, support, shared/PM. Each agent belongs to a domain that determines their tools.',
          },
          {
            title: 'Personality',
            description:
              'DISC profiles shape how agents approach work: a Dominant analyst delivers blunt assessments, an Influential designer focuses on brand harmony.',
          },
          {
            title: 'Intelligence tiers',
            description:
              'Economy for simple tasks, Auto for most work, Power for complex strategy. Start with Auto and adjust based on results.',
          },
        ],
      },
      {
        mockupKind: 'studio',
        title: 'Hire, train, trust',
        features: [
          {
            title: 'The HR agent',
            description:
              'Tell Vibey what you need. HR recommends the right specialist to hire for your team.',
          },
          {
            title: 'One-on-one testing',
            description:
              'Chat with any agent directly on the Team page before trusting them with real work.',
          },
          {
            title: 'Skill refinement',
            description:
              'Build skills, test output, adjust until quality is dialed in for your business.',
          },
        ],
      },
      {
        mockupKind: 'mission-activity-score',
        title: 'Performance and scoring',
        features: [
          {
            title: '7 scoring dimensions',
            description:
              'Quality, reliability, initiative, communication, spec adherence, learning rate, and execution speed.',
          },
          {
            title: 'Scores compound',
            description:
              'Weighted and accumulated over time. You see trends on each agent\u2019s profile.',
          },
          {
            title: 'Feedback loop',
            description:
              'Your corrections make agents better: not just for this task, but for all future work.',
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
        q: 'How is this different from a regular chatbot?',
        a: 'Instead of one generalist AI, you have a team of specialists. A copywriter writes, an analyst researches, and a developer builds. They work together on missions, coordinated by Vibey, using specific skills and memory tuned for your business.',
      },
      {
        q: 'How many agents can I hire?',
        a: 'You can hire unlimited agents on all plans. We recommend starting with 1-2 specialists for your core tasks and scaling your team as your operations grow.',
      },
      {
        q: 'Do agents share the same knowledge?',
        a: 'Agents access three layers of memory: Your Brain (personal context), Campaign Knowledge (project-specific), and their own Agent Brain (specialized expertise). This ensures they have the right context for the right task.',
      },
      {
        q: 'What are intelligence tiers?',
        a: 'You can choose the thinking power for each agent: Economy (powered by Gemini) for routine tasks, Auto (powered by Claude) for most content and analysis, and Power (powered by Claude) for complex strategy and coordination.',
      },
      {
        q: 'How do I train my agents?',
        a: 'Training is a loop: feed their Agent Brain with expert references, build Skills for repeatable tasks, and test them one-on-one. Your feedback on missions automatically improves their performance scores over time.',
      },
      {
        q: 'Can one agent work on multiple projects?',
        a: 'Yes. You hire an agent once and assign them to any number of campaigns. They automatically pull the relevant context from whichever campaign they are currently working on.',
      },
      {
        q: 'Is my business data kept private?',
        a: 'Yes. Vibey uses tenant-isolated storage, meaning your Brain context and agent training are strictly your own. Your data is never used to train public models.',
      },
    ],
  },
  standaloneVideo: {
    title: 'Control and visibility',
    subtitle: 'Your AI team is transparent: not a black box.',
    videoSrc:
      'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/videos/1775559485781-team%2Bhire.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvdmlkZW9zLzE3NzU1NTk0ODU3ODEtdGVhbStoaXJlLm1wNCIsImlhdCI6MTc3NTU1OTUyMCwiZXhwIjoyMDkwOTE5NTIwfQ.hk7vPkTxMBSpjsxaWBSA-tSPWgpLDfpwn4lMrHtKkwY',
  },
  finalCta: {
    title: 'Ready to build your team?',
    subtitle: 'Specialist agents that learn your business and get better with every project.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
