import { describe, expect, it } from 'vitest'
import { SpaceAssetIndexRegistry } from './space-asset-index.registry'

describe('SpaceAssetIndexRegistry', () => {
  const registry = new SpaceAssetIndexRegistry()
  const input = {
    userId: 'ea216be9-d4c1-501a-b74e-4daf55e8d2ff',
    orgId: '9fb9a0c1-7ce1-4d1a-9b4d-e68817e8f800',
  }

  it('uses the space id for space assets and nulls missing uuid fields', () => {
    const spaceId = '9ccdb39d-2369-5b87-a35c-fe504369ef0e'
    const asset = registry.toAsset(
      'space',
      { id: spaceId, title: 'Company Wiki', description: 'Internal wiki' },
      input,
    )

    expect(asset?.spaceId).toBe(spaceId)
    expect(asset?.campaignId).toBeNull()
    expect(asset?.parentId).toBeNull()
  })

  it('uses backfill spaceId when mission row has no space_id', () => {
    const helmsmarkSpaceId = '8ffb35ec-4728-5821-9926-7cfddde683f4'
    const asset = registry.toAsset(
      'mission',
      {
        id: 'c72c7085-bd26-59fe-8ddf-9437d00813ca',
        title: 'Helmsmark controller repositioning narrative',
        brief: 'Reposition around controller buyers.',
      },
      { ...input, spaceId: helmsmarkSpaceId },
    )

    expect(asset?.spaceId).toBe(helmsmarkSpaceId)
  })

  it('falls back to input orgId when row org_id is missing', () => {
    const asset = registry.toAsset(
      'space_doc',
      {
        id: '564ae49b-4967-5389-bc2e-6ada59925d4d',
        space_id: '9ccdb39d-2369-5b87-a35c-fe504369ef0e',
        title: 'Brand voice cheatsheet',
        doc_body: 'Use plain language.',
        custom_data: { _view_type: 'doc' },
      },
      input,
    )

    expect(asset?.orgId).toBe(input.orgId)
    expect(asset?.spaceId).toBe('9ccdb39d-2369-5b87-a35c-fe504369ef0e')
    expect(asset?.campaignId).toBeNull()
  })

  it('maps social research view types to first-class semantic source types', () => {
    expect(registry.socialResearchSourceTypeForViewType('instagram_research')).toBe(
      'instagram_research_item',
    )
    expect(registry.socialResearchSourceTypeForViewType('tiktok_research')).toBe(
      'tiktok_research_item',
    )
    expect(registry.socialResearchSourceTypeForViewType('youtube_research')).toBe(
      'youtube_research_item',
    )
    expect(registry.socialResearchSourceTypeForViewType('twitter_research')).toBe(
      'twitter_research_item',
    )
  })

  it('serializes social research rows with captions, hooks, transcripts, and metrics', () => {
    const asset = registry.toAsset(
      'instagram_research_item',
      {
        id: '0efc780b-b2ff-5897-a239-d9abbe594eb8',
        space_id: '9ccdb39d-2369-5b87-a35c-fe504369ef0e',
        title: 'C123',
        custom_data: {
          _view_type: 'instagram_research',
          _platform: 'instagram',
          _handle: 'vibey',
          media_id: 'media-1',
          media_type: 'reel',
          post_url: 'https://instagram.com/reel/C123',
          caption: 'Strong creator hook.',
          hook: 'Stop scrolling.',
          transcript: 'Stop scrolling if your funnel is leaking leads.',
          play_count: 120000,
          outlier_score: 4.2,
        },
      },
      input,
    )

    expect(asset?.sourceType).toBe('instagram_research_item')
    expect(asset?.content).toContain('Caption: Strong creator hook.')
    expect(asset?.content).toContain('Hook: Stop scrolling.')
    expect(asset?.content).toContain('Transcript: Stop scrolling')
    expect(asset?.content).toContain('Outlier score: 4.2')
  })

  it('serializes artifact rows as rich semantic assets', () => {
    const asset = registry.toAsset(
      'funnel',
      {
        id: '2459758c-d92f-57a6-aa0d-2070e2c4a87e',
        space_id: '9ccdb39d-2369-5b87-a35c-fe504369ef0e',
        campaign_id: 'f4e2558c-36f6-509c-bf95-98be94c90244',
        name: 'Workshop Funnel',
        description: 'Converts cold traffic into workshop signups.',
        metadata: { audience: 'creators' },
      },
      input,
    )

    expect(asset?.sourceType).toBe('funnel')
    expect(asset?.title).toBe('Workshop Funnel')
    expect(asset?.campaignId).toBe('f4e2558c-36f6-509c-bf95-98be94c90244')
    expect(asset?.content).toContain('Converts cold traffic')
  })
})
