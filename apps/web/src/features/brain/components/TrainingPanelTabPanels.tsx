'use client'

import dynamic from 'next/dynamic'
import { type RefObject } from 'react'
import { ExternalLink, GraduationCap, ImageIcon, Mic, Square, Trash2, X } from 'lucide-react'
import { TabsContent } from '@/components/ui/navigation/tabs'
import type { SkDomain, SkSourceType } from '../services/sk.service'
import { TrainingPanelMetadataFields } from './TrainingPanelMetadataFields'

const SimpleChatAudioRecorder = dynamic(
  () =>
    import('@/components/ui/media/simple-chat-audio-recorder').then((mod) => ({
      default: mod.SimpleChatAudioRecorder,
    })),
  { ssr: false },
)

export type TrainingPanelInputMode = 'text' | 'link' | 'image'
export type TrainingPanelRecordingState = 'idle' | 'recording' | 'finishing'

export interface TrainingPanelLinkDetection {
  supported: boolean
  platform?: string
  sourceType: SkSourceType
}

interface TrainingPanelTabPanelsProps {
  title: string
  onTitleChange: (value: string) => void
  textInputValue: string
  onTextChange: (value: string) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  recordingState: TrainingPanelRecordingState
  onStartRecording: () => void
  onStopRecording: () => void
  onCancelRecording: () => void
  onTranscriptionUpdate: (text: string) => void
  onTranscriptionComplete: (text: string) => void
  onTranscriptionError: () => void
  sourceType: SkSourceType
  onSourceTypeChange: (sourceType: SkSourceType) => void
  domain: SkDomain
  onDomainChange: (domain: SkDomain) => void
  onIngestText: () => void
  linkUrl: string
  onLinkUrlChange: (value: string) => void
  linkDetection: TrainingPanelLinkDetection | null
  onIngestLink: () => void
  imagePreview: string | null
  imageInputRef: RefObject<HTMLInputElement | null>
  onImageFile: (file: File) => void | Promise<void>
  imageDragOver: boolean
  onImageDragOverChange: (value: boolean) => void
  imageCaption: string
  onImageCaptionChange: (value: string) => void
  canIngestImage: boolean
  onIngestImage: () => void
}

export function TrainingPanelTabPanels({
  title,
  onTitleChange,
  textInputValue,
  onTextChange,
  textareaRef,
  recordingState,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onTranscriptionUpdate,
  onTranscriptionComplete,
  onTranscriptionError,
  sourceType,
  onSourceTypeChange,
  domain,
  onDomainChange,
  onIngestText,
  linkUrl,
  onLinkUrlChange,
  linkDetection,
  onIngestLink,
  imagePreview,
  imageInputRef,
  onImageFile,
  imageDragOver,
  onImageDragOverChange,
  imageCaption,
  onImageCaptionChange,
  canIngestImage,
  onIngestImage,
}: TrainingPanelTabPanelsProps) {
  return (
    <div className="scrollbar-thin max-h-[400px] overflow-y-auto">
      <TabsContent value="text" className="space-y-spacing-2 mt-0">
        <input
          type="text"
          placeholder="Source title (e.g. book name, article title)"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
        />
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder="Paste the knowledge content here..."
            value={textInputValue}
            onChange={(e) => onTextChange(e.target.value)}
            disabled={recordingState === 'recording'}
            rows={6}
            className="px-spacing-3 py-spacing-2 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full resize-none border pr-11"
          />
          <button
            type="button"
            onClick={onStartRecording}
            disabled={recordingState !== 'idle'}
            className="button-glass-neutral absolute bottom-spacing-4 right-spacing-2 flex h-8 w-8 items-center justify-center rounded-full transition-all disabled:opacity-30"
          >
            <Mic className="h-3.5 w-3.5" />
          </button>
        </div>
        {recordingState !== 'idle' && (
          <div className="flex items-center justify-between px-1 py-1">
            <div className="flex-1">
              <SimpleChatAudioRecorder
                isRecording={recordingState === 'recording'}
                insertionMode={true}
                onTranscriptionUpdate={(_complete, delta) => onTranscriptionUpdate(delta || '')}
                onTranscriptionComplete={(_complete, delta) =>
                  onTranscriptionComplete(delta || '')
                }
                onError={onTranscriptionError}
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
                    <Square className="h-3 w-3 text-destructive" />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelRecording}
                    className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {recordingState === 'finishing' && (
                <span className="text-muted-foreground text-xs">Finishing...</span>
              )}
            </div>
          </div>
        )}
        <TrainingPanelMetadataFields
          sourceType={sourceType}
          onSourceTypeChange={onSourceTypeChange}
          domain={domain}
          onDomainChange={onDomainChange}
        />
        <button
          type="button"
          disabled={!title.trim() || !textInputValue.trim()}
          onClick={onIngestText}
          className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
        >
          <span className="relative z-10 flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5" />
            Train
          </span>
        </button>
      </TabsContent>

      <TabsContent value="link" className="space-y-spacing-2 mt-0">
        <div className="relative">
          <input
            type="url"
            placeholder="Paste URL (YouTube, article, social...)"
            value={linkUrl}
            onChange={(e) => onLinkUrlChange(e.target.value)}
            className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border pr-8"
          />
          {linkUrl && (
            <button
              type="button"
              onClick={() => onLinkUrlChange('')}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {linkDetection && (
          <div
            className={`body-4 rounded-spacing-2 px-spacing-2 py-spacing-2 ${linkDetection.supported ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}
          >
            {linkDetection.supported ? (
              <span className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
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
          disabled={!linkUrl.trim()}
          onClick={onIngestLink}
          className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
        >
          <span className="relative z-10 flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5" />
            Train
          </span>
        </button>
      </TabsContent>

      <TabsContent value="image" className="space-y-spacing-2 mt-0">
        <div
          className={`border-border rounded-spacing-2 bg-muted/10 flex min-h-[160px] cursor-pointer items-center justify-center border border-dashed p-3 transition-colors ${imageDragOver ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/40'}`}
          onClick={() => imageInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            onImageDragOverChange(true)
          }}
          onDragLeave={() => onImageDragOverChange(false)}
          onDrop={(e) => {
            e.preventDefault()
            onImageDragOverChange(false)
            const file = e.dataTransfer.files[0]
            if (file?.type.startsWith('image/')) void onImageFile(file)
          }}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="max-h-[220px] rounded-md object-contain" />
          ) : (
            <div className="text-muted-foreground body-4 flex flex-col items-center gap-2 text-center">
              <ImageIcon className="h-5 w-5" />
              <span>Click, drag & drop, or paste (Ctrl/Cmd+V)</span>
            </div>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onImageFile(file)
            e.target.value = ''
          }}
        />
        <input
          type="text"
          placeholder="Optional caption"
          value={imageCaption}
          onChange={(e) => onImageCaptionChange(e.target.value)}
          className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
        />
        <button
          type="button"
          disabled={!canIngestImage}
          onClick={onIngestImage}
          className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Embed Image
        </button>
      </TabsContent>
    </div>
  )
}
