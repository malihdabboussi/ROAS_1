import { describe, expect, it } from 'vitest'
import type { Contact } from '@/lib/contacts/contacts-api'
import type { CustomFieldDefinition } from '@/lib/properties/custom-fields'
import { buildContactMergeFieldRows, expandContactMergeTokens } from './contact-merge-fields'

const contact: Contact = {
  id: 'contact-1',
  email: 'ada@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  phone: null,
  tags: ['vip', 'beta'],
  source: 'newsletter',
  source_id: null,
  custom_fields: {
    favorite_number: 42,
    opted_in: true,
  },
  business_name: 'Analytical Engines',
  website: 'https://example.com/very/long/path/that/should/be/trimmed/in/the/preview',
  address: null,
  city: 'London',
  state: null,
  country: 'UK',
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-02T00:00:00.000Z',
}

const definitions: CustomFieldDefinition[] = [
  {
    id: 'field-2',
    user_id: 'user-1',
    name: 'Opted in',
    field_key: 'opted_in',
    field_type: 'boolean',
    options: [],
    default_value: null,
    is_required: false,
    display_order: 2,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'field-1',
    user_id: 'user-1',
    name: 'Favorite number',
    field_key: 'favorite_number',
    field_type: 'number',
    options: [],
    default_value: '7',
    is_required: false,
    display_order: 1,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
  },
]

describe('contact merge fields', () => {
  it('builds built-in and sorted custom merge field rows with previews', () => {
    const rows = buildContactMergeFieldRows(contact, definitions)

    expect(rows.slice(0, 3)).toEqual([
      {
        id: 'full_name',
        label: 'Full name',
        valuePreview: 'Ada Lovelace',
        token: '{{full_name}}',
      },
      {
        id: 'first_name',
        label: 'First name',
        valuePreview: 'Ada',
        token: '{{first_name}}',
      },
      {
        id: 'last_name',
        label: 'Last name',
        valuePreview: 'Lovelace',
        token: '{{last_name}}',
      },
    ])
    expect(rows.find((row) => row.id === 'phone')?.valuePreview).toBe('\u2014')
    expect(rows.find((row) => row.id === 'website')?.valuePreview).toHaveLength(64)
    expect(rows.slice(-2)).toEqual([
      {
        id: 'cf:field-1',
        label: 'Favorite number',
        valuePreview: '42',
        token: '{{favorite_number}}',
      },
      {
        id: 'cf:field-2',
        label: 'Opted in',
        valuePreview: 'Yes',
        token: '{{opted_in}}',
      },
    ])
  })

  it('expands built-in and custom merge tokens while blanking unknown tokens', () => {
    expect(
      expandContactMergeTokens(
        'Hi {{ first_name }} from {{business_name}}. Score {{favorite_number}}. Unknown {{missing}}.',
        contact,
        definitions,
      ),
    ).toBe('Hi Ada from Analytical Engines. Score 42. Unknown .')
  })
})
