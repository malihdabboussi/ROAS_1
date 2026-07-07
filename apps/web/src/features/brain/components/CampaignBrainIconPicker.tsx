'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, ChevronRight, Image as ImageIcon, Sparkles, Trash2, Upload } from 'lucide-react'
import { MediaGenerateModal, MediaPickerModal } from '@/components/media'
import { getIconColor, LucideIcon, type IconColorId } from '@/components/ui/icon-picker-shared'
import { IconLibraryPopup } from '@/components/ui/IconLibraryPopup'
import { patchCampaignBrainIcon } from '@/features/brain/services/campaign-brain-icon.service'
import { reportClientError } from '@/lib/log-client-error'
import { presignPutUploadFile } from '@/lib/media/presigned-client-upload'
import { cn } from '@/lib/utils/cn'

const DEFAULT_ICON = 'brain'

const CARD_ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'

export function CampaignBrainIconDisplay({
  icon,
  iconColor,
  imageUrl,
  variant = 'card',
  className,
}: {
  icon: string
  iconColor: string
  imageUrl: string | null
  variant?: 'card' | 'inline'
  className?: string
}) {
  const iconName = icon.trim() || DEFAULT_ICON
  const activeColor = getIconColor((iconColor || 'purple') as IconColorId)
  const isCard = variant === 'card'

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn(
          isCard ? 'h-full w-full object-cover' : 'h-6 w-6 shrink-0 rounded-full object-cover',
          className,
        )}
      />
    )
  }

  if (isCard) {
    return (
      <div
        className={cn(
          `${activeColor.glassClass} flex h-full w-full items-center justify-center`,
          className,
        )}
      >
        <LucideIcon name={iconName} className={`h-14 w-14 ${activeColor.textColor}`} />
      </div>
    )
  }

  return (
    <span
      className={cn(
        `${activeColor.glassClass} flex h-6 w-6 shrink-0 items-center justify-center rounded-full`,
        className,
      )}
    >
      <LucideIcon name={iconName} className={`icon-sm ${activeColor.textColor}`} />
    </span>
  )
}

export function CampaignBrainIconMenuItem({
  campaignId,
  campaignLabel,
  icon,
  iconColor,
  imageUrl,
  variant = 'card',
  onAction,
}: {
  campaignId: string
  campaignLabel: string
  icon: string
  iconColor: string
  imageUrl: string | null
  variant?: 'menu' | 'card'
  onAction: () => void
}) {
  const [open, setOpen] = useState(false)
  const [iconSubmenuOpen, setIconSubmenuOpen] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [, setUploading] = useState(false)

  const rowRef = useRef<HTMLDivElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const iconRowRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const iconName = icon.trim() || DEFAULT_ICON
  const iconColorId = (iconColor || 'purple') as IconColorId

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      setOpen(false)
      setIconSubmenuOpen(false)
    }, 160)
  }

  useEffect(() => () => cancelClose(), [])

  const applyPatch = useCallback(
    async (patch: Parameters<typeof patchCampaignBrainIcon>[1]) => {
      try {
        await patchCampaignBrainIcon(campaignId, patch)
        setOpen(false)
        setIconSubmenuOpen(false)
        onAction()
      } catch (err) {
        void reportClientError({
          feature: 'brain/campaign_knowledge',
          error_code: 'campaign_brain_icon_patch_failed',
          message: err instanceof Error ? err.message : String(err),
          context: { campaignId },
        })
      }
    },
    [campaignId, onAction],
  )

  const setImage = useCallback(
    (url: string) => {
      void applyPatch({ icon_image_url: url })
    },
    [applyPatch],
  )

  const handleFileUpload = useCallback(
    async (file: File | undefined) => {
      if (!file?.type.startsWith('image/')) return
      setUploading(true)
      try {
        const { url } = await presignPutUploadFile({
          file,
          category: 'image',
          campaign_id: campaignId,
        })
        setImage(url)
      } catch (err) {
        void reportClientError({
          feature: 'brain/campaign_knowledge',
          error_code: 'campaign_brain_icon_upload_failed',
          message: err instanceof Error ? err.message : String(err),
          context: { campaignId },
        })
      } finally {
        setUploading(false)
      }
    },
    [campaignId, setImage],
  )

  const rowCls =
    variant === 'menu'
      ? cn(CARD_ITEM_CLS, open && 'bg-[var(--color-hover-subtle)] text-foreground')
      : cn(CARD_ITEM_CLS, open && 'bg-[var(--color-hover-subtle)] text-foreground')

  const flyoutItemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors text-muted-foreground hover:text-foreground hover:bg-[var(--color-hover-subtle)]'

  return (
    <>
      <div
        ref={rowRef}
        className="relative"
        onMouseEnter={() => {
          cancelClose()
          setOpen(true)
        }}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          className={rowCls}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate">Change icon</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
        {open ? (
          <div
            ref={flyoutRef}
            role="menu"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="dropdown-menu-solid p-spacing-2 gap-spacing-1 absolute left-full top-0 z-50 ml-1 flex w-56 flex-col rounded-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={flyoutItemCls}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                fileInputRef.current?.click()
              }}
            >
              <Upload className="h-3.5 w-3.5 shrink-0" />
              Upload
            </button>
            <button
              type="button"
              className={flyoutItemCls}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                setMediaPickerOpen(true)
              }}
            >
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              Media library
            </button>
            <button
              type="button"
              className={flyoutItemCls}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                setGenerateOpen(true)
              }}
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              Generate with AI
            </button>
            <div className="border-border my-0.5 border-t" />
            <button
              ref={iconRowRef}
              type="button"
              className={flyoutItemCls}
              onMouseEnter={() => setIconSubmenuOpen(true)}
              onClick={(e) => {
                e.stopPropagation()
                setIconSubmenuOpen((o) => !o)
              }}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left">Icon</span>
              <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
            </button>
            {imageUrl ? (
              <>
                <div className="border-border my-0.5 border-t" />
                <button
                  type="button"
                  className="gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-destructive transition-colors hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    void applyPatch({ icon_image_url: undefined })
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  Remove image
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <IconLibraryPopup
        open={open && iconSubmenuOpen}
        onClose={() => setIconSubmenuOpen(false)}
        anchorRef={iconRowRef}
        triggerRef={iconRowRef}
        value={iconName}
        onSelect={(name) => void applyPatch({ icon: name, icon_image_url: undefined })}
        color={iconColorId}
        onColorChange={(colorId) =>
          void applyPatch({ icon_color: colorId, icon_image_url: undefined })
        }
        placement="right"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFileUpload(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          setImage(url)
          setMediaPickerOpen(false)
        }}
        campaignId={campaignId}
      />

      <MediaGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        campaignId={campaignId}
        title={`Generate image for ${campaignLabel}`}
        extraTags={['campaign-brain-icon']}
        onSelect={(url) => {
          setImage(url)
          setGenerateOpen(false)
        }}
      />
    </>
  )
}
