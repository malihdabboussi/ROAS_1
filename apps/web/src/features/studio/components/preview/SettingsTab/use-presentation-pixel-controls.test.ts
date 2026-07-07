import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '../../../types'
import { updatePresentation } from '../../../services/artifact-preview.service'
import { usePresentationPixelControls } from './use-presentation-pixel-controls'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('../../../services/artifact-preview.service', () => ({
  updatePresentation: vi.fn().mockResolvedValue({}),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function presentation(overrides: Partial<Presentation> = {}): Presentation {
  return {
    id: 'presentation-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    offer_id: null,
    name: 'Deck',
    slides: [],
    generated_html: null,
    theme_id: null,
    file_url: null,
    status: 'generated',
    slug: 'deck',
    published_url: null,
    domain_id: null,
    hide_branding: false,
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

function useHarness(activePresentationId = 'presentation-1') {
  const [presentations, setPresentations] = useState<Presentation[]>([
    presentation({ metadata: { meta_pixels: [{ id: 'old-pixel' }] } }),
  ])
  const controls = usePresentationPixelControls({
    presentations,
    setPresentations,
    activePresentationId,
  })
  return { presentations, ...controls }
}

describe('usePresentationPixelControls', () => {
  it('updates presentation pixel metadata and primary pixel id', async () => {
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      await result.current.handleUpdatePresentationPixels('presentation-1', [
        { id: 'pixel-1', source: 'manual' },
      ])
    })

    expect(updatePresentation).toHaveBeenCalledWith('presentation-1', {
      metadata: {
        meta_pixels: [{ id: 'pixel-1', source: 'manual' }],
        meta_pixel_id: 'pixel-1',
      },
    })
    expect(result.current.presentations[0]!.metadata).toEqual({
      meta_pixels: [{ id: 'pixel-1', source: 'manual' }],
      meta_pixel_id: 'pixel-1',
    })
  })

  it('rolls back presentation metadata when event save fails', async () => {
    vi.mocked(updatePresentation).mockRejectedValueOnce(new Error('failed'))
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      await result.current.handleUpdatePresentationMetaEvents('presentation-1', {
        'opt-in': 'Lead',
      })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    expect(result.current.presentations[0]!.metadata).toEqual({
      meta_pixels: [{ id: 'old-pixel' }],
    })
  })

  it('resets the pixel add flow when the active presentation changes', () => {
    const { result, rerender } = renderHook(
      ({ activePresentationId }) => useHarness(activePresentationId),
      { initialProps: { activePresentationId: 'presentation-1' } },
    )

    act(() => {
      result.current.setLmPixelAddFlow('__pasting__12345')
    })
    expect(result.current.lmPixelAddFlow).toBe('__pasting__12345')

    rerender({ activePresentationId: 'presentation-2' })
    expect(result.current.lmPixelAddFlow).toBe('')
  })
})
