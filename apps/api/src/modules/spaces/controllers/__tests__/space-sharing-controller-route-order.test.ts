import { describe, expect, it } from 'vitest'
import { SpacesModule } from '../../spaces.module'
import { SpaceItemSharingController } from '../space-item-sharing.controller'
import { SpacePublicSharingController } from '../space-public-sharing.controller'
import { SpaceSharingController } from '../space-sharing.controller'

function methodIndex(controller: Function, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('SpaceSharingController route order', () => {
  it('keeps public shared-token routes before space-id sharing routes', () => {
    const controllers = Reflect.getMetadata('controllers', SpacesModule) as Function[]
    expect(methodIndex(SpacePublicSharingController, 'getSharedItem')).toBeGreaterThan(-1)
    expect(methodIndex(SpacePublicSharingController, 'getSharedSpace')).toBeGreaterThan(-1)
    expect(methodIndex(SpaceSharingController, 'listSpaceShares')).toBeGreaterThan(-1)
    expect(controllers.indexOf(SpacePublicSharingController)).toBeLessThan(
      controllers.indexOf(SpaceSharingController),
    )
    expect(controllers.indexOf(SpaceSharingController)).toBeLessThan(
      controllers.indexOf(SpaceItemSharingController),
    )
  })
})
