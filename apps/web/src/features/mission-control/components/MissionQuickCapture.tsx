'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MISSION_QUICK_CAPTURE_ACCEPT } from '@/lib/chat/chat-toast-errors.config'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { MISSION_CONTROL_MESSAGES } from '../config/messages.config'
import { MISSION_CAPTURE_TEXT_MAX_CHARS } from '../config/mission-field-limits.config'
import type { MissionPriority } from '../types'
import type {
  CampaignOption,
  MissionQuickCaptureDropdown,
  MissionQuickCaptureRecordingState,
} from './mission-quick-capture-config'
import { MissionQuickCaptureFileChips } from './MissionQuickCaptureFileChips'
import { MissionQuickCaptureIdleFooter } from './MissionQuickCaptureIdleFooter'
import { MissionQuickCaptureRecordingFooter } from './MissionQuickCaptureRecordingFooter'

export interface MissionQuickCaptureProps {
  value: string
  priority: MissionPriority | null
  campaigns: CampaignOption[]
  selectedCampaignId: string | null
  files: File[]
  disabled?: boolean
  capabilityWarning?: string | null
  onHireClick?: () => void
  onChange: (value: string) => void
  onPriorityChange: (priority: MissionPriority | null) => void
  onCampaignChange: (campaignId: string | null) => void
  onFilesChange: (files: File[]) => void
  onSubmit: () => void
  /** Hide campaign picker; parent must set `selectedCampaignId` to the current campaign */
  hideCampaignSelector?: boolean
  /** Hide priority picker (e.g. space missions modal already has campaign context) */
  hidePrioritySelector?: boolean
  /** Hide character counter in footer */
  hideCharCount?: boolean
  /** Match Studio ChatInput chrome (+ attach, plain icon buttons, rounded-2xl) */
  composerVariant?: 'legacy' | 'modern'
  /** Uppercase-style heading above the glass input (defaults like Mission Control page title) */
  heading?: string
  /** Line below heading (defaults to mission control subtitle) */
  subtitle?: string
  /** When true, credits are 0 - send is blocked and replaced with a Get Credits CTA */
  creditsExhausted?: boolean
  /** Called when user clicks the Get Credits CTA */
  onGetCredits?: () => void
}

