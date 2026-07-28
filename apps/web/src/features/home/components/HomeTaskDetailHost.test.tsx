import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'
import { DEFAULT_SPACE_SCHEMA } from '@/features/spaces/types/space-schema'
import { HomeTaskDetailHost } from './HomeTaskDetailHost'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <div data-testid="loading-orb" />,
}))

vi.mock('@/features/spaces/components/task-detail/TaskDetailModal', () => ({
  TaskDetailModal: ({
    item,
    presentation,
  }: {
    item: { title: string | null }
    presentation?: string
  }) => (
    <div data-presentation={presentation} data-testid="task-detail-modal">
      {item.title}
    </div>
  ),
}))

vi.mock('@/features/spaces/components/StatusEditorModal', () => ({
  StatusEditorModal: () => null,
}))

vi.mock('@/features/spaces/components/SpaceStatusCascadeConfirmProvider', () => ({
  SpaceStatusCascadeConfirmProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('@/features/spaces/hooks/use-space-field-option-actions', () => ({
  useSpaceFieldOptionActions: () => ({
    handleCreateFieldOption: vi.fn(),
    handleUpdateFieldOption: vi.fn(),
    handleDeleteFieldOption: vi.fn(),
    handleTagCustomSwatchesChange: vi.fn(),
  }),
}))

vi.mock('@/features/org/services/org.service', () => ({
  orgService: {
    listRoster: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  }),
}))

const spaceItem: YourTurnItem = {
  kind: 'space_item',
  id: 'item-1',
  space_id: 'space-1',
  title: 'Prep call notes',
  status: 'todo',
  assignee_user_id: 'user-1',
  org_id: null,
  mission_id: null,
  suggestion_state: null,
  due_at: null,
  source_url: null,
  preview: null,
  created_at: '2026-07-27T00:00:00.000Z',
  updated_at: '2026-07-27T00:00:00.000Z',
}

vi.mock('@/features/spaces/services/spaces.service', () => ({
  fetchSpaceById: vi.fn().mockResolvedValue({
    id: 'space-1',
    name: 'Home',
    schema: DEFAULT_SPACE_SCHEMA,
    campaign_id: null,
  }),
  fetchSpaceItems: vi.fn().mockResolvedValue([
    {
      id: 'item-1',
      space_id: 'space-1',
      title: 'Prep call notes',
      status: 'todo',
      parent_item_id: null,
      data: {},
    },
  ]),
  fetchSpaceItem: vi.fn(),
  updateSpace: vi.fn(),
}))

describe('HomeTaskDetailHost', () => {
  afterEach(cleanup)

  it('survives loading → ready without a Rules of Hooks crash', async () => {
    render(<HomeTaskDetailHost item={spaceItem} onClose={vi.fn()} presentation="panel" />)

    expect(screen.getByTestId('loading-orb')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('task-detail-modal')).toHaveTextContent('Prep call notes')
    })
    expect(screen.getByTestId('task-detail-modal')).toHaveAttribute('data-presentation', 'panel')
  })
})
