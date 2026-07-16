'use client'

import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  HomeDashboardV4Chip,
  HomeDashboardV4Menu,
  HomeDashboardV4MenuItem,
  HomeDashboardV4MenuLabel,
} from '@/components/home-dashboard-v4/HomeDashboardV4Menu'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import type { ImageGenerationModelIdWeb } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'
import { AspectRatioGlyph, aspectRatioLabel } from './aspect-ratio-menu'
import type { CoverAspectRatio } from './use-media-image-generation'
import { useMediaImageGeneration } from './use-media-image-generation'

export interface MediaGenerateComposerProps {
  spaceId?: string | null
  campaignId?: string | null
  /** Extra tags stored on generated assets (unused when routing through chat). */
  extraTags?: string[]
  /** Called after a successful generation so parents can refresh galleries. */
  onGenerated?: (result: { url: string; assetId: string }) => void
  className?: string
  placeholder?: string
}

function buildGenerateSeedContent(input: {
  prompt: string
  aspectRatio: string
  modelId: string
  modelName: string
  hasReference: boolean
  spaceId?: string | null
  campaignId?: string | null
}): string {
  const lines = [
    `Generate an image using the generate_image tool.`,
    `Prompt: ${input.prompt}`,
    `Aspect ratio: ${input.aspectRatio}`,
    `Model: ${input.modelId} (${input.modelName}). Prefer this model id.`,
  ]
  if (input.spaceId) {
    lines.push(
      `Pass space_id "${input.spaceId}" in generate_image data so the asset is saved into this space's media library.`,
    )
    lines.push(
      `On success the tool returns image_asset_id + media_library=registered_in_space_media — confirm that; do not claim Space Media cannot register the asset.`,
    )
  } else {
    lines.push(`Save the result into the media library.`)
  }
  if (input.campaignId) {
    lines.push(`campaign_id: ${input.campaignId}`)
  }
  if (input.hasReference) {
    lines.push(
      `Use the attached reference image (edit / image-to-image). Keep the subject recognizable unless I ask otherwise.`,
    )
  }
  lines.push(
    `Model note: gpt-5.4-image-2 is OpenAI GPT Image 2 (ChatGPT images). GPT-5.6 is a chat model, not an image model id.`,
  )
  return lines.join('\n')
}

