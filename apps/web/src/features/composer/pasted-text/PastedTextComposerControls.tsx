'use client'

import { PastedTextEditorModal } from './PastedTextEditorModal'
import { PastedTextStrip } from './PastedTextStrip'
import type { PastedTextBlock } from './pasted-text.types'

export function PastedTextComposerControls({
  blocks,
  editingBlock,
  editingBlockId,
  stripClassName,
  onEditBlock,
  onCloseEditor,
  onSaveBlock,
  onRemoveBlock,
}: {
  blocks: PastedTextBlock[]
  editingBlock: PastedTextBlock | null
  editingBlockId: string | null
  stripClassName?: string
  onEditBlock: (id: string) => void
  onCloseEditor: () => void
  onSaveBlock: (id: string, text: string) => void
  onRemoveBlock: (id: string) => void
}) {
  return (
    <>
      <PastedTextStrip
        blocks={blocks}
        onBlockClick={(block) => onEditBlock(block.id)}
        onBlockRemove={(block) => onRemoveBlock(block.id)}
        stripClassName={stripClassName}
      />
      <PastedTextEditorModal
        block={editingBlock}
        open={editingBlockId !== null}
        onOpenChange={(open) => {
          if (!open) onCloseEditor()
        }}
        onSave={onSaveBlock}
        onRemove={onRemoveBlock}
      />
    </>
  )
}
