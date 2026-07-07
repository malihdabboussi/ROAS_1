import type { FeaturePageDefinition } from './types'

export const teamFeaturePage: FeaturePageDefinition = {
  slug: 'team',
  metaTitle: 'Agent Team | Vibey',
  metaDescription:
    'Specialized agents for strategy, copy, funnels, and distribution-coordinated inside one Studio thread.',
  mockupKind: 'team',
  heroBadges: ['Strategist', 'Copywriter', 'Funnel builder', 'Ads specialist', 'Analyst'],
  hero: {
    kicker: '',
    title: 'A ROSTER THAT SHOWS UP IN ONE THREAD',
    subtitle:
      'Instead of juggling tools and freelancers, Vibey routes work between specialized agents while you stay in conversation. Strategy, copy, build, and distribution-coordinated automatically.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/your-team', label: 'See Your Team' },
  },
  comparison: {
    title: 'Team mode vs. solo assistant',
    subtitle: 'One generalist can only do one thing at a time. A coordinated team ships campaigns.',
    columns: ['Vibey Agent Team', 'Single AI assistant'],
    rows: [
      {
        label: 'Specialization',
        cells: ['Implicit specialist agents per discipline', 'One generalist persona'],
      },
      {
        label: 'Outputs',
        cells: ['Artifacts per discipline in parallel', 'Sequential single-format replies'],
      },
      {
        label: 'Coordination',
        cells: ['Shared mission context and Brain', 'Manual copy/paste between chats'],
      },
      { label: 'Scale', cells: ['Adds capacity without headcount', 'Linear human time'] },
      {
        label: 'Quality control',
        cells: ['Review checkpoints before publish', 'No built-in review step'],
      },
      { label: 'Learning', cells: ['Insights feed The Workspace Brain', 'Session-scoped only'] },
    ],
  },
  showcase: {
    title: 'How your AI team operates',
    subtitle: 'You talk to Vibey. Behind the scenes, specialists divide the work.',
    blocks: [
      {
        mockupKind: 'team',
        title: 'Mission kickoff and planning',
        features: [
          {
            title: 'You set the objective',
            description:
              'Describe the campaign goal-launch a product, fill a webinar, generate leads. Vibey sequences the work across agents.',
          },
          {
            title: 'Strategic planning',
            description:
              'The strategist agent maps the campaign: which assets, which channels, what sequence, what positioning.',
          },
          {
            title: 'Task delegation',
            description:
              'Work items get routed to the right specialist-copy to the copywriter, pages to the funnel builder, ads to the ads agent.',
          },
        ],
      },
      {
        mockupKind: 'studio',
        title: 'Parallel execution',
        features: [
          {
            title: 'Simultaneous builds',
            description:
              'Copy, layout, and funnel tasks advance in parallel. You do not wait for one to finish before the next starts.',
          },
          {
            title: 'Shared context',
            description:
              'Every agent reads from the same Workspace Brain, so voice, positioning, and audience stay aligned across deliverables.',
          },
          {
            title: 'Artifact hand-off',
            description:
              'When one agent finishes, the output feeds directly into the next step-copy flows into the funnel builder, funnel data flows into ads.',
          },
        ],
      },
      {
        mockupKind: 'funnels',
        title: 'Review, approve, and ship',
        features: [
          {
            title: 'Review checkpoints',
            description:
              'Nothing goes live without your approval. Agents surface artifacts for review before publishing.',
          },
          {
            title: 'In-chat iteration',
            description:
              'Request changes in natural language. The responsible agent updates the artifact while others continue their work.',
          },
          {
            title: 'Mission complete',
            description:
              'When all assets are approved, Vibey publishes the campaign and logs learnings back to Brain.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Control and visibility',
    subtitle: 'Your AI team is transparent-not a black box.',
    items: [
      {
        title: 'Mission dashboard',
        description:
          'See which agents are working, what they produced, and what is pending review.',
      },
      {
        title: 'Approval gates',
        description: 'Nothing ships without explicit human approval. You are always in the loop.',
      },
      {
        title: 'Workspace policies',
        description:
          'Define what agents can and cannot do. Guard sensitive actions with approval steps.',
      },
      {
        title: 'Bounded scope',
        description: 'Missions are scoped to marketing workflows-not open-ended tool spam.',
      },
      {
        title: 'Team collaboration',
        description: 'Human teammates can join missions, review artifacts, and add context.',
      },
      {
        title: 'Learning loop',
        description:
          'Results from shipped campaigns feed back into Brain for continuous improvement.',
      },
    ],
  },
  steps: {
    title: 'Launch a mission in three steps',
    items: [
      {
        title: 'Brief',
        description:
          'Tell Vibey your campaign goal, target audience, and desired channels. The strategist takes it from there.',
      },
      {
        title: 'Execute',
        description:
          'Specialist agents build copy, pages, and ads in parallel. You see progress in real time.',
      },
      {
        title: 'Review and ship',
        description:
          'Approve each artifact, request changes in chat, and publish the full campaign when ready.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Do I talk to each agent separately?',
        a: 'No. You speak normally in Studio. Vibey delegates to the right specialist behind the scenes.',
      },
      {
        q: 'Can I restrict certain actions?',
        a: 'Yes. Workspace policies and approval gates govern what agents can do autonomously.',
      },
      {
        q: 'How is this different from AutoGPT-style loops?',
        a: 'Missions are bounded to marketing workflows with human-visible artifacts and review checkpoints-not open-ended tool chains.',
      },
      {
        q: 'What specialists are available?',
        a: 'Strategist, copywriter, funnel builder, ads specialist, and analyst. The roster expands as Vibey evolves.',
      },
      {
        q: 'Can I add my own agents?',
        a: 'Custom agent configuration is on the enterprise roadmap. Today, Vibey ships with a curated team.',
      },
      {
        q: 'How do agents share context?',
        a: 'Through The Workspace Brain and the shared mission workspace. Every agent sees the same brand voice, ICP, and campaign brief.',
      },
      {
        q: 'What happens if I disagree with an agent output?',
        a: 'Request changes in natural language. The responsible agent revises the artifact. Nothing ships without your approval.',
      },
      {
        q: 'Does the team learn from feedback?',
        a: 'Yes. Approved outputs and corrections are crystallized in The Workspace Brain, making future missions sharper.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to stop juggling tools?',
    subtitle: 'Let a coordinated AI team handle strategy, build, and distribution from one thread.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
