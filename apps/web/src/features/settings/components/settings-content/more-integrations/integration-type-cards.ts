/**
 * Step 1 of "More integrations": the kinds of integration a platform admin
 * could add. Only note takers have a no-code backend today; the other kinds
 * mirror the Library's categories and stay disabled until theirs exists.
 */
export type IntegrationTypeCard = {
  id:
    | 'note_taker'
    | 'social'
    | 'automation'
    | 'ads_analytics'
    | 'email_marketing'
    | 'payments'
    | 'crm'
    | 'productivity'
    | 'developer'
  label: string
  description: string
  available: boolean
}

export const INTEGRATION_TYPE_CARDS: IntegrationTypeCard[] = [
  {
    id: 'note_taker',
    label: 'Note taker',
    description: 'A meeting recorder that posts transcripts to ROAS. Configure it here, no code.',
    available: true,
  },
  {
    id: 'social',
    label: 'Social media',
    description: 'Profiles, pages and posting.',
    available: false,
  },
  {
    id: 'automation',
    label: 'Automation',
    description: 'Tools that run work from Space rules.',
    available: false,
  },
  {
    id: 'ads_analytics',
    label: 'Advertising & Analytics',
    description: 'Ad accounts and reporting.',
    available: false,
  },
  {
    id: 'email_marketing',
    label: 'Email & Marketing',
    description: 'Lists, campaigns and sends.',
    available: false,
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Billing and checkout providers.',
    available: false,
  },
  { id: 'crm', label: 'CRM', description: 'Contacts and pipelines.', available: false },
  {
    id: 'productivity',
    label: 'Productivity',
    description: 'Files, docs and calendars.',
    available: false,
  },
  {
    id: 'developer',
    label: 'Developer',
    description: 'Repos, deploys and agents.',
    available: false,
  },
]
