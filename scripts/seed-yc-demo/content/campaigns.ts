/**
 * Campaign definitions: 6 client campaigns + Internal Ops + Sales/Pipeline
 * + Company Wiki = 9 campaigns. Created_at backdated per timeline.
 *
 * Wave 3 fills this. P5 creates campaigns via CampaignsService.createCampaign
 * (ensures campaign brain), seeds campaign_nodes + campaign_agents.
 */
import type { CampaignDef } from './_types'

export const CAMPAIGNS: readonly CampaignDef[] = []
