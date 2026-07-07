'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ad } from '../../../types'

export function useDropZone(
  placement: string,
  onImageDropped?: (file: File, placement: string) => void,
  ad?: Ad | null,
) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setDragOver(false)
      if (!onImageDropped) return
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        setUploading(true)
        onImageDropped(file, placement)
      }
    },
    [onImageDropped, placement],
  )

  useEffect(() => {
    if (!uploading) return
    setUploading(false)
  }, [ad?.image_url, ad?.placement_images, uploading])

  const handlers = onImageDropped
    ? ({
        'data-dropzone': true,
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      } as Record<string, unknown>)
    : {}

  return { dragOver, uploading, handlers }
}
