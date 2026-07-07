import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { toast } from 'sonner'
import { BRAIN_TOAST_ERRORS } from '../../config/brain-toast-errors.config'
import {
  enqueueDocumentMemoryImport,
  rememberDocumentMemory,
  rememberLinkMemory,
} from '../../services/user-brain-import.service'
import { useBrainStore } from '../../store/use-brain-store'
import type { InputMode, RecordingState } from './types'
import { detectLinkType, insertAtPosition } from './utils'

export function useUserAddInfoForm(
  visible: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
  open: boolean,
  handleCloudFile: (
    file: File,
    sourceType: 'document' | 'dropbox' | 'google_drive',
  ) => Promise<void>,
  toBase64: (file: File) => Promise<string>,
) {
  const loadGraph = useBrainStore((s) => s.loadGraph)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [rememberingText, setRememberingText] = useState(false)
  const [rememberingLink, setRememberingLink] = useState(false)
  const [rememberingImage, setRememberingImage] = useState(false)
  const [linkDetection, setLinkDetection] = useState<ReturnType<typeof detectLinkType> | null>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [, setShouldTranscribe] = useState(false)
  const baseTextRef = useRef<string>('')
  const accumulatedTranscriptRef = useRef<string>('')
  const [insertPosition, setInsertPosition] = useState<number>(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/png')
  const [imageName, setImageName] = useState<string>('Pasted image')
  const [imageCaption, setImageCaption] = useState<string>('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageDragOver, setImageDragOver] = useState(false)

  useEffect(() => {
    if (!linkUrl.trim()) {
      setLinkDetection(null)
      return
    }
    setLinkDetection(detectLinkType(linkUrl.trim()))
  }, [linkUrl])

  useEffect(() => {
    if (recordingState === 'idle') {
      setDisplayText(textContent)
    }
  }, [textContent, recordingState])

  const refreshGraph = useCallback(async () => {
    await loadGraph()
  }, [loadGraph])

  const handleImageFile = useCallback(
    async (file: File) => {
      const dataUrl = URL.createObjectURL(file)
      const base64 = await toBase64(file)
      setImagePreview(dataUrl)
      setImageBase64(base64)
      setImageMimeType(file.type || 'image/png')
      setImageName(file.name.replace(/\.[^.]+$/, '') || 'Image')
      setInputMode('image')
      setOpen(true)
    },
    [toBase64, setOpen],
  )

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.type.startsWith('image/')) {
        void handleImageFile(file)
      } else {
        void handleCloudFile(file, 'document')
      }
      e.target.value = ''
    },
    [handleCloudFile, handleImageFile],
  )

  useEffect(() => {
    if (!open) return
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue
          event.preventDefault()
          void handleImageFile(file)
          break
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, handleImageFile])

  const handleRememberImage = async () => {
    if (!imageBase64) {
      toast.error('Upload or paste an image first.')
      return
    }
    setRememberingImage(true)
    try {
      const extractedText = await (imagePreview
        ? fetch(imagePreview).then(async () => '')
        : Promise.resolve(''))
      await enqueueDocumentMemoryImport({
        content: imageCaption.trim() || extractedText || imageName || 'Image import',
        title: imageName || 'Image import',
        sourceType: 'document',
        mediaType: 'image',
        mediaMimeType: imageMimeType,
        mediaBase64: imageBase64,
        mediaCaption: imageCaption.trim() || undefined,
      })
      await refreshGraph()
      setImagePreview(null)
      setImageBase64(null)
      setImageCaption('')
      toast.success('Image import started.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.IMPORT_FAILED.userMessage)
    } finally {
      setRememberingImage(false)
    }
  }

  const handleRememberText = async () => {
    if (!title.trim() || !textContent.trim()) {
      toast.error(BRAIN_TOAST_ERRORS.TITLE_CONTENT_REQUIRED.userMessage)
      return
    }
    setRememberingText(true)
    try {
      await rememberDocumentMemory({
        content: textContent.trim(),
        title: title.trim(),
        sourceType: 'document',
      })
      await refreshGraph()
      setTitle('')
      setTextContent('')
      toast.success('Text import queued.')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.ADD_TEXT_FAILED.userMessage,
      )
    } finally {
      setRememberingText(false)
    }
  }

  const handleStartRecording = () => {
    const currentText = textContent
    const cursorPos = textAreaRef.current?.selectionStart ?? currentText.length
    baseTextRef.current = currentText
    setInsertPosition(cursorPos)
    accumulatedTranscriptRef.current = ''
    setDisplayText(currentText)
    setRecordingState('recording')
  }

  const handleStopRecording = () => {
    setShouldTranscribe(true)
    setRecordingState('finishing')
  }

  const handleCancelRecording = () => {
    setShouldTranscribe(false)
    setRecordingState('idle')
    accumulatedTranscriptRef.current = ''
    const restore = baseTextRef.current
    setDisplayText(restore)
    setTextContent(restore)
  }

  const handleTranscriptionUpdate = (text: string) => {
    if (recordingState !== 'recording') return
    const merged = insertAtPosition(baseTextRef.current, insertPosition, text)
    setDisplayText(merged)
  }

  const handleTranscriptionComplete = (finalText: string) => {
    const finalMerged = insertAtPosition(baseTextRef.current, insertPosition, finalText)
    setDisplayText(finalMerged)
    setTextContent(finalMerged)
    setRecordingState('idle')
    setShouldTranscribe(false)
    accumulatedTranscriptRef.current = ''
  }

  const textInputValue = recordingState === 'idle' ? textContent : displayText

  const handleRememberLink = async () => {
    if (!linkUrl.trim()) {
      toast.error(BRAIN_TOAST_ERRORS.URL_REQUIRED.userMessage)
      return
    }
    setRememberingLink(true)
    try {
      await rememberLinkMemory({ url: linkUrl.trim() })
      await refreshGraph()
      setLinkUrl('')
      toast.success('Link import queued.')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.IMPORT_LINK_FAILED.userMessage,
      )
    } finally {
      setRememberingLink(false)
    }
  }

  useEffect(() => {
    if (!visible) return
    const handler = () => setOpen(true)
    window.addEventListener('mobile-brain-add-info', handler)
    return () => window.removeEventListener('mobile-brain-add-info', handler)
  }, [visible, setOpen])

  return {
    inputMode,
    setInputMode,
    title,
    setTitle,
    textContent,
    setTextContent,
    displayText,
    setDisplayText,
    linkUrl,
    setLinkUrl,
    rememberingText,
    rememberingLink,
    rememberingImage,
    linkDetection,
    textAreaRef,
    recordingState,
    setRecordingState,
    setShouldTranscribe,
    baseTextRef,
    imagePreview,
    imageBase64,
    imageMimeType,
    imageName,
    imageCaption,
    setImageCaption,
    imageInputRef,
    imageDragOver,
    setImageDragOver,
    handleImageFile,
    handleFileUpload,
    handleRememberImage,
    handleRememberText,
    handleRememberLink,
    handleStartRecording,
    handleStopRecording,
    handleCancelRecording,
    handleTranscriptionUpdate,
    handleTranscriptionComplete,
    textInputValue,
  }
}
