import { describe, expect, it } from 'vitest'
import { ArtifactResolverService, type ActiveWorkingSet } from './artifact-resolver.service'

const resolver = new ArtifactResolverService()

function workingSet(items: ActiveWorkingSet['byType']): ActiveWorkingSet {
  return {
    byType: items,
    lastTouched: null,
  }
}

describe('ArtifactResolverService', () => {
  it('fills a missing presentation_id from one attached presentation', () => {
    const result = resolver.resolve(
      'patch_presentation',
      { value: 'Sharper headline' },
      workingSet({
        presentation: [
          {
            type: 'presentation',
            id: 'deck-1',
            label: 'Launch Deck',
            campaign_id: 'campaign-1',
            source: 'user_attached',
            updated_at: 100,
          },
        ],
      }),
      { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    )

    expect(result).toEqual({
      ok: true,
      data: { value: 'Sharper headline', presentation_id: 'deck-1' },
    })
  })

  it('does not overwrite an explicit action target id', () => {
    const result = resolver.resolve(
      'patch_presentation',
      { presentation_id: 'explicit-deck', value: 'Sharper headline' },
      workingSet({
        presentation: [
          {
            type: 'presentation',
            id: 'deck-1',
            label: 'Launch Deck',
            campaign_id: 'campaign-1',
            source: 'user_attached',
            updated_at: 100,
          },
        ],
      }),
      { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    )

    expect(result).toEqual({
      ok: true,
      data: { presentation_id: 'explicit-deck', value: 'Sharper headline' },
    })
  })

  it('returns ambiguity instead of guessing between same-priority candidates', () => {
    const result = resolver.resolve(
      'patch_presentation',
      { value: 'Sharper headline' },
      workingSet({
        presentation: [
          {
            type: 'presentation',
            id: 'deck-1',
            label: 'Launch Deck',
            campaign_id: 'campaign-1',
            source: 'user_attached',
            updated_at: 100,
          },
          {
            type: 'presentation',
            id: 'deck-2',
            label: 'Sales Deck',
            campaign_id: 'campaign-1',
            source: 'user_attached',
            updated_at: 101,
          },
        ],
      }),
      { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    )

    expect(result).toEqual({
      ok: false,
      reason: 'ambiguous',
      candidates: [
        expect.objectContaining({ id: 'deck-2' }),
        expect.objectContaining({ id: 'deck-1' }),
      ],
    })
  })

  it('resolves child page ids instead of using only the parent funnel', () => {
    const result = resolver.resolve(
      'update_funnel_page',
      { value: 'New hero copy' },
      workingSet({
        funnel: [
          {
            type: 'funnel',
            id: 'funnel-1',
            label: 'Main Funnel',
            campaign_id: 'campaign-1',
            source: 'created_in_conversation',
            updated_at: 90,
          },
        ],
        funnel_page: [
          {
            type: 'funnel_page',
            id: 'page-1',
            label: 'Opt-in Page',
            campaign_id: 'campaign-1',
            parent: { type: 'funnel', id: 'funnel-1' },
            source: 'created_in_conversation',
            updated_at: 100,
          },
        ],
      }),
      { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    )

    expect(result).toEqual({
      ok: true,
      data: { value: 'New hero copy', funnel_page_id: 'page-1' },
    })
  })

  it('does not resolve funnel_page_id from only a parent funnel', () => {
    const result = resolver.resolve(
      'update_funnel_page',
      { value: 'New hero copy' },
      workingSet({
        funnel: [
          {
            type: 'funnel',
            id: 'funnel-1',
            label: 'Main Funnel',
            campaign_id: 'campaign-1',
            source: 'created_in_conversation',
            updated_at: 100,
          },
        ],
      }),
      { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    )

    expect(result).toEqual({ ok: false, reason: 'no_target' })
  })

  it('does not auto-fill destructive actions even if a target exists', () => {
    const result = resolver.resolve(
      'delete_presentation',
      {},
      workingSet({
        presentation: [
          {
            type: 'presentation',
            id: 'deck-1',
            label: 'Launch Deck',
            campaign_id: 'campaign-1',
            source: 'user_attached',
            updated_at: 100,
          },
        ],
      }),
      { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    )

    expect(result).toEqual({ ok: false, reason: 'not_resolvable' })
  })

  it('prefers same-campaign candidates before declaring ambiguity', () => {
    const result = resolver.resolve(
      'patch_presentation',
      { value: 'Sharper headline' },
      workingSet({
        presentation: [
          {
            type: 'presentation',
            id: 'deck-1',
            label: 'Launch Deck',
            campaign_id: 'campaign-1',
            source: 'created_in_conversation',
            updated_at: 100,
          },
          {
            type: 'presentation',
            id: 'deck-2',
            label: 'Other Campaign Deck',
            campaign_id: 'campaign-2',
            source: 'created_in_conversation',
            updated_at: 101,
          },
        ],
      }),
      { campaign_id: 'campaign-1', space_id: null, scope_kind: 'campaign', org_id: null },
    )

    expect(result).toEqual({
      ok: true,
      data: { value: 'Sharper headline', presentation_id: 'deck-1' },
    })
  })
})
