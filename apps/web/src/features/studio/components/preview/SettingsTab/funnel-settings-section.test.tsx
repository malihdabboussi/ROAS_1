import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Funnel } from '@/features/studio/services/artifact-preview.service'
import { FunnelSettingsSection } from './funnel-settings-section'

vi.mock('../funnel-settings', () => ({
  FunnelSettingsSections: ({
    campaignId,
    funnel,
    isFreeUser,
    domainsLoading,
    selectedDomainId,
    onFunnelChange,
    onOpenAddDomain,
    onOpenDomainsWorkspace,
  }: {
    campaignId: string
    funnel: Funnel
    isFreeUser: boolean
    domainsLoading?: boolean
    selectedDomainId?: string
    onFunnelChange: (next: Funnel) => void
    onOpenAddDomain: () => void
    onOpenDomainsWorkspace: () => void
  }) => (
    <div
      data-testid="funnel-settings-details"
      data-campaign-id={campaignId}
      data-funnel-id={funnel.id}
      data-free-user={String(isFreeUser)}
      data-domains-loading={String(domainsLoading)}
      data-selected-domain-id={selectedDomainId ?? ''}
    >
      <button type="button" onClick={() => onFunnelChange({ ...funnel, name: 'Updated Funnel' })}>
        change funnel
      </button>
      <button type="button" onClick={onOpenAddDomain}>
        add domain
      </button>
      <button type="button" onClick={onOpenDomainsWorkspace}>
        open domains workspace
      </button>
    </div>
  ),
}))

afterEach(cleanup)

function funnel(overrides: Partial<Funnel> = {}): Funnel {
  return {
    id: 'funnel-1',
    campaign_id: 'campaign-1',
    name: 'Checkout Funnel',
    slug: 'checkout-funnel',
    funnel_type: 'lead-magnet',
    status: 'published',
    hide_branding: false,
    created_at: '2026-06-22T00:00:00.000Z',
    updated_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('FunnelSettingsSection', () => {
  it('renders the active funnel shell and delegates detail settings props', () => {
    const setActiveIndex = vi.fn()
    const onStartEdit = vi.fn()
    const onFunnelChange = vi.fn()
    const onOpenAddDomain = vi.fn()
    const onOpenDomainsWorkspace = vi.fn()

    const { container } = render(
      <FunnelSettingsSection
        campaignId="campaign-1"
        funnels={[funnel(), funnel({ id: 'funnel-2', name: 'Upsell Funnel', status: 'draft' })]}
        activeIndex={0}
        setActiveIndex={setActiveIndex}
        editingId={null}
        draftName=""
        setDraftName={vi.fn()}
        onStartEdit={onStartEdit}
        onCommitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onFunnelChange={onFunnelChange}
        savingIds={new Set()}
        containerRef={createRef<HTMLDivElement>()}
        nameInputRef={createRef<HTMLInputElement>()}
        isFreeUser={true}
        domains={[]}
        setDomains={vi.fn()}
        domainsLoading={true}
        metaPixelsByAccount={{}}
        adCampaigns={[]}
        onOpenDomainsWorkspace={onOpenDomainsWorkspace}
        onOpenAddDomain={onOpenAddDomain}
        selectedDomainId="domain-1"
        setSelectedDomainId={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Checkout Funnel' })).toBeTruthy()
    expect(screen.getByText('Published')).toBeTruthy()
    expect(screen.getByText('lead-magnet')).toBeTruthy()
    expect(screen.getByText('1 / 2')).toBeTruthy()

    const delegated = screen.getByTestId('funnel-settings-details')
    expect(delegated.dataset.campaignId).toBe('campaign-1')
    expect(delegated.dataset.funnelId).toBe('funnel-1')
    expect(delegated.dataset.freeUser).toBe('true')
    expect(delegated.dataset.domainsLoading).toBe('true')
    expect(delegated.dataset.selectedDomainId).toBe('domain-1')

    fireEvent.click(screen.getByRole('button', { name: 'Checkout Funnel' }))
    expect(onStartEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'funnel-1' }))

    fireEvent.click(screen.getByRole('button', { name: 'change funnel' }))
    expect(onFunnelChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Funnel' }))

    fireEvent.click(screen.getByRole('button', { name: 'add domain' }))
    fireEvent.click(screen.getByRole('button', { name: 'open domains workspace' }))
    expect(onOpenAddDomain).toHaveBeenCalledTimes(1)
    expect(onOpenDomainsWorkspace).toHaveBeenCalledTimes(1)

    const shell = container.querySelector('[tabindex="0"]')
    fireEvent.keyDown(shell!, { key: 'ArrowRight' })
    fireEvent.keyDown(shell!, { key: 'ArrowLeft' })
    expect((setActiveIndex.mock.calls[0]![0] as (index: number) => number)(0)).toBe(1)
    expect((setActiveIndex.mock.calls[1]![0] as (index: number) => number)(1)).toBe(0)
  })

  it('keeps the edit-name branch and empty-state behavior intact', () => {
    const setDraftName = vi.fn()
    const onCommitEdit = vi.fn().mockResolvedValue(undefined)
    const onCancelEdit = vi.fn()

    const { rerender } = render(
      <FunnelSettingsSection
        campaignId="campaign-1"
        funnels={[funnel()]}
        activeIndex={0}
        setActiveIndex={vi.fn()}
        editingId="funnel-1"
        draftName="Draft Funnel"
        setDraftName={setDraftName}
        onStartEdit={vi.fn()}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
        onFunnelChange={vi.fn()}
        savingIds={new Set(['funnel-1'])}
        containerRef={createRef<HTMLDivElement>()}
        nameInputRef={createRef<HTMLInputElement>()}
        isFreeUser={false}
        domains={[]}
        setDomains={vi.fn()}
        domainsLoading={false}
        metaPixelsByAccount={{}}
        adCampaigns={[]}
        onOpenDomainsWorkspace={vi.fn()}
        onOpenAddDomain={vi.fn()}
        selectedDomainId=""
        setSelectedDomainId={vi.fn()}
      />,
    )

    const input = screen.getByDisplayValue('Draft Funnel')
    fireEvent.change(input, { target: { value: 'Renamed Funnel' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(setDraftName).toHaveBeenCalledWith('Renamed Funnel')
    expect(onCommitEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'funnel-1' }))
    expect(onCancelEdit).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Saving...')).toBeTruthy()

    rerender(
      <FunnelSettingsSection
        campaignId="campaign-1"
        funnels={[]}
        activeIndex={0}
        setActiveIndex={vi.fn()}
        editingId={null}
        draftName=""
        setDraftName={vi.fn()}
        onStartEdit={vi.fn()}
        onCommitEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onFunnelChange={vi.fn()}
        savingIds={new Set()}
        containerRef={createRef<HTMLDivElement>()}
        nameInputRef={createRef<HTMLInputElement>()}
        isFreeUser={false}
        domains={[]}
        setDomains={vi.fn()}
        domainsLoading={false}
        metaPixelsByAccount={{}}
        adCampaigns={[]}
        onOpenDomainsWorkspace={vi.fn()}
        onOpenAddDomain={vi.fn()}
        selectedDomainId=""
        setSelectedDomainId={vi.fn()}
      />,
    )

    expect(screen.getByText('No funnels yet')).toBeTruthy()
    expect(screen.getByText('Create a funnel in the Artifacts tab to configure its settings here.')).toBeTruthy()
  })
})
