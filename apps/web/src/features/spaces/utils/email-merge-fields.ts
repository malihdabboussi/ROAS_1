import type { RichTextMergeFieldOption } from '@/components/ui/forms/rich-text-toolbar'

/** Standard personalization tokens for campaign email drafts (expanded at send time). */
export const CAMPAIGN_EMAIL_MERGE_FIELDS: RichTextMergeFieldOption[] = [
  {
    id: 'first_name',
    label: 'First name',
    valuePreview: 'Alex',
    token: '{{first_name}}',
  },
  { id: 'last_name', label: 'Last name', valuePreview: 'Rivera', token: '{{last_name}}' },
  { id: 'full_name', label: 'Full name', valuePreview: 'Alex Rivera', token: '{{full_name}}' },
  {
    id: 'email',
    label: 'Email',
    valuePreview: 'alex@example.com',
    token: '{{email}}',
  },
  {
    id: 'business_name',
    label: 'Business',
    valuePreview: 'Acme Co',
    token: '{{business_name}}',
  },
  { id: 'phone', label: 'Phone', valuePreview: '+1 555 0100', token: '{{phone}}' },
  {
    id: 'website',
    label: 'Website',
    valuePreview: 'https://example.com',
    token: '{{website}}',
  },
]
