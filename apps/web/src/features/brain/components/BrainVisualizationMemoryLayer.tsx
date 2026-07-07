'use client'

import type { ChangeEventHandler, RefObject } from 'react'
import type { BrainMemory } from '../types'
import MemoryPanel from './MemoryPanel'

interface BrainVisualizationMemoryLayerProps {
  memories: BrainMemory[]
  onImageSearchFileChange: ChangeEventHandler<HTMLInputElement>
  onMemoryPanelOpenChange: (open: boolean) => void
  onSearchQueryChange: (query: string) => void
  onSelectMemory: (memory: BrainMemory) => void
  searchImageInputRef: RefObject<HTMLInputElement | null>
  selectedMemoryId: string | null
  visible: boolean
}

export function BrainVisualizationMemoryLayer({
  memories,
  onImageSearchFileChange,
  onMemoryPanelOpenChange,
  onSearchQueryChange,
  onSelectMemory,
  searchImageInputRef,
  selectedMemoryId,
  visible,
}: BrainVisualizationMemoryLayerProps) {
  const handleSelectMemory = (memory: BrainMemory) => {
    onSelectMemory(memory)
    onSearchQueryChange(memory.content ?? memory.name ?? '')
    onMemoryPanelOpenChange(false)
  }

  return (
    <>
      <input
        ref={searchImageInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif"
        className="hidden"
        onChange={onImageSearchFileChange}
      />
      <MemoryPanel
        memories={memories}
        selectedId={selectedMemoryId}
        onSelect={handleSelectMemory}
        visible={visible}
        onClose={() => onMemoryPanelOpenChange(false)}
      />
    </>
  )
}
