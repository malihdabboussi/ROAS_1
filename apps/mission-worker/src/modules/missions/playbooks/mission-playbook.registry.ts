import { ADS_RESEARCH_PLAYBOOK_ID, expandAdsResearchPlaybook } from './ads-research.playbook'
import {
  expandMetaAdsLaunchPlaybook,
  META_ADS_LAUNCH_PLAYBOOK_ID,
} from './meta-ads-launch.playbook'
import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
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
  if (input.playbookId === ADS_RESEARCH_PLAYBOOK_ID) return expandAdsResearchPlaybook(input)
  return null
}
