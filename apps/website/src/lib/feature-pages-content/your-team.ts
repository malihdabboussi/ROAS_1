import type { FeaturePageDefinition } from './types'

export const yourTeamFeaturePage: FeaturePageDefinition = {
  slug: 'your-team',
  metaTitle: 'Your Team | Vibey',
  metaDescription:
    'AI agents that work alongside your team so your best people can focus on the work that actually needs them. Each agent is powered by a brain, trained on your business, and connected to your tools.',
  mockupKind: 'team',
  heroBadges: [
    'Copywriter',
    'Designer',
    'Analyst',
    'Developer',
    'Project Manager',
    'Support',
    'Sales',
    'Operations',
  ],
  hero: {
    kicker: '',
    title: 'YOUR BEST PEOPLE, DOING THEIR BEST WORK',
    subtitle:
      'AI agents handle the execution: research, drafts, data, outreach. So the people you hired for their judgment can actually use it.',
    primaryCta: { href: '/waitlist', label: 'Get Early Access' },
  },
  showcase: {
    title: 'How it actually works',
    subtitle:
      'Agents handle the execution. Your people handle the decisions. Here is how they work together.',
    blocks: [
      {
        mockupKind: 'marketing-org',
        title: 'Agents that actually know your business',
        features: [
          {
            title: 'Powered by a brain, not a prompt',
            description:
              'Each agent connects to your company brain. They already know your context before the task starts.',
          },
          {
            title: 'Built for a role',
            description:
              'Every agent has a defined domain and skills specific to their function. Not generalists pretending to specialize.',
          },
          {
            title: 'They get better over time',
            description:
              'Every correction and decision feeds back into the brain. The longer they work with your team, the sharper they get.',
          },
        ],
      },
      {
        mockupKind: 'studio',
        title: 'Spin up any agent in plain English',
        features: [
          {
            title: 'Just describe what you need',
            description:
              'Tell Jaime, the HR agent, what role you need filled. A competitive research agent, a customer success agent, a finance analyst. She builds it.',
          },
          {
            title: 'No configuration required',
            description:
              'Jaime handles the setup: role, brain, skills, tools, and access. You describe the job. The agent shows up ready to work.',
          },
          {
            title: 'Any role, any function',
            description:
              'Agents are not limited to a preset catalog. If you can describe the work, Jaime can build the agent for it.',
          },
        ],
      },
      {
        mockupKind: 'mission-activity-score',
        title: 'Your employee reviews, not rebuilds',
        features: [
          {
            title: 'The agent does the work',
            description:
              'Research, first drafts, data pulls, outreach sequences, summaries. The output arrives ready for review, not ready to start.',
          },
          {
            title: 'Your employee directs',
            description:
              'They open the output, refine what matters, approve or redirect. That is the shift: from doing to directing.',
          },
          {
            title: 'The gap closes over time',
            description:
              'As agents learn your standards, the gap between their output and your expectations gets smaller. Less review, more trust.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Get Early Access',
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Will this replace my employees?',
        a: 'No. Agents handle the execution work: research, drafts, data pulls, outreach. Your employees direct the work, make the decisions, and refine what the agents produce. The shift is from doing to directing.',
      },
      {
        q: 'How do agents know our business context?',
        a: 'Every agent connects to your company brain. It holds your processes, decisions, and organizational knowledge. Agents pull from it automatically so they show up informed, not blank.',
      },
      {
        q: 'What is Jaime?',
        a: 'Jaime is the HR agent. You tell her what role you need and she builds the agent: role, brain, skills, tools, and access. No configuration required on your end.',
      },
      {
        q: 'How many agents can we have?',
        a: 'Unlimited. Start with the roles that would have the biggest impact on your team and add from there.',
      },
      {
        q: 'How do agents get better over time?',
        a: 'Every correction, every piece of feedback, and every approved output feeds back into the agent brain. The longer they work with your team, the smaller the gap between their output and your expectations.',
      },
      {
        q: 'Is our data kept private?',
        a: 'Yes. Every workspace is tenant-isolated. Your organizational knowledge is never used to train public models.',
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
    ctaLabel: 'Get Early Access',
  },
}
