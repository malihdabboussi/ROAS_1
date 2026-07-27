import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceToolbarContext } from '../types'
import { ArtifactsToolbar } from './ArtifactsToolbar'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../_shared/ToolbarShell', () => ({
  ToolbarShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../_shared/SaveViewSeparator', () => ({ SaveViewSlot: () => null }))
vi.mock('../_shared/GroupByButton', () => ({ GroupByButton: () => null }))
vi.mock('../_shared/AddColumnsButton', () => ({ AddColumnsButton: () => null }))
vi.mock('../../components/reporting/shared/ReportingTimeRangeSelector', () => ({
  ReportingTimeRangeSelector: () => <button type="button">Time range</button>,
}))
vi.mock('../../components/toolbar', () => ({
  SpaceCustomizeButton: () => <button type="button">Customize</button>,
}))
vi.mock('./PresentationCreateMenu', () => ({
  PresentationCreateMenu: () => <button type="button">Create presentation</button>,
}))
vi.mock('../../components/artifacts/funnels/CreateFunnelTypeModal', () => ({
  CreateFunnelTypeModal: () => null,
}))

function makeContext(overrides: Partial<SpaceToolbarContext> = {}): SpaceToolbarContext {
  return {
    activeView: { id: 'view-1', type: 'ads' },
    activeSpace: { id: 'space-1', campaign_id: 'campaign-1' },
    artifactConfig: {},
    artifactCampaignId: 'campaign-1',
    includeCampaignArtifacts: false,
    artifactPrimaryLabel: 'Ad',
    artifactSlidePreviewOpen: false,
    artifactDetailOpen: false,
    handleArtifactConfigPatch: vi.fn(),
    handleCreateArtifact: vi.fn(),
    loadCampaignArtifacts: vi.fn(),
    showGroupByInToolbar: false,
    showAddColumnsToolbar: false,
    spaceToolbarSearchOpen: false,
    setSpaceToolbarSearchOpen: vi.fn(),
    schemaEditorOpen: false,
    closeCustomizePanel: vi.fn(),
    openCustomizeFromToolbar: vi.fn(),
    ...overrides,
  } as unknown as SpaceToolbarContext
}

describe('ArtifactsToolbar', () => {
  afterEach(() => cleanup())

  it('uses stable canonical toolbar controls', () => {
    const ctx = makeContext()
    render(<ArtifactsToolbar ctx={ctx} />)

    fireEvent.click(screen.getByRole('button', { name: 'Search artifacts' }))
    expect(ctx.setSpaceToolbarSearchOpen).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'New ad' })).toHaveClass('button-compact')
  })

  it('uses the canonical search field and clears it with Escape', () => {
    const ctx = makeContext({
      artifactConfig: { search_query: 'launch' },
      spaceToolbarSearchOpen: true,
    })
    render(<ArtifactsToolbar ctx={ctx} />)

    const search = screen.getByRole('searchbox', { name: 'Search artifacts' })
    expect(search).toHaveClass('input-leading')
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(ctx.handleArtifactConfigPatch).toHaveBeenCalledWith({ search_query: '' })
    expect(ctx.setSpaceToolbarSearchOpen).toHaveBeenCalledWith(false)
  })
})
