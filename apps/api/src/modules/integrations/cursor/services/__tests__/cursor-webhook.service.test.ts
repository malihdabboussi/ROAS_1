import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CursorIntegration } from '../../integrations/cursor.integration'
import { CursorWebhookService } from '../cursor-webhook.service'

const resumeAutomationMock = vi.fn()
const createActivityMock = vi.fn()

function createService(repoOverrides: Record<string, unknown> = {}) {
  const cursorRepo = {
    getServiceClient: vi.fn().mockReturnValue({}),
    insertWebhookEvent: vi.fn().mockResolvedValue(null),
    findSpaceItemByCursorAgentId: vi.fn().mockResolvedValue({
      id: 'item-1',
      space_id: 'space-1',
      user_id: 'user-1',
      org_id: null,
      custom_data: { cursor_connection_id: 'conn-1' },
    }),
    findConnectionMetadata: vi.fn().mockResolvedValue({}),
    updateSpaceItemCursorResult: vi.fn().mockResolvedValue(undefined),
    findLatestPausedRunForItem: vi.fn().mockResolvedValue({ id: 'run-1' }),
    ...repoOverrides,
  }
  const service = new CursorWebhookService(
    {
      get: (key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
        return ''
      },
    } as never,
    new CursorIntegration(),
    cursorRepo as never,
    { createActivity: createActivityMock } as never,
    { resumeAutomation: resumeAutomationMock } as never,
  )
  return { service, cursorRepo }
}

describe('CursorWebhookService', () => {
  beforeEach(() => {
    resumeAutomationMock.mockReset()
    createActivityMock.mockReset()
  })

  it('returns 401 for invalid signature when secret configured', async () => {
    const { service } = createService({
      findConnectionMetadata: vi.fn().mockResolvedValue({ webhook_secret: 'secret' }),
    })

    const result = await service.handleEvent({
      rawBody: Buffer.from(
        JSON.stringify({ id: 'agent-1', status: 'FINISHED', event: 'statusChange' }),
      ),
      signature: 'sha256=invalid',
      webhookId: 'wh_1',
    })

    expect(result.status).toBe(401)
    expect(resumeAutomationMock).not.toHaveBeenCalled()
  })

  it('skips duplicate webhook ids', async () => {
    const { service, cursorRepo } = createService({
      insertWebhookEvent: vi.fn().mockResolvedValue({ code: '23505', message: 'duplicate' }),
    })

    const result = await service.handleEvent({
      rawBody: Buffer.from(JSON.stringify({ id: 'agent-1', status: 'FINISHED' })),
      webhookId: 'wh_dup',
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(cursorRepo.findSpaceItemByCursorAgentId).not.toHaveBeenCalled()
  })

  it('resumes automation on FINISHED', async () => {
    resumeAutomationMock.mockResolvedValue(undefined)
    const { service } = createService()

    const body = {
      id: 'agent-1',
      status: 'FINISHED',
      event: 'statusChange',
      target: {
        prUrl: 'https://github.com/org/repo/pull/1',
        url: 'https://cursor.com/agents?id=1',
      },
      summary: 'Fixed bug',
    }

    const result = await service.handleEvent({
      rawBody: Buffer.from(JSON.stringify(body)),
      webhookId: 'wh_ok',
    })

    expect(result.success).toBe(true)
    expect(createActivityMock).toHaveBeenCalled()
    expect(resumeAutomationMock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'item-1', spaceId: 'space-1' }),
      'run-1',
      'done',
    )
  })

  it('resumes automation with failed status on ERROR', async () => {
    resumeAutomationMock.mockResolvedValue(undefined)
    const { service } = createService()

    const body = { id: 'agent-1', status: 'ERROR', event: 'statusChange', summary: 'Build failed' }
    const result = await service.handleEvent({
      rawBody: Buffer.from(JSON.stringify(body)),
      webhookId: 'wh_err',
    })

    expect(result.success).toBe(true)
    expect(resumeAutomationMock).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'item-1' }),
      'run-1',
      'failed',
    )
  })
})
