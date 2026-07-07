'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  enqueueCampaignKnowledgeFileImport,
  type KnowledgeDomain,
} from '@/lib/campaigns'
import { BRAIN_TOAST_ERRORS, BRAIN_TOAST_SUCCESS } from '../config/brain-toast-errors.config'
import { insertCampaignInfoTextAtPosition } from './campaign-add-info-helpers'

type CampaignAddInfoRecordingState = 'idle' | 'recording' | 'finishing'

interface UseCampaignAddInfoTextImportsOptions {
  campaignId: string | null
  onImported: () => Promise<void> | void
  resolvedDomain?: KnowledgeDomain
}

export function useCampaignAddInfoTextImports({
  campaignId,
  onImported,
  resolvedDomain,
}: UseCampaignAddInfoTextImportsOptions) {
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [importingText, setImportingText] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const [recordingState, setRecordingState] =
    useState<CampaignAddInfoRecordingState>('idle')
  const [_shouldTranscribe, setShouldTranscribe] = useState(false)
  const baseTextRef = useRef<string>('')
  const accumulatedTranscriptRef = useRef<string>('')
  const [insertPosition, setInsertPosition] = useState<number>(0)

  useEffect(() => {
    if (recordingState === 'idle') {
      setDisplayText(textContent)
    }
  }, [textContent, recordingState])

  const importManualText = useCallback(
    async (title: string, content: string, selectedDomain?: KnowledgeDomain) => {
      if (!campaignId) throw new Error('Campaign not selected')
      await enqueueCampaignKnowledgeFileImport({
        campaignId,
        title,
        content,
        sourceType: 'upload',
        domain: selectedDomain,
      })
      await onImported()
    },
    [campaignId, onImported],
  )

  const handleImportText = useCallback(async () => {
    if (!campaignId) {
      toast.error(BRAIN_TOAST_ERRORS.CAMPAIGN_REQUIRED.userMessage)
      return
    }
    if (!title.trim() || !textContent.trim()) {
      toast.error(BRAIN_TOAST_ERRORS.TITLE_CONTENT_REQUIRED.userMessage)
      return
    }
    setImportingText(true)
    try {
      await importManualText(title.trim(), textContent.trim(), resolvedDomain)
      setTitle('')
      setTextContent('')
      toast.success(BRAIN_TOAST_SUCCESS.TEXT_ADDED.userMessage)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.ADD_TEXT_FAILED.userMessage,
      )
    } finally {
      setImportingText(false)
    }
  }, [campaignId, importManualText, resolvedDomain, textContent, title])

  const handleStartRecording = useCallback(() => {
    const currentText = textContent
    const cursorPos = textAreaRef.current?.selectionStart ?? currentText.length
    baseTextRef.current = currentText
    setInsertPosition(cursorPos)
    accumulatedTranscriptRef.current = ''
    setDisplayText(currentText)
    setRecordingState('recording')
  }, [textContent])

  const handleStopRecording = useCallback(() => {
    setShouldTranscribe(true)
    setRecordingState('finishing')
  }, [])

  const handleCancelRecording = useCallback(() => {
    setShouldTranscribe(false)
    setRecordingState('idle')
    accumulatedTranscriptRef.current = ''
    const restore = baseTextRef.current
    setDisplayText(restore)
    setTextContent(restore)
  }, [])

  const handleTranscriptionUpdate = useCallback(
    (text: string) => {
      if (recordingState !== 'recording') return
      const merged = insertCampaignInfoTextAtPosition(baseTextRef.current, insertPosition, text)
      setDisplayText(merged)
    },
    [insertPosition, recordingState],
  )

  const handleTranscriptionComplete = useCallback(
    (finalText: string) => {
      const finalMerged = insertCampaignInfoTextAtPosition(
        baseTextRef.current,
        insertPosition,
        finalText,
      )
      setDisplayText(finalMerged)
      setTextContent(finalMerged)
      setRecordingState('idle')
      setShouldTranscribe(false)
      accumulatedTranscriptRef.current = ''
    },
    [insertPosition],
  )

  const handleRecordingError = useCallback(() => {
    setRecordingState('idle')
    setShouldTranscribe(false)
    const restore = baseTextRef.current
    setDisplayText(restore)
    setTextContent(restore)
  }, [])

  const textInputValue = recordingState === 'idle' ? textContent : displayText

  return {
    handleCancelRecording,
    handleImportText,
    handleRecordingError,
    handleStartRecording,
    handleStopRecording,
    handleTranscriptionComplete,
    handleTranscriptionUpdate,
    importingText,
    recordingState,
    setTextContent,
    setTitle,
    textAreaRef,
    textContent,
    textInputValue,
    title,
  }
}
