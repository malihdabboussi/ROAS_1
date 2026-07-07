import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { AttachedFile } from '../chat/FileAttachments'
import { ChatInputAttachmentsArea } from './chat-input-attachments-area'

afterEach(cleanup)

function attachedFile(): AttachedFile {
  return {
    id: 'file-1',
    file: new File(['hello'], 'brief.txt', { type: 'text/plain' }),
    uploading: false,
  }
}

function attachedArtifact(): AttachedArtifact {
  return {
    id: 'artifact-1',
    type: 'document',
    label: 'Launch brief',
  }
}

function mediaReference(): MessageReference {
  return {
    id: 'media-1',
    kind: 'media',
    label: 'Hero image',
  }
}

function defaultProps() {
  return {
    fileInputRef: createRef<HTMLInputElement>(),
    fileInputAccept: '.txt,image/*',
    attachedFiles: [attachedFile()],
    attachedArtifacts: [attachedArtifact()],
    attachedReferences: [mediaReference()],
    creditsExhausted: true,
    composerPadX: 'px-spacing-2',
    composerChipRowPad: 'px-spacing-2 pb-spacing-2',
    onFileSelect: vi.fn(),
    onFileRemove: vi.fn(),
    onArtifactRemove: vi.fn(),
    onReferenceRemove: vi.fn(),
  }
}

describe('ChatInputAttachmentsArea', () => {
  it('renders hidden file input, attachment chips, references, and credit notice', () => {
    const { container } = render(<ChatInputAttachmentsArea {...defaultProps()} />)

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null
    expect(input?.multiple).toBe(true)
    expect(input?.accept).toBe('.txt,image/*')
    expect(input?.className).toContain('hidden')
    expect(screen.getByText('brief.txt')).toBeTruthy()
    expect(screen.getByText('Launch brief')).toBeTruthy()
    expect(screen.getByText('Hero image')).toBeTruthy()
    expect(screen.getByText(/run out of credits/i)).toBeTruthy()
  })

  it('delegates file input changes and clears the input value', () => {
    const props = defaultProps()
    const { container } = render(<ChatInputAttachmentsArea {...props} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['new'], 'new.txt', { type: 'text/plain' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(props.onFileSelect).toHaveBeenCalledWith(expect.objectContaining({ 0: file }))
    expect(input.value).toBe('')
  })

  it('delegates removal callbacks by attachment type', () => {
    const props = defaultProps()
    render(<ChatInputAttachmentsArea {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove brief.txt' }))
    expect(props.onFileRemove).toHaveBeenCalledWith('file-1')

    fireEvent.click(screen.getByRole('button', { name: 'Remove Launch brief' }))
    expect(props.onArtifactRemove).toHaveBeenCalledWith('artifact-1')

    fireEvent.click(screen.getByRole('button', { name: 'Remove Hero image' }))
    expect(props.onReferenceRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'media-1' }))
  })
})
