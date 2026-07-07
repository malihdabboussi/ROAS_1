import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { CursorApiService } from '../services/cursor-api.service'
import { CursorController } from './cursor.controller'

const user = { id: 'user-1' }

function createController() {
  const cursorRepo = {
    disconnectConnections: vi.fn().mockResolvedValue(undefined),
  }
  const controller = new CursorController(
    new CursorApiService({} as never, cursorRepo as never),
    { handleEvent: vi.fn() } as never,
    {
      resolveScopeMode: vi.fn(),
      insertOrgSharedIntegration: vi.fn(),
      upsertPersonalScopedIntegration: vi.fn(),
    } as never,
  )
  return { controller, cursorRepo }
}

describe('CursorController disconnect', () => {
  it('disconnects all current-user Cursor integrations when no connection id is provided', async () => {
    const { controller, cursorRepo } = createController()

    await expect(controller.disconnect({} as never, user, {})).resolves.toEqual({
      success: true,
    })

    expect(cursorRepo.disconnectConnections).toHaveBeenCalledWith(expect.anything(), 'user-1', undefined)
  })

  it('filters disconnect by connection id when provided', async () => {
    const { controller, cursorRepo } = createController()
    const connectionId = '11111111-1111-4111-8111-111111111111'

    await controller.disconnect({} as never, user, { connectionId })

    expect(cursorRepo.disconnectConnections).toHaveBeenCalledWith(expect.anything(), 'user-1', connectionId)
  })

  it('rejects invalid disconnect bodies', async () => {
    const { controller, cursorRepo } = createController()

    await expect(
      controller.disconnect({} as never, user, { connectionId: 'bad-id' }),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    })
    expect(cursorRepo.disconnectConnections).not.toHaveBeenCalled()
  })

  it('maps disconnect database errors to bad request HTTP errors', async () => {
    const { controller, cursorRepo } = createController()
    cursorRepo.disconnectConnections.mockRejectedValue(new BadRequestException('db failed'))

    await expect(controller.disconnect({} as never, user, {})).rejects.toBeInstanceOf(HttpException)
    await expect(controller.disconnect({} as never, user, {})).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    })
  })
})
