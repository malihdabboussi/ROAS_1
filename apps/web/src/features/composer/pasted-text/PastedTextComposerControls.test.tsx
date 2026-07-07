import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PastedTextBlock } from './pasted-text.types'
import { PastedTextComposerControls } from './PastedTextComposerControls'

const block: PastedTextBlock = {
  id: 'paste-1',
  text: 'A long pasted research note for the composer.',
}

describe('PastedTextComposerControls', () => {
  it('renders pasted cards and delegates edit and remove actions', () => {
    const onEditBlock = vi.fn()
    const onRemoveBlock = vi.fn()

    render(
      <PastedTextComposerControls
        blocks={[block]}
        editingBlock={null}
        editingBlockId={null}
        stripClassName="px-spacing-2"
        onEditBlock={onEditBlock}
        onCloseEditor={vi.fn()}
        onSaveBlock={vi.fn()}
        onRemoveBlock={onRemoveBlock}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'View pasted text' }))
    expect(onEditBlock).toHaveBeenCalledWith('paste-1')

    fireEvent.click(screen.getByRole('button', { name: 'Remove pasted text' }))
    expect(onRemoveBlock).toHaveBeenCalledWith('paste-1')
  })

  it('renders the editor modal and delegates save and close actions', () => {
    const onCloseEditor = vi.fn()
    const onSaveBlock = vi.fn()

    render(
      <PastedTextComposerControls
        blocks={[block]}
        editingBlock={block}
        editingBlockId="paste-1"
        onEditBlock={vi.fn()}
        onCloseEditor={onCloseEditor}
        onSaveBlock={onSaveBlock}
        onRemoveBlock={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated pasted text' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveBlock).toHaveBeenCalledWith('paste-1', 'Updated pasted text')
    expect(onCloseEditor).toHaveBeenCalledTimes(1)
  })
})
