import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '../../../types'
import { updateFunnel, updatePresentation, type Funnel } from '../../../services/artifact-preview.service'
import { useSettingsTabEntityControls } from './use-settings-tab-entity-controls'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('../../../services/artifact-preview.service', () => ({
  updateFunnel: vi.fn().mockResolvedValue({ id: 'funnel-1', name: 'Saved Funnel' }),
  updatePresentation: vi.fn().mockResolvedValue({}),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function funnel(overrides: Partial<Funnel> = {}): Funnel {
  return {
    id: 'funnel-1',
    campaign_id: 'campaign-1',
    name: 'Original Funnel',
    funnel_type: 'classic',
    status: 'draft',
    layout: {},
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  } as Funnel
}

function presentation(overrides: Partial<Presentation> = {}): Presentation {
  return {
    id: 'presentation-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    offer_id: null,
    name: 'Original Presentation',
    slides: [],
    generated_html: null,
    theme_id: null,
    file_url: null,
    status: 'generated',
    slug: 'presentation',
    published_url: null,
    domain_id: null,
    hide_branding: false,
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

function useHarness() {
  const [funnels, setFunnels] = useState<Funnel[]>([funnel()])
  const [presentations, setPresentations] = useState<Presentation[]>([presentation()])
  const controls = useSettingsTabEntityControls({
    funnels,
    setFunnels,
    presentations,
    setPresentations,
  })
  return { funnels, presentations, ...controls }
}

describe('useSettingsTabEntityControls', () => {
  it('commits funnel names through the same optimistic save path', async () => {
    const { result } = renderHook(() => useHarness())

    act(() => {
      result.current.handleStartEditFunnelName(result.current.funnels[0]!)
      result.current.setDraftFunnelName('  Renamed Funnel  ')
    })
    await act(async () => {
      await result.current.handleCommitEditFunnelName(result.current.funnels[0]!)
    })

    expect(updateFunnel).toHaveBeenCalledWith('funnel-1', { name: 'Renamed Funnel' })
    expect(result.current.funnels[0]!.name).toBe('Saved Funnel')
    expect(result.current.editingFunnelId).toBeNull()
  })

  it('saves website layout and updates the matching funnel row', async () => {
    const { result } = renderHook(() => useHarness())
    const layout = { headline: 'Hello' }

    await act(async () => {
      await result.current.handleSaveWebsiteLayout('funnel-1', layout)
    })

    expect(updateFunnel).toHaveBeenCalledWith('funnel-1', { layout })
    expect(result.current.funnels[0]!.layout).toEqual(layout)
  })

  it('rolls back presentation branding when the save fails', async () => {
    vi.mocked(updatePresentation).mockRejectedValueOnce(new Error('failed'))
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      await result.current.handleTogglePresentationBranding('presentation-1', true)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
    expect(result.current.presentations[0]!.hide_branding).toBe(false)
  })
})
