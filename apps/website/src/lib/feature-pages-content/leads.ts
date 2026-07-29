import type { FeaturePageDefinition } from './types'

export const leadsFeaturePage: FeaturePageDefinition = {
  slug: 'leads',
  metaTitle: 'Leads & CRM | ROAS',
  metaDescription:
    'Contacts, imports, segments, and campaign membership-managed inside the same workspace where you build.',
  mockupKind: 'integrations',
  heroBadges: ['Contacts', 'CSV import', 'CRM sync', 'Segments', 'Campaign membership'],
  hero: {
    kicker: '',
    title: 'CONTACTS, IMPORTS, AND SEGMENTS',
    subtitle:
      'Import from ActiveCampaign, GoHighLevel, or CSV. Segment your audience and attach contacts to campaigns-all inside the workspace where you build.',
    primaryCta: { href: '/waitlist', label: 'Join Waitlist' },
    secondaryCta: { href: '/features/email-sequences', label: 'See Email Sequences' },
  },
  comparison: {
    title: 'ROAS leads vs. standalone CRM',
    subtitle:
      'Traditional CRMs live in a separate tab. ROAS keeps contacts next to the campaigns targeting them.',
    columns: ['ROAS', 'Standalone CRM'],
    rows: [
      { label: 'Location', cells: ['Same workspace as campaigns', 'Separate tool and tab'] },
      {
        label: 'Import',
        cells: ['CSV, ActiveCampaign, GoHighLevel sync', 'Platform-specific import'],
      },
      {
        label: 'Segmentation',
        cells: ['Tag and segment inside campaign context', 'Disconnected from marketing execution'],
      },
      {
        label: 'Campaign link',
        cells: ['Attach contacts to campaigns directly', 'Manual list management'],
      },
      { label: 'Sync', cells: ['Background full-account sync', 'Manual export/import'] },
      {
        label: 'Context',
        cells: ['Brain knows who your audience is', 'Data sits in a separate system'],
      },
    ],
  },
  showcase: {
    title: 'Everything you need to manage your audience',
    subtitle: 'Leads are not a separate system-they live where your campaigns live.',
    blocks: [
      {
        mockupKind: 'integrations',
        title: 'Import from anywhere',
        features: [
          {
            title: 'CSV upload',
            description:
              'Drag and drop a spreadsheet. ROAS maps columns and imports contacts instantly.',
          },
          {
            title: 'ActiveCampaign sync',
            description:
              'Connect your AC account and sync contacts-paginated for accounts of any size.',
          },
          {
            title: 'GoHighLevel sync',
            description: 'Pull contacts from your GHL location with background full-account sync.',
          },
        ],
      },
      {
        mockupKind: 'studio',
        title: 'Organize and segment',
        features: [
          {
            title: 'Tags and segments',
            description:
              'Group contacts by source, behavior, or custom attributes for targeted campaigns.',
          },
          {
            title: 'Campaign membership',
            description:
              'Attach contacts to campaigns directly. Know exactly who is in each funnel.',
          },
          {
            title: 'Search and filter',
            description: 'Find contacts instantly across your entire database.',
          },
        ],
      },
      {
        mockupKind: 'funnels',
        title: 'Connected to your campaigns',
        features: [
          {
            title: 'Email targeting',
            description: 'Send sequences to specific segments or your full contact list.',
          },
          {
            title: 'Funnel lead capture',
            description: 'Forms on your funnels feed directly into your contact database.',
          },
          {
            title: 'Brain-informed campaigns',
            description: 'Audience data flows into Brain so every campaign targets more precisely.',
          },
        ],
      },
    ],
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
  valuePropGrid: {
    title: 'Your contacts, your control',
    subtitle: 'Full ownership and portability.',
    items: [
      {
        title: 'Unlimited imports',
        description: 'CSV, CRM sync, manual entry-bring contacts from anywhere.',
      },
      {
        title: 'Background sync',
        description: 'Full-account CRM sync runs in the background for large databases.',
      },
      {
        title: 'Export anytime',
        description: 'Download your contact list whenever you need it.',
      },
      {
        title: 'Privacy compliant',
        description: 'Tenant-isolated storage. Your contacts are never shared.',
      },
      { title: 'Deduplication', description: 'Automatic duplicate detection on import.' },
      {
        title: 'Workspace scoped',
        description: 'Each workspace manages its own contact database independently.',
      },
    ],
  },
  steps: {
    title: 'Build your contact database in three steps',
    items: [
      {
        title: 'Import',
        description:
          'Upload a CSV, connect ActiveCampaign or GoHighLevel, or add contacts manually.',
      },
      {
        title: 'Organize',
        description: 'Tag, segment, and attach contacts to campaigns for targeted outreach.',
      },
      {
        title: 'Activate',
        description: 'Send sequences, target ads, and track engagement-all from one workspace.',
      },
    ],
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Which CRMs can I import from?',
        a: 'ActiveCampaign and GoHighLevel today. More integrations ship based on demand.',
      },
      {
        q: 'Is there a contact limit?',
        a: 'Depends on your plan. Enterprise plans support unlimited contacts.',
      },
      {
        q: 'Can I export my contacts?',
        a: 'Yes. Download your full contact list anytime. No lock-in.',
      },
      {
        q: 'How does background sync work?',
        a: 'ROAS paginates through your CRM account server-side. Progress is tracked in real time.',
      },
      {
        q: 'Are contacts shared across workspaces?',
        a: 'No. Each workspace maintains its own isolated contact database.',
      },
    ],
  },
  finalCta: {
    title: 'Ready to bring your contacts into the campaign?',
    subtitle:
      'Stop managing leads in a separate tab. Import, segment, and activate from one workspace.',
    ctaHref: '/waitlist',
    ctaLabel: 'Join Waitlist',
  },
}
