import type { FormQuestion } from '@/lib/forms/forms-api'

export type ContactSubfieldId =
  | 'first_name'
  | 'last_name'
  | 'name'
  | 'email'
  | 'phone'
  | 'business_name'
  | 'website'
  | 'city'
  | 'state'
  | 'country'

export interface ContactSubfieldMeta {
  id: ContactSubfieldId
  label: string
  placeholder: string
  inputType: 'text' | 'email' | 'tel' | 'url'
}

export const CONTACT_SUBFIELDS: readonly ContactSubfieldMeta[] = [
  { id: 'first_name', label: 'First name', placeholder: 'First name', inputType: 'text' },
  { id: 'last_name', label: 'Last name', placeholder: 'Last name', inputType: 'text' },
  { id: 'name', label: 'Full name', placeholder: 'Full name', inputType: 'text' },
  { id: 'email', label: 'Email', placeholder: 'you@example.com', inputType: 'email' },
  { id: 'phone', label: 'Phone', placeholder: 'Phone', inputType: 'tel' },
  { id: 'business_name', label: 'Company', placeholder: 'Company', inputType: 'text' },
  { id: 'website', label: 'Website', placeholder: 'https://', inputType: 'url' },
  { id: 'city', label: 'City', placeholder: 'City', inputType: 'text' },
  { id: 'state', label: 'State', placeholder: 'State / Region', inputType: 'text' },
  { id: 'country', label: 'Country', placeholder: 'Country', inputType: 'text' },
] as const

export const DEFAULT_CONTACT_SUBFIELDS: ContactSubfieldId[] = [
  'first_name',
  'last_name',
  'email',
  'phone',
]

export const LEGACY_CONTACT_SUBFIELDS: ContactSubfieldId[] = ['name', 'email', 'phone']

export function getContactSubfieldMeta(id: string): ContactSubfieldMeta | null {
  return CONTACT_SUBFIELDS.find((meta) => meta.id === (id as ContactSubfieldId)) ?? null
}

export function resolveContactSubfields(
  question: Pick<FormQuestion, 'contact_subfields'>,
): ContactSubfieldId[] {
  const configured = question.contact_subfields
  if (Array.isArray(configured) && configured.length > 0) {
    return configured.filter((id): id is ContactSubfieldId =>
      CONTACT_SUBFIELDS.some((meta) => meta.id === id),
    )
  }
  return LEGACY_CONTACT_SUBFIELDS
}
