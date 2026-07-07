'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ChevronDown, Cloud, HardDrive, ImageIcon, Link, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import type { MediaAsset } from '@/lib/services/media-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

const ADD_MENU_ITEM =
  'body-4 flex w-full items-center gap-2 px-3 py-2 text-left text-foreground transition-colors hover:bg-white/10'

const ADD_TRIGGER_BASE =
  'body-4 inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-border bg-surface-subtle px-2 py-1.5 text-white transition-colors sm:px-2.5'

function isImageAsset(a: MediaAsset): boolean {
  if (a.mime_type?.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(a.original_filename || a.name || '')
}

function isImageFile(f: File): boolean {
  return f.type.startsWith('image/')
}

/** Renders the “Add image” menu into this node so it stays inside the modal layer (Radix sets body pointer-events: none). */
export const WidgetBuilderImageFieldMenuPortalContext = createContext<HTMLElement | null>(null)

export function WidgetBuilderImageField({
  label,
  hint,
  value,
  onChange,
  campaignId,
  variant = 'default',
}: {
  label: string
  /** Short line under the title row explaining where this image is used */
  hint?: string
  value: string | null | undefined
  onChange: (url: string | null) => void
  /** Optional — scopes media library when set */
  campaignId?: string
  /**
   * `logo` — empty: label + Add only. With image: label + preview; hover on preview shows
   * remove (X) and an image icon that opens the add menu (no empty placeholder box).
   */
  variant?: 'default' | 'logo'
}) {
  const { upload: presignedUpload } = usePresignedUpload()
  const menuPortalContainer = useContext(WidgetBuilderImageFieldMenuPortalContext)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const [driveOpen, setDriveOpen] = useState(false)
  const [dropboxOpen, setDropboxOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [urlDialogOpen, setUrlDialogOpen] = useState(false)

  const applyUploadResult = useCallback(
    (url: string | null | undefined) => {
      if (url) onChange(url)
      else toast.error('Could not get a public URL for this file')
    },
    [onChange],
  )

  const uploadImageFile = useCallback(
    async (file: File) => {
      if (!isImageFile(file)) {
        toast.error('Please choose an image file')
        return
      }
      setUploading(true)
      try {
        const res = await presignedUpload({
          file,
          name: file.name,
          category: 'upload',
          aiAnalysis: false,
        })
        const url = res.url || res.asset?.public_url
        applyUploadResult(url ?? null)
      } catch (e) {
        toast.error(sanitizeUserError(e, 'Upload failed'))
      } finally {
        setUploading(false)
      }
    },
    [presignedUpload, applyUploadResult],
  )

  const handleCloudFile = useCallback(
    async (file: File) => {
      void uploadImageFile(file)
    },
    [uploadImageFile],
  )

  const openAddMenu = useCallback(() => {
    const r = addBtnRef.current?.getBoundingClientRect()
    if (r && typeof window !== 'undefined') {
      const w = 220
      setMenuPos({
        top: r.bottom + 4,
        left: Math.min(r.left, window.innerWidth - w - 8),
      })
    }
    setAddMenuOpen(true)
  }, [])

  useEffect(() => {
    if (!addMenuOpen) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (addBtnRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setAddMenuOpen(false)
    }
    const id = window.setTimeout(() => document.addEventListener('mousedown', close, true), 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', close, true)
    }
  }, [addMenuOpen])

  const url = (value && value.trim()) || ''
  const showPreview = Boolean(url)
  const isLogo = variant === 'logo'

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) void uploadImageFile(file)
        e.target.value = ''
      }}
    />
  )

  return (
    <div
      className="w-full"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) void uploadImageFile(file)
      }}
      onPaste={(e) => {
        const file = e.clipboardData.files[0]
        if (file) void uploadImageFile(file)
      }}
    >
      {isLogo && !showPreview && (
        <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
          <p
            className="body-4 min-w-0 flex-1 pr-1 text-muted-foreground"
            title={hint ? `${label}. ${hint}` : label}
          >
            {label}
          </p>
          {fileInput}
          <button
            ref={addBtnRef}
            type="button"
            onClick={() => (addMenuOpen ? setAddMenuOpen(false) : openAddMenu())}
            className={`${ADD_TRIGGER_BASE} hover:bg-white/[0.08]`}
          >
            Add
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
        </div>
      )}

      {isLogo && showPreview && (
        <div className="flex w-full min-w-0 items-start gap-2 sm:gap-3">
          <p
            className="body-4 min-w-0 flex-1 pr-1 pt-0.5 text-muted-foreground"
            title={hint ? `${label}. ${hint}` : label}
          >
            {label}
          </p>
          <div className="border-border group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black/30">
            <img src={url} alt="" className="h-full w-full object-cover" />
            <div
              className="absolute inset-0 z-10 flex flex-col justify-between p-0.5 opacity-100 transition-opacity duration-150 sm:pointer-events-none sm:opacity-0 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  className={`${ADD_TRIGGER_BASE} hover:bg-red-500/90 sm:focus-visible:opacity-100`}
                  title="Remove image"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onChange(null)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex justify-start">
                <button
                  ref={addBtnRef}
                  type="button"
                  title="Change image"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (addMenuOpen) setAddMenuOpen(false)
                    else openAddMenu()
                  }}
                  className={`${ADD_TRIGGER_BASE} hover:bg-white/[0.08]`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {uploading && (
              <div className="bg-background/60 absolute inset-0 z-[15] flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </div>
          {fileInput}
        </div>
      )}

      {!isLogo && (
        <div className="flex w-full min-w-0 items-start gap-2 sm:gap-3">
          <p
            className="body-4 min-w-0 flex-1 pr-1 pt-0.5 text-muted-foreground"
            title={hint ? `${label}. ${hint}` : label}
          >
            {label}
          </p>

          <div
            className={`border-border group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border transition-colors ${
              showPreview
                ? 'border-white/20 bg-black/30'
                : `cursor-pointer border-dashed ${
                    dragOver ? 'border-white/40 bg-surface-subtle' : 'border-white/15 bg-black/30'
                  }`
            }`}
            onClick={!showPreview ? () => fileInputRef.current?.click() : undefined}
            role="presentation"
            title={
              !showPreview ? (hint ? hint : 'Drop, paste, or click') : 'Click image to replace'
            }
          >
            {showPreview ? (
              <>
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 z-10 rounded bg-black/60 p-0.5 text-white/90 opacity-100 shadow-sm transition-opacity duration-150 hover:bg-red-500/90 hover:text-white sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                  title="Remove image"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="h-full w-full p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}
                  title="Replace image"
                >
                  <img
                    src={url}
                    alt=""
                    className="pointer-events-none h-full w-full object-cover"
                  />
                </button>
              </>
            ) : (
              <div className="flex h-full w-full cursor-pointer items-center justify-center p-1 text-white/30">
                <ImageIcon className="h-6 w-6 shrink-0" />
              </div>
            )}
            {uploading && (
              <div className="bg-background/60 absolute inset-0 z-[5] flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </div>

          {fileInput}

          <div className="flex min-w-0 shrink-0 flex-col items-end self-stretch">
            <button
              ref={addBtnRef}
              type="button"
              onClick={() => (addMenuOpen ? setAddMenuOpen(false) : openAddMenu())}
              className={`${ADD_TRIGGER_BASE} hover:bg-white/[0.08]`}
            >
              Add
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
          </div>
        </div>
      )}

      {addMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            data-widget-modal-portal
            className="dropdown-menu-solid pointer-events-auto fixed z-[100002] w-[220px] overflow-hidden rounded-xl py-1 shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CloudAttachMenuItems
              onLocalUpload={() => fileInputRef.current?.click()}
              onDrive={() => {
                setDriveOpen(true)
                setAddMenuOpen(false)
              }}
              onDropbox={() => {
                setDropboxOpen(true)
                setAddMenuOpen(false)
              }}
              onUrl={() => {
                setUrlDialogOpen(true)
                setAddMenuOpen(false)
              }}
              onSelect={() => setAddMenuOpen(false)}
              localLabel="Upload from device"
              driveLabel="Google Drive"
              dropboxLabel="Dropbox"
              urlLabel="Image URL"
              localIcon={<Upload className="h-4 w-4 shrink-0 opacity-80" />}
              driveIcon={<HardDrive className="h-4 w-4 shrink-0 opacity-80" />}
              dropboxIcon={<Cloud className="h-4 w-4 shrink-0 opacity-80" />}
              urlIcon={<Link className="h-4 w-4 shrink-0 opacity-80" />}
              itemClassName={ADD_MENU_ITEM}
            />
            <button
              type="button"
              onClick={() => {
                setLibraryOpen(true)
                setAddMenuOpen(false)
              }}
              className={ADD_MENU_ITEM}
            >
              <ImageIcon className="h-4 w-4 shrink-0 opacity-80" />
              Library
            </button>
          </div>,
          menuPortalContainer ?? document.body,
        )}

      <DriveFileBrowserModal
        open={driveOpen}
        onClose={() => setDriveOpen(false)}
        context="chat"
        onSelectFileForChat={handleCloudFile}
      />
      <DropboxFileBrowserModal
        open={dropboxOpen}
        onClose={() => setDropboxOpen(false)}
        context="chat"
        onSelectFileForChat={handleCloudFile}
      />
      <MediaPickerModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={() => {}}
        onSelectAsset={(asset) => {
          if (!isImageAsset(asset) || !asset.public_url) {
            toast.error('Choose an image from the library')
            return
          }
          onChange(asset.public_url)
        }}
        campaignId={campaignId}
      />

      <WidgetImageUrlDialog
        open={urlDialogOpen}
        onClose={() => setUrlDialogOpen(false)}
        onApply={(u) => {
          onChange(u)
          setUrlDialogOpen(false)
        }}
      />
    </div>
  )
}

function WidgetImageUrlDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean
  onClose: () => void
  onApply: (url: string) => void
}) {
  const [raw, setRaw] = useState('')
  const [previewErr, setPreviewErr] = useState(false)
  const [previewOk, setPreviewOk] = useState(false)

  useEffect(() => {
    if (open) {
      setRaw('')
      setPreviewErr(false)
      setPreviewOk(false)
    }
  }, [open])

  const trimmed = raw.trim()
  const isHttp = /^https?:\/\/.+/i.test(trimmed)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 sm:p-spacing-4 fixed inset-0 flex items-center justify-center p-4"
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('[data-widget-modal-portal]')) e.preventDefault()
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Image URL</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div
            data-widget-modal-portal
            className="surface-card border-border w-full max-w-md overflow-hidden rounded-xl border p-5 shadow-xl"
          >
            <p className="body-3 text-foreground mb-1 font-medium">Image URL</p>
            <p className="body-4 text-muted-foreground mb-3">
              Paste a direct link to an image (https). It will be used as-is in the widget.
            </p>
            <input
              type="url"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value)
                setPreviewErr(false)
                setPreviewOk(false)
              }}
              placeholder="https://…"
              className="body-3 mb-3 w-full rounded-lg border border-border bg-surface-subtle px-3 py-2 text-foreground outline-none placeholder:text-white/30"
              autoFocus
            />
            <div className="relative mb-4 flex min-h-[120px] w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-black/30">
              {!isHttp && (
                <p className="body-4 px-2 text-center text-white/40">Enter a URL to preview</p>
              )}
              {isHttp && previewErr && (
                <p className="body-4 px-2 text-center text-red-300/90">Could not load image</p>
              )}
              {isHttp && !previewErr && (
                <>
                  {!previewOk && (
                    <Loader2 className="absolute h-6 w-6 animate-spin text-white/40" />
                  )}
                  {/* User-supplied image URL; not optimizable with next/image without host allowlist */}
                  <img
                    src={trimmed}
                    alt=""
                    className={`max-h-[160px] max-w-full object-contain ${previewOk ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setPreviewOk(true)}
                    onError={() => {
                      setPreviewErr(true)
                      setPreviewOk(false)
                    }}
                  />
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="body-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isHttp || !previewOk || previewErr}
                onClick={() => onApply(trimmed)}
                className="body-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white disabled:opacity-40"
              >
                Use image
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
