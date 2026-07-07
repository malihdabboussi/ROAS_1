import { act, renderHook, waitFor } from '@testing-library/react'
import { backendGet } from '@/lib/api/backend-client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSettingsTabDomainControls, type SettingsCustomDomain } from './use-settings-tab-domain-controls'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn().mockResolvedValue({
    domains: [
      {
        id: 'domain-1',
        domain_name: 'example.com',
        domain: 'example.com',
        user_id: 'user-1',
        domain_type: 'custom',
        landing_page_id: null,
        funnel_id: null,
        status: 'pending',
        created_at: '2026-06-22T00:00:00.000Z',
        updated_at: '2026-06-22T00:00:00.000Z',
      },
    ],
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function domain(overrides: Partial<SettingsCustomDomain> = {}): SettingsCustomDomain {
  return {
    id: 'domain-2',
    domain_name: 'added.com',
    domain: 'added.com',
    user_id: 'user-1',
    domain_type: 'custom',
    landing_page_id: null,
    funnel_id: null,
    status: 'pending',
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('useSettingsTabDomainControls', () => {
  it('loads domains for funnel and presentation sections', async () => {
    const { result } = renderHook(() =>
      useSettingsTabDomainControls({
        activeSection: 'funnel',
        activePresentationId: null,
        activePresentationDomainId: null,
      }),
    )

    await waitFor(() => {
      expect(result.current.domainsLoading).toBe(false)
    })

    expect(backendGet).toHaveBeenCalledWith('/api/domains')
    expect(result.current.domains).toHaveLength(1)
    expect(result.current.domains[0]!.domain_name).toBe('example.com')
  })

  it('selects added domains for the active section and opens DNS details', async () => {
    const { result } = renderHook(() =>
      useSettingsTabDomainControls({
        activeSection: 'presentation',
        activePresentationId: 'presentation-1',
        activePresentationDomainId: 'domain-existing',
      }),
    )

    await waitFor(() => {
      expect(result.current.domainsLoading).toBe(false)
    })
    expect(result.current.lmSelectedDomainId).toBe('domain-existing')

    act(() => {
      result.current.handleDomainAdded(domain())
    })

    expect(result.current.domains[0]!.id).toBe('domain-2')
    expect(result.current.lmSelectedDomainId).toBe('domain-2')
    expect(result.current.selectedDomainId).toBe('')
    expect(result.current.addDomainOpen).toBe(false)
    expect(result.current.dnsDialogDomain?.id).toBe('domain-2')
  })

  it('merges DNS verification updates into existing domain rows', async () => {
    const { result } = renderHook(() =>
      useSettingsTabDomainControls({
        activeSection: 'funnel',
        activePresentationId: null,
        activePresentationDomainId: null,
      }),
    )

    await waitFor(() => {
      expect(result.current.domains).toHaveLength(1)
    })

    act(() => {
      result.current.handleDomainUpdated({
        id: 'domain-1',
        status: 'verified',
        verification_records: [{ type: 'TXT', name: '_verify', value: 'token' }],
      })
    })

    expect(result.current.domains[0]!.status).toBe('verified')
    expect(result.current.domains[0]!.verification_records).toEqual([
      { type: 'TXT', name: '_verify', value: 'token' },
    ])
    expect(result.current.domains[0]!.last_verification_check).toBeTruthy()
  })
})