export function MissionQuickCapture({
  value,
  priority,
  campaigns,
  selectedCampaignId,
  files,
  disabled = false,
  capabilityWarning = null,
  onHireClick,
  onChange,
  onPriorityChange,
  onCampaignChange,
  onFilesChange,
  onSubmit,
  hideCampaignSelector = false,
  hidePrioritySelector = false,
  hideCharCount = false,
  composerVariant = 'legacy',
  heading: _heading = MISSION_CONTROL_MESSAGES.QUICK_CAPTURE_HEADING,
  subtitle: _subtitle = MISSION_CONTROL_MESSAGES.SUBTITLE,
  creditsExhausted = false,
  onGetCredits,
}: MissionQuickCaptureProps) {
  const isModernComposer = composerVariant === 'modern'
  const iconBtnClass = isModernComposer
    ? 'text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30'
    : 'button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30'
  const [activeDropdown, setActiveDropdown] = useState<MissionQuickCaptureDropdown>(null)
  const [campaignError, setCampaignError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId)

  const [recordingState, setRecordingState] =
    useState<MissionQuickCaptureRecordingState>('idle')
  const [displayText, setDisplayText] = useState(value)
  const baseTextRef = useRef('')
  const insertPositionRef = useRef(0)
  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'connect_if_disconnected',
    onBeforeOpen: () => setActiveDropdown(null),
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
  })

  useEffect(() => {
    if (recordingState === 'idle') setDisplayText(value)
  }, [value, recordingState])

  const insertAtPosition = useCallback((base: string, position: number, text: string): string => {
    if (!text) return base
    const pos = Math.min(Math.max(0, position), base.length)
    const before = base.slice(0, pos)
    const after = base.slice(pos)
    const needsSpace = before.length > 0 && !/\s$/.test(before) && !/^\s/.test(text)
    return `${before}${needsSpace ? ' ' : ''}${text}${after}`
  }, [])

  const handleStartRecording = () => {
    const currentText = value
    const cursorPos = textareaRef.current?.selectionStart ?? currentText.length
    baseTextRef.current = currentText
    insertPositionRef.current = cursorPos
    setDisplayText(currentText)
    setRecordingState('recording')
  }

  const handleStopRecording = () => setRecordingState('finishing')

  const handleCancelRecording = () => {
    setRecordingState('idle')
    setDisplayText(baseTextRef.current)
    onChange(baseTextRef.current)
  }

  const handleTranscriptionUpdate = useCallback(
    (delta: string) => {
      if (recordingState !== 'recording') return
      const merged = insertAtPosition(baseTextRef.current, insertPositionRef.current, delta)
      setDisplayText(merged.slice(0, MISSION_CAPTURE_TEXT_MAX_CHARS))
    },
    [recordingState, insertAtPosition],
  )

  const handleTranscriptionComplete = useCallback(
    (delta: string) => {
      const finalMerged = insertAtPosition(baseTextRef.current, insertPositionRef.current, delta)
      const capped = finalMerged.slice(0, MISSION_CAPTURE_TEXT_MAX_CHARS)
      setDisplayText(capped)
      onChange(capped)
      setRecordingState('idle')
    },
    [onChange, insertAtPosition],
  )

  useEffect(() => {
    if (!activeDropdown) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  useEffect(() => {
    if (selectedCampaignId) {
      setCampaignError(false)
    }
  }, [selectedCampaignId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected?.length) return
    onFilesChange([...files, ...Array.from(selected)])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const handleFileFromCloud = (file: File) => {
    onFilesChange([...files, file])
  }

  const trySubmit = () => {
    if (creditsExhausted) {
      onGetCredits?.()
      return
    }
    if (!selectedCampaignId) {
      setCampaignError(true)
      setActiveDropdown('campaign')
      return
    }
    setCampaignError(false)
    onSubmit()
  }

  const inputValue = recordingState === 'idle' ? value : displayText

  return (
    <section>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={MISSION_QUICK_CAPTURE_ACCEPT}
        onChange={handleFileSelect}
        disabled={disabled}
      />

      <div
        className={
          isModernComposer
            ? 'input-glass relative flex flex-col overflow-hidden rounded-2xl'
            : 'input-glass rounded-spacing-3 relative flex flex-col'
        }
      >
        <MissionQuickCaptureFileChips files={files} onRemoveFile={removeFile} />

        <div className="flex-1 px-4 pt-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            maxLength={MISSION_CAPTURE_TEXT_MAX_CHARS}
            onChange={(e) => recordingState === 'idle' && onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !disabled && recordingState === 'idle') {
                e.preventDefault()
                trySubmit()
              }
            }}
            placeholder={MISSION_CONTROL_MESSAGES.QUICK_CAPTURE_PLACEHOLDER}
            rows={1}
            className="body-2 text-foreground caret-accent placeholder:text-muted-foreground max-h-[200px] min-h-[60px] w-full resize-none bg-transparent focus:outline-none"
            disabled={disabled || recordingState === 'recording'}
          />
        </div>

        {recordingState !== 'idle' ? (
          <MissionQuickCaptureRecordingFooter
            recordingState={recordingState}
            disabled={disabled}
            onStopRecording={handleStopRecording}
            onCancelRecording={handleCancelRecording}
            onTranscriptionUpdate={handleTranscriptionUpdate}
            onTranscriptionComplete={handleTranscriptionComplete}
            onError={() => {
              setRecordingState('idle')
              setDisplayText(baseTextRef.current)
              onChange(baseTextRef.current)
            }}
          />
        ) : (
          <MissionQuickCaptureIdleFooter
            isModernComposer={isModernComposer}
            iconBtnClass={iconBtnClass}
            filesCount={files.length}
            disabled={disabled}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            fileInputRef={fileInputRef}
            openDrive={openDrive}
            openDropbox={openDropbox}
            hideCampaignSelector={hideCampaignSelector}
            activeCampaign={activeCampaign}
            campaignError={campaignError}
            campaigns={campaigns}
            selectedCampaignId={selectedCampaignId}
            onCampaignChange={onCampaignChange}
            hidePrioritySelector={hidePrioritySelector}
            priority={priority}
            onPriorityChange={onPriorityChange}
            hideCharCount={hideCharCount}
            inputValue={inputValue}
            onStartRecording={handleStartRecording}
            creditsExhausted={creditsExhausted}
            onSubmit={trySubmit}
          />
        )}
      </div>

      {campaignError && !selectedCampaignId && (
        <p className="body-3 mt-2 text-red-300">please choose a campaign first</p>
      )}
      {capabilityWarning && (
        <div className="border-border rounded-spacing-2 mt-2 flex items-center justify-between border bg-amber-500/10 px-3 py-2">
          <p className="body-4 text-amber-300">{capabilityWarning}</p>
          <button
            type="button"
            onClick={() => onHireClick?.()}
            className="button-glass-neutral rounded-spacing-2 px-spacing-2 py-spacing-1 body-4"
          >
            Hire & Assign
          </button>
        </div>
      )}
      <DriveFileBrowserModal
        open={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        context="mission_inbox"
        onSelectFileForChat={handleFileFromCloud}
      />
      <DropboxFileBrowserModal
        open={showDropboxPicker}
        onClose={() => setShowDropboxPicker(false)}
        context="mission_inbox"
        onSelectFileForChat={handleFileFromCloud}
      />
    </section>
  )
}
