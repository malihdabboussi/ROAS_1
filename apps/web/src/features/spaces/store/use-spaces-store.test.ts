import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import {
  persistActiveConversationId,
  readStoredAgentConversationId,
  readStoredConversationId,
  useSpacesStore,
} from './use-spaces-store'

const mocks = vi.hoisted(() => ({
  fetchTeamRoster: vi.fn(),
  getUser: vi.fn(),
  createSpaceItem: vi.fn(),
  createSpace: vi.fn(),
  deleteSpaceItem: vi.fn(),
  deleteSpace: vi.fn(),
  deleteViewOverride: vi.fn(),
  duplicateSpaceItem: vi.fn(),
  ensureDefaultSpace: vi.fn(),
  fetchSpaceItems: vi.fn(),
  fetchViewOverrides: vi.fn(),
  pushItemToAgent: vi.fn(),
  undoAgentTaskEdits: vi.fn(),
  updateSpaceItem: vi.fn(),
  updateSpaceItemsBatch: vi.fn(),
  upsertViewOverride: vi.fn(),
  cachedSpacesPeek: vi.fn(),
  cachedSpacesReload: vi.fn(),
  cachedSpacesMutate: vi.fn(),
}))

vi.mock('@/lib/team/team-roster-api', () => ({
  fetchTeamRoster: mocks.fetchTeamRoster,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

vi.mock('../hooks/use-cached-spaces', () => ({
  cachedSpaces: {
    peek: () => mocks.cachedSpacesPeek(),
    reload: () => mocks.cachedSpacesReload(),
    mutate: (fn: unknown) => mocks.cachedSpacesMutate(fn),
    invalidate: vi.fn(),
  },
}))

vi.mock('../services/spaces.service', () => ({
  createSpaceItem: mocks.createSpaceItem,
  createSpace: mocks.createSpace,
  deleteSpaceItem: mocks.deleteSpaceItem,
  deleteSpace: mocks.deleteSpace,
  deleteViewOverride: mocks.deleteViewOverride,
  duplicateSpaceItem: mocks.duplicateSpaceItem,
  ensureDefaultSpace: mocks.ensureDefaultSpace,
  fetchSpaceItems: mocks.fetchSpaceItems,
  fetchViewOverrides: mocks.fetchViewOverrides,
  pushItemToAgent: mocks.pushItemToAgent,
  undoAgentTaskEdits: mocks.undoAgentTaskEdits,
  updateSpaceItem: mocks.updateSpaceItem,
  updateSpaceItemsBatch: mocks.updateSpaceItemsBatch,
  upsertViewOverride: mocks.upsertViewOverride,
}))

describe('spaces active conversation storage', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.values(mocks).forEach((mock) => mock.mockReset())
    useSpacesStore.setState({
      spaces: [],
      activeSpaceId: null,
      activeViewId: null,
      items: [],
      loading: false,
      itemsLoadedForSpaceId: null,
      itemsLoadedForQueryKey: null,
      loadError: null,
      roster: [],
      rosterLoaded: false,
      currentUserId: null,
    })
  })

  it('stores separate active conversations per agent in the same space', () => {
    persistActiveConversationId('space-1', 'conversation-vibey', 'vibey')
    persistActiveConversationId('space-1', 'conversation-hr', 'hr')

    expect(readStoredAgentConversationId('space-1', 'vibey')).toBe('conversation-vibey')
    expect(readStoredAgentConversationId('space-1', 'hr')).toBe('conversation-hr')
  })

  it('clears only the selected agent conversation', () => {
    persistActiveConversationId('space-1', 'conversation-vibey', 'vibey')
    persistActiveConversationId('space-1', 'conversation-hr', 'hr')

    persistActiveConversationId('space-1', null, 'hr')

    expect(readStoredAgentConversationId('space-1', 'vibey')).toBe('conversation-vibey')
    expect(readStoredAgentConversationId('space-1', 'hr')).toBeNull()
  })

  it('keeps legacy ROAS storage compatible', () => {
    persistActiveConversationId('space-1', 'conversation-vibey', 'vibey')

    expect(readStoredConversationId('space-1')).toBe('conversation-vibey')
    expect(readStoredAgentConversationId('space-1', 'vibey')).toBe('conversation-vibey')
  })

  it('loadSpaces keeps loading false when spaces are already warm', async () => {
    const warmSpace = {
      id: 'space-1',
      name: 'Warm',
      org_id: 'org-1',
      user_id: 'user-1',
      schema: { views: [] },
    }
    mocks.cachedSpacesPeek.mockReturnValue([warmSpace])
    mocks.cachedSpacesReload.mockResolvedValue([warmSpace])
    mocks.fetchSpaceItems.mockResolvedValue([])
    mocks.fetchViewOverrides.mockResolvedValue([])

    useSpacesStore.setState({
      spaces: [warmSpace as never],
      activeSpaceId: 'space-1',
      loading: false,
      items: [],
      itemsLoadedForSpaceId: 'space-1',
      itemsLoadedForQueryKey: 'all',
    })

    const pending = useSpacesStore.getState().loadSpaces()
    expect(useSpacesStore.getState().loading).toBe(false)
    await pending
    expect(useSpacesStore.getState().loading).toBe(false)
    expect(mocks.cachedSpacesReload).toHaveBeenCalled()
  })

  it('loads roster through the shared team roster API', async () => {
    const roster: TeamRosterEntry[] = [
      {
        participant_id: 'human:user-1',
        kind: 'human',
        org_id: 'org-1',
        user_id: 'user-1',
        agent_key: null,
        display_name: 'User One',
        avatar_url: null,
        role_label: null,
        specialties: [],
        accepts_assignments: true,
        delegation_notes: null,
        timezone: null,
        working_hours: null,
        out_of_office_until: null,
        current_load: 0,
        is_ready: true,
        agent_level: null,
        org_role: null,
        email: 'user@example.com',
        created_at: '2026-06-21T00:00:00.000Z',
        updated_at: null,
      },
    ]
    mocks.fetchTeamRoster.mockResolvedValue(roster)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    await useSpacesStore.getState().loadRoster()

    expect(mocks.fetchTeamRoster).toHaveBeenCalledWith({ kind: 'all' })
    expect(useSpacesStore.getState().roster).toEqual(roster)
    expect(useSpacesStore.getState().currentUserId).toBe('user-1')
    expect(useSpacesStore.getState().rosterLoaded).toBe(true)
  })

  it('updates items through the spaces API without local debug network calls', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const updatedAt = '2026-07-08T00:00:00.000Z'
    mocks.updateSpaceItem.mockResolvedValue({
      id: 'item-1',
      updated_at: updatedAt,
    })

    useSpacesStore.setState({
      activeSpaceId: 'space-1',
      currentUserId: 'user-1',
      items: [
        {
          id: 'item-1',
          space_id: 'space-1',
          org_id: 'org-1',
          user_id: 'user-1',
          title: 'Task',
          status: 'todo',
          priority: null,
          assignee_type: 'unassigned',
          assignee_id: null,
          assignees: [],
          start_date: null,
          due_date: null,
          recurrence: null,
          parent_item_id: null,
          recurrence_parent_id: null,
          description: null,
          notes: null,
          doc_body: null,
          source: 'manual',
          linked_mission_id: null,
          form_id: null,
          task_execution_status: null,
          is_private: false,
          share_link_enabled: false,
          share_token: null,
          sort_order: 0,
          custom_data: {},
          created_at: '2026-07-07T00:00:00.000Z',
          updated_at: '2026-07-07T00:00:00.000Z',
        },
      ],
    })

    await useSpacesStore.getState().updateItem('item-1', { status: 'done' })

    expect(mocks.updateSpaceItem).toHaveBeenCalledWith('space-1', 'item-1', { status: 'done' })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(useSpacesStore.getState().items[0]).toMatchObject({
      id: 'item-1',
      status: 'done',
      updated_at: updatedAt,
    })

    vi.unstubAllGlobals()
  })
})
