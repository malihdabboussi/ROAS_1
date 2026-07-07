import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import { PresentationSettingsSection } from './presentation-settings-section'

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
    metadata: null,
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

function renderSection(overrides: Partial<Parameters<typeof PresentationSettingsSection>[0]> = {}) {
  const props: Parameters<typeof PresentationSettingsSection>[0] = {
    presentations: [
      presentation({ id: 'presentation-1', name: 'Launch Deck' }),
      presentation({ id: 'presentation-2', name: 'Sales Deck' }),
    ],
    activePresentationIndex: 1,
    setActivePresentationIndex: vi.fn(),
    savingPresentationIds: new Set(['presentation-2']),
    editingPresentationId: null,
    draftPresentationName: '',
    setDraftPresentationName: vi.fn(),
    presentationContainerRef: createRef<HTMLDivElement>(),
    presentationNameInputRef: createRef<HTMLInputElement>(),
    handleStartEditPresentationName: vi.fn(),
    handleCommitEditPresentationName: vi.fn(),
    handleCancelEditPresentationName: vi.fn(),
    handleTogglePresentationBranding: vi.fn(),
    domains: [],
    domainsLoading: false,
    selectedDomainId: '',
    setSelectedDomainId: vi.fn(),
    domainDropdownOpen: false,
    setDomainDropdownOpen: vi.fn(),
    domainDropdownTriggerRef: createRef<HTMLButtonElement>(),
    domainDropdownPos: { top: 0, left: 0, width: 0 },
    domainActionLoading: false,
    setDomainActionLoading: vi.fn(),
    setAddDomainOpen: vi.fn(),
    setPresentations: vi.fn(),
    onOpenDomainsWorkspace: vi.fn(),
    isFreeUser: false,
    pixelSaving: false,
    pixelAddFlow: '',
    setPixelAddFlow: vi.fn(),
    allMetaPixelOptions: [],
    onUpdatePixels: vi.fn(),
    onUpdateMetaEvents: vi.fn(),
    ...overrides,
  }

  return { ...render(<PresentationSettingsSection {...props} />), props }
}

describe('PresentationSettingsSection', () => {
  it('renders the active presentation shell and delegates navigation', () => {
    const { container, props } = renderSection()

    expect(screen.getByRole('button', { name: 'Sales Deck' })).toBeTruthy()
    expect(screen.getByText('2 / 2')).toBeTruthy()
    expect(screen.getAllByText('Saving...').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Meta Pixel & events')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Previous presentation' }))

    const previousUpdater = vi.mocked(props.setActivePresentationIndex).mock.calls[0]?.[0]
    expect(typeof previousUpdater).toBe('function')
    expect((previousUpdater as (index: number) => number)(1)).toBe(0)

    const keyboardTarget = container.querySelector('[tabindex="0"]')
    expect(keyboardTarget).toBeTruthy()
    fireEvent.keyDown(keyboardTarget as Element, { key: 'ArrowLeft' })
    fireEvent.keyDown(keyboardTarget as Element, { key: 'ArrowRight' })

    const nextUpdater = vi.mocked(props.setActivePresentationIndex).mock.calls[2]?.[0]
    expect(typeof nextUpdater).toBe('function')
    expect((nextUpdater as (index: number) => number)(1)).toBe(1)
    expect(props.setActivePresentationIndex).toHaveBeenCalledTimes(3)
  })

  it('renders nothing when no active presentation exists', () => {
    const { container } = renderSection({ presentations: [] })

    expect(container.firstChild).toBeNull()
  })
})
