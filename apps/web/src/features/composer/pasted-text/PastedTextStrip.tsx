'use client'

import type { PastedTextBlock } from './pasted-text.types'
import { PastedTextCard } from './PastedTextCard'

export function PastedTextStrip({
  blocks,
  onBlockClick,
  onBlockRemove,
  stripClassName = 'px-spacing-2 pb-spacing-2',
}: {
  blocks: PastedTextBlock[]
  onBlockClick: (block: PastedTextBlock) => void
  onBlockRemove?: (block: PastedTextBlock) => void
  stripClassName?: string
}) {
  if (blocks.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${stripClassName}`}>
      {blocks.map((block) => (
        <PastedTextCard
          key={block.id}
          block={block}
          onClick={() => onBlockClick(block)}
          onRemove={onBlockRemove ? () => onBlockRemove(block) : undefined}
        />
      ))}
    </div>
  )
}
