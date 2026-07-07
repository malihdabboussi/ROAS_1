/**
 * Source of truth for seeding `space_automation_templates`.
 * Regenerate SQL via: node scripts/generate-space-automation-templates-migration.mjs
 */
import type { SpaceAutomationTemplateSeed } from './space-automation-template-catalog.types'
import { AGENCY_AUTOMATION_TEMPLATES } from './space-automation-template-catalog-agency'
import { CONNECTED_APP_AUTOMATION_TEMPLATES } from './space-automation-template-catalog-connected-apps'
import { CORE_AUTOMATION_TEMPLATES } from './space-automation-template-catalog-core'
import { PHASE_TWO_AUTOMATION_TEMPLATES } from './space-automation-template-catalog-phase2'

export type { SpaceAutomationTemplateSeed } from './space-automation-template-catalog.types'

export const SPACE_AUTOMATION_TEMPLATE_CATALOG: SpaceAutomationTemplateSeed[] = [
  ...CORE_AUTOMATION_TEMPLATES,
  ...PHASE_TWO_AUTOMATION_TEMPLATES,
  ...CONNECTED_APP_AUTOMATION_TEMPLATES,
  ...AGENCY_AUTOMATION_TEMPLATES,
]