export function MediaGenerateComposer({
  spaceId,
  campaignId,
  extraTags,
  onGenerated,
  className,
  placeholder = 'Describe a new image…',
}: MediaGenerateComposerProps) {
  const [openDropdown, setOpenDropdown] = useState<'model' | 'ratio' | null>(null)
  const [attaching, setAttaching] = useState(false)
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const ratioChipRef = useRef<HTMLButtonElement>(null)
  const modelChipRef = useRef<HTMLButtonElement>(null)
  const { upload } = usePresignedUpload()
  const seedComposer = useGlobalChatStore((s) => s.seedComposer)

  const hook = useMediaImageGeneration({
    open: true,
    campaignId,
    spaceId,
    extraTags,
    loadCreations: false,
    onGenerationComplete: onGenerated,
  })

  const onAttachFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.item(0)
      if (!file || !file.type.startsWith('image/')) return
      setAttaching(true)
      try {
        const result = await upload({
          file,
          category: 'upload',
          campaign_id: campaignId ?? undefined,
          space_id: spaceId ?? undefined,
        })
        const preview = result.asset.public_url ?? result.url
        if (result.asset.id && preview) {
          hook.setReference(result.asset.id, preview)
          onGenerated?.({ url: preview, assetId: result.asset.id })
        }
      } finally {
        setAttaching(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    },
    [upload, campaignId, spaceId, hook, onGenerated],
  )

  const canSubmit =
    hook.prompt.trim().length > 0 && !sending && !hook.isLoadingModels && !attaching

  const handleSubmit = useCallback(() => {
    const prompt = hook.prompt.trim()
    if (!prompt || sending) return
    setSending(true)
    try {
      const documents: DocumentAttachment[] | undefined =
        hook.referenceAssetId && hook.referencePreviewUrl
          ? [
              {
                filename: 'reference-image',
                type: 'image',
                fileUrl: hook.referencePreviewUrl,
                mediaAssetId: hook.referenceAssetId,
                mimeType: 'image/*',
              },
            ]
          : undefined

      seedComposer({
        content: buildGenerateSeedContent({
          prompt,
          aspectRatio: hook.aspectRatio,
          modelId: hook.selectedModel,
          modelName: hook.selectedModelInfo?.name ?? 'ChatGPT',
          hasReference: Boolean(hook.referenceAssetId),
          spaceId,
          campaignId,
        }),
        documents,
        workContext: {
          surface: 'spaces',
          spaceId: spaceId ?? null,
          campaignId: campaignId ?? null,
        },
        railIntent: 'new',
      })
      toast.message('Opening chat to create your image…')
      hook.setPrompt('')
      hook.clearReference()
    } finally {
      setSending(false)
    }
  }, [campaignId, hook, seedComposer, sending, spaceId])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSubmit) handleSubmit()
    }
  }

  return (
    <div className={cn('min-w-0 w-full', className)}>
      <div className="home-composer-v4-shell relative min-w-0">
        {hook.referencePreviewUrl ? (
          <div className="mb-spacing-2 flex items-center gap-spacing-2 px-spacing-2">
            <div className="relative shrink-0">
              <img
                src={hook.referencePreviewUrl}
                alt=""
                className="border-border h-12 w-12 rounded-spacing-2 border object-cover"
              />
              <button
                type="button"
                onClick={hook.clearReference}
                className="bg-card border-border absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-spacing-1 border"
                aria-label="Remove reference"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <p className="body-4 text-muted-foreground">
              Reference attached — edits will use this image
            </p>
          </div>
        ) : null}

        <div className="relative flex-1 px-spacing-2 pt-3">
          <textarea
            value={hook.prompt}
            onChange={(e) => hook.setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending}
            placeholder={hook.referenceAssetId ? 'Describe edits…' : placeholder}
            rows={2}
            className="body-2 text-foreground placeholder:text-muted-foreground w-full resize-none bg-transparent outline-none disabled:opacity-50"
          />
        </div>

        <div className="home-composer-v4-standard-footer flex w-full min-w-0 flex-wrap items-center justify-between gap-2 px-spacing-2 py-spacing-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={sending || attaching}
              onClick={() => fileRef.current?.click()}
              className="hd4-plus-btn disabled:opacity-50"
              aria-label="Open add menu"
            >
              {attaching ? (
                <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
              ) : (
                <Paperclip className="icon-sm" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onAttachFiles(e.target.files)}
            />

            <div className="relative">
              <HomeDashboardV4Chip
                label="Aspect"
                value={hook.aspectRatio}
                open={openDropdown === 'ratio'}
                selected={openDropdown === 'ratio'}
                innerRef={ratioChipRef}
                onClick={() =>
                  setOpenDropdown((d) => (d === 'ratio' ? null : 'ratio'))
                }
              />
              <HomeDashboardV4Menu
                open={openDropdown === 'ratio'}
                onClose={() => setOpenDropdown(null)}
                width={220}
                anchorRef={ratioChipRef}
              >
                <HomeDashboardV4MenuLabel>Aspect ratio</HomeDashboardV4MenuLabel>
                {hook.supportedAspectRatios.map((r) => (
                  <HomeDashboardV4MenuItem
                    key={r}
                    label={
                      <span className="gap-spacing-2 flex items-center">
                        <AspectRatioGlyph ratio={r} />
                        <span>{aspectRatioLabel(r)}</span>
                        <span className="text-muted-foreground font-normal">{r}</span>
                      </span>
                    }
                    checked={hook.aspectRatio === r}
                    onClick={() => {
                      hook.setAspectRatio(r as CoverAspectRatio)
                      setOpenDropdown(null)
                    }}
                  />
                ))}
              </HomeDashboardV4Menu>
            </div>

            <div className="relative">
              <HomeDashboardV4Chip
                label="Model"
                value={hook.selectedModelInfo?.name ?? 'ChatGPT'}
                open={openDropdown === 'model'}
                selected={openDropdown === 'model'}
                innerRef={modelChipRef}
                onClick={() =>
                  setOpenDropdown((d) => (d === 'model' ? null : 'model'))
                }
              />
              <HomeDashboardV4Menu
                open={openDropdown === 'model'}
                onClose={() => setOpenDropdown(null)}
                width={300}
                anchorRef={modelChipRef}
              >
                <HomeDashboardV4MenuLabel>Image model</HomeDashboardV4MenuLabel>
                {hook.availableModels.map((m) => (
                  <HomeDashboardV4MenuItem
                    key={m.id}
                    label={m.name}
                    sub={m.description}
                    checked={hook.selectedModel === m.id}
                    onClick={() => {
                      hook.setSelectedModel(m.id as ImageGenerationModelIdWeb)
                      setOpenDropdown(null)
                    }}
                  />
                ))}
              </HomeDashboardV4Menu>
            </div>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={cn(
              'hd4-send-btn shrink-0',
              canSubmit ? 'hd4-send-btn-active' : 'hd4-send-btn-idle opacity-50',
            )}
            aria-label="Send message"
          >
            {sending ? (
              <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
            ) : (
              <ArrowUp className="icon-sm" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
