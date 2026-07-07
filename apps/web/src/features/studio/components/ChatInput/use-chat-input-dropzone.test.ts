import { act, renderHook } from '@testing-library/react'
import type { SetStateAction } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { MessageReference } from '../../types'
import {
  VIBEY_ARTIFACT_DRAG_TYPE,
  useChatInputDropzone,
} from './use-chat-input-dropzone'

function createFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
  } as FileList

  files.forEach((file, index) => {
    Object.defineProperty(fileList, index, {
      value: file,
      enumerable: true,
    })
  })

  return fileList
}

function createStateSetter<T>(initial: T) {
  let state = initial
  const setter = vi.fn((value: SetStateAction<T>) => {
    state = typeof value === 'function' ? (value as (previous: T) => T)(state) : value
  })
  return { setter, getState: () => state }
}

function createReactDragEvent({
  types,
  files = createFileList([]),
  artifactJson = '',
}: {
  types: string[]
  files?: FileList
  artifactJson?: string
}) {
  const dataTransfer = {
    types,
    files,
    dropEffect: 'none',
    getData: vi.fn((type: string) => (type === VIBEY_ARTIFACT_DRAG_TYPE ? artifactJson : '')),
  }

  return {
    dataTransfer,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.DragEvent<HTMLDivElement> & {
    dataTransfer: typeof dataTransfer
    preventDefault: ReturnType<typeof vi.fn>
    stopPropagation: ReturnType<typeof vi.fn>
  }
}

function createDomDragEvent(type: string, options: { types: string[]; files: FileList }) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    dataTransfer: {
      types: string[]
      files: FileList
      dropEffect: string
      getData: (type: string) => string
    }
  }

  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: options.types,
      files: options.files,
      dropEffect: 'none',
      getData: () => '',
    },
  })

  return event
}

function renderDropzone(options: {
  disabled?: boolean
  recordingState?: 'idle' | 'recording' | 'finishing'
  dropZoneRef?: React.RefObject<HTMLElement | null>
  handleFileSelect?: (files: FileList | readonly File[] | null) => void
}) {
  const artifacts = createStateSetter<AttachedArtifact[]>([])
  const references = createStateSetter<MessageReference[]>([])
  const handleFileSelect = options.handleFileSelect ?? vi.fn()

  const hook = renderHook(() =>
    useChatInputDropzone({
      disabled: options.disabled ?? false,
      recordingState: options.recordingState ?? 'idle',
      dropZoneRef: options.dropZoneRef,
      handleFileSelect,
      setAttachedArtifacts: artifacts.setter,
      setAttachedReferences: references.setter,
    }),
  )

  return { ...hook, artifacts, references, handleFileSelect }
}

describe('useChatInputDropzone', () => {
  it('handles composer file drag and drop events', () => {
    const fileList = createFileList([new File(['body'], 'brief.txt', { type: 'text/plain' })])
    const { result, handleFileSelect } = renderDropzone({})
    const event = createReactDragEvent({ types: ['Files'], files: fileList })

    act(() => result.current.handleDragEnter(event))
    expect(result.current.isDragOver).toBe(true)

    act(() => result.current.handleDragOver(event))
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(event.dataTransfer.dropEffect).toBe('copy')

    act(() => result.current.handleDrop(event))
    expect(event.stopPropagation).toHaveBeenCalledTimes(1)
    expect(handleFileSelect).toHaveBeenCalledWith(fileList)
    expect(result.current.isDragOver).toBe(false)
  })

  it('applies dropped artifacts to artifact chips and conversation references', () => {
    const artifact: AttachedArtifact = {
      id: 'conversation-1',
      type: 'contact-conversation',
      label: 'Sales call',
    }
    const { result, artifacts, references } = renderDropzone({})
    const event = createReactDragEvent({
      types: [VIBEY_ARTIFACT_DRAG_TYPE],
      artifactJson: JSON.stringify(artifact),
    })

    act(() => result.current.handleDragEnter(event))
    act(() => result.current.handleDrop(event))

    expect(artifacts.getState()).toEqual([artifact])
    expect(references.getState()).toEqual([
      { kind: 'conversation', id: 'conversation-1', label: 'Sales call' },
    ])
    expect(result.current.isDragOver).toBe(false)
  })

  it('handles document-level file drops outside explicit dropzones', () => {
    const fileList = createFileList([new File(['img'], 'hero.png', { type: 'image/png' })])
    const { handleFileSelect } = renderDropzone({})
    const event = createDomDragEvent('drop', { types: ['Files'], files: fileList })

    act(() => {
      document.dispatchEvent(event)
    })

    expect(event.defaultPrevented).toBe(true)
    expect(handleFileSelect).toHaveBeenCalledWith(fileList)
  })

  it('extends file drops to the outer dropzone ref', () => {
    const dropZone = document.createElement('div')
    const dropZoneRef = { current: dropZone }
    const fileList = createFileList([new File(['body'], 'outer.txt', { type: 'text/plain' })])
    const { result, handleFileSelect } = renderDropzone({ dropZoneRef })

    act(() => {
      dropZone.dispatchEvent(createDomDragEvent('dragenter', { types: ['Files'], files: fileList }))
    })
    expect(result.current.isDragOver).toBe(true)

    const dropEvent = createDomDragEvent('drop', { types: ['Files'], files: fileList })
    act(() => {
      dropZone.dispatchEvent(dropEvent)
    })

    expect(dropEvent.defaultPrevented).toBe(true)
    expect(handleFileSelect).toHaveBeenCalledWith(fileList)
    expect(result.current.isDragOver).toBe(false)
  })
})
