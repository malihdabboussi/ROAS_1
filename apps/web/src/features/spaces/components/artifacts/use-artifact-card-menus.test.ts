import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ArtifactListRow } from './artifact-display'
import { useArtifactCardMenus } from './use-artifact-card-menus'

const offerRow: ArtifactListRow = {
  id: 'artifact-offer',
  title: 'Offer artifact',
  raw: {
    id: 'offer-1',
    name: 'Offer One',
    campaign_id: 'campaign-1',
  },
}

describe('useArtifactCardMenus', () => {
  it('builds offer menu controls and opens them from a context-menu event', () => {
    const { result } = renderHook(() =>
      useArtifactCardMenus({
        row: offerRow,
        previewType: 'offer',
        parentCampaignId: 'parent-campaign',
      }),
    )

    expect(result.current.isOfferCard).toBe(true)
    expect(result.current.actionMenus).toHaveLength(1)
    expect(result.current.actionMenus[0]?.key).toBe('offer')
    expect(result.current.dropdownControls.offer.target).toEqual({
      id: 'offer-1',
      name: 'Offer One',
      campaign_id: 'campaign-1',
    })
    expect(result.current.dropdownControls.offer.open).toBe(false)
    expect(result.current.dropdownControls.offer.pointerPosition).toBeNull()

    const event = {
      clientX: 120,
      clientY: 48,
      preventDefault: vi.fn(),
    }

    act(() => {
      result.current.onContextMenu?.(event as never)
    })

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(result.current.actionMenus[0]?.open).toBe(true)
    expect(result.current.dropdownControls.offer.open).toBe(true)
    expect(result.current.dropdownControls.offer.pointerPosition).toEqual({ x: 120, y: 48 })
  })

  it('returns no menu controls for unsupported artifact cards', () => {
    const { result } = renderHook(() =>
      useArtifactCardMenus({
        row: { id: 'doc-1', title: 'Doc', raw: {} },
        previewType: 'doc',
        parentCampaignId: 'parent-campaign',
      }),
    )

    expect(result.current.actionMenus).toEqual([])
    expect(result.current.onContextMenu).toBeUndefined()
  })
})
