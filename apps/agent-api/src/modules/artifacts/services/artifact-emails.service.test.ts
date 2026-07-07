import { describe, expect, it, vi } from 'vitest'
import { ArtifactEmailsService } from './artifact-emails.service'

describe('ArtifactEmailsService', () => {
  it('saves an email artifact and links it to the source task', async () => {
    const updateMock = vi.fn()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'space_items') {
          const chain = {
            select: vi.fn(() => chain),
            update: vi.fn((payload) => {
              updateMock(payload)
              return chain
            }),
            eq: vi.fn(() => chain),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'task-1', space_id: 'space-1', custom_data: { existing: true } },
              error: null,
            }),
          }
          return chain
        }
        if (table === 'spaces') {
          const chain = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { campaign_id: 'campaign-1' },
              error: null,
            }),
          }
          return chain
        }
        if (table === 'emails') {
          const chain = {
            insert: vi.fn(() => chain),
            select: vi.fn(() => chain),
            single: vi.fn().mockResolvedValue({
              data: { id: 'email-1' },
              error: null,
            }),
          }
          return chain
        }
        return {}
      }),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => supabase),
    }
    const service = new ArtifactEmailsService()
    const result = (await service.getHandlers(target).save_email(
      {
        subject: 'Reply',
        body: 'Hello',
        space_id: 'space-1',
        source_item_id: 'task-1',
      },
      'session',
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(result.artifact_id).toBe('email-1')
    expect(updateMock).toHaveBeenCalledWith({
      custom_data: {
        existing: true,
        artifact: { kind: 'email', id: 'email-1' },
        artifacts: [{ kind: 'email', id: 'email-1' }],
      },
    })
    expect(result.ui_blocks).toEqual([
      expect.objectContaining({
        type: 'artifact_preview',
        artifactType: 'email',
        artifactId: 'email-1',
      }),
    ])
  })

  it('lists, gets, updates, and requests deletion for email artifacts', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'emails') {
          const chain = {
            select: vi.fn(() => chain),
            order: vi.fn(() => chain),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'email-1', subject: 'Reply', body: 'Hello' }],
              error: null,
            }),
            eq: vi.fn(() => chain),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'email-1', subject: 'Reply', body: 'Hello', status: 'draft' },
              error: null,
            }),
            update: vi.fn(() => chain),
          }
          return chain
        }
        return {}
      }),
    }
    const target = {
      resolveUserId: vi.fn(() => 'user-1'),
      resolveCampaignId: vi.fn(async () => 'campaign-1'),
      getUserClient: vi.fn(async () => supabase),
    }
    const service = new ArtifactEmailsService()
    const handlers = service.getHandlers(target)

    await expect(handlers.list_emails({}, 'session')).resolves.toEqual([
      { id: 'email-1', subject: 'Reply', body: 'Hello' },
    ])
    await expect(handlers.get_email({ email_id: 'email-1' }, 'session')).resolves.toMatchObject({
      id: 'email-1',
      subject: 'Reply',
    })
    await expect(
      handlers.update_email({ email_id: 'email-1', subject: 'Updated' }, 'session'),
    ).resolves.toMatchObject({
      success: true,
      id: 'email-1',
      ui_blocks: [expect.objectContaining({ artifactType: 'email', artifactId: 'email-1' })],
    })
    await expect(handlers.delete_email({ email_id: 'email-1' }, 'session')).resolves.toMatchObject({
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        expect.objectContaining({
          type: 'delete_confirm',
          delete_action: 'delete_email',
          entity_type: 'email',
          entity_id: 'email-1',
        }),
      ],
    })
  })
})
