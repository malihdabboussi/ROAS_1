'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Loader2,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import {
  importCampaignKnowledgeUrl,
  type KnowledgeDomain,
} from '@/lib/campaigns'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { BRAIN_TOAST_ERRORS, BRAIN_TOAST_SUCCESS } from '../config/brain-toast-errors.config'
import { detectCampaignInfoLinkType } from './campaign-add-info-helpers'
import { CampaignAddInfoDomainSelect } from './CampaignAddInfoDomainSelect'
import { CampaignAddInfoFirefliesDialog } from './CampaignAddInfoFirefliesDialog'
import { CampaignAddInfoFathomDialog } from './CampaignAddInfoFathomDialog'
import { CampaignAddInfoImportMenu } from './CampaignAddInfoImportMenu'
import { CampaignAddInfoTabPanels } from './CampaignAddInfoTabPanels'
import { useCampaignAddInfoCallImports } from './use-campaign-add-info-call-imports'
import { useCampaignAddInfoMediaImports } from './use-campaign-add-info-media-imports'
import { useCampaignAddInfoTextImports } from './use-campaign-add-info-text-imports'

interface CampaignAddInfoPanelProps {
  visible: boolean
  campaignId: string | null
  onImported: () => Promise<void> | void
}

type InputMode = 'text' | 'link' | 'image'

