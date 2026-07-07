import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SocialPostMenuDropdown } from './SocialPostMenuDropdown'
import type { SocialPostMenuActions, SocialPostMenuTarget } from './use-social-post-menu-actions'

const mocks = vi.hoisted(() => ({
  DeleteConfirmModal: vi.fn(
    ({
      entityName,
      onConfirm,
      open,
    }: {
      entityName: string
      onConfirm: () => void | Promise<void>
      open: boolean
    }) =>
      open ? (
        <div data-testid="delete-modal">
          <span>{entityName}</span>
          <button type="button" onClick={() => void onConfirm()}>
            Confirm delete
          </button>
        </div>
      ) : null,
  ),
  LucideIcon: vi.fn(({ name }: { name: string }) => <span data-testid={`icon-${name}`} />),
  useSocialPostMenuActions: vi.fn(),
}))

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: mocks.LucideIcon,
}))

vi.mock('../SpacesArtifactDeleteConfirmModal', () => ({
  SpacesArtifactDeleteConfirmModal: mocks.DeleteConfirmModal,
}))

vi.mock('./use-social-post-menu-actions', () => ({
  useSocialPostMenuActions: mocks.useSocialPostMenuActions,
}))

function createAnchorRef() {
  const anchor = document.createElement('button')
  anchor.getBoundingClientRect = () =>
    ({
      bottom: 48,
      height: 32,
      left: 80,
      right: 112,
      top: 16,
      width: 32,
      x: 80,
      y: 16,
      toJSON: () => ({}),
    }) as DOMRect
  document.body.appendChild(anchor)
  return { current: anchor }
}

const post: SocialPostMenuTarget = {
  id: 'post-1',
  caption: 'Launch caption',
  campaign_id: 'campaign-1',
  platform: 'instagram',
  scheduled_at: '2026-06-30T12:00:00.000Z',
  status: 'draft',
}

function createActions(): SocialPostMenuActions {
  return {
    campaigns: [
      {
        id: 'campaign-1',
        user_id: 'user-1',
        name: 'Launch',
        campaign_type: 'standard',
        status: 'active',
        config: { icon: 'rocket' },
        metrics: {},
        created_at: '2026-06-30T00:00:00.000Z',
        updated_at: '2026-06-30T00:00:00.000Z',
      },
      {
        id: 'campaign-2',
        user_id: 'user-1',
        name: 'Growth',
        campaign_type: 'standard',
        status: 'active',
        config: { icon: 'chart' },
        metrics: {},
        created_at: '2026-06-30T00:00:00.000Z',
        updated_at: '2026-06-30T00:00:00.000Z',
      },
    ],
    campaignsLoading: false,
    copyId: vi.fn(async () => {}),
    copyToCampaign: vi.fn(async () => {}),
    deletePost: vi.fn(async () => {}),
    displayName: 'Launch caption',
    duplicateInCurrentCampaign: vi.fn(async () => {}),
    isPublished: false,
    isReady: false,
    isScheduled: true,
    markDraft: vi.fn(async () => {}),
    markReady: vi.fn(async () => {}),
    moveToCampaign: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
    unschedule: vi.fn(async () => {}),
    viewAnalytics: vi.fn(async () => {}),
  }
}

describe('SocialPostMenuDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    cleanup()
  })

  it('mounts menu actions, delegates campaign submenu and delete confirm, and settles', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actions = createActions()
    mocks.useSocialPostMenuActions.mockReturnValue(actions)
    const onChanged = vi.fn()
    const onClose = vi.fn()
    const onDeleted = vi.fn()
    const onOpenFullView = vi.fn()
    const onSchedule = vi.fn()
    const anchorRef = createAnchorRef()

    const { rerender } = render(
      <SocialPostMenuDropdown
        post={post}
        anchorRef={anchorRef}
        onChanged={onChanged}
        onClose={onClose}
        onDeleted={onDeleted}
        onOpenFullView={onOpenFullView}
        onSchedule={onSchedule}
        pointerPosition={{ x: 120, y: 80 }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Copy ID' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Full screen view' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as ready' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unschedule' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy to' }))
    expect(await screen.findByText('Launch')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Growth' }))
    await waitFor(() => expect(actions.copyToCampaign).toHaveBeenCalledWith('campaign-2'))
    expect(onClose).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByTestId('delete-modal')).toHaveTextContent('Launch caption')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(actions.deletePost).toHaveBeenCalledTimes(1))
    expect(onDeleted).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalled()

    rerender(
      <SocialPostMenuDropdown
        post={{ ...post, caption: 'Launch caption updated' }}
        anchorRef={anchorRef}
        onChanged={onChanged}
        onClose={onClose}
        pointerPosition={{ x: 120, y: 80 }}
      />,
    )

    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      ),
    ).toBe(false)
    consoleError.mockRestore()
  })
})
