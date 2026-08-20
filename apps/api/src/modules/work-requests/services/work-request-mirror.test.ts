import { describe, expect, it, vi } from 'vitest'
import { clickUpMirrorLastError, mirrorWorkRequestFinalTask } from './work-request-mirror'

const harry = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  name: 'Harry/Haroon',
  email: 'haroon@roas.co',
  source: 'portal' as const,
}

describe('work-request-mirror', () => {
  it('explains an unmapped ClickUp assignee instead of a generic pending string', () => {
    expect(
      clickUpMirrorLastError(
        {
          space_item_id: 'task-1',
          status: 'created',
          clickup_task_id: null,
          assignee_resolution: [{ email: 'haroon@roas.co', status: 'unmapped' }],
        },
        {
          name: 'Harry/Haroon',
          email: 'haroon@roas.co',
          pageGraderUserId: harry.id,
          orgUserId: null,
          source: 'portal',
        },
        true,
      ),
    ).toBe('ClickUp does not have a mapped user for this assignee yet.')
  })

  it('sends the Portal roster id when intake only stored a name', async () => {
    const update = vi.fn().mockImplementation((_id, values) => Promise.resolve(values))
    const sendWork = vi.fn().mockResolvedValue({
      success: true,
      results: [
        {
          space_item_id: 'task-1',
          status: 'created',
          clickup_task_id: 'cu-1',
          clickup_task_url: 'https://app.clickup.com/t/cu-1',
        },
      ],
    })

    await mirrorWorkRequestFinalTask(
      { client: {}, update } as never,
      { sendWork } as never,
      {
        id: 'draft-1',
        owner_user_id: 'user-1',
        owner_org_id: 'org-1',
        page_grader_external_client_id: 'client-1',
        page_grader_external_campaign_id: null,
        request_type: 'ghl',
        assignee_name: 'Harry/Haroon',
        routing: {},
        due_at: null,
        sync_attempt_count: 0,
      } as never,
      { id: 'task-1', space_id: 'space-1' },
      [harry],
    )

    expect(sendWork.mock.calls[0]?.[2]).toMatchObject({
      assignee: {
        page_grader_user_id: harry.id,
        email: 'haroon@roas.co',
        name: 'Harry/Haroon',
      },
    })
  })
})
