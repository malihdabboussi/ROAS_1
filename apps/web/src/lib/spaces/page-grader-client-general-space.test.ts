import { describe, expect, it } from 'vitest'
import {
  clientOverviewHrefFromSpace,
  isHiddenClientGeneralSpace,
  isPageGraderClientGeneralSpace,
  pageGraderClientIdFromCampaignConfig,
} from './page-grader-client-general-space'

const clientGeneral = {
  title: 'General',
  campaign_id: 'campaign-1ds',
  schema: {
    custom_data: {
      source: 'page_grader',
      space_role: 'general',
      page_grader_client_id: 'pg-client-1',
    },
  },
}

describe('page-grader-client-general-space', () => {
  it('reads a Page Grader client id from campaign config', () => {
    expect(
      pageGraderClientIdFromCampaignConfig({
        external_sources: { page_grader: { client_id: 'pg-client-1' } },
      }),
    ).toBe('pg-client-1')
    expect(pageGraderClientIdFromCampaignConfig({ system_kind: 'general' })).toBeNull()
  })

  it('recognizes the hidden Page Grader client General space', () => {
    expect(isPageGraderClientGeneralSpace(clientGeneral)).toBe(true)
    expect(
      isPageGraderClientGeneralSpace({
        title: 'Meetings',
        campaign_id: 'campaign-general',
        schema: { custom_data: { source: 'page_grader', space_role: 'client_campaign' } },
      }),
    ).toBe(false)
    expect(
      isPageGraderClientGeneralSpace({
        title: 'General',
        campaign_id: 'campaign-general',
        schema: {},
      }),
    ).toBe(false)
  })

  it('hides General from switchers for Page Grader client campaigns', () => {
    expect(isHiddenClientGeneralSpace(clientGeneral)).toBe(true)
    expect(
      isHiddenClientGeneralSpace(
        { title: 'General', campaign_id: 'campaign-1ds' },
        { config: { external_sources: { page_grader: { client_id: 'pg-client-1' } } } },
      ),
    ).toBe(true)
    expect(
      isHiddenClientGeneralSpace(
        { title: 'Webinar', campaign_id: 'campaign-webinar' },
        { config: { external_sources: { page_grader: { client_id: 'pg-client-1' } } } },
      ),
    ).toBe(false)
    expect(isHiddenClientGeneralSpace({ title: 'Meetings', campaign_id: 'campaign-general' })).toBe(
      false,
    )
  })

  it('opens the hidden General space as the client overview', () => {
    expect(clientOverviewHrefFromSpace(clientGeneral)).toBe(
      '/campaigns/campaign-1ds?client=pg-client-1',
    )
    expect(clientOverviewHrefFromSpace(clientGeneral, { hasItem: true })).toBe(
      '/campaigns/campaign-1ds?client=pg-client-1&view=list',
    )
    expect(
      clientOverviewHrefFromSpace({
        title: 'Meetings',
        campaign_id: 'campaign-general',
      }),
    ).toBeNull()
  })
})
