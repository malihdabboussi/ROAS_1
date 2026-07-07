'use client'

import { useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

type RecordingState = 'idle' | 'recording' | 'finishing'

interface VisibleAttachedFile {
  filename: string
  uploading: boolean
}

interface ChannelComposerVisibleSnapshot {
  text: string
  attachmentNames: string[]
  pastedBlockCount: number
  recordingState: RecordingState
  linkInputOpen: boolean
  uploadingAttachmentCount: number
}

export function useChannelComposerVisibleState({
  editor,
  attachedFiles,
  pastedBlockCount,
  recordingState,
  linkInputOpen,
  onVisibleStateChange,
}: {
  editor: Editor | null
  attachedFiles: VisibleAttachedFile[]
  pastedBlockCount: number
  recordingState: RecordingState
  linkInputOpen: boolean
  onVisibleStateChange?: (state: ChannelComposerVisibleSnapshot) => void
}) {
  const reportVisibleState = useCallback(() => {
    onVisibleStateChange?.({
      text: editor?.getText().trim() ?? '',
      attachmentNames: attachedFiles.map((file) => file.filename),
      pastedBlockCount,
      recordingState,
      linkInputOpen,
      uploadingAttachmentCount: attachedFiles.filter((file) => file.uploading).length,
    })
  }, [
    attachedFiles,
    editor,
    linkInputOpen,
    onVisibleStateChange,
    pastedBlockCount,
    recordingState,
  ])

  useEffect(() => {
    if (!editor) {
      reportVisibleState()
      return
    }
    editor.on('update', reportVisibleState)
    reportVisibleState()
    return () => {
      editor.off('update', reportVisibleState)
    }
  }, [editor, reportVisibleState])
}
