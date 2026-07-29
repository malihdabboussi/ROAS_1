import type { FeaturePageDefinition } from './types'

export const integrationsFeaturePage: FeaturePageDefinition = {
  slug: 'integrations',
  metaTitle: 'Integrations | ROAS',
  metaDescription:
    'Connect CRMs, ad accounts, storage, and comms so ROAS acts with your stack-not beside it.',
  mockupKind: 'integrations',
  heroBadges: ['Google', 'Slack', 'Stripe', 'Meta', 'HubSpot', 'Notion', 'PayPal', 'Zapier'],
  hero: {
    kicker: '',
    title: 'OAUTH INTO YOUR REAL STACK',
    subtitle:
      'Authorize once. ROAS pulls context, pushes updates, and respects workspace boundaries. Your tools, connected to your AI marketing team.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/ads', label: 'See Ads' },
  },
  comparison: {
    title: 'Deep links vs. copy/paste',
    subtitle:
      'Most AI tools require manual export-import or risky API key exposure. ROAS integrates securely via OAuth at the API level.',
    columns: ['ROAS integrations', 'Manual workflows'],
    rows: [
      {
        label: 'Setup',
        cells: ['OAuth + scoped tokens in one click', 'Download, upload, configure'],
      },
      {
        label: 'Data freshness',
        cells: ['Live reads where supported', 'Static snapshots that go stale'],
      },
      {
        label: 'Governance',
        cells: ['Workspace controls and audit trail', 'Individual habits and memory'],
      },
      {
        label: 'Security',
        cells: [
          'Secure OAuth — no raw API keys exposed',
          'Shared credentials or risky manual tokens',
        ],
      },
      { label: 'Maintenance', cells: ['ROAS handles token refresh', 'You manage credentials'] },
      {
        label: 'Context richness',
        cells: ['CRM + analytics + ads data flow into Brain', 'Whatever you paste in'],
      },
    ],
  },
  showcase: {
    title: 'Everything connected, nothing siloed',
    subtitle: 'Integrations give ROAS live context and action paths-not just data imports.',
    blocks: [
      {
        mockupKind: 'integration-indexer',
        title: 'Context flows into every campaign',
        features: [
          {
            title: 'CRM data',
            description:
              'Pull customer records, deal stages, and segmentation from HubSpot or your CRM so campaigns target the right audience.',
          },
          {
            title: 'Analytics insights',
            description:
              'Import page performance, conversion rates, and traffic sources so Brain learns what is actually working.',
          },
          {
            title: 'Document sync',
            description:
              'Brand guides, competitive research, and past campaigns from Google Drive, Notion, or Slack-indexed and searchable.',
          },
        ],
      },
      {
        mockupKind: 'integration-dispatcher',
        title: 'Actions push results outward',
        features: [
          {
            title: 'Ad account publishing',
            description:
              'Push approved creative to Meta, Google, and LinkedIn ad accounts without leaving Studio.',
            link: { href: '/features/ads', label: 'See Ads' },
          },
          {
            title: 'Payment processing',
            description: 'Connect Stripe or PayPal to power checkout flows inside your funnels.',
          },
          {
            title: 'Notifications',
            description:
              'Alert your team on Slack when leads come in, campaigns publish, or missions complete.',
          },
        ],
      },
      {
        mockupKind: 'integration-scoper',
        title: 'Governed and auditable',
        features: [
          {
            title: 'Scoped permissions',
            description:
              'Connect via secure OAuth without ever exposing raw API keys. Only the specific data and actions you authorize are accessible.',
          },
          {
            title: 'Centralized management',
            description:
              'View, revoke, and rotate all connections from workspace settings. One place, full visibility.',
          },
          {
            title: 'Enterprise governance',
            description:
              'HQ admins can standardize approved connectors across workspaces and enforce policies.',
            link: { href: '/enterprise', label: 'See Enterprise' },
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
        q: 'Where do I manage connections?',
        a: 'Inside your workspace settings. View all active integrations, revoke access, and rotate tokens from one place.',
      },
      {
        q: 'Do integrations work on enterprise tenants?',
        a: 'Yes. HQ admins can standardize approved connectors and enforce policies across workspaces.',
      },
      {
        q: 'What if a vendor is missing?',
        a: 'Request it. ROAS prioritizes new integrations by customer demand.',
      },
      {
        q: 'How is my data secured?',
        a: 'OAuth with least-privilege scopes. Encrypted at rest and in transit. Tenant-isolated storage.',
      },
      {
        q: 'Can I connect the same tool to multiple workspaces?',
        a: 'Yes. Each workspace maintains its own connection with independent scopes and permissions.',
      },
      {
        q: 'Do I need to re-authorize periodically?',
        a: 'No. ROAS handles token refresh automatically. You only re-auth if you revoke and reconnect.',
      },
      {
        q: 'Which integrations are available today?',
        a: 'Google, Slack, Stripe, Meta, HubSpot, Notion, PayPal, FanBasis, Zapier, and Airtable. More ship continuously.',
      },
      {
        q: 'Can ROAS write data back to my tools?',
        a: 'Where the integration supports it, yes. For example, pushing ad creative to Meta or creating contacts in HubSpot.',
      },
    ],
  },
  standaloneVideo: {
    title: 'Integrations in action',
    subtitle: 'See how your tools connect and feed live context into every campaign.',
    videoSrc:
      'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/videos/1775559285956-integrations.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvdmlkZW9zLzE3NzU1NTkyODU5NTYtaW50ZWdyYXRpb25zLm1wNCIsImlhdCI6MTc3NTU1OTMwMSwiZXhwIjoyMDkwOTE5MzAxfQ.T0u1Rsu_obcjHv7g6I5rBgZboBZb6PfG0NxtF3bYYVQ',
  },
  finalCta: {
    title: 'Ready to connect your stack?',
    subtitle:
      'Secure OAuth connection. No raw API keys to expose or manage. Live context for every campaign.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
