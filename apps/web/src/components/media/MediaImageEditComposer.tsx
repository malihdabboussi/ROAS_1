'use client'

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import { ArrowUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { MEDIA_TOAST_SUCCESS } from '@/lib/config/media-toast-errors.config'
import { cn } from '@/lib/utils/cn'
import {
  AspectRatioMenuOption,
  CHATGPT_STYLE_ASPECT_OPTIONS,
  type ChatGptStyleAspectRatio,
} from './aspect-ratio-menu'
import type { CoverAspectRatio } from './media-image-generation-types'
import { useMediaImageGeneration } from './use-media-image-generation'

interface MediaImageEditComposerProps {
  assetId: string
  assetUrl: string
  spaceId?: string | null
  campaignId?: string | null
  onGenerated: (result: { url: string; assetId: string }) => void
}

export function MediaImageEditComposer({
  assetId,
  assetUrl,
  spaceId,
  campaignId,
  onGenerated,
}: MediaImageEditComposerProps) {
  const [aspectOpen, setAspectOpen] = useState(false)
  const handleGenerated = useCallback(
    (result: { url: string; assetId: string }) => {
      toast.success(MEDIA_TOAST_SUCCESS.IMAGE_EDITED.userMessage)
      onGenerated(result)
    },
    [onGenerated],
  )
  const editor = useMediaImageGeneration({
    open: true,
    spaceId,
    campaignId,
    loadCreations: false,
    extraTags: ['image-studio'],
    onGenerationComplete: handleGenerated,
  })

  useEffect(() => {
    editor.setReference(assetId, assetUrl)
  }, [assetId, assetUrl, editor.setReference])

  const submit = useCallback(() => {
    void editor.handleGenerate()
  }, [editor.handleGenerate])

  const changeAspectRatio = useCallback(
    (ratio: ChatGptStyleAspectRatio) => {
      if (!editor.supportedAspectRatios.includes(ratio as CoverAspectRatio)) return
      const supportedRatio = ratio as CoverAspectRatio
      setAspectOpen(false)
      editor.setAspectRatio(supportedRatio)
      void editor.generate({
        aspectRatio: supportedRatio,
        prompt:
          'Resize this image to the selected aspect ratio. Preserve the subject, style, details, and composition as closely as possible. Extend the scene naturally where needed.',
      })
    },
    [editor.generate, editor.setAspectRatio],
  )

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="border-border bg-card border-t">
      {editor.isGenerating || editor.progressMessage ? (
        <div className="border-border px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center border-b">
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

      <div className="p-spacing-3">
        <div className="home-composer-v4-shell relative">
          <textarea
            value={editor.prompt}
            onChange={(event) => editor.setPrompt(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={editor.isGenerating}
            placeholder="Describe what you want to change…"
            rows={2}
            className="body-2 text-foreground placeholder:text-muted-foreground px-spacing-3 pt-spacing-3 w-full resize-none bg-transparent outline-none disabled:opacity-50"
          />
          <div className="home-composer-v4-standard-footer px-spacing-2 py-spacing-2 flex items-center justify-between">
            <div className="relative">
              <button
                type="button"
                disabled={editor.isGenerating}
                onClick={() => setAspectOpen((open) => !open)}
                className="body-4 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 px-spacing-2 flex h-7 items-center border disabled:opacity-50"
              >
                {editor.aspectRatio}
                <ChevronDown className="h-3 w-3" />
              </button>
              {aspectOpen ? (
                <div className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown absolute bottom-8 left-0 flex min-w-64 flex-col">
                  {CHATGPT_STYLE_ASPECT_OPTIONS.filter((option) =>
                    editor.supportedAspectRatios.includes(option.ratio as CoverAspectRatio),
                  ).map((option) => (
                    <AspectRatioMenuOption
                      key={option.ratio}
                      ratio={option.ratio}
                      label={option.label}
                      onSelect={() => changeAspectRatio(option.ratio)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!editor.prompt.trim() || editor.isGenerating}
              onClick={submit}
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
          </div>
        </div>
      </div>
    </div>
  )
}
