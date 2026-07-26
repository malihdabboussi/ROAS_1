'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Mic, Plus, Square } from 'lucide-react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { MEDIA_TOAST_ERRORS, MEDIA_TOAST_SUCCESS } from '@/lib/config/media-toast-errors.config'
import { cn } from '@/lib/utils/cn'
import { useMediaImageGeneration } from './use-media-image-generation'

const SimpleChatAudioRecorder = dynamic(
  () =>
    import('@/components/ui/media/simple-chat-audio-recorder').then((mod) => ({
      default: mod.SimpleChatAudioRecorder,
    })),
  { ssr: false },
)

interface UseMediaImageEditControllerOptions {
  assetId?: string | null
  assetUrl?: string | null
  spaceId?: string | null
  campaignId?: string | null
  conversationId?: string | null
  onGenerated: (result: { url: string; assetId: string }) => void
}

export function useMediaImageEditController({
  assetId,
  assetUrl,
  spaceId,
  campaignId,
  conversationId,
  onGenerated,
}: UseMediaImageEditControllerOptions) {
  const handleGenerated = useCallback(
    (result: { url: string; assetId: string }) => {
      toast.success(MEDIA_TOAST_SUCCESS.IMAGE_EDITED.userMessage)
      onGenerated(result)
    },
    [onGenerated],
  )
  const editor = useMediaImageGeneration({
    open: Boolean(assetId && assetUrl),
    spaceId,
    campaignId,
    conversationId,
    loadCreations: false,
    extraTags: ['image-studio'],
    onGenerationComplete: handleGenerated,
  })

  useEffect(() => {
    if (!assetId || !assetUrl) return
    editor.setReference(assetId, assetUrl)
  }, [assetId, assetUrl, editor.setReference])

  return editor
}

export type MediaImageEditController = ReturnType<typeof useMediaImageEditController>

export function MediaImageEditComposerView({
  editor,
  campaignId,
  floating = false,
}: {
  editor: MediaImageEditController
  campaignId?: string | null
  floating?: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const recordingBaseRef = useRef('')
  const submit = useCallback(() => {
    void editor.handleGenerate()
  }, [editor.handleGenerate])
  const mergeTranscription = useCallback(
    (delta = '') => {
      const base = recordingBaseRef.current.trim()
      const addition = delta.trim()
      editor.setPrompt([base, addition].filter(Boolean).join(' '))
    },
    [editor.setPrompt],
  )

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <>
      <div
        className={cn(
          floating
            ? 'bottom-spacing-4 left-spacing-6 right-spacing-6 z-dropdown absolute'
            : 'border-border bg-card p-spacing-3 border-t',
        )}
      >
        <div className={cn('mx-auto w-full', floating && 'max-w-4xl')}>
          {editor.isGenerating || editor.progressMessage ? (
            <div className="surface-card border-border mb-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 rounded-spacing-3 flex items-center border shadow-lg">
              {editor.isGenerating ? (
                <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="body-4 text-foreground truncate">
                  {editor.progressMessage || 'Creating your edit…'}
                </p>
                {editor.isGenerating ? (
                  <progress
                    value={editor.progress}
                    max={100}
                    className="mt-spacing-1 h-1 w-full"
                    aria-label="Image edit progress"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          <form
            aria-label="Image edit composer"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            className="surface-card border-border px-spacing-3 py-spacing-2 gap-spacing-2 rounded-spacing-4 flex w-full items-center border shadow-lg"
          >
            <button
              type="button"
              disabled={editor.isGenerating}
              onClick={() => setPickerOpen(true)}
              className="btn-icon-bare shrink-0"
              aria-label="Add reference image"
            >
              <Plus className="icon-sm" />
            </button>
            <div className={cn('min-w-0 flex-1', !isRecording && 'hidden')}>
              <SimpleChatAudioRecorder
                isRecording={isRecording}
                insertionMode
                onTranscriptionUpdate={(_text, delta) => mergeTranscription(delta)}
                onTranscriptionComplete={(_text, delta) => {
                  mergeTranscription(delta)
                  setIsRecording(false)
                }}
                onError={() => {
                  setIsRecording(false)
                  toast.error(MEDIA_TOAST_ERRORS.VOICE_INPUT_FAILED.userMessage)
                }}
              />
            </div>
            {!isRecording ? (
              <textarea
                value={editor.prompt}
                onChange={(event) => editor.setPrompt(event.target.value)}
                onKeyDown={onKeyDown}
                disabled={editor.isGenerating}
                placeholder="Describe edits"
                rows={1}
                className="body-2 text-foreground placeholder:text-muted-foreground py-spacing-2 min-w-0 flex-1 resize-none bg-transparent outline-none disabled:opacity-50"
              />
            ) : null}
            {editor.additionalReferenceAssetIds.length > 0 ? (
              <span className="body-4 text-muted-foreground shrink-0">
                {editor.additionalReferenceAssetIds.length} reference
                {editor.additionalReferenceAssetIds.length === 1 ? '' : 's'}
              </span>
            ) : null}
            <button
              type="button"
              disabled={editor.isGenerating}
              onClick={() => {
                if (!isRecording) recordingBaseRef.current = editor.prompt
                setIsRecording((value) => !value)
              }}
              className="btn-icon-bare shrink-0"
              aria-label={isRecording ? 'Stop voice input' : 'Voice input'}
            >
              {isRecording ? <Square className="icon-sm" /> : <Mic className="icon-sm" />}
            </button>
            <button
              type="submit"
              disabled={!editor.prompt.trim() || editor.isGenerating}
              className={cn(
                'hd4-send-btn shrink-0',
                editor.prompt.trim() && !editor.isGenerating
                  ? 'hd4-send-btn-active'
                  : 'hd4-send-btn-idle opacity-50',
              )}
              aria-label="Create image edit"
            >
              {editor.isGenerating ? (
                <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
              ) : (
                <ArrowUp className="icon-sm" />
              )}
            </button>
          </form>
        </div>
      </div>
      {pickerOpen ? (
        <MediaPickerModal
          open
          onClose={() => setPickerOpen(false)}
          onSelect={() => {}}
          onSelectAsset={(asset) => {
            if (asset.asset_type !== 'image') return
            editor.addReferenceAsset(asset.id)
            setPickerOpen(false)
          }}
          campaignId={campaignId ?? undefined}
        />
      ) : null}
    </>
  )
}

interface MediaImageEditComposerProps extends UseMediaImageEditControllerOptions {}

export function MediaImageEditComposer(props: MediaImageEditComposerProps) {
  const editor = useMediaImageEditController(props)
  return <MediaImageEditComposerView editor={editor} campaignId={props.campaignId} />
}
