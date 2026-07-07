import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChatInputAtMenuActions } from './use-chat-input-at-menu-actions'

function defaultOptions() {
  return {
    setCrossCampaignMode: vi.fn(),
    setCrossCampaignId: vi.fn(),
    setAtMenuTab: vi.fn(),
    setAtHighlight: vi.fn(),
    setAtArtifactCollapsedByType: vi.fn(),
    setAtArtifactMoreByType: vi.fn(),
    setAtMediaCollapsedByType: vi.fn(),
    setAtMediaMoreByType: vi.fn(),
  }
}

describe('useChatInputAtMenuActions', () => {
  it('resets cross-campaign state and tab highlight state', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputAtMenuActions(options))

    result.current.handleBackFromCrossCampaign()
    result.current.handleAtMenuTabChange('media')

    expect(options.setCrossCampaignMode).toHaveBeenCalledWith(false)
    expect(options.setCrossCampaignId).toHaveBeenCalledWith(null)
    expect(options.setAtMenuTab).toHaveBeenCalledWith('media')
    expect(options.setAtHighlight).toHaveBeenCalledWith(-1)
  })

  it('builds artifact and media collapse/show-more state updaters', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputAtMenuActions(options))

    result.current.handleToggleArtifactCollapsed('offer')
    result.current.handleShowAllArtifacts('offer')
    result.current.handleToggleMediaCollapsed('image')
    result.current.handleShowAllMedia('image')

    const artifactCollapse = options.setAtArtifactCollapsedByType.mock.calls[0]?.[0] as (
      state: Record<string, boolean>,
    ) => Record<string, boolean>
    const artifactMore = options.setAtArtifactMoreByType.mock.calls[0]?.[0] as (
      state: Record<string, boolean>,
    ) => Record<string, boolean>
    const mediaCollapse = options.setAtMediaCollapsedByType.mock.calls[0]?.[0] as (
      state: Record<string, boolean>,
    ) => Record<string, boolean>
    const mediaMore = options.setAtMediaMoreByType.mock.calls[0]?.[0] as (
      state: Record<string, boolean>,
    ) => Record<string, boolean>
    expect(artifactCollapse({ offer: false })).toEqual({ offer: true })
    expect(artifactMore({})).toEqual({ offer: true })
    expect(mediaCollapse({ image: true })).toEqual({ image: false })
    expect(mediaMore({})).toEqual({ image: true })
  })
})
