import { createRef } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainVisualizationMemoryLayer } from './BrainVisualizationMemoryLayer'
import type { BrainMemory } from '../types'

const mocks = vi.hoisted(() => ({
  memoryPanel: vi.fn(),
}))

vi.mock('./MemoryPanel', () => ({
  default: (props: {
    memories: BrainMemory[]
    onClose: () => void
    onSelect: (memory: BrainMemory) => void
    selectedId: string | null
    visible: boolean
  }) => {
    mocks.memoryPanel(props)
    return props.visible ? (
      <div data-testid="memory-panel" data-selected-id={props.selectedId ?? ''}>
        <button type="button" onClick={() => props.onSelect(props.memories[0]!)}>
          Select memory
        </button>
        <button type="button" onClick={props.onClose}>
          Close memories
        </button>
      </div>
    ) : null
  },
}))

const memory: BrainMemory = {
  id: 'memory-1',
  content: 'Launch memory',
  memory_type: 'fact',
  source_type: 'note',
  significance: 0.8,
  confidence: 1,
  tags: [],
  recalled_count: 0,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-02T00:00:00.000Z',
  node_type: 'memory',
  name: 'Launch memory',
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderMemoryLayer(
  overrides: Partial<Parameters<typeof BrainVisualizationMemoryLayer>[0]> = {},
) {
  const props: Parameters<typeof BrainVisualizationMemoryLayer>[0] = {
    memories: [memory],
    onImageSearchFileChange: vi.fn(),
    onMemoryPanelOpenChange: vi.fn(),
    onSearchQueryChange: vi.fn(),
    onSelectMemory: vi.fn(),
    searchImageInputRef: createRef<HTMLInputElement>(),
    selectedMemoryId: null,
    visible: true,
    ...overrides,
  }

  return {
    ...render(<BrainVisualizationMemoryLayer {...props} />),
    props,
  }
}

describe('BrainVisualizationMemoryLayer', () => {
  it('keeps the hidden image search input wired to the image-search handler', () => {
    const onImageSearchFileChange = vi.fn()
    const { container } = renderMemoryLayer({ onImageSearchFileChange })

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')

    expect(input).toBeTruthy()
    expect(input?.className).toBe('hidden')
    expect(input?.accept).toBe('.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif')

    const file = new File(['image-bytes'], 'brain.png', { type: 'image/png' })
    fireEvent.change(input!, { target: { files: [file] } })

    expect(onImageSearchFileChange).toHaveBeenCalledTimes(1)
  })

  it('selects a memory, mirrors its text into search, and closes the memory panel', () => {
    const onMemoryPanelOpenChange = vi.fn()
    const onSearchQueryChange = vi.fn()
    const onSelectMemory = vi.fn()

    renderMemoryLayer({
      onMemoryPanelOpenChange,
      onSearchQueryChange,
      onSelectMemory,
      selectedMemoryId: 'memory-1',
    })

    expect(screen.getByTestId('memory-panel').getAttribute('data-selected-id')).toBe('memory-1')

    fireEvent.click(screen.getByRole('button', { name: 'Select memory' }))

    expect(onSelectMemory).toHaveBeenCalledWith(memory)
    expect(onSearchQueryChange).toHaveBeenCalledWith('Launch memory')
    expect(onMemoryPanelOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes the memory panel through the existing close callback', () => {
    const onMemoryPanelOpenChange = vi.fn()

    renderMemoryLayer({ onMemoryPanelOpenChange })

    fireEvent.click(screen.getByRole('button', { name: 'Close memories' }))

    expect(onMemoryPanelOpenChange).toHaveBeenCalledWith(false)
  })
})
