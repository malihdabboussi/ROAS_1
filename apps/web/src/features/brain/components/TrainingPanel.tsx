'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { DriveFileBrowserModal, DropboxFileBrowserModal, MediaPickerModal } from '@/components/media'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { useTrainingPanelCallImports } from '../hooks/use-training-panel-call-imports'
import { useTrainingPanelImports } from '../hooks/use-training-panel-imports'
import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import {
  fetchSkSources,
  fetchSkStats,
  type SkDomain,
  type SkSource,
  type SkSourceType,
  type SkStats,
} from '../services/sk.service'
import {
  enqueueSkIngest,
  enqueueSkLinkIngest,
} from '../services/user-brain-import.service'
import { TrainingPanelFathomDialog } from './TrainingPanelFathomDialog'
import { TrainingPanelFirefliesDialog } from './TrainingPanelFirefliesDialog'
import { TrainingPanelImportMenu } from './TrainingPanelImportMenu'
import {
  TrainingPanelTabPanels,
  type TrainingPanelInputMode,
  type TrainingPanelLinkDetection,
  type TrainingPanelRecordingState,
} from './TrainingPanelTabPanels'

interface TrainingPanelProps {
  brainId: string | null
  isAgentBrain: boolean
  agentName?: string
}

function detectLinkType(url: string): TrainingPanelLinkDetection {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be'))
    return { supported: true, platform: 'YouTube', sourceType: 'transcript' }
  if (lower.includes('instagram.com'))
    return { supported: true, platform: 'Instagram', sourceType: 'article' }
  if (lower.includes('tiktok.com'))
    return { supported: true, platform: 'TikTok', sourceType: 'transcript' }
  if (lower.includes('linkedin.com'))
    return { supported: true, platform: 'LinkedIn', sourceType: 'article' }
  if (lower.includes('facebook.com'))
    return { supported: true, platform: 'Facebook', sourceType: 'article' }
  if (lower.includes('twitter.com') || lower.includes('x.com'))
    return { supported: false, platform: 'X/Twitter', sourceType: 'article' }
  if (lower.match(/^https?:\/\//))
    return { supported: true, platform: 'Web', sourceType: 'website' }
  return { supported: false, sourceType: 'website' }
}

export default function TrainingPanel({ brainId, isAgentBrain, agentName }: TrainingPanelProps) {
  const [open, setOpen] = useState(false)
  const [inputMode, setInputMode] = useState<TrainingPanelInputMode>('text')
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [sourceType, setSourceType] = useState<SkSourceType>('notes')
  const [domain, setDomain] = useState<SkDomain>('general')
  const [_sources, setSources] = useState<SkSource[]>([])
  const [stats, setStats] = useState<SkStats | null>(null)
  const [_sourcesLoading, setSourcesLoading] = useState(false)
  const [linkDetection, setLinkDetection] = useState<TrainingPanelLinkDetection | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [recordingState, setRecordingState] = useState<TrainingPanelRecordingState>('idle')
  const [_shouldTranscribe, setShouldTranscribe] = useState(false)
  const baseTextRef = useRef<string>('')
  const accumulatedTranscriptRef = useRef<string>('')
  const [insertPosition, setInsertPosition] = useState<number>(0)

  const selectImageMode = useCallback(() => setInputMode('image'), [])
  const trainingImports = useTrainingPanelImports({
    open,
    brainId,
    domain,
    onImageModeSelected: selectImageMode,
  })
  const callImports = useTrainingPanelCallImports({ brainId })

  const loadData = useCallback(async () => {
    if (!brainId) return
    setSourcesLoading(true)
    const [sourcesData, statsData] = await Promise.all([
      fetchSkSources(brainId).catch(() => []),
      fetchSkStats(brainId).catch(() => null),
    ])
    setSources(sourcesData)
    setStats(statsData)
    setSourcesLoading(false)
  }, [brainId])

  useEffect(() => {
    if (open && brainId) void loadData()
  }, [open, brainId, loadData])

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

  const handleIngestText = async () => {
    if (!brainId || !title.trim() || !textContent.trim()) {
      toast.error(BRAIN_TOAST_ERRORS.TITLE_CONTENT_REQUIRED.userMessage)
      return
    }
    try {
      await enqueueSkIngest({
        brainId,
        text: textContent.trim(),
        sourceType,
        title: title.trim(),
        domain,
      })
      toast.success('Added to processing queue')
      setTitle('')
      setTextContent('')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.INGESTION_FAILED.userMessage,
      )
    }
  }

  const insertAtPosition = (base: string, position: number, text: string): string => {
    if (!text) return base

    const pos = Math.min(Math.max(0, position), base.length)
    const before = base.slice(0, pos)
    const after = base.slice(pos)
    const needsSpace = before.length > 0 && !/\s$/.test(before) && !/^\s/.test(text)
    const spacer = needsSpace ? ' ' : ''
    return `${before}${spacer}${text}${after}`
  }

  const handleStartRecording = () => {
    const currentText = textContent
    const cursorPos = textareaRef.current?.selectionStart ?? currentText.length

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

  const handleTranscriptionError = () => {
    setRecordingState('idle')
    setShouldTranscribe(false)
    const restore = baseTextRef.current
    setDisplayText(restore)
    setTextContent(restore)
  }

  const textInputValue = recordingState === 'idle' ? textContent : displayText

  const handleIngestLink = async () => {
    if (!brainId || !linkUrl.trim()) {
      toast.error(BRAIN_TOAST_ERRORS.URL_REQUIRED.userMessage)
      return
    }
    if (linkDetection && !linkDetection.supported) {
      toast.error(BRAIN_TOAST_ERRORS.LINK_TYPE_UNSUPPORTED.userMessage)
      return
    }
    try {
      const linkTitle = linkDetection?.platform
        ? `${linkDetection.platform}: ${linkUrl
            .trim()
            .replace(/^https?:\/\/(www\.)?/, '')
            .slice(0, 60)}`
        : `Link: ${linkUrl
            .trim()
            .replace(/^https?:\/\/(www\.)?/, '')
            .slice(0, 60)}`
      await enqueueSkLinkIngest({
        brainId,
        url: linkUrl.trim(),
        sourceType: linkDetection?.sourceType,
        title: linkTitle,
        domain,
      })
      toast.success('Added to processing queue')
      setLinkUrl('')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.LINK_INGESTION_FAILED.userMessage,
      )
    }
  }

  if (!isAgentBrain) return null

  const totalEntries = stats?.totalEntries ?? 0

  return (
    <div className="relative flex flex-col items-end">
      <button
        onClick={() => setOpen(!open)}
        className="surface-card border-border px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-muted/20 mb-spacing-1 flex items-center gap-2 rounded-lg border font-medium transition-colors"
      >
        <GraduationCap className="icon-xs" />
        Train {agentName ?? 'Agent'}
        <ChevronDown
          className={`icon-xs text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="surface-card border-border w-[340px] rounded-lg border"
        style={{
          maxHeight: open ? '600px' : '0px',
          opacity: open ? 1 : 0,
          overflow: open ? 'visible' : 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="px-spacing-3 py-spacing-3 space-y-spacing-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="body-3 text-foreground font-semibold">Train {agentName ?? 'Agent'}</p>
            {totalEntries > 0 && (
              <span className="typo-caption text-muted-foreground">{totalEntries} entries</span>
            )}
          </div>

          {/* Input mode tabs + Import, outside scroll so dropdown is not clipped */}
          <Tabs
            value={inputMode}
            onValueChange={(v) => setInputMode(v as TrainingPanelInputMode)}
            className="space-y-spacing-2"
          >
            <div className="gap-spacing-2 flex items-center">
              <TabsList variant="full">
                <TabsTrigger value="text" className="px-spacing-3">
                  Text
                </TabsTrigger>
                <TabsTrigger value="link" className="px-spacing-3">
                  Link
                </TabsTrigger>
                <TabsTrigger value="image" className="px-spacing-3">
                  Image
                </TabsTrigger>
              </TabsList>
              <TrainingPanelImportMenu
                importDropdownOpen={trainingImports.importDropdownOpen}
                importDropdownRef={trainingImports.importDropdownRef}
                fileInputRef={trainingImports.fileInputRef}
                onToggleImportDropdown={trainingImports.toggleImportDropdown}
                onCloseImportDropdown={trainingImports.closeImportDropdown}
                onFileUpload={trainingImports.handleFileUpload}
                openDrive={trainingImports.openDrive}
                openDropbox={trainingImports.openDropbox}
                fathomConnected={trainingImports.fathomConnected}
                firefliesConnected={trainingImports.firefliesConnected}
                onOpenFathom={() => {
                  trainingImports.closeImportDropdown()
                  callImports.setFathomModalOpen(true)
                }}
                onOpenFireflies={() => {
                  trainingImports.closeImportDropdown()
                  callImports.setFirefliesModalOpen(true)
                }}
                onOpenMediaLibrary={() => {
                  trainingImports.closeImportDropdown()
                  trainingImports.setMediaLibraryOpen(true)
                }}
              />
            </div>

            <TrainingPanelTabPanels
              title={title}
              onTitleChange={setTitle}
              textInputValue={textInputValue}
              onTextChange={setTextContent}
              textareaRef={textareaRef}
              recordingState={recordingState}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onCancelRecording={handleCancelRecording}
              onTranscriptionUpdate={handleTranscriptionUpdate}
              onTranscriptionComplete={handleTranscriptionComplete}
              onTranscriptionError={handleTranscriptionError}
              sourceType={sourceType}
              onSourceTypeChange={setSourceType}
              domain={domain}
              onDomainChange={setDomain}
              onIngestText={handleIngestText}
              linkUrl={linkUrl}
              onLinkUrlChange={setLinkUrl}
              linkDetection={linkDetection}
              onIngestLink={handleIngestLink}
              imagePreview={trainingImports.imagePreview}
              imageInputRef={trainingImports.imageInputRef}
              onImageFile={trainingImports.handleImageFile}
              imageDragOver={trainingImports.imageDragOver}
              onImageDragOverChange={trainingImports.setImageDragOver}
              imageCaption={trainingImports.imageCaption}
              onImageCaptionChange={trainingImports.setImageCaption}
              canIngestImage={trainingImports.canIngestImage}
              onIngestImage={trainingImports.handleIngestImage}
            />
          </Tabs>
        </div>
      </div>

      <DriveFileBrowserModal
        open={trainingImports.showDrivePicker}
        onClose={() => trainingImports.setShowDrivePicker(false)}
        context="brain"
        onSelectFileForChat={trainingImports.handleCloudFile}
        keepOpenAfterImport
      />
      <DropboxFileBrowserModal
        open={trainingImports.showDropboxPicker}
        onClose={() => trainingImports.setShowDropboxPicker(false)}
        context="brain"
        onSelectFileForChat={trainingImports.handleCloudFile}
        keepOpenAfterImport
      />
      <MediaPickerModal
        open={trainingImports.mediaLibraryOpen}
        onClose={() => trainingImports.setMediaLibraryOpen(false)}
        onSelect={() => {}}
        onSelectAssets={(assets) => void trainingImports.handleMediaLibrarySelect(assets)}
        multiSelect
        keepOpenAfterImport
      />

      <TrainingPanelFathomDialog
        importingBatch={callImports.importingBatch}
        loading={callImports.loadingFathom}
        loadingMore={callImports.loadingMoreFathom}
        meetings={callImports.sortedFathom}
        nextCursor={callImports.fathomNextCursor}
        onBatchImport={callImports.handleBatchImportFathom}
        onLoadAll={callImports.loadAllFathomMeetings}
        onLoadMore={callImports.loadMoreFathomMeetings}
        onOpenChange={callImports.setFathomModalOpen}
        onToggleAll={callImports.handleToggleAllFathomSelection}
        onToggleSelection={callImports.toggleFathomSelection}
        open={callImports.fathomModalOpen}
        selectedIds={callImports.selectedFathomIds}
      />

      <TrainingPanelFirefliesDialog
        importingMeetingId={callImports.importingMeetingId}
        loading={callImports.loadingFireflies}
        onImportTranscript={callImports.handleImportFirefliesTranscript}
        onOpenChange={callImports.setFirefliesModalOpen}
        open={callImports.firefliesModalOpen}
        transcripts={callImports.firefliesTranscripts}
      />
    </div>
  )
}
