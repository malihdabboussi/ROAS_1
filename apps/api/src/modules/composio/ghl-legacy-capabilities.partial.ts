/**
 * GoHighLevel legacy integration capability rows for integration_capabilities + vector sync.
 * Action slugs must match keys in packages/api-shared GOHIGHLEVEL_ROUTES.
 */
import { GHL_LEGACY_BLOGS_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-blogs.partial'
import { GHL_LEGACY_CALENDARS_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-calendars.partial'
import { GHL_LEGACY_CRM_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-crm.partial'
import { GHL_LEGACY_DOCUMENTS_STORE_AUTOMATIONS_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-documents-store-automations.partial'
import { GHL_LEGACY_EMAIL_FORMS_FUNNELS_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-email-forms-funnels.partial'
import { GHL_LEGACY_INVOICES_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-invoices.partial'
import { GHL_LEGACY_LINKS_MEDIA_OBJECTS_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-links-media-objects.partial'
import { GHL_LEGACY_OPPORTUNITIES_PAYMENTS_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-opportunities-payments.partial'
import { GHL_LEGACY_PHONES_PRODUCTS_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-phones-products.partial'
import { GHL_LEGACY_VIBE_LEAD_CAPABILITY_ENTRIES } from './ghl-legacy-capabilities-vibey-lead.partial'
import type { GhlLegacyRow } from './ghl-legacy-capabilities.shared.partial'

export const GHL_LEGACY_CAPABILITY_ENTRIES: GhlLegacyRow[] = [
  ...GHL_LEGACY_VIBE_LEAD_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_BLOGS_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_CALENDARS_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_CRM_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_EMAIL_FORMS_FUNNELS_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_INVOICES_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_LINKS_MEDIA_OBJECTS_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_OPPORTUNITIES_PAYMENTS_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_PHONES_PRODUCTS_CAPABILITY_ENTRIES,
  ...GHL_LEGACY_DOCUMENTS_STORE_AUTOMATIONS_CAPABILITY_ENTRIES,
]
