'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Building2, Image as ImageIcon, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { MediaGenerateModal, MediaPickerModal } from '@/components/media'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import type { MediaAsset } from '@/lib/services/media-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

interface OrgLogoPickerProps {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

export function OrgLogoPicker({ value, onChange, disabled }: OrgLogoPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload: presignedUpload } = usePresignedUpload()

  const [menuOpen, setMenuOpen] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const imageUrl = value?.trim() || null

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const applyUrl = useCallback(
    (url: string) => {
      onChange(url)
      setMenuOpen(false)
    },
    [onChange],
  )

  const handleFileUpload = useCallback(
    async (file: File | undefined) => {
      if (!file?.type.startsWith('image/')) return
      setUploading(true)
      try {
        const res = await presignedUpload({
          file,
          name: file.name,
          category: 'upload',
          aiAnalysis: false,
        })
        const url = res.url || res.asset?.public_url
        if (url) applyUrl(url)
      } catch (e) {
        toast.error(sanitizeUserError(e, 'Upload failed'))
      } finally {
        setUploading(false)
      }
    },
    [presignedUpload, applyUrl],
  )

  return (
    <div ref={rootRef} className="space-y-spacing-2 relative">
      <label className="body-3 text-muted-foreground block">Company logo</label>
      <p className="body-4 text-muted-foreground">
        Used on Company Cortex and Customer Brain cards in Brain Home.
      </p>
      <div className="gap-spacing-3 relative flex items-center">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => setMenuOpen((o) => !o)}
          className="border-border bg-muted h-20 w-20 shrink-0 overflow-hidden rounded-full border transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Building2 className="icon-md text-muted-foreground opacity-40" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => setMenuOpen((o) => !o)}
            className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 font-medium disabled:opacity-50"
          >
            {imageUrl ? 'Change logo' : 'Add logo'}
          </button>
          {imageUrl && !disabled ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="body-4 text-muted-foreground hover:text-foreground mt-spacing-2 block transition-colors"
            >
              Remove logo
            </button>
          ) : null}
        </div>

        {menuOpen ? (
          <div className="dropdown-menu-solid absolute left-0 top-[calc(100%+4px)] z-[200] w-44 overflow-hidden rounded-xl py-1 shadow-xl">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          void handleFileUpload(file)
        }}
      />

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={() => {}}
        onSelectAsset={(asset: MediaAsset) => {
          const url = asset.public_url?.trim()
          if (url) applyUrl(url)
          setMediaPickerOpen(false)
        }}
      />

      <MediaGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSelect={(url) => {
          applyUrl(url)
          setGenerateOpen(false)
        }}
        title="Generate company logo"
        extraTags={['org-logo']}
      />
    </div>
  )
}
