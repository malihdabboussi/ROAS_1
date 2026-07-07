import { describe, expect, it } from 'vitest'
import { ChatOrderedBlocksService } from './chat-ordered-blocks.service'

describe('ChatOrderedBlocksService', () => {
  it('deduplicates repeated tool starts by tool call id', () => {
    const service = new ChatOrderedBlocksService()
    const state = service.createState('message-1', [])

    service.pushToolStart(
      state,
      'campaign_capability',
      'Creating your Cyprus house image',
      'generate_image',
      1,
      'tool-1',
    )
    service.pushToolStart(
      state,
      'campaign_capability',
      'Creating your Cyprus house image',
      'generate_image',
      2,
      'tool-1',
    )

    expect(state.blocks).toHaveLength(1)
    expect(state.blocks[0]).toMatchObject({
      type: 'tool',
      name: 'campaign_capability',
      label: 'Creating your Cyprus house image',
      action: 'generate_image',
      toolCallId: 'tool-1',
      state: 'active',
    })
  })

  it('deduplicates repeated active tool starts without ids when label and action match', () => {
    const service = new ChatOrderedBlocksService()
    const state = service.createState('message-1', [])

    service.pushToolStart(
      state,
      'campaign_capability',
      'Creating your Cyprus house image',
      'generate_image',
      1,
    )
    service.pushToolStart(
      state,
      'campaign_capability',
      'Creating your Cyprus house image',
      'generate_image',
      2,
    )

    expect(state.blocks).toHaveLength(1)
  })

  it('deduplicates repeated active generation starts with the same label', () => {
    const service = new ChatOrderedBlocksService()
    const state = service.createState('message-1', [])

    service.pushGenerationStart(state, 'Creating your Cyprus house image', 1)
    service.pushGenerationStart(state, 'Creating your Cyprus house image', 2)

    expect(state.blocks).toHaveLength(1)
  })
})
