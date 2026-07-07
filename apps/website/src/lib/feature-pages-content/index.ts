import { adsFeaturePage } from './ads'
import { autopilotFeaturePage } from './autopilot'
import { brainFeaturePage } from './brain'
import { capabilitiesFeaturePage } from './capabilities'
import { documentsFeaturePage } from './documents'
import { emailSequencesFeaturePage } from './email-sequences'
import { funnelsFeaturePage } from './funnels'
import { integrationsFeaturePage } from './integrations'
import { leadsFeaturePage } from './leads'
import { missionsFeaturePage } from './missions'
import { skillsFeaturePage } from './skills'
import type { FeatureSlug } from './slugs'
import { FEATURE_SLUGS } from './slugs'
import { socialContentFeaturePage } from './social-content'
import { spacesFeaturePage } from './spaces'
import { studioFeaturePage } from './studio'
import { teamFeaturePage } from './team'
import { theBrainFeaturePage } from './the-brain'
import type { FeaturePageDefinition } from './types'
import { yourTeamFeaturePage } from './your-team'

export { FEATURE_SLUGS, type FeatureSlug } from './slugs'
export type { FeaturePageDefinition } from './types'

export const FEATURE_PAGES: Record<FeatureSlug, FeaturePageDefinition> = {
  'your-team': yourTeamFeaturePage,
  'the-brain': theBrainFeaturePage,
  spaces: spacesFeaturePage,
  missions: missionsFeaturePage,
  autopilot: autopilotFeaturePage,
  capabilities: capabilitiesFeaturePage,
  studio: studioFeaturePage,
  documents: documentsFeaturePage,
  funnels: funnelsFeaturePage,
  brain: brainFeaturePage,
  team: teamFeaturePage,
  ads: adsFeaturePage,
  integrations: integrationsFeaturePage,
  'email-sequences': emailSequencesFeaturePage,
  'social-content': socialContentFeaturePage,
  leads: leadsFeaturePage,
  skills: skillsFeaturePage,
}

export function getFeaturePage(slug: string): FeaturePageDefinition | undefined {
  if (FEATURE_SLUGS.includes(slug as FeatureSlug)) {
    return FEATURE_PAGES[slug as FeatureSlug]
  }
  return undefined
}
