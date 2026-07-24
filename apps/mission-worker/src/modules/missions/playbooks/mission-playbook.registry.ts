import { ADS_RESEARCH_PLAYBOOK_ID, expandAdsResearchPlaybook } from './ads-research.playbook'
import {
  expandIgOrganicVideoAdPlaybook,
  IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID,
} from './ig-organic-video-ad.playbook'
import { expandMetaAdsAuditPlaybook, META_ADS_AUDIT_PLAYBOOK_ID } from './meta-ads-audit.playbook'
import {
  expandMetaAdsLaunchPlaybook,
  META_ADS_LAUNCH_PLAYBOOK_ID,
} from './meta-ads-launch.playbook'
import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import {
  expandStaticAdProductionPlaybook,
  STATIC_AD_PRODUCTION_PLAYBOOK_ID,
} from './static-ad-production.playbook'
import {
  expandWebinarFulfillmentPlaybook,
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
} from './webinar-fulfillment.playbook'

export function expandMissionPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult | null {
  if (input.playbookId === WEBINAR_FULFILLMENT_PLAYBOOK_ID)
    return expandWebinarFulfillmentPlaybook(input)
  if (input.playbookId === META_ADS_LAUNCH_PLAYBOOK_ID) return expandMetaAdsLaunchPlaybook(input)
  if (input.playbookId === META_ADS_AUDIT_PLAYBOOK_ID) return expandMetaAdsAuditPlaybook(input)
  if (input.playbookId === ADS_RESEARCH_PLAYBOOK_ID) return expandAdsResearchPlaybook(input)
  if (input.playbookId === STATIC_AD_PRODUCTION_PLAYBOOK_ID)
    return expandStaticAdProductionPlaybook(input)
  if (input.playbookId === IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID)
    return expandIgOrganicVideoAdPlaybook(input)
  return null
}
