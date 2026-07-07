'use client'

import dynamic from 'next/dynamic'
import type { ChangeEvent, RefObject } from 'react'
import {
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Mic,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { TabsContent } from '@/components/ui/navigation/tabs'

const SimpleChatAudioRecorder = dynamic(
  () =>
    import('@/components/ui/media/simple-chat-audio-recorder').then((mod) => ({
      default: mod.SimpleChatAudioRecorder,
    })),
  { ssr: false },
)

type CampaignAddInfoRecordingState = 'idle' | 'recording' | 'finishing'

interface CampaignAddInfoLinkDetection {
  platform?: string
  supported: boolean
}

interface CampaignAddInfoTabPanelsProps {
  imageBase64: string | null
  imageCaption: string
  imageDragOver: boolean
  imageInputRef: RefObject<HTMLInputElement | null>
  imagePreview: string | null
  importingImage: boolean
  importingLink: boolean
  importingText: boolean
  linkDetection: CampaignAddInfoLinkDetection | null
  linkUrl: string
  onCancelRecording: () => void
  onClearLinkUrl: () => void
  onImageCaptionChange: (value: string) => void
  onImageDragOverChange: (dragOver: boolean) => void
  onImageFileSelected: (file: File) => void
  onImportImage: () => void
  onImportLink: () => void
  onImportText: () => void
  onLinkUrlChange: (value: string) => void
  onRecordingError: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onTextContentChange: (value: string) => void
  onTitleChange: (value: string) => void
  onTranscriptionComplete: (text: string) => void
  onTranscriptionUpdate: (text: string) => void
  recordingState: CampaignAddInfoRecordingState
  textAreaRef: RefObject<HTMLTextAreaElement | null>
  textContent: string
  textInputValue: string
  title: string
}

export function CampaignAddInfoTabPanels({
  imageBase64,
  imageCaption,
  imageDragOver,
  imageInputRef,
  imagePreview,
  importingImage,
  importingLink,
  importingText,
  linkDetection,
  linkUrl,
  onCancelRecording,
  onClearLinkUrl,
  onImageCaptionChange,
  onImageDragOverChange,
  onImageFileSelected,
  onImportImage,
  onImportLink,
  onImportText,
  onLinkUrlChange,
  onRecordingError,
  onStartRecording,
  onStopRecording,
  onTextContentChange,
  onTitleChange,
  onTranscriptionComplete,
  onTranscriptionUpdate,
  recordingState,
  textAreaRef,
  textContent,
  textInputValue,
  title,
}: CampaignAddInfoTabPanelsProps) {
  return (
    <div className="scrollbar-thin max-h-[400px] overflow-y-auto">
      <TabsContent value="text" className="space-y-spacing-2 mt-0">
        <input
          type="text"
          placeholder="Source title (e.g. book name, article title)"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
        />
        <div className="relative">
          <textarea
            ref={textAreaRef}
            placeholder="Paste the knowledge content here..."
            value={textInputValue}
            onChange={(event) => onTextContentChange(event.target.value)}
            disabled={recordingState === 'recording'}
            rows={6}
            className="px-spacing-3 py-spacing-2 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full resize-none border pr-11"
          />
          <button
            type="button"
            onClick={onStartRecording}
            disabled={recordingState !== 'idle'}
            className="button-glass-neutral absolute bottom-4 right-2 flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
          >
            <Mic className="icon-xs" />
          </button>
        </div>
        {recordingState !== 'idle' && (
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex-1">
              <SimpleChatAudioRecorder
                isRecording={recordingState === 'recording'}
                insertionMode={true}
                onTranscriptionUpdate={(_complete, delta) => onTranscriptionUpdate(delta || '')}
                onTranscriptionComplete={(_complete, delta) => onTranscriptionComplete(delta || '')}
                onError={onRecordingError}
              />
            </div>
            <div className="flex items-center gap-1">
              {recordingState === 'recording' && (
                <>
                  <button
                    type="button"
                    onClick={onStopRecording}
                    className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
                  >
                    <Square className="icon-xs text-destructive" />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelRecording}
                    className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
                  >
                    <Trash2 className="icon-xs" />
                  </button>
                </>
              )}
              {recordingState === 'finishing' && (
                <span className="text-muted-foreground text-xs">Finishing...</span>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          disabled={importingText || !title.trim() || !textContent.trim()}
          onClick={onImportText}
          className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
        >
          <span className="relative z-10 flex items-center gap-2">
            {importingText ? (
              <>
                <Loader2 className="icon-xs animate-spin" />
                Extracting knowledge...
              </>
            ) : (
              <>
                <GraduationCap className="icon-xs" />
                Train
              </>
            )}
          </span>
        </button>
      </TabsContent>

      <TabsContent value="link" className="space-y-spacing-2 mt-0">
        <div className="relative">
          <input
            type="url"
            placeholder="Paste URL (YouTube, article, social...)"
            value={linkUrl}
            onChange={(event) => onLinkUrlChange(event.target.value)}
            className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border pr-8"
          />
          {linkUrl && (
            <button
              type="button"
              onClick={onClearLinkUrl}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="icon-xs" />
            </button>
          )}
        </div>
        {linkDetection && (
          <div
            className={`body-4 rounded-spacing-2 px-spacing-2 py-spacing-2 ${linkDetection.supported ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}
          >
            {linkDetection.supported ? (
              <span className="flex items-center gap-1">
                <ExternalLink className="icon-xs" />
                {linkDetection.platform} link detected
              </span>
            ) : (
              <span>
                {linkDetection.platform} content is not supported yet. Try pasting the text
                directly, uploading a PDF, or linking to a web article.
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          disabled={importingLink || !linkUrl.trim()}
          onClick={onImportLink}
          className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
        >
          <span className="relative z-10 flex items-center gap-2">
            {importingLink ? (
              <>
                <Loader2 className="icon-xs animate-spin" />
                Extracting knowledge...
              </>
            ) : (
              <>
                <GraduationCap className="icon-xs" />
                Train
              </>
            )}
          </span>
        </button>
      </TabsContent>

      <TabsContent value="image" className="space-y-spacing-2 mt-0">
        <div
          className={`border-border rounded-spacing-2 bg-muted/10 flex min-h-40 cursor-pointer items-center justify-center border border-dashed p-spacing-3 transition-colors ${imageDragOver ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/40'}`}
          onClick={() => imageInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            onImageDragOverChange(true)
          }}
          onDragLeave={() => onImageDragOverChange(false)}
          onDrop={(event) => {
            event.preventDefault()
            onImageDragOverChange(false)
            const file = event.dataTransfer.files[0]
            if (file?.type.startsWith('image/')) onImageFileSelected(file)
          }}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="max-h-56 rounded-md object-contain" />
          ) : (
            <div className="text-muted-foreground body-4 gap-spacing-2 flex flex-col items-center text-center">
              <ImageIcon className="icon-sm" />
              <span>Click, drag & drop, or paste (Ctrl/Cmd+V)</span>
            </div>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0]
            if (file) onImageFileSelected(file)
            event.target.value = ''
          }}
        />
        <input
          type="text"
          placeholder="Optional caption"
          value={imageCaption}
          onChange={(event) => onImageCaptionChange(event.target.value)}
          className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
        />
        <button
          type="button"
          disabled={importingImage || !imageBase64}
          onClick={onImportImage}
          className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
        >
          {importingImage ? (
            <Loader2 className="icon-xs animate-spin" />
          ) : (
            <ImageIcon className="icon-xs" />
          )}
          {importingImage ? 'Embedding image...' : 'Embed Image'}
        </button>
      </TabsContent>
    </div>
  )
}
