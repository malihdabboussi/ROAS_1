import type { FeaturePageDefinition } from './types'

export const spacesFeaturePage: FeaturePageDefinition = {
  slug: 'spaces',
  metaTitle: 'Spaces | Vibey',
  metaDescription:
    'The work, the team, and the agents. One place. Tasks, docs, channels, and flows. Humans and agents working in the same workspace, not in parallel tools.',
  mockupKind: 'spaces-hero',
  heroBadges: ['Views', 'Docs', 'Channels', 'Flows'],
  hero: {
    kicker: '',
    title: 'THE WORK, THE TEAM, AND THE AGENTS. ONE PLACE.',
    subtitle:
      'Spaces is where tasks get done, docs get written, channels get used, and flows run in the background. Humans and agents working in the same workspace, not in parallel tools.',
    primaryCta: { href: '/waitlist', label: 'Get Early Access' },
  },
  showcase: {
    title: 'Everything in one workspace',
    subtitle: 'Four surfaces. One place. No context switching.',
    blocks: [
      {
        mockupKind: 'space-views',
        title: 'Views',
        features: [
          {
            title: 'Every surface your team needs. Already here.',
            description:
              'Tasks, contacts, media, forms, funnels, emails, ads, analytics, presentations, social. Your team stops switching between tools because everything they work in lives in one place.',
          },
          {
            title: 'Agents show up where humans work',
            description:
              'When an agent finishes a task, it moves on the same board your team is looking at. No separate dashboard. No fetching output from another tool.',
          },
          {
            title: 'Shaped around your workflow',
            description:
              'Add the fields, statuses, and views your team actually uses. The workspace adapts to how you work, not the other way around.',
          },
        ],
      },
      {
        mockupKind: 'space-docs',
        title: 'Docs',
        features: [
          {
            title: 'One place for everything your team creates',
            description:
              'Agent deliverables, meeting notes, strategy docs, uploaded files. Everything your team produces or references surfaces here. No hunting across five tools for the latest version.',
          },
          {
            title: 'Documents that stay current',
            description:
              'When an agent finishes a deliverable, it appears instantly. When a plan gets updated, everyone sees it. No copy-paste. No "which version is this?"',
          },
          {
            title: 'New hires know where to look on day one',
            description:
              'Pin the documents that matter. The truth lives at the top of the workspace, not buried in someone\'s Drive folder.',
          },
        ],
      },
      {
        mockupKind: 'space-channels',
        title: 'Channels',
        features: [
          {
            title: 'Communication where the work happens',
            description:
              'Team conversations live inside the workspace, not in a separate app. Every message is connected to the project it belongs to.',
          },
          {
            title: 'Your AI team is in the conversation',
            description:
              'Tag an agent in a channel and it responds, takes action, or produces output. Same thread as everyone else. No switching tools to talk to AI.',
          },
          {
            title: 'Decisions stay findable',
            description:
              'Every conversation and decision is searchable and tied to the work. No more scrolling through months of Slack history to find what was agreed on.',
          },
        ],
      },
      {
        mockupKind: 'space-automations',
        title: 'Flows',
        features: [
          {
            title: 'The workspace reacts when things happen',
            description:
              'A meeting recording finishes. A form gets submitted. A task status changes. The workspace responds automatically, without anyone initiating it.',
          },
          {
            title: 'Agents work while your team sleeps',
            description:
              'Flows assign work to agents, create deliverables, update contacts, and send messages. The repetitive operations run themselves.',
          },
          {
            title: 'Your people spend time on decisions, not triggers',
            description:
              'Set it once. The workspace handles recurring operations so your team focuses on the work that actually needs a human in the room.',
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
        q: 'How is this different from Notion or Linear?',
        a: 'Spaces has agents built into it. Tasks can be assigned to agents, flows can trigger agent runs, and channels include agents as participants. It is not a project management tool with AI bolted on.',
      },
      {
        q: 'Can agents and humans work on the same tasks?',
        a: 'Yes. Humans and agents are both valid assignees in any Space. An agent can pick up a task, complete it, and mark it done. The same way a human would.',
      },
      {
        q: 'How do Channels work?',
        a: 'Channels are group communication threads inside a Space. Humans and agents participate together. You can tag an agent in a channel and it will respond, take action, or produce output.',
      },
      {
        q: 'What can Flows trigger?',
        a: 'Flows can trigger on task changes, form submissions, contact events, schedules, incoming emails, Slack messages, and Fathom recordings. Actions include running an agent, creating deliverables, sending messages, and updating contacts.',
      },
      {
        q: 'Do Docs replace Google Drive?',
        a: 'No. Drive files surface inside Docs alongside native space documents and agent deliverables. Everything in one view, nothing moved.',
      },
      {
        q: 'Can I have multiple Spaces?',
        a: 'Yes. Each Space has its own schema, views, docs, channels, and flows. Use one per project, team, or workflow.',
      },
    ],
  },
  finalCta: {
    title: 'One workspace. Humans and agents.',
    subtitle:
      'Stop managing work across five tools. Spaces brings tasks, docs, channels, and flows into one place where your whole team can actually work.',
    ctaHref: '/waitlist',
    ctaLabel: 'Get Early Access',
  },
}
