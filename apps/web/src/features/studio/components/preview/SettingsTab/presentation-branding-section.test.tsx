import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import { PresentationBrandingSection } from './presentation-branding-section'

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
    hide_branding: true,
    metadata: null,
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('PresentationBrandingSection', () => {
  it('renders branding copy, saving state, and delegates paid-user toggle changes', () => {
    const onToggleBranding = vi.fn().mockResolvedValue(undefined)

    render(
      <PresentationBrandingSection
        presentation={presentation()}
        isSaving={true}
        isFreeUser={false}
        onToggleBranding={onToggleBranding}
      />,
    )

    expect(screen.getByText('Remove "Made with ROAS"')).toBeTruthy()
    expect(screen.getByText('Hide the watermark on published presentation pages.')).toBeTruthy()
    expect(screen.getByText('Saving...')).toBeTruthy()

    fireEvent.click(screen.getByRole('switch'))
    expect(onToggleBranding).toHaveBeenCalledWith('presentation-1', false)
  })

  it('keeps the branding switch disabled for free users', () => {
    const onToggleBranding = vi.fn()

    render(
      <PresentationBrandingSection
        presentation={presentation({ hide_branding: false })}
        isSaving={false}
        isFreeUser={true}
        onToggleBranding={onToggleBranding}
      />,
    )

    fireEvent.click(screen.getByRole('switch'))
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true)
    expect(onToggleBranding).not.toHaveBeenCalled()
  })
})
