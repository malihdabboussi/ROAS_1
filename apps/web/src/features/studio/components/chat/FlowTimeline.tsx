'use client'

import { useMemo } from 'react'
import { ORB_STYLES, ToolStatusIcon } from '@/components/chat/ToolBlockInline'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import type { FlowTimelineBlock, FlowToolBlock } from '../../store/use-chat-store'

export {
  getToolIcon,
  ORB_STYLES,
  ToolBlockInline,
  ToolStatusIcon,
} from '@/components/chat/ToolBlockInline'

/**
 * FlowTimeline — flat list of tool steps. No grouping, no container.
 *
 * Active tool  → orange spinning orb + shimmer label
 * Completed    → glass icon badge + muted label
 */
export function FlowTimeline({ blocks }: { blocks: FlowTimelineBlock[] }) {
  const toolBlocks = useMemo(
    () =>
      blocks
        .filter((b): b is FlowToolBlock => b.type === 'tool')
        .sort((a, b) => a.startedAt - b.startedAt),
    [blocks],
  )

  if (toolBlocks.length === 0) return null

  return (
    <div className="mx-4 mb-3 flex max-w-2xl flex-col gap-1">
      {toolBlocks.map((block, idx) => {
        const isActive = block.state === 'active'
        const style = ORB_STYLES[idx % ORB_STYLES.length]
        const latestProgress =
          block.progress.length > 0 ? block.progress[block.progress.length - 1]?.detail : null

        return (
          <div key={block.id} className="py-0.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
                {isActive ? (
                  <VibeyChatOrb state="executing" style={style} />
                ) : (
                  <ToolStatusIcon name={block.name} action={block.action} />
                )}
              </div>
              <span
                className={`body-3 font-medium ${
                  isActive
                    ? 'text-shimmer-gradient animate-[shimmer_4s_infinite_linear]'
                    : 'text-muted-foreground'
                }`}
              >
                {block.label}
              </span>
            </div>
            {isActive && latestProgress && (
              <div className="text-muted-foreground body-3 ml-7 mt-1">{latestProgress}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
