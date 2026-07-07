import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import { PresentationPixelEventsSection } from './presentation-pixel-events-section'

vi.mock('../SettingsDropdown', () => ({
  SettingsDropdown: ({
    options,
    onChange,
    placeholder,
  }: {
    options: Array<{ value: string; label: string }>
    onChange: (value: string) => void
    placeholder?: string
  }) => (
    <button
      type="button"
      data-testid={`settings-dropdown-${placeholder ?? 'select'}`}
      onClick={() => {
        const nextValue = placeholder === 'View content' ? 'Lead' : options[1]?.value
        if (nextValue) onChange(nextValue)
      }}
    >
      {placeholder}
    </button>
  ),
}))

afterEach(cleanup)

function presentation(overrides: Partial<Presentation> = {}): Presentation {
  return {
    id: 'presentation-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    offer_id: null,
    name: 'Launch Deck',
    slides: [],
    generated_html: null,
    theme_id: null,
    file_url: null,
    status: 'generated',
    slug: 'launch-deck',
    published_url: null,
    domain_id: null,
    hide_branding: false,
    metadata: {
      meta_pixels: [{ id: '123456', name: 'Existing Pixel', source: 'integration' }],
      meta_events: { 'opt-in': 'ViewContent' },
    },
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

const pixelOptions = [
  { value: '123456', label: 'Existing Pixel' },
  { value: '678901', label: 'New Pixel' },
]

describe('PresentationPixelEventsSection', () => {
  it('renders current pixels and delegates remove plus event updates', () => {
    const onUpdatePixels = vi.fn().mockResolvedValue(undefined)
    const onUpdateMetaEvents = vi.fn().mockResolvedValue(undefined)

    const { rerender } = render(
      <PresentationPixelEventsSection
        presentation={presentation()}
        pixelSaving={true}
        pixelAddFlow=""
        setPixelAddFlow={vi.fn()}
        allMetaPixelOptions={pixelOptions}
        onUpdatePixels={onUpdatePixels}
        onUpdateMetaEvents={onUpdateMetaEvents}
      />,
    )

    expect(screen.getByText('Meta Pixel & events')).toBeTruthy()
    expect(screen.getByText('Existing Pixel')).toBeTruthy()
    expect(screen.getByText('123456')).toBeTruthy()
    expect(screen.getByText('Saving...')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Remove' }) as HTMLButtonElement).disabled).toBe(
      true,
    )

    rerender(
      <PresentationPixelEventsSection
        presentation={presentation()}
        pixelSaving={false}
        pixelAddFlow=""
        setPixelAddFlow={vi.fn()}
        allMetaPixelOptions={pixelOptions}
        onUpdatePixels={onUpdatePixels}
        onUpdateMetaEvents={onUpdateMetaEvents}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onUpdatePixels).toHaveBeenCalledWith('presentation-1', [])

    fireEvent.click(screen.getByTestId('settings-dropdown-View content'))
    expect(onUpdateMetaEvents).toHaveBeenCalledWith('presentation-1', {
      'opt-in': 'Lead',
    })
  })

  it('keeps add-flow branching for Meta and manual pixel additions', () => {
    const setPixelAddFlow = vi.fn()
    const onUpdatePixels = vi.fn().mockResolvedValue(undefined)
    const onUpdateMetaEvents = vi.fn().mockResolvedValue(undefined)

    const { rerender } = render(
      <PresentationPixelEventsSection
        presentation={presentation()}
        pixelSaving={false}
        pixelAddFlow=""
        setPixelAddFlow={setPixelAddFlow}
        allMetaPixelOptions={pixelOptions}
        onUpdatePixels={onUpdatePixels}
        onUpdateMetaEvents={onUpdateMetaEvents}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Pixel To Presentation' }))
    expect(setPixelAddFlow).toHaveBeenCalledWith('__choose__')

    rerender(
      <PresentationPixelEventsSection
        presentation={presentation()}
        pixelSaving={false}
        pixelAddFlow="__choose__"
        setPixelAddFlow={setPixelAddFlow}
        allMetaPixelOptions={pixelOptions}
        onUpdatePixels={onUpdatePixels}
        onUpdateMetaEvents={onUpdateMetaEvents}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'From Meta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Paste Pixel ID' }))
    expect(setPixelAddFlow).toHaveBeenCalledWith('__meta__')
    expect(setPixelAddFlow).toHaveBeenCalledWith('__pasting__')

    rerender(
      <PresentationPixelEventsSection
        presentation={presentation()}
        pixelSaving={false}
        pixelAddFlow="__meta__"
        setPixelAddFlow={setPixelAddFlow}
        allMetaPixelOptions={pixelOptions}
        onUpdatePixels={onUpdatePixels}
        onUpdateMetaEvents={onUpdateMetaEvents}
      />,
    )
    fireEvent.click(screen.getByTestId('settings-dropdown-Select a pixel...'))
    expect(setPixelAddFlow).toHaveBeenCalledWith('')
    expect(onUpdatePixels).toHaveBeenCalledWith('presentation-1', [
      { id: '123456', name: 'Existing Pixel', source: 'integration' },
      { id: '678901', name: 'New Pixel', source: 'integration' },
    ])

    rerender(
      <PresentationPixelEventsSection
        presentation={presentation()}
        pixelSaving={false}
        pixelAddFlow="__pasting__777777"
        setPixelAddFlow={setPixelAddFlow}
        allMetaPixelOptions={pixelOptions}
        onUpdatePixels={onUpdatePixels}
        onUpdateMetaEvents={onUpdateMetaEvents}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(setPixelAddFlow).toHaveBeenCalledWith('')
    expect(onUpdatePixels).toHaveBeenCalledWith('presentation-1', [
      { id: '123456', name: 'Existing Pixel', source: 'integration' },
      { id: '777777', source: 'manual' },
    ])
  })
})
