/**
 * Source of truth for seeding `space_templates` + related rows.
 * Regenerate SQL via: node scripts/generate-space-templates-migration.mjs
 */

import { AGENCY_CLIENT_WEBINAR_TEMPLATES } from './space-template-catalog-agency-client-webinar'
import { CEO_SPACE_TEMPLATES } from './space-template-catalog-ceo'
import { SPECIALIZED_SPACE_TEMPLATES } from './space-template-catalog-specialized'
import { UNIVERSAL_SPACE_TEMPLATES } from './space-template-catalog-universal'
import type { SpaceTemplateSeed } from './space-template-catalog.types'

export type {
  SpaceTemplateAutomationSeed,
  SpaceTemplateItemSeed,
  SpaceTemplateSeed,
} from './space-template-catalog.types'

function insertAfterSlug(
  templates: SpaceTemplateSeed[],
  afterSlug: string,
  extra: SpaceTemplateSeed[],
): SpaceTemplateSeed[] {
  const idx = templates.findIndex((t) => t.slug === afterSlug)
  if (idx < 0) return [...templates, ...extra]
  return [...templates.slice(0, idx + 1), ...extra, ...templates.slice(idx + 1)]
}

export const SPACE_TEMPLATE_CATALOG: SpaceTemplateSeed[] = [
  ...CEO_SPACE_TEMPLATES,
  ...insertAfterSlug(UNIVERSAL_SPACE_TEMPLATES, 'client-account-workspace', AGENCY_CLIENT_WEBINAR_TEMPLATES),
  ...SPECIALIZED_SPACE_TEMPLATES,
]
