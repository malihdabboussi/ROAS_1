import { describe, expect, it, vi } from 'vitest'
import { EmailArtifactsService } from './email-artifacts.service'

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createSupabase(queriesByTable: Record<string, Array<Record<string, any>>>) {
  return {
    from: vi.fn((table: string) => {
      const query = queriesByTable[table]?.shift()
      if (query) return query
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe('EmailArtifactsService', () => {
  it('creates an email artifact and links it back to the source task', async () => {
    const task = {
      id: 'task-1',
      space_id: 'space-1',
      custom_data: { artifacts: [{ kind: 'doc', id: 'doc-1' }] },
    }
    const taskLookup = createQuery({ data: task, error: null })
    const spaceLookup = createQuery({ data: { campaign_id: 'campaign-1' }, error: null })
    const emailInsert = createQuery({
      data: { id: 'email-1', subject: 'Subject' },
      error: null,
    })
    const taskUpdate = createQuery({ data: null, error: null })
    const supabase = createSupabase({
      space_items: [taskLookup, taskUpdate],
      spaces: [spaceLookup],
      emails: [emailInsert],
    })
    const service = new EmailArtifactsService()

    await expect(
      service.create(supabase as never, 'user-1', 'org-1', {
        space_id: 'space-1',
        source_item_id: 'task-1',
        subject: 'Subject',
        body: '<p>Hello</p>',
      }),
    ).resolves.toEqual({ id: 'email-1', subject: 'Subject' })
    expect(emailInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Subject',
        campaign_id: 'campaign-1',
        source_item_id: 'task-1',
      }),
    )
    expect(taskUpdate.update).toHaveBeenCalledWith({
      custom_data: {
        artifacts: [
          { kind: 'doc', id: 'doc-1' },
          { kind: 'email', id: 'email-1' },
        ],
        artifact: { kind: 'email', id: 'email-1' },
      },
    })
  })

  it('deletes an email artifact and unlinks it from source task custom data', async () => {
    const email = {
      id: 'email-1',
      space_id: 'space-1',
      source_item_id: 'task-1',
    }
    const emailLookup = createQuery({ data: email, error: null })
    const emailDelete = createQuery({ error: null })
    const taskLookup = createQuery({
      data: {
        custom_data: {
          artifact: { kind: 'email', id: 'email-1' },
          artifacts: [
            { kind: 'doc', id: 'doc-1' },
            { kind: 'email', id: 'email-1' },
          ],
        },
      },
      error: null,
    })
    const taskUpdate = createQuery({ error: null })
    const supabase = createSupabase({
      emails: [emailLookup, emailDelete],
      space_items: [taskLookup, taskUpdate],
    })
    const service = new EmailArtifactsService()

    await expect(service.delete(supabase as never, 'email-1')).resolves.toEqual({
      success: true,
      id: 'email-1',
    })
    expect(emailDelete.delete).toHaveBeenCalled()
    expect(taskUpdate.update).toHaveBeenCalledWith({
      custom_data: {
        artifacts: [{ kind: 'doc', id: 'doc-1' }],
      },
    })
  })
})
