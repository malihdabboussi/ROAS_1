import { describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceAgendaRepository } from './meeting-workspace-agenda.repository'

describe('MeetingWorkspaceAgendaRepository', () => {
  it('creates and links an agenda Space Doc when the workspace has none', async () => {
    const workspaceSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: { agenda_doc_item_id: null }, error: null })),
    }
    const workspaceUpdate = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn(async () => ({ error: null })),
    }
    const childrenQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    }
    const insertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { id: 'agenda-doc-1' }, error: null })),
    }
    let workspaceCalls = 0
    let spaceItemCalls = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'meeting_workspaces') {
          workspaceCalls += 1
          return workspaceCalls === 1 ? workspaceSelect : workspaceUpdate
        }
        if (table === 'space_items') {
          spaceItemCalls += 1
          return spaceItemCalls === 1 ? childrenQuery : insertQuery
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    const repository = new MeetingWorkspaceAgendaRepository()
    const id = await repository.ensureAgendaDocument(supabase as never, {
      meetingItemId: 'meeting-1',
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: 'org-1',
      title: 'Meeting W/ Nate',
    })

    expect(id).toBe('agenda-doc-1')
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        space_id: 'space-1',
        parent_item_id: 'meeting-1',
        title: 'Agenda — Meeting W/ Nate',
        doc_body: '',
        source: 'manual',
        custom_data: expect.objectContaining({
          _view_type: 'doc',
          entry_type: 'meeting_agenda',
          meeting_item_id: 'meeting-1',
        }),
      }),
    )
    expect(workspaceUpdate.update).toHaveBeenCalledWith({ agenda_doc_item_id: 'agenda-doc-1' })
  })

  it('reuses a workspace-linked agenda doc without inserting another', async () => {
    const workspaceQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        data: { agenda_doc_item_id: 'agenda-existing' },
        error: null,
      })),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'meeting_workspaces') return workspaceQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const repository = new MeetingWorkspaceAgendaRepository()
    const id = await repository.ensureAgendaDocument(supabase as never, {
      meetingItemId: 'meeting-1',
      spaceId: 'space-1',
      userId: 'user-1',
      orgId: null,
      title: 'Strategy call',
    })
    expect(id).toBe('agenda-existing')
  })
})
