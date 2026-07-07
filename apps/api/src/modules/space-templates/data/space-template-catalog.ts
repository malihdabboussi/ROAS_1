/**
 * Source of truth for seeding `space_templates` + related rows.
 * Regenerate SQL via: node scripts/generate-space-templates-migration.mjs
 */

import { SPECIALIZED_SPACE_TEMPLATES } from './space-template-catalog-specialized'
import { UNIVERSAL_SPACE_TEMPLATES } from './space-template-catalog-universal'
import type { SpaceTemplateSeed } from './space-template-catalog.types'

export type {
  SpaceTemplateAutomationSeed,
  SpaceTemplateItemSeed,
  SpaceTemplateSeed,
} from './space-template-catalog.types'

export const SPACE_TEMPLATE_CATALOG: SpaceTemplateSeed[] = [
  ...UNIVERSAL_SPACE_TEMPLATES,
  ...SPECIALIZED_SPACE_TEMPLATES,
]
