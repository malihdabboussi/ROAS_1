import type { FeaturePageDefinition } from './types'

export const missionsFeaturePage: FeaturePageDefinition = {
  slug: 'missions',
  metaTitle: 'Missions | ROAS',
  metaDescription:
    'Delegate work to your AI team. Describe the outcome, ROAS plans the subtasks, assigns specialists, and delivers finished work for your review.',
  mockupKind: 'mission-detail-modal',
  heroBadges: [
    'Delegation',
    'Subtasks',
    'Deliverables',
    'Priority',
    'Dependencies',
    'Comments',
    'Review',
  ],
  hero: {
    kicker: '',
    title: 'DESCRIBE THE OUTCOME. YOUR TEAM HANDLES THE REST.',
    subtitle:
      'Studio is hands-on. Missions are hands-off. You write the brief, ROAS breaks it into subtasks, assigns the right agents, and delivers finished work for your review.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/capabilities', label: 'See Capabilities' },
  },
  comparison: {
    title: 'Missions vs. doing it yourself',
    columns: ['ROAS Missions', 'Doing it yourself'],
    rows: [
      {
        label: 'Planning',
        cells: ['ROAS breaks the brief into subtasks', 'You plan every step manually'],
      },
      {
        label: 'Execution',
        cells: ['Specialist agents work in parallel', 'You do each task sequentially'],
      },
      {
        label: 'Coordination',
        cells: ['Dependencies managed automatically', 'You manage handoffs'],
      },
      { label: 'Review', cells: ['Deliverables appear for approval', 'You check your own work'] },
      { label: 'Scale', cells: ['Send 10 missions simultaneously', 'Linear human time'] },
      {
        label: 'Learning',
        cells: ['Results feed back into Brain', 'Knowledge stays in your head'],
      },
    ],
  },
  showcase: {
    title: 'How delegation works',
    subtitle: 'You define the outcome. Your team figures out how to get there.',
    blocks: [
      {
        mockupKind: 'mission-execution',
        title: 'How missions work',
        features: [
          {
            title: 'You write the brief',
            description:
              'Describe the end result you need. Be specific about the deliverable: what, for whom, in what format.',
          },
          {
            title: 'ROAS plans',
            description:
              'The CEO agent analyzes the mission, breaks it into subtasks, and assigns the right specialist for each piece.',
          },
          {
            title: 'Deliverables come back',
            description:
              'As each subtask finishes, deliverables appear for your review. Preview, approve, comment, or request revisions.',
          },
        ],
      },
      {
        mockupKind: 'mission-deliverable-stacks',
        title: 'What you can delegate',
        features: [
          {
            title: 'Marketing campaigns',
            description:
              'Nurture sequences, funnel builds, ad campaigns, social content series: from brief to deliverable.',
          },
          {
            title: 'Research and analysis',
            description:
              'Competitor research, market analysis, content research at scale: delivered as structured reports.',
          },
          {
            title: 'Operations and content',
            description:
              'Client onboarding flows, status reports, meeting summaries, blog posts from recordings.',
          },
        ],
      },
      {
        mockupKind: 'mission-activity-timeline',
        title: 'Activity and control',
        features: [
          {
            title: 'Mission timeline',
            description:
              'Status changes, agent assignments, execution events, and your comments: all tracked in one view.',
          },
          {
            title: 'Subtask dependencies',
            description:
              'Research finishes before writing starts. Writer finishes before designer starts on visuals.',
          },
          {
            title: 'Priority levels',
            description:
              'Low, Medium, High, Urgent: signal what matters now across all your active missions.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  steps: {
    title: 'Delegate in three steps',
    items: [
      {
        title: 'Write the brief',
        description:
          'Describe what you need done. Attach files, reference the campaign for context.',
        mockupKind: 'mission-delegate-step-brief',
      },
      {
        title: 'Review the plan',
        description:
          'ROAS shows the subtask breakdown. Approve the plan or adjust before execution starts.',
        mockupKind: 'mission-delegate-step-plan',
      },
      {
        title: 'Review deliverables',
        description: 'Each completed subtask produces output. Approve, revise, or comment.',
        mockupKind: 'mission-delegate-step-deliverable',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Do I have to plan the subtasks myself?',
        a: 'No. ROAS\u2019s CEO agent creates the plan. You approve it.',
      },
      {
        q: 'Can I send multiple missions at once?',
        a: 'Yes. Agents work across missions in parallel.',
      },
      {
        q: 'What if I disagree with the plan?',
        a: 'Request changes. The plan gets revised before execution starts.',
      },
      {
        q: 'How do I give feedback mid-mission?',
        a: 'Comment on the mission with text and attachments. Agents see your feedback.',
      },
      {
        q: 'Can missions use my integrations?',
        a: 'Yes. Agents access every connected platform during execution.',
      },
      {
        q: 'What happens if a subtask fails?',
        a: 'It gets retried automatically. If still stuck, you\u2019re notified.',
      },
    ],
  },
  standaloneVideo: {
    title: 'Missions in action',
    subtitle: 'See how your team coordinates to deliver complete campaigns.',
    videoSrc:
      'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/videos/17755442123N-missions.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvdmlkZW9zLzE3NzU1NDQyMTIzTi1taXNzaW9ucy5tcDQiLCJpYXQiOjE3NzU1NDQ1NzcsImV4cCI6MjA5MDkwNDU3N30.VS_oc6qNVfEYCeJWcZerX0zlLZ8V8VzvvwXp0wOfpNQ',
  },
  finalCta: {
    title: 'Ready to stop doing everything yourself?',
    subtitle: 'Describe the outcome. Your team handles the rest.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
