import type { FeaturePageDefinition } from './types'

export const documentsFeaturePage: FeaturePageDefinition = {
  slug: 'documents',
  metaTitle: 'Documents | ROAS',
  metaDescription:
    'One Docs view for pages from Studio, Space, Missions, and Drive-filter, pin, and open editors without hunting across tabs.',
  mockupKind: 'documents',
  heroBadges: ['Studio', 'Space', 'Missions', 'Drive', 'Pins', 'Grid & list', 'Source filters'],
  hero: {
    kicker: '',
    title: 'EVERY DOC IN ONE SURFACE',
    subtitle:
      'Studio threads, space notes, mission briefs, and Drive files land in the same Docs view. Filter by origin, pin what matters, and keep the team aligned.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/studio', label: 'See Studio' },
  },
  comparison: {
    title: 'Docs in ROAS vs. scattered files',
    subtitle:
      'Traditional stacks bury files per tool. ROAS ties origins together so you always know where truth lives.',
    columns: ['ROAS Documents', 'Scattered tools'],
    rows: [
      {
        label: 'Surfaces',
        cells: ['Studio, Space, Missions, Drive in one grid', 'Separate tabs per product'],
      },
      {
        label: 'Filtering',
        cells: ['Source chips + layout modes', 'Manual search per folder'],
      },
      {
        label: 'Pins',
        cells: ['Pin key pages at the top of the view', 'Star files inside each vendor UI'],
      },
      {
        label: 'Context',
        cells: ['Same workspace as campaigns and missions', 'No shared campaign context'],
      },
      {
        label: 'Editor',
        cells: ['Open rich editors without leaving the space', 'Jump between apps constantly'],
      },
      {
        label: 'Handoff',
        cells: ['Agents and humans see the same doc list', 'Links pasted into chat threads'],
      },
    ],
  },
  showcase: {
    title: 'What Documents unlocks',
    subtitle:
      'Ship narratives in Studio, capture decisions in Space, delegate specs through Missions, and fold Drive in when files already live there.',
    blocks: [
      {
        mockupKind: 'documents',
        title: 'One grid for every origin',
        features: [
          {
            title: 'Source-aware rows',
            description:
              'Each card shows whether it came from Studio chat, native Space pages, a Mission handoff, or Google Drive.',
          },
          {
            title: 'Filter without losing Drive scope',
            description:
              'Toggle Studio, Space, or Missions while preserving Drive folder mappings when you need both.',
          },
          {
            title: 'Pins that stay visible',
            description:
              'Pin launch narratives, compliance sheets, or exec summaries so they stay above the fold.',
          },
        ],
      },
      {
        mockupKind: 'studio',
        title: 'Built from live collaboration',
        features: [
          {
            title: 'Studio exports become docs',
            description:
              'Long-form answers and artifacts promoted from Studio threads appear instantly inside Docs.',
          },
          {
            title: 'Iterate in conversation',
            description:
              'Keep refining inside Studio; the linked doc updates for everyone reviewing in the space.',
          },
          {
            title: 'Brand-aware drafts',
            description:
              'Because Brain backs Studio, every exported doc inherits approved voice and positioning.',
          },
        ],
      },
      {
        mockupKind: 'missions',
        title: 'Mission-ready briefs',
        features: [
          {
            title: 'Delegation artifacts surface here',
            description:
              'Mission briefs and deliverables stay beside Space docs so reviewers never chase attachments.',
          },
          {
            title: 'Status stays honest',
            description:
              'When missions finish, their docs remain searchable inside the same campaign workspace.',
          },
          {
            title: 'Cross-team clarity',
            description:
              'Specialists and operators reference one pinned stack instead of Slack scrollbacks.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Operational details',
    subtitle: 'Docs inherits the same permissions and workspace boundaries as the rest of ROAS.',
    items: [
      {
        title: 'Workspace scoped',
        description: 'Every doc list respects the space you are inside-no leaking across clients.',
      },
      {
        title: 'Layouts that fit the moment',
        description: 'Switch grid, list, or tree when you need density vs. hierarchy.',
      },
      {
        title: 'Drive parity',
        description: 'Mapped folders stay in sync so Drive-heavy teams are not second-class.',
      },
      {
        title: 'Readable at a glance',
        description: 'Icons and chips encode origin before you open a single page.',
      },
      {
        title: 'Fast capture',
        description: 'Create native docs from the toolbar without breaking flow.',
      },
      {
        title: 'Future-proof filtering',
        description: 'Additional origins can join the same surface without restructuring your space.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Do Documents replace Google Drive?',
        a: 'No. Drive files stay in Drive. ROAS surfaces them alongside native docs so you see everything that matters for the campaign.',
      },
      {
        q: 'Can I hide Studio exports?',
        a: 'Yes. Use source filters to focus on Space-only pages, missions, or any combination you need.',
      },
      {
        q: 'How many pins can I use?',
        a: 'Pins behave like the product UI-up to three pinned docs stay at the top for quick access.',
      },
      {
        q: 'Will mission docs update automatically?',
        a: 'Mission-linked pages refresh as agents deliver new versions, so the grid reflects the latest brief.',
      },
      {
        q: 'Who can edit a doc?',
        a: 'Same rules as the underlying space permissions-editors can update native docs; Drive files follow Google sharing.',
      },
      {
        q: 'Does this work on mobile?',
        a: 'The responsive layouts mirror the web app-grid and list modes adapt down to phone widths.',
      },
    ],
  },
  finalCta: {
    title: 'Ready for a single doc surface?',
    subtitle: 'Bring Studio, Space, Missions, and Drive into one trustworthy stack.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
