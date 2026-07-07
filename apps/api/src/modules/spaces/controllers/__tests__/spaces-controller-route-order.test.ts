import { describe, expect, it } from 'vitest'
import { SpaceItemsController } from '../space-items.controller'
import { SpacesStateController } from '../spaces-state.controller'
import { SpacesModule } from '../../spaces.module'
import { SpacesController } from '../spaces.controller'

function moduleControllerIndex(controller: Function): number {
  const controllers = Reflect.getMetadata('controllers', SpacesModule) as Function[] | undefined
  return (controllers ?? []).indexOf(controller)
}

function methodIndex(controller: Function, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('SpacesController static route order', () => {
  it('registers static state routes before :id routes', () => {
    expect(moduleControllerIndex(SpacesStateController)).toBeGreaterThan(-1)
    expect(moduleControllerIndex(SpacesController)).toBeGreaterThan(-1)
    expect(moduleControllerIndex(SpacesStateController)).toBeLessThan(
      moduleControllerIndex(SpacesController),
    )
  })

  it('keeps items/batch before items/:itemId patch routes', () => {
    expect(methodIndex(SpaceItemsController, 'updateItemsBatch')).toBeGreaterThan(-1)
    expect(methodIndex(SpaceItemsController, 'updateItem')).toBeGreaterThan(-1)
    expect(methodIndex(SpaceItemsController, 'updateItemsBatch')).toBeLessThan(
      methodIndex(SpaceItemsController, 'updateItem'),
    )
  })
})
