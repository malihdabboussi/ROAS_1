import type { Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PageGraderWebhooksController } from './page-grader-webhooks.controller'

const { waitUntilMock } = vi.hoisted(() => ({ waitUntilMock: vi.fn() }))
vi.mock('@vercel/functions', () => ({ waitUntil: waitUntilMock }))

describe('PageGraderWebhooksController', () => {
  beforeEach(() => waitUntilMock.mockReset())

  it('acknowledges a valid Brain webhook before background import completes', async () => {
    let finishImport: (() => void) | undefined
    const work = new Promise<{ success: true }>((resolve) => {
      finishImport = () => resolve({ success: true })
    })
    const sync = {
      beginWebhookProcessing: vi.fn().mockResolvedValue({ clientId: 'client-1', work }),
    }
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response
    const controller = new PageGraderWebhooksController(sync as never)

    await controller.receiveBrainPackageWebhook(
      {
        body: { client_id: 'client-1' },
        headers: { 'x-page-grader-signature': 'secret' },
      } as never,
      response,
    )

    expect(response.status).toHaveBeenCalledWith(202)
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      status: 'accepted',
      client_id: 'client-1',
    })
    expect(waitUntilMock).toHaveBeenCalledWith(expect.any(Promise))
    if (finishImport) finishImport()
    await work
  })

  it('rejects the request before acknowledging when connection validation fails', async () => {
    const sync = {
      beginWebhookProcessing: vi.fn().mockRejectedValue(new Error('Unknown webhook secret')),
    }
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response
    const controller = new PageGraderWebhooksController(sync as never)

    await controller.receiveBrainPackageWebhook(
      { body: { client_id: 'client-1' }, headers: {} } as never,
      response,
    )

    expect(response.status).toHaveBeenCalledWith(401)
    expect(waitUntilMock).not.toHaveBeenCalled()
  })
})
