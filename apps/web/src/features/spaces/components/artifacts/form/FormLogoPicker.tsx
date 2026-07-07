'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, ChevronRight, Image as ImageIcon, Sparkles, Upload } from 'lucide-react'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { getIconColor, LucideIcon, type IconColorId } from '@/components/ui/icon-picker-shared'
import { IconLibraryPopup } from '@/components/ui/IconLibraryPopup'
import { DocCoverGenerateModal } from '@/features/spaces/components/docs/DocCoverPickerModal'
import { reportClientError } from '@/lib/log-client-error'
import { presignPutUploadFile } from '@/lib/media/presigned-client-upload'

export interface FormLogoValue {
  icon?: string
  icon_color?: string
  icon_image_url?: string
}

interface FormLogoPickerProps {
  value: FormLogoValue
  onChange: (next: FormLogoValue) => void
  campaignId: string
  /** For client error reporting context. */
  formId: string
  defaultIcon?: string
}

const DEFAULT_ICON = 'square'

export function FormLogoPicker({
  value,
  onChange,
  campaignId,
  formId,
  defaultIcon = DEFAULT_ICON,
}: FormLogoPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const iconRowRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [iconSubmenuOpen, setIconSubmenuOpen] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [, setUploading] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const imageUrl =
    typeof value.icon_image_url === 'string' && value.icon_image_url.trim()
      ? value.icon_image_url
      : null
  const iconName = typeof value.icon === 'string' && value.icon.trim() ? value.icon : defaultIcon
  const iconColorId = (value.icon_color ?? 'default') as IconColorId
  const activeColor = getIconColor(iconColorId)

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) {
      setPos(null)
      return
    }
    const place = () => {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('[data-icon-picker-popup]')) return
      setMenuOpen(false)
      setIconSubmenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const setImage = useCallback(
    (url: string) => {
      onChange({ ...value, icon_image_url: url })
      setMenuOpen(false)
    },
    [onChange, value],
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
          feature: 'ui/form_editor',
          error_code: 'form_logo_upload_failed',
          message: err instanceof Error ? err.message : String(err),
          context: { formId },
        })
      } finally {
        setUploading(false)
      }
    },
    [campaignId, formId, setImage],
  )

  const handleIconSelect = useCallback(
    (name: string) => {
      onChange({ ...value, icon: name, icon_image_url: undefined })
      setIconSubmenuOpen(false)
      setMenuOpen(false)
    },
    [onChange, value],
  )

  const handleIconColorChange = useCallback(
    (colorId: IconColorId) => {
      onChange({ ...value, icon_color: colorId, icon_image_url: undefined })
    },
    [onChange, value],
  )

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        data-form-logo-trigger
        onClick={(e) => {
          e.stopPropagation()
          setMenuOpen((o) => !o)
          setIconSubmenuOpen(false)
        }}
        className={
          imageUrl
            ? 'flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] transition-all hover:border-[var(--color-muted-foreground)]'
            : `${activeColor.glassClass} flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] transition-all hover:border-[var(--color-muted-foreground)]`
        }
        aria-label="Change form logo"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <LucideIcon name={iconName} className={`icon-sm ${activeColor.textColor}`} />
        )}
      </button>

      {menuOpen && pos ? (
        <div
          ref={menuRef}
          className="dropdown-menu-solid fixed z-[200] w-44 overflow-hidden rounded-xl py-1 shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              fileInputRef.current?.click()
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <Upload className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setMediaPickerOpen(true)
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <ImageIcon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            Media library
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setGenerateOpen(true)
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <Bot className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            Generate with AI
          </button>
          <div className="my-0.5 border-t border-[var(--border)]" />
          <button
            ref={iconRowRef}
            type="button"
            onMouseEnter={() => setIconSubmenuOpen(true)}
            onClick={() => setIconSubmenuOpen((o) => !o)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            <span className="flex-1 text-left">Icon</span>
            <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
          </button>
        </div>
      ) : null}

      <IconLibraryPopup
        open={menuOpen && iconSubmenuOpen}
        onClose={() => setIconSubmenuOpen(false)}
        anchorRef={iconRowRef}
        triggerRef={iconRowRef}
        value={iconName}
        onSelect={handleIconSelect}
        color={iconColorId}
        onColorChange={handleIconColorChange}
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

      <DocCoverGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        campaignId={campaignId}
        onSelect={(url) => {
          setImage(url)
          setGenerateOpen(false)
        }}
      />
    </div>
  )
}
