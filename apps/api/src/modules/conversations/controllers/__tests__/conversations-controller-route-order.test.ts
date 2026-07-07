import { describe, expect, it } from 'vitest'
import { ConversationsModule } from '../../conversations.module'
import { ConversationMessagesController } from '../conversation-messages.controller'
import { ConversationsController } from '../conversations.controller'

function methodIndex(controller: { prototype: object }, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('ConversationsController static route order', () => {
  it('keeps static collection routes before conversation-scoped routes', () => {
    const controllers = Reflect.getMetadata('controllers', ConversationsModule) as unknown[]

    expect(controllers.indexOf(ConversationsController)).toBeGreaterThan(-1)
    expect(controllers.indexOf(ConversationMessagesController)).toBeGreaterThan(-1)
    expect(controllers.indexOf(ConversationsController)).toBeLessThan(
      controllers.indexOf(ConversationMessagesController),
    )
    expect(methodIndex(ConversationsController, 'sharedWithMe')).toBeGreaterThan(-1)
    expect(methodIndex(ConversationsController, 'suggestTitle')).toBeGreaterThan(-1)
    expect(methodIndex(ConversationsController, 'listAssets')).toBeGreaterThan(-1)
    expect(methodIndex(ConversationMessagesController, 'getMessages')).toBeGreaterThan(-1)
  })
})
