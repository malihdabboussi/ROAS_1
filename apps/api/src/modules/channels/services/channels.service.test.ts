import { describe, expect, it, vi } from 'vitest'
import { ChannelsService } from './channels.service'

describe('ChannelsService', () => {
  it('delegates channel state methods to the management service', async () => {
    const channelManagement = {
      getUnreadCounts: vi.fn().mockResolvedValue({ counts: { 'channel-1': 2 } }),
    }
    const service = new ChannelsService(channelManagement as never, {} as never)

    await expect(
      service.getUnreadCounts({} as never, { userId: 'user-1', orgId: 'org-1' } as never),
    ).resolves.toEqual({ counts: { 'channel-1': 2 } })

    expect(channelManagement.getUnreadCounts).toHaveBeenCalledWith(
      {},
      { userId: 'user-1', orgId: 'org-1' },
    )
  })

  it('delegates message methods to the channel messages service', async () => {
    const channelMessages = {
      patchMessageMetadata: vi.fn().mockResolvedValue({ success: true }),
    }
    const service = new ChannelsService({} as never, channelMessages as never)

    await expect(
      service.patchMessageMetadata(
        {} as never,
        { userId: 'user-1', orgId: 'org-1' } as never,
        'channel-1',
        'message-1',
        { content_blocks_ordered: [{ id: 'block-1', confirmed: true }] },
      ),
    ).resolves.toEqual({ success: true })

    expect(channelMessages.patchMessageMetadata).toHaveBeenCalledWith(
      {},
      { userId: 'user-1', orgId: 'org-1' },
      'channel-1',
      'message-1',
      { content_blocks_ordered: [{ id: 'block-1', confirmed: true }] },
    )
  })
})
