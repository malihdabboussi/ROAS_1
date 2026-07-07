import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SpacePublicSharingController } from '../space-public-sharing.controller'

const token = '11111111-1111-4111-8111-111111111111'

function createController(shared: unknown) {
  const publicShareResolver = {
    resolvePublicSharedItemByToken: vi.fn().mockResolvedValue(shared),
  }
  return new SpacePublicSharingController(publicShareResolver as never)
}

describe('SpacePublicSharingController', () => {
  it('returns a resolved shared item payload', async () => {
    const shared = {
      share_type: 'public',
      access_level: 'view',
      space: { id: 'space-1', name: 'Launch' },
      item: { id: 'item-1', title: 'Task' },
    }
    const controller = createController(shared)

    await expect(controller.getSharedItem({ token })).resolves.toBe(shared)
  })

  it('throws not found when a shared item token does not resolve', async () => {
    const controller = createController(null)

    await expect(controller.getSharedItem({ token })).rejects.toBeInstanceOf(NotFoundException)
  })

  it('keeps external shared-space lookup paused', async () => {
    const controller = createController(null)

    await expect(controller.getSharedSpace({ token })).rejects.toBeInstanceOf(NotFoundException)
  })
})
