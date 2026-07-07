import { describe, expect, it } from 'vitest'
import { SpaceKeywordContextService } from './space-keyword-context.service'

describe('SpaceKeywordContextService', () => {
  it('builds contextual prefixes and keyword metadata without LLM guesses', () => {
    const service = new SpaceKeywordContextService()
    const result = service.build(
      {
        sourceType: 'space_doc',
        sourceId: 'doc-1',
        title: 'Homepage Offer Doc',
        summary: 'Pricing and positioning decisions',
        content: 'Decision: Almanac launch price is $49 for the first cohort.',
        userId: 'user-1',
        orgId: 'org-1',
        spaceId: 'space-1',
        campaignId: 'campaign-1',
        retrieveVia: {
          action: 'read_space_document',
          data: { space_id: 'space-1', document_id: 'doc-1' },
        },
      },
      'Decision: Almanac launch price is $49 for the first cohort.',
      0,
    )

    expect(result.contextualPrefix).toContain('Homepage Offer Doc')
    expect(result.contextualPrefix).toContain('space doc')
    expect(result.searchTerms).toContain('almanac')
    expect(result.entities).toContain('Almanac')
    expect(result.aliases).toContain('Homepage Offer Doc')
    expect(result.metadata.retrieve_via).toMatchObject({
      action: 'read_space_document',
    })
    expect(result.contentHash).toHaveLength(64)
  })
})
