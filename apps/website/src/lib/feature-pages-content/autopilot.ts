import type { FeaturePageDefinition } from './types'

export const autopilotFeaturePage: FeaturePageDefinition = {
  slug: 'autopilot',
  metaTitle: 'Autopilot | Vibey',
  metaDescription:
    'Define your strategy, enable Autopilot, and close the tab. Vibey monitors progress, creates missions, retries failures, and sends you a daily digest.',
  mockupKind: 'autopilot-depth',
  heroBadges: [
    'Strategy',
    'Monitoring',
    'Auto-missions',
    'Daily digest',
    'Recovery',
    'Telegram',
    'Slack',
  ],
  hero: {
    kicker: '',
    title: 'YOUR CEO NEVER SLEEPS',
    subtitle:
      'Define your strategy, turn on Autopilot, and close the tab. Vibey monitors progress, creates missions, retries failures, and sends you a daily digest of what happened.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/the-brain', label: 'See The Brain' },
  },
  showcase: {
    title: 'How Autopilot runs your operation',
    subtitle: 'Set your strategy once. Vibey keeps everything moving toward your goals.',
    blocks: [
      {
        mockupKind: 'northstar-guardrail',
        title: 'The North Star',
        features: [
          {
            title: 'Result',
            description:
              'What does success look like? Define the measurable outcome your campaign is working toward.',
          },
          {
            title: 'Strategy and purpose',
            description:
              'Why does this campaign exist and how are you getting there? Every autonomous decision checks against these guardrails.',
          },
          {
            title: 'Off-Limits',
            description:
              'What will you NOT do? Hard boundaries that prevent your agents from going off-track.',
          },
        ],
      },
      {
        mockupKind: 'dynamic-router',
        title: 'What Vibey does autonomously',
        features: [
          {
            title: 'Create missions',
            description:
              'Identify work that needs to happen and assign it to the right agents proactively.',
          },
          {
            title: 'Retry and recover',
            description:
              'Failed tasks get re-attempted with a smarter approach. Stuck work gets nudged forward.',
          },
          {
            title: 'Reassign and adjust',
            description:
              'Move work to better-suited agents. Pause, amend, or replan missions mid-execution.',
          },
        ],
      },
      {
        mockupKind: 'daily-digest',
        title: 'Stay informed, stay in control',
        features: [
          {
            title: 'Daily digest',
            description:
              'A narrative summary sent to Studio, Telegram, or Slack: what got done, what\u2019s in progress, what needs attention.',
          },
          {
            title: 'Auto-approve',
            description:
              'Plans can auto-approve so agents start immediately, or pause for your review. You choose the control level.',
          },
          {
            title: 'Credits safety',
            description:
              'If credits run out, Autopilot pauses and notifies you. Enable auto-recharge to prevent interruption.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Autonomous but accountable',
    subtitle: 'Vibey acts, but you always have the final word.',
    items: [
      {
        title: 'Strategy guardrails',
        description: 'Every decision checked against your North Star.',
      },
      {
        title: 'Always watching',
        description: 'Even with Autopilot off, failed work gets retried and stuck tasks recovered.',
      },
      { title: 'Daily digest', description: 'Morning briefing sent to your preferred channel.' },
      { title: 'Auto-approve toggle', description: 'You choose how much control to retain.' },
      { title: 'Credit safety', description: 'Auto-recharge option prevents interruption.' },
      {
        title: 'Multi-campaign',
        description: 'Autopilot runs across all your active campaigns.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'How is Autopilot different from a regular flow?',
        a: 'It is a continuous decision-making loop. Vibey acts like a CEO, evaluating signals across your missions and agents to take the next best action. It doesn’t just follow a sequence; it weighs priorities and only acts when it makes sense for your goals.',
      },
      {
        q: 'Does it require a campaign strategy?',
        a: 'Autopilot works best with a defined North Star: Result, Purpose, Strategy, and Off-Limits. While Vibey can still retry failed work and nudge stuck tasks without one, a strategy is required for the system to proactively create and assign new missions.',
      },
      {
        q: 'Can I review plans before agents start working?',
        a: 'Yes. By default, auto-approve is disabled. Vibey will plan the subtasks and wait for your review. You can enable auto-approve in settings if you want agents to start executing immediately after the plan is generated.',
      },
      {
        q: 'How do I stay updated on what happened?',
        a: 'You can enable a daily digest in your communication settings. Vibey will send a narrative briefing to Studio, Telegram, or Slack at your preferred time, summarizing completed work, active missions, and anything that needs your attention.',
      },
      {
        q: 'What happens if I run out of credits?',
        a: 'Autopilot consumes credits for agent work like any other activity. If your balance hits zero, Autopilot will pause automatically and notify you. We recommend enabling auto-recharge to prevent your operations from stalling.',
      },
      {
        q: 'Can I override an autonomous decision?',
        a: 'Absolutely. You always have the final word. You can comment on any mission to redirect the team, request changes to a plan, or pause execution entirely.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to close the tab?',
    subtitle: 'Define your strategy. Let Vibey run the operation. Wake up to finished work.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
