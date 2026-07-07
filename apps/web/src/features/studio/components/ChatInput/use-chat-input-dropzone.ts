import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, DragEvent, RefObject, SetStateAction } from 'react'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { MessageReference } from '../../types'
import { applyArtifactDrop } from '../../lib/artifact-drop'

export const VIBEY_ARTIFACT_DRAG_TYPE = 'application/x-vibey-artifact'

type ChatInputDropzoneRecordingState = 'idle' | 'recording' | 'finishing'

type FileSelectHandler = (files: FileList | readonly File[] | null) => void | Promise<void>

interface UseChatInputDropzoneOptions {
  disabled: boolean
  recordingState: ChatInputDropzoneRecordingState
  dropZoneRef?: RefObject<HTMLElement | null>
  handleFileSelect: FileSelectHandler
  setAttachedArtifacts: Dispatch<SetStateAction<AttachedArtifact[]>>
  setAttachedReferences: Dispatch<SetStateAction<MessageReference[]>>
}

function isAcceptedDrag(types: readonly string[]): boolean {
  return types.includes('Files') || types.includes(VIBEY_ARTIFACT_DRAG_TYPE)
}

function hasFiles(event: globalThis.DragEvent): boolean {
  return event.dataTransfer?.types?.includes('Files') || (event.dataTransfer?.files?.length ?? 0) > 0
}

export function useChatInputDropzone({
  disabled,
  recordingState,
  dropZoneRef,
  handleFileSelect,
  setAttachedArtifacts,
  setAttachedReferences,
}: UseChatInputDropzoneOptions) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepthRef = useRef(0)
  const handleFileSelectRef = useRef(handleFileSelect)

  useEffect(() => {
    handleFileSelectRef.current = handleFileSelect
  }, [handleFileSelect])

  const resetDragState = useCallback(() => {
    dragDepthRef.current = 0
    setIsDragOver(false)
  }, [])

  const applyDroppedArtifact = useCallback(
    (artifactJson: string) => {
      try {
        const artifact: AttachedArtifact = JSON.parse(artifactJson)
        setAttachedArtifacts(
          (prev) => applyArtifactDrop(artifact, { artifacts: prev, references: [] }).artifacts,
        )
        setAttachedReferences(
          (prev) => applyArtifactDrop(artifact, { artifacts: [], references: prev }).references,
        )
      } catch {
        /* malformed payload */
      }
    },
    [setAttachedArtifacts, setAttachedReferences],
  )

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled || recordingState !== 'idle') return
      if (!isAcceptedDrag([...event.dataTransfer.types])) return
      dragDepthRef.current += 1
      setIsDragOver(true)
    },
    [disabled, recordingState],
  )

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled || recordingState !== 'idle') return
      if (!isAcceptedDrag([...event.dataTransfer.types])) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDragOver(false)
    },
    [disabled, recordingState],
  )

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled || recordingState !== 'idle') return
      const types = [...event.dataTransfer.types]
      if (event.dataTransfer.files.length === 0 && !types.includes(VIBEY_ARTIFACT_DRAG_TYPE)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    [disabled, recordingState],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (disabled || recordingState !== 'idle') return

      const artifactJson = event.dataTransfer.getData(VIBEY_ARTIFACT_DRAG_TYPE)
      if (artifactJson) {
        event.preventDefault()
        event.stopPropagation()
        resetDragState()
        applyDroppedArtifact(artifactJson)
        return
      }

      if (event.dataTransfer.files.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      resetDragState()
      void handleFileSelect(event.dataTransfer.files)
    },
    [applyDroppedArtifact, disabled, handleFileSelect, recordingState, resetDragState],
  )

  useEffect(() => {
    const onDocDragOver = (event: globalThis.DragEvent) => {
      if (!hasFiles(event)) return
      if ((event.target as HTMLElement)?.closest?.('[data-dropzone]')) return
      event.preventDefault()
      event.dataTransfer!.dropEffect = 'copy'
    }
    const onDocDrop = (event: globalThis.DragEvent) => {
      if (!event.dataTransfer?.files?.length) return
      if ((event.target as HTMLElement)?.closest?.('[data-dropzone]')) return
      event.preventDefault()
      event.stopPropagation()
      resetDragState()
      void handleFileSelectRef.current(event.dataTransfer.files)
    }

    document.addEventListener('dragover', onDocDragOver, { capture: true })
    document.addEventListener('drop', onDocDrop, { capture: true })
    window.addEventListener('blur', resetDragState)
    document.addEventListener('visibilitychange', resetDragState)
    return () => {
      document.removeEventListener('dragover', onDocDragOver, { capture: true })
      document.removeEventListener('drop', onDocDrop, { capture: true })
      window.removeEventListener('blur', resetDragState)
      document.removeEventListener('visibilitychange', resetDragState)
    }
  }, [resetDragState])

  useEffect(() => {
    if (!isDragOver) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetDragState()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDragOver, resetDragState])

  useEffect(() => {
    const element = dropZoneRef?.current
    if (!element) return

    const onEnter = (event: globalThis.DragEvent) => {
      if (disabled || recordingState !== 'idle') return
      if (!event.dataTransfer || !isAcceptedDrag([...event.dataTransfer.types])) return
      dragDepthRef.current += 1
      setIsDragOver(true)
    }
    const onLeave = (event: globalThis.DragEvent) => {
      if (disabled || recordingState !== 'idle') return
      if (!event.dataTransfer || !isAcceptedDrag([...event.dataTransfer.types])) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDragOver(false)
    }
    const onOver = (event: globalThis.DragEvent) => {
      if (event.defaultPrevented) return
      if (disabled || recordingState !== 'idle' || !event.dataTransfer) return
      const types = [...event.dataTransfer.types]
      if (event.dataTransfer.files.length === 0 && !types.includes(VIBEY_ARTIFACT_DRAG_TYPE))
        return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (event: globalThis.DragEvent) => {
      if (event.defaultPrevented) return
      if (disabled || recordingState !== 'idle' || !event.dataTransfer) return

      const artifactJson = event.dataTransfer.getData(VIBEY_ARTIFACT_DRAG_TYPE)
      if (artifactJson) {
        event.preventDefault()
        event.stopPropagation()
        resetDragState()
        applyDroppedArtifact(artifactJson)
        return
      }

      if (event.dataTransfer.files.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      resetDragState()
      void handleFileSelectRef.current(event.dataTransfer.files)
    }

    element.addEventListener('dragenter', onEnter)
    element.addEventListener('dragleave', onLeave)
    element.addEventListener('dragover', onOver)
    element.addEventListener('drop', onDrop)
    return () => {
      element.removeEventListener('dragenter', onEnter)
      element.removeEventListener('dragleave', onLeave)
      element.removeEventListener('dragover', onOver)
      element.removeEventListener('drop', onDrop)
    }
  }, [applyDroppedArtifact, disabled, dropZoneRef, recordingState, resetDragState])

  return {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  }
}
