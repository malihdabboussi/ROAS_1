import type { FeaturePageDefinition } from './types'

export const brainFeaturePage: FeaturePageDefinition = {
  slug: 'brain',
  metaTitle: 'The Workspace Brain | ROAS',
  metaDescription:
    'Persistent memory for your brand, audience insights, and conversion patterns-applied to every new campaign.',
  mockupKind: 'brain',
  heroBadges: ['Brand voice', 'Audience insights', 'Conversion patterns', 'Guardrails', 'Import'],
  hero: {
    kicker: '',
    title: 'MEMORY THAT COMPOUNDS',
    subtitle:
      'Every approved insight becomes a reusable signal. ROAS applies brand voice, ICP notes, and winning angles automatically-so every campaign gets sharper.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/the-brain', label: 'See The Brain' },
  },
  comparison: {
    title: 'Why memory matters',
    subtitle:
      'Without persistent memory, every AI conversation starts from zero. The Workspace Brain changes that.',
    columns: ['The Workspace Brain', 'Stateless AI'],
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
        cells: ['Once-Brain carries it forward', 'Every session is onboarding'],
      },
      {
        label: 'Compliance',
        cells: ['Guardrails persist across all output', 'Re-applied manually'],
      },
    ],
  },
  showcase: {
    title: 'Everything your AI needs to know about your business',
    subtitle:
      'The Workspace Brain stores, organizes, and applies the context that makes AI output actually useful.',
    blocks: [
      {
        mockupKind: 'brain',
        title: 'Learns your brand without being told twice',
        features: [
          {
            title: 'Voice and tone extraction',
            description:
              'ROAS analyzes your approved outputs and crystallizes your communication style-punchy, luxurious, technical, casual-so new content matches automatically.',
          },
          {
            title: 'ICP memory',
            description:
              'Ideal customer profiles, objection maps, and persona notes are stored as structured memories applied to every campaign.',
          },
          {
            title: 'Offer positioning',
            description:
              'Hooks, proof points, and value propositions that worked are remembered and reused. No spreadsheet required.',
          },
        ],
      },
      {
        mockupKind: 'brain',
        title: 'Gets smarter with every campaign',
        features: [
          {
            title: 'Conversion insights',
            description:
              'When results come back, learnings like "ROI headlines beat feature lists 3x" get stored and applied to future copy.',
          },
          {
            title: 'Channel preferences',
            description:
              'Brain remembers what works on email vs. ads vs. landing pages, so channel-specific guidance is built in.',
          },
          {
            title: 'Negative signals',
            description:
              'Words to avoid, compliance restrictions, and failed angles are flagged so ROAS never repeats them.',
          },
        ],
      },
      {
        mockupKind: 'integrations',
        title: 'Bring your existing context in',
        features: [
          {
            title: 'Document import',
            description:
              'Upload brand guidelines, past campaigns, competitive research, or meeting notes. Brain extracts and indexes the relevant signals.',
          },
          {
            title: 'Integration sync',
            description:
              'Pull CRM data, ad performance, and analytics from connected tools so Brain has live context-not stale snapshots.',
            link: { href: '/features/integrations', label: 'See integrations' },
          },
          {
            title: 'Manual entries',
            description:
              'Add, edit, or delete memories directly. You stay in full control of what Brain knows and applies.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Your memory, your control',
    subtitle: 'Brain is a tool you govern-not a black box.',
    items: [
      {
        title: 'Full editability',
        description: 'Add, update, or delete any memory. ROAS applies only what you approve.',
      },
      {
        title: 'Team segmentation',
        description: 'Enterprise workspaces can scope memories per team or brand.',
      },
      {
        title: 'Import from anywhere',
        description: 'Docs, CSVs, Notion, Google Drive, Slack, HubSpot-bring it in.',
      },
      {
        title: 'Guardrails',
        description: 'Compliance rules and brand constraints enforced on every output.',
      },
      { title: 'Audit trail', description: 'See which memories were applied to each campaign.' },
      {
        title: 'Privacy by design',
        description: 'Tenant-isolated storage. Your data never trains public models.',
      },
    ],
  },
  steps: {
    title: 'Build The Workspace Brain in three steps',
    items: [
      {
        title: 'Seed it',
        description:
          'Upload your brand guidelines, past campaigns, or just describe your business. Brain extracts the signals.',
      },
      {
        title: 'Let it learn',
        description:
          'As you run campaigns in Studio, Brain crystallizes insights from approved outputs and results.',
      },
      {
        title: 'Watch quality compound',
        description:
          'Each new campaign benefits from everything you approved before. Less re-explaining, better output.',
      },
    ],
  },
  proof: {
    title: 'Memory changes everything',
    quotes: [
      {
        quote: 'I stopped re-explaining our brand voice. Brain just knows.',
        name: 'Head of content',
        role: 'SaaS startup',
      },
      {
        quote: 'Campaign #5 was noticeably better than #1 without any extra prompting.',
        name: 'Founder',
        role: 'E-commerce',
      },
      {
        quote:
          'Having guardrails in Brain means I can let junior team members run campaigns safely.',
        name: 'Marketing director',
        role: 'FinTech',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'What is The Workspace Brain?',
        a: 'A persistent memory layer that stores your brand voice, audience insights, conversion patterns, and guardrails. It applies them automatically to every campaign ROAS builds.',
      },
      {
        q: 'Can I delete a memory?',
        a: 'Yes. Edit or remove any entry so ROAS stops applying outdated guidance.',
      },
      {
        q: 'Does every teammate share the same Brain?',
        a: 'By default, yes-workspace rules apply to the whole org. Enterprise customers can segment by team or brand.',
      },
      {
        q: 'Is my data used to train public models?',
        a: 'No. ROAS isolates tenant context. Refer to the privacy policy for retention specifics.',
      },
      {
        q: 'What can I import?',
        a: 'Documents (PDF, DOCX), CSVs, Notion pages, Google Drive files, Slack threads, and HubSpot data. More integrations roll out continuously.',
      },
      {
        q: 'How does Brain learn from campaigns?',
        a: 'When you approve an artifact or feed back results, Brain extracts patterns-voice, structure, hooks that worked-and stores them for future use.',
      },
      {
        q: 'Can I see which memories were applied?',
        a: 'Yes. Each campaign logs which Brain entries influenced the output.',
      },
      {
        q: 'Does Brain work across Studio and Funnels?',
        a: 'Yes. Brain is workspace-wide. Every feature in ROAS reads from the same memory.',
      },
      {
        q: 'What happens if I add conflicting memories?',
        a: 'Brain flags potential conflicts and asks you to resolve. The newest approved entry takes precedence.',
      },
      {
        q: 'Is there a memory limit?',
        a: 'Generous limits per workspace tier. Enterprise plans have unlimited storage.',
      },
    ],
  },
  finalCta: {
    title: 'Stop re-explaining your brand',
    subtitle:
      'Let The Workspace Brain carry your context forward so every campaign starts smarter.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
