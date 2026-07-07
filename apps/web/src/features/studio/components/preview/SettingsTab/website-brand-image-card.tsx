'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FolderOpen, ImagePlus, Palette, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { getTheme } from '@/lib/themes/themes-api'

async function uploadWebsiteImageFile(
  file: File,
  category: string,
): Promise<{ url: string } | null> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)
  formData.append('name', file.name)
  const { backendUpload } = await import('@/lib/api/backend-client')
  const json = await backendUpload<{
    success?: boolean
    url?: string
    asset?: { id?: string }
  }>('/media/upload', formData)
  if (!json?.success || !json.url) return null
  return { url: json.url }
}

export function WebsiteBrandImageCard({
  label,
  value,
  onChange,
  themeId,
  uploadCategory,
  onOpenLibrary,
  previewBoxClass,
}: {
  label: string
  value: string
  onChange: (url: string) => void
  themeId: string | null
  uploadCategory: string
  onOpenLibrary: () => void
  previewBoxClass: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)

  useEffect(() => {
    if (!menuOpen) return
    const handle = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  const handleUploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    const result = await uploadWebsiteImageFile(file, uploadCategory)
    if (!result) {
      toast.error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      return
    }
    onChange(result.url)
    setMenuOpen(false)
  }

  const handlePickFromTheme = async () => {
    if (!themeId) {
      toast.error('Select a theme in Theme settings first.')
      setMenuOpen(false)
      return
    }
    const theme = await getTheme(themeId).catch(() => null)
    const url = theme?.logo_url?.trim() ?? ''
    if (!url) {
      toast.error('This theme has no logo.')
      setMenuOpen(false)
      return
    }
    onChange(url)
    setMenuOpen(false)
  }

  return (
    <div className="space-y-spacing-2">
      <div className="gap-spacing-2 flex items-center justify-between">
        <span className="body-4 text-muted-foreground">{label}</span>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="btn-icon-glass btn-icon-glass-sm rounded-spacing-2 flex h-9 w-9 items-center justify-center"
            title="Add image"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <ChevronDown className="icon-sm" />
          </button>
          {menuOpen && (
            <div
              className="dropdown-menu-solid absolute right-0 top-full z-[60] mt-1 w-52 py-1"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  fileInputRef.current?.click()
                  setMenuOpen(false)
                }}
                className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-secondary flex w-full items-center text-left transition-colors"
              >
                <Upload className="icon-sm shrink-0" />
                Upload
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handlePickFromTheme()}
                className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-secondary flex w-full items-center text-left transition-colors"
              >
                <Palette className="icon-sm shrink-0" />
                From theme
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onOpenLibrary()
                  setMenuOpen(false)
                }}
                className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 text-foreground hover:bg-secondary flex w-full items-center text-left transition-colors"
              >
                <FolderOpen className="icon-sm shrink-0" />
                From library
              </button>
            </div>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleUploadFile(file)
          e.target.value = ''
        }}
      />
      <div className="card-glass rounded-spacing-2 p-spacing-4 border-border border border-dashed">
        {!value ? (
          <div
            className={`gap-spacing-2 py-spacing-4 flex flex-col items-center justify-center text-center ${isDragging ? 'ring-primary/40 rounded-spacing-2 ring-2' : ''}`}
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dragDepth.current += 1
              setIsDragging(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dragDepth.current -= 1
              if (dragDepth.current <= 0) {
                dragDepth.current = 0
                setIsDragging(false)
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              dragDepth.current = 0
              setIsDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) void handleUploadFile(file)
            }}
          >
            <ImagePlus className="text-muted-foreground h-10 w-10 sm:h-12 sm:w-12" />
            <p className="body-3 text-foreground font-medium">No image</p>
            <p className="typo-caption px-spacing-2 text-muted-foreground">
              Drop an image or use the menu for upload, theme, or library.
            </p>
          </div>
        ) : (
          <div className="gap-spacing-3 py-spacing-2 flex flex-col items-center sm:flex-row sm:items-start">
            <div
              className={`rounded-spacing-1 border-border bg-background flex shrink-0 items-center justify-center overflow-hidden border ${previewBoxClass}`}
            >
              <img src={value} alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="body-3 mb-spacing-1 text-foreground font-medium">Image set</p>
              <p className="typo-caption mb-spacing-2 text-muted-foreground break-all font-mono">
                {value}
              </p>
              <button
                type="button"
                onClick={() => onChange('')}
                className="button-glass-destructive rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
