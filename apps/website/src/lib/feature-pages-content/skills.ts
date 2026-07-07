import type { FeaturePageDefinition } from './types'

export const skillsFeaturePage: FeaturePageDefinition = {
  slug: 'skills',
  metaTitle: 'Vibey Skills | Vibey',
  metaDescription:
    'Teach your agent repeatable plays-lead magnets, webinar funnels, launch sequences-so campaigns start from proven scaffolds.',
  mockupKind: 'skills-hero',
  heroBadges: ['Playbooks', 'Templates', 'Custom skills', 'Shared library', 'One-click launch'],
  hero: {
    kicker: '',
    title: 'TEACH YOUR AGENT REPEATABLE PLAYS',
    subtitle:
      'Skills are reusable campaign scaffolds. Define the play once-lead magnet, webinar funnel, product launch-and run it anytime with fresh context.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/missions', label: 'See Missions' },
  },
  showcase: {
    title: 'Everything you need to scale campaign execution',
    subtitle: 'Skills capture what works so your team runs proven plays instead of guessing.',
    blocks: [
      {
        mockupKind: 'skill-stack',
        title: 'Built-in plays',
        features: [
          {
            title: 'Lead magnet funnel',
            description:
              'Landing page + PDF + email sequence scaffold ready to fill with your offer.',
          },
          {
            title: 'Webinar registration',
            description: 'Registration page + confirmation sequence + reminder flow in one skill.',
          },
          {
            title: 'Product launch',
            description:
              'Pre-launch, launch day, and follow-up sequence structured as a single play.',
          },
        ],
      },
      {
        mockupKind: 'skill-builder',
        title: 'Create your own',
        features: [
          {
            title: 'Custom skill builder',
            description:
              'Define the structure, prompts, and artifact types. Save as a reusable skill.',
          },
          {
            title: 'Brain-connected',
            description:
              'Skills pull from The Workspace Brain so every run inherits your latest brand context.',
          },
          {
            title: 'Version control',
            description: 'Update a skill and every future run uses the improved version.',
          },
        ],
      },
      {
        mockupKind: 'skill-library',
        title: 'Share and scale',
        features: [
          {
            title: 'Team library',
            description:
              'Share skills across your workspace. New teammates launch campaigns from day one.',
          },
          {
            title: 'One-click launch',
            description: 'Pick a skill, provide the brief, and Vibey runs the full play.',
          },
          {
            title: 'Continuous improvement',
            description:
              'Campaign results feed back into Brain, making the next skill run sharper.',
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
        q: 'What is a Vibey Skill?',
        a: 'A reusable campaign scaffold that defines structure, prompts, and artifact types. Run it with fresh context anytime.',
      },
      {
        q: 'Can I create my own skills?',
        a: 'Yes. Define the workflow, save it, and share with your team.',
      },
      {
        q: 'Do skills use The Workspace Brain?',
        a: 'Yes. Every skill run pulls the latest brand voice, ICP, and positioning from Brain.',
      },
      { q: 'Can teammates use my skills?', a: 'Yes. Skills are shared at the workspace level.' },
      {
        q: 'What built-in skills ship with Vibey?',
        a: 'Lead magnet funnels, webinar registration, product launches, and more. The library grows continuously.',
      },
    ],
  },
  standaloneVideo: {
    title: 'Skills in action',
    subtitle: 'See how reusable playbooks turn strategy into one-click execution.',
    videoSrc:
      'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/videos/1775544386756-Skills.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvdmlkZW9zLzE3NzU1NDQzODY3NTYtU2tpbGxzLm1wNCIsImlhdCI6MTc3NTU0NDU4NCwiZXhwIjoyMDkwOTA0NTg0fQ.6M0AHuX4tkMscrrcoJIvnUk48VrAdCFBBp0zueTv5Bk',
  },
  finalCta: {
    title: 'Ready to stop reinventing every campaign?',
    subtitle: 'Build proven plays once. Run them on demand. Get sharper with every launch.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