export default function CampaignAddInfoPanel({
  visible,
  campaignId,
  onImported,
}: CampaignAddInfoPanelProps) {
  const [open, setOpen] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [linkUrl, setLinkUrl] = useState('')
  const [importingLink, setImportingLink] = useState(false)
  const [domain, setDomain] = useState<KnowledgeDomain | 'auto'>('auto')
  const [linkDetection, setLinkDetection] = useState<ReturnType<
    typeof detectCampaignInfoLinkType
  > | null>(null)
  const [importDropdownOpen, setImportDropdownOpen] = useState(false)
  const [importDropdownPos, setImportDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const importBtnRef = useRef<HTMLButtonElement>(null)

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'connect_if_disconnected',
    onBeforeOpen: () => setImportDropdownOpen(false),
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
  })

  useEffect(() => {
    if (!linkUrl.trim()) {
      setLinkDetection(null)
      return
    }
    setLinkDetection(detectCampaignInfoLinkType(linkUrl.trim()))
  }, [linkUrl])

  useLayoutEffect(() => {
    if (!importDropdownOpen || !importBtnRef.current) return
    const rect = importBtnRef.current.getBoundingClientRect()
    setImportDropdownPos({ top: rect.bottom + 4, left: rect.right - 260, width: 260 })
  }, [importDropdownOpen])

  useEffect(() => {
    if (!importDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        importBtnRef.current &&
        !importBtnRef.current.contains(target) &&
        !(e.target as HTMLElement).closest('[data-import-dropdown]')
      ) {
        setImportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [importDropdownOpen])

  const resolvedDomain = domain === 'auto' ? undefined : domain

  const textImports = useCampaignAddInfoTextImports({
    campaignId,
    onImported,
    resolvedDomain,
  })

  const mediaImports = useCampaignAddInfoMediaImports({
    campaignId,
    onImported,
    open,
    resolvedDomain,
    setInputMode,
    setOpen,
  })

  const callImports = useCampaignAddInfoCallImports({
    campaignId,
    resolvedDomain,
  })

  const handleImportUrl = async () => {
    if (!campaignId) {
      toast.error(BRAIN_TOAST_ERRORS.CAMPAIGN_REQUIRED.userMessage)
      return
    }
    if (!linkUrl.trim()) {
      toast.error(BRAIN_TOAST_ERRORS.URL_REQUIRED.userMessage)
      return
    }
    setImportingLink(true)
    try {
      await importCampaignKnowledgeUrl(campaignId, linkUrl.trim(), resolvedDomain)
      await onImported()
      setLinkUrl('')
      toast.success(BRAIN_TOAST_SUCCESS.LINK_IMPORTED.userMessage)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.IMPORT_LINK_FAILED.userMessage,
      )
    } finally {
      setImportingLink(false)
    }
  }

  useEffect(() => {
    if (!visible || !campaignId) return
    const handler = () => setOpen(true)
    window.addEventListener('mobile-brain-add-info', handler)
    return () => window.removeEventListener('mobile-brain-add-info', handler)
  }, [visible, campaignId])

  if (!visible || !campaignId) return null

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="surface-card border-border px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-muted/20 mb-spacing-1 hidden items-center gap-2 rounded-lg border font-medium transition-colors md:flex"
      >
        <Plus className="icon-xs" />
        Add Information
        <ChevronDown
          className={`icon-xs text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div
        className="surface-card border-border w-[340px] rounded-lg border max-md:fixed max-md:inset-x-4 max-md:top-1/2 max-md:z-50 max-md:w-auto max-md:-translate-y-1/2 max-md:shadow-2xl"
        style={{
          maxHeight: open ? '520px' : '0px',
          opacity: open ? 1 : 0,
          overflow: open ? 'visible' : 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="px-spacing-3 py-spacing-3 space-y-spacing-2">
          <p className="body-3 text-foreground font-semibold">Add Information</p>

          <Tabs
            value={inputMode}
            onValueChange={(v) => setInputMode(v as InputMode)}
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
              <CampaignAddInfoImportMenu
                buttonRef={importBtnRef}
                fileInputRef={mediaImports.fileInputRef}
                onClose={() => setImportDropdownOpen(false)}
                onDrive={openDrive}
                onDropbox={openDropbox}
                onFileChange={mediaImports.handleFileUpload}
                onOpenFathom={() => {
                  setImportDropdownOpen(false)
                  callImports.setFathomModalOpen(true)
                }}
                onOpenFireflies={() => {
                  setImportDropdownOpen(false)
                  callImports.setFirefliesModalOpen(true)
                }}
                onOpenMediaLibrary={() => {
                  setImportDropdownOpen(false)
                  mediaImports.setMediaLibraryOpen(true)
                }}
                onToggleOpen={() => setImportDropdownOpen((p) => !p)}
                open={importDropdownOpen}
                position={importDropdownPos}
              />
            </div>

            <CampaignAddInfoDomainSelect value={domain} onChange={(next) => setDomain(next)} />

            <CampaignAddInfoTabPanels
              imageBase64={mediaImports.imageBase64}
              imageCaption={mediaImports.imageCaption}
              imageDragOver={mediaImports.imageDragOver}
              imageInputRef={mediaImports.imageInputRef}
              imagePreview={mediaImports.imagePreview}
              importingImage={mediaImports.importingImage}
              importingLink={importingLink}
              importingText={textImports.importingText}
              linkDetection={linkDetection}
              linkUrl={linkUrl}
              onCancelRecording={textImports.handleCancelRecording}
              onClearLinkUrl={() => setLinkUrl('')}
              onImageCaptionChange={mediaImports.setImageCaption}
              onImageDragOverChange={mediaImports.setImageDragOver}
              onImageFileSelected={(file) => void mediaImports.handleImageFile(file)}
              onImportImage={mediaImports.handleImportImage}
              onImportLink={handleImportUrl}
              onImportText={textImports.handleImportText}
              onLinkUrlChange={setLinkUrl}
              onRecordingError={textImports.handleRecordingError}
              onStartRecording={textImports.handleStartRecording}
              onStopRecording={textImports.handleStopRecording}
              onTextContentChange={textImports.setTextContent}
              onTitleChange={textImports.setTitle}
              onTranscriptionComplete={textImports.handleTranscriptionComplete}
              onTranscriptionUpdate={textImports.handleTranscriptionUpdate}
              recordingState={textImports.recordingState}
              textAreaRef={textImports.textAreaRef}
              textContent={textImports.textContent}
              textInputValue={textImports.textInputValue}
              title={textImports.title}
            />
          </Tabs>

          {mediaImports.importingFile && (
            <div className="body-4 text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Importing file...
            </div>
          )}
        </div>
      </div>

      <DriveFileBrowserModal
        open={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        context="brain"
        onSelectFileForChat={(file) => void mediaImports.handleCloudFile(file, 'drive')}
        keepOpenAfterImport
      />
      <DropboxFileBrowserModal
        open={showDropboxPicker}
        onClose={() => setShowDropboxPicker(false)}
        context="brain"
        onSelectFileForChat={(file) => void mediaImports.handleCloudFile(file, 'dropbox')}
        keepOpenAfterImport
      />
      <MediaPickerModal
        open={mediaImports.mediaLibraryOpen}
        onClose={() => mediaImports.setMediaLibraryOpen(false)}
        onSelect={() => {}}
        onSelectAssets={(assets) => void mediaImports.handleMediaLibrarySelect(assets)}
        campaignId={campaignId ?? undefined}
        multiSelect
        keepOpenAfterImport
      />

      <CampaignAddInfoFathomDialog
        importingBatch={callImports.importingBatch}
        loading={callImports.loadingFathom}
        loadingMore={callImports.loadingMoreFathom}
        meetings={callImports.sortedFathom}
        nextCursor={callImports.fathomNextCursor}
        onBatchImport={callImports.handleBatchImportFathom}
        onLoadAll={callImports.loadAllFathom}
        onLoadMore={callImports.loadMoreFathom}
        onOpenChange={callImports.setFathomModalOpen}
        onToggleAll={callImports.handleToggleAllFathomSelection}
        onToggleSelection={callImports.toggleFathomSelection}
        open={callImports.fathomModalOpen}
        selectedIds={callImports.selectedFathomIds}
      />

      <CampaignAddInfoFirefliesDialog
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
