import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceToolbarContext } from '../types'
import { SpaceMediaToolbar } from './SpaceMediaToolbar'

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({ upload: vi.fn() }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../_shared/ToolbarShell', () => ({
  ToolbarShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../_shared/GroupByButton', () => ({
  GroupByButton: () => <button type="button">Group</button>,
}))

vi.mock('../_shared/SaveViewSeparator', () => ({
  SaveViewSlot: () => null,
}))

vi.mock('../../components/toolbar', () => ({
  SpaceCustomizeButton: () => <button type="button">Customize</button>,
}))

vi.mock('./MediaTypeFilterControl', () => ({
  MediaTypeFilterControl: () => <button type="button">Media type</button>,
}))

vi.mock('./MediaPreviewCardSizeControl', () => ({
  MediaPreviewCardSizeControl: () => <button type="button">Card size</button>,
}))

vi.mock('./media-view-presentation', () => ({
  resolveMediaViewPresentation: () => ({
    uploadLabel: 'Upload media',
    uploadTooltip: 'Upload media',
    uploadAccept: 'image/*',
  }),
}))

function makeContext(overrides: Partial<SpaceToolbarContext> = {}): SpaceToolbarContext {
  return {
    activeView: { id: 'view-1' },
    activeSpace: { id: 'space-1', campaign_id: null },
    handleMediaViewConfigPatch: vi.fn(),
    mediaDetailOpen: false,
    showGroupByInToolbar: false,
    spaceToolbarSearchOpen: false,
    setSpaceToolbarSearchOpen: vi.fn(),
    schemaEditorOpen: false,
    closeCustomizePanel: vi.fn(),
    openCustomizeFromToolbar: vi.fn(),
    mediaViewConfig: {},
    ...overrides,
  } as unknown as SpaceToolbarContext
}

describe('SpaceMediaToolbar', () => {
  afterEach(() => cleanup())

  it('opens media search from one stable toolbar state', () => {
    const ctx = makeContext()
    render(<SpaceMediaToolbar ctx={ctx} />)

    fireEvent.click(screen.getByRole('button', { name: 'Search media' }))
    expect(ctx.setSpaceToolbarSearchOpen).toHaveBeenCalledWith(true)
    expect(screen.getByRole('button', { name: 'Upload media' })).toHaveClass('button-compact')
  })

  it('uses the canonical search field and clears it with Escape', () => {
    const ctx = makeContext({
      spaceToolbarSearchOpen: true,
      mediaViewConfig: { search_query: 'launch' },
    })
    render(<SpaceMediaToolbar ctx={ctx} />)
    const search = screen.getByRole('searchbox', { name: 'Search media' })

    expect(search).toHaveClass('input-leading')
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(ctx.handleMediaViewConfigPatch).toHaveBeenCalledWith({ search_query: '' })
    expect(ctx.setSpaceToolbarSearchOpen).toHaveBeenCalledWith(false)
  })
})
