import { describe, expect, it } from 'vitest'
import { ChannelMessagesController } from '../channel-messages.controller'
import { ChannelsController } from '../channels.controller'

function methodIndex(controller: Function, methodName: string): number {
  return Object.getOwnPropertyNames(controller.prototype).indexOf(methodName)
}

describe('ChannelsController route order', () => {
  it('keeps static channel routes before :id routes', () => {
    expect(methodIndex(ChannelsController, 'getUnreadCounts')).toBeGreaterThan(-1)
    expect(methodIndex(ChannelsController, 'listUserState')).toBeGreaterThan(-1)
    expect(methodIndex(ChannelsController, 'getChannel')).toBeGreaterThan(-1)
    expect(methodIndex(ChannelsController, 'getUnreadCounts')).toBeLessThan(
      methodIndex(ChannelsController, 'getChannel'),
    )
    expect(methodIndex(ChannelsController, 'listUserState')).toBeLessThan(
      methodIndex(ChannelsController, 'getChannel'),
    )
  })

  it('keeps message action routes before generic message patch routes', () => {
    expect(methodIndex(ChannelMessagesController, 'togglePinMessage')).toBeGreaterThan(-1)
    expect(methodIndex(ChannelMessagesController, 'editChannelMessage')).toBeGreaterThan(-1)
    expect(methodIndex(ChannelMessagesController, 'togglePinMessage')).toBeLessThan(
      methodIndex(ChannelMessagesController, 'editChannelMessage'),
    )
  })
})
