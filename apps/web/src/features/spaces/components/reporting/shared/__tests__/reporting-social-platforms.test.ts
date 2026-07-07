import { describe, expect, it } from 'vitest'
import type { ReportingViewConfig } from '../../../../types/space-schema'
import { resolveSocialReportingUserIntegrationId } from '../resolve-social-reporting-user-integration-id'
import {
  filterReportingSocialPlatformsToConnected,
  normalizeReportingSocialPlatforms,
  patchReportingSocialPlatforms,
  reportingSocialPlatformsEqual,
} from '../reporting-social-platforms'

describe('reporting social platform helpers', () => {
  it('normalizes, patches, and compares configured platforms in canonical order', () => {
    const config = {
      social_platforms: ['youtube', 'bad-value', 'instagram', 'youtube'],
      social_platform: 'linkedin',
    } as ReportingViewConfig

    expect(normalizeReportingSocialPlatforms(config)).toEqual(['instagram', 'youtube'])
    expect(patchReportingSocialPlatforms(['youtube', 'linkedin'])).toEqual({
      social_platforms: ['linkedin', 'youtube'],
      social_platform: 'linkedin',
    })
    expect(reportingSocialPlatformsEqual(['instagram', 'youtube'], ['instagram', 'youtube'])).toBe(
      true,
    )
    expect(reportingSocialPlatformsEqual(['youtube', 'instagram'], ['instagram', 'youtube'])).toBe(
      false,
    )
  })

  it('filters to connected platforms and resolves the backing user integration', () => {
    const config = {
      social_platforms: ['instagram', 'linkedin', 'youtube'],
      social_platform: 'instagram',
    } as ReportingViewConfig

    expect(
      filterReportingSocialPlatformsToConnected(config, {
        instagram: [{ id: 'ig-campaign' }],
        linkedin: [],
        facebook: [],
        youtube: [{ id: 'yt-user' }],
      }),
    ).toEqual(['instagram', 'youtube'])

    expect(
      resolveSocialReportingUserIntegrationId(
        'campaign-linkedin',
        [
          {
            id: 'campaign-linkedin',
            source: 'campaign_integration',
            label: 'Campaign LinkedIn',
            platform: 'linkedin',
            scope_mode: null,
            is_default: false,
          },
          {
            id: 'user-linkedin',
            source: 'user_integration',
            label: 'User LinkedIn',
            platform: 'linkedin',
            scope_mode: null,
            is_default: true,
          },
        ],
        null,
        null,
      ),
    ).toBe('user-linkedin')
  })
})
