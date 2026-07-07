import type { MessageContentBlock } from '../../types'
import type { ContentBlockRenderContext } from './message-bubble.types'
import { messageContentBlockPartA } from './MessageContentBlockSwitchPartA'
import { messageContentBlockPartB } from './MessageContentBlockSwitchPartB'

export function MessageContentBlockSwitch({
  block,
  ctx,
}: {
  block: MessageContentBlock
  ctx: ContentBlockRenderContext
}) {
  const a = messageContentBlockPartA(block, ctx)
  if (a !== undefined) return a
  return messageContentBlockPartB(block, ctx)
}
