'use client'

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from 'react'
import { extractClipboardImageFilesFromItems } from '@/lib/media/clipboard-image'

interface UseChannelComposerDropzoneOptions {
  disabled: boolean
  onFileSelect: (files: FileList | File[] | null) => Promise<void> | void
}

function hasDraggedFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types ?? []).includes('Files')
}

export function useChannelComposerDropzone({
  disabled,
  onFileSelect,
}: UseChannelComposerDropzoneOptions) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dragDepthRef = useRef(0)

  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) return
      if (!hasDraggedFiles(event)) return
      dragDepthRef.current += 1
      setIsDragOver(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) return
      if (!hasDraggedFiles(event)) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setIsDragOver(false)
    },
    [disabled],
  )

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) return
      if (!hasDraggedFiles(event)) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'copy'
    },
    [disabled],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      if (disabled) return
      const files = event.dataTransfer.files
      if (!files || files.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      dragDepthRef.current = 0
      setIsDragOver(false)
      void onFileSelect(files)
    },
    [disabled, onFileSelect],
  )

  const handlePasteCapture = useCallback(
    (event: ClipboardEvent<HTMLElement>) => {
      if (disabled) return
      const imageFiles = extractClipboardImageFilesFromItems(event.clipboardData?.items)
      if (imageFiles.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      void onFileSelect(imageFiles)
    },
    [disabled, onFileSelect],
  )

  const dropzoneHandlers = useMemo(
    () => ({
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onPasteCapture: handlePasteCapture,
    }),
    [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handlePasteCapture],
  )

  return { isDragOver, dropzoneHandlers }
}
