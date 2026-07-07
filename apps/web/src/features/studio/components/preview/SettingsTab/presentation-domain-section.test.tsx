import { createRef } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendPost } from '@/lib/api/backend-client'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import {
  PresentationDomainSection,
  type PresentationDomainOption,
} from './presentation-domain-section'

vi.mock('@/lib/api/backend-client', () => ({
  backendPost: vi.fn(),
}))

const backendPostMock = vi.mocked(backendPost)

beforeEach(() => {
  backendPostMock.mockReset()
})

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

function domain(overrides: Partial<PresentationDomainOption> = {}): PresentationDomainOption {
  return {
    id: 'domain-1',
    domain_name: 'deck.example.com',
    domain_type: 'custom',
    status: 'verified',
    ...overrides,
  }
}

function renderDomainSection(
  overrides: Partial<Parameters<typeof PresentationDomainSection>[0]> = {},
) {
  const props = {
    presentation: presentation(),
    domains: [domain()],
    domainsLoading: false,
    selectedDomainId: '',
    setSelectedDomainId: vi.fn(),
    domainDropdownOpen: false,
    setDomainDropdownOpen: vi.fn(),
    domainDropdownTriggerRef: createRef<HTMLButtonElement>(),
    domainDropdownPos: { top: 10, left: 20, width: 240 },
    domainActionLoading: false,
    setDomainActionLoading: vi.fn(),
    setAddDomainOpen: vi.fn(),
    setPresentations: vi.fn(),
    onOpenDomainsWorkspace: vi.fn(),
    ...overrides,
  }

  render(<PresentationDomainSection {...props} />)
  return props
}

describe('PresentationDomainSection', () => {
  it('renders the loading and empty states', () => {
    renderDomainSection({ domainsLoading: true })
    expect(screen.getByText('Loading domains...')).toBeTruthy()

    cleanup()
    renderDomainSection({ domains: [] })
    expect(screen.getByText('No custom domains yet.')).toBeTruthy()
  })

  it('delegates dropdown selection and add-domain actions', () => {
    const props = renderDomainSection({ domainDropdownOpen: true })

    fireEvent.click(screen.getByRole('button', { name: 'deck.example.com Verified' }))
    expect(props.setSelectedDomainId).toHaveBeenCalledWith('domain-1')
    expect(props.setDomainDropdownOpen).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: '+ Add New Domain' }))
    expect(props.setAddDomainOpen).toHaveBeenCalledWith(true)
  })

  it('connects the selected presentation domain and updates local presentation state', async () => {
    backendPostMock.mockResolvedValue({ success: true, published_url: 'https://deck.example.com' })
    const props = renderDomainSection({ selectedDomainId: 'domain-1' })

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(backendPostMock).toHaveBeenCalledWith('/api/domains/connect-presentation', {
        domain_id: 'domain-1',
        presentation_id: 'presentation-1',
      })
    })
    expect(props.setDomainActionLoading).toHaveBeenNthCalledWith(1, true)
    expect(props.setDomainActionLoading).toHaveBeenLastCalledWith(false)

    const setPresentationsMock = props.setPresentations as unknown as {
      mock: { calls: Array<[unknown]> }
    }
    const updater = setPresentationsMock.mock.calls[0]?.[0] as
      | ((current: Presentation[]) => Presentation[])
      | undefined
    expect(updater?.([presentation()])[0]).toMatchObject({
      domain_id: 'domain-1',
      published_url: 'https://deck.example.com',
    })
  })
})
