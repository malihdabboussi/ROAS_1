import { act, renderHook } from '@testing-library/react'
import type { SetStateAction } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_MAX_FILES, CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import { SPACE_COMPOSER_IMPORT_FILES_EVENT } from '@/lib/spaces/presentation-import-events'
import type { AttachedFile } from '../chat/FileAttachments'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import { useChatInputExternalAttachments } from './use-chat-input-external-attachments'

function applyState<T>(current: T, update: SetStateAction<T>): T {
  return typeof update === 'function' ? (update as (value: T) => T)(current) : update
}

describe('useChatInputExternalAttachments', () => {
  let attachedArtifacts: AttachedArtifact[]
  let attachedFiles: AttachedFile[]
  let setAttachedArtifacts: ReturnType<typeof vi.fn>
  let setAttachedFiles: ReturnType<typeof vi.fn>
  let setText: ReturnType<typeof vi.fn>
  let handleFileSelect: ReturnType<typeof vi.fn>
  let toastError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    attachedArtifacts = []
    attachedFiles = []
    setAttachedArtifacts = vi.fn((update: SetStateAction<AttachedArtifact[]>) => {
      attachedArtifacts = applyState(attachedArtifacts, update)
    })
    setAttachedFiles = vi.fn((update: SetStateAction<AttachedFile[]>) => {
      attachedFiles = applyState(attachedFiles, update)
    })
    setText = vi.fn()
    handleFileSelect = vi.fn()
    toastError = vi.fn()
  })

  it('listens for external space task attach events and de-duplicates tasks', () => {
    renderHook(() =>
      useChatInputExternalAttachments({
        enabled: true,
        setAttachedArtifacts,
        setAttachedFiles,
        setText,
        handleFileSelect,
        toastError,
        createId: () => 'file-1',
      }),
    )

    act(() => {
      window.dispatchEvent(
        new CustomEvent('space-vibey:attach-task', {
          detail: { id: 'task-1', label: 'Review launch' },
        }),
      )
      window.dispatchEvent(
        new CustomEvent('space-vibey:attach-task', {
          detail: { id: 'task-1', label: 'Review launch' },
        }),
      )
    })

    expect(attachedArtifacts).toEqual([{ id: 'task-1', type: 'space-task', label: 'Review launch' }])
  })

  it('attaches external files with parsed metadata, duplicate guard, and max-file guard', () => {
    const { result } = renderHook(() =>
      useChatInputExternalAttachments({
        enabled: false,
        setAttachedArtifacts,
        setAttachedFiles,
        setText,
        handleFileSelect,
        toastError,
        createId: () => 'external-file-1',
      }),
    )

    act(() => {
      result.current.attachComposerSpaceFile(' https://cdn.test/image.png ', ' Image.png ', 'image/png')
      result.current.attachComposerSpaceFile('https://cdn.test/image.png', 'Duplicate.png', 'image/png')
    })

    expect(attachedFiles).toHaveLength(1)
    expect(attachedFiles[0]).toMatchObject({
      id: 'external-file-1',
      uploading: false,
      previewUrl: 'https://cdn.test/image.png',
      parsed: [
        {
          filename: 'Image.png',
          mimeType: 'image/png',
          sizeBytes: 0,
          type: 'image',
          fileUrl: 'https://cdn.test/image.png',
        },
      ],
    })
    expect(attachedFiles[0]?.file.name).toBe('Image.png')

    attachedFiles = Array.from({ length: CHAT_MAX_FILES }, (_, index) => ({
      id: `existing-${index}`,
      file: new File([], `existing-${index}.txt`, { type: 'text/plain' }),
      uploading: false,
    }))

    act(() => {
      result.current.attachComposerSpaceFile('https://cdn.test/overflow.txt', 'Overflow.txt')
    })

    expect(attachedFiles).toHaveLength(CHAT_MAX_FILES)
    expect(toastError).toHaveBeenCalledWith(CHAT_TOAST_ERRORS.MAX_FILES_EXCEEDED.userMessage)
  })

  it('delegates composer import files events to setText and handleFileSelect', () => {
    renderHook(() =>
      useChatInputExternalAttachments({
        enabled: true,
        setAttachedArtifacts,
        setAttachedFiles,
        setText,
        handleFileSelect,
        toastError,
        createId: () => 'file-1',
      }),
    )
    const file = new File(['deck'], 'deck.pdf', { type: 'application/pdf' })

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SPACE_COMPOSER_IMPORT_FILES_EVENT, {
          detail: { files: [file], prompt: 'Turn this into a deck.' },
        }),
      )
    })

    expect(setText).toHaveBeenCalledWith('Turn this into a deck.')
    expect(handleFileSelect).toHaveBeenCalledWith([file])
  })
})
