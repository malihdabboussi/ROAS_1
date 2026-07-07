'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Cloud,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  ImageIcon,
  Images,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  isMediaLibrarySupportedUploadFile,
  MEDIA_LIBRARY_FILE_INPUT_ACCEPT,
} from '@/components/media/drive-file-browser-modal.constants'
import type { MediaSource } from '@/components/media/media-picker-modal.types'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { Tooltip } from '@/components/ui/tooltip'
import { backendUpload } from '@/lib/api/backend-client'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import type { MediaAsset } from '@/lib/services/media-api'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { BaseCellProps } from './cell-types'

type MediaCellFile = {
  url: string
  name?: string
  mime_type?: string
  asset_type?: string
}

function filenameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop()
    return last ? decodeURIComponent(last) : 'Document'
  } catch {
    return url.split('/').filter(Boolean).pop() ?? 'Document'
  }
}

function assetToFile(asset: MediaAsset): MediaCellFile | null {
  const url = asset.public_url
  if (!url) return null
  return {
    url,
    name: asset.original_filename || asset.name || filenameFromUrl(url),
    mime_type: asset.mime_type,
    asset_type: asset.asset_type,
  }
}

function mediaFileFromRecord(record: Record<string, unknown>): MediaCellFile | null {
  const rawUrl = record.url ?? record.public_url ?? record.fileUrl
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return null
  const rawName = record.name ?? record.original_filename ?? record.filename
  const rawMime = record.mime_type ?? record.mimeType
  const rawType = record.asset_type ?? record.type
  return {
    url: rawUrl,
    name: typeof rawName === 'string' && rawName.length > 0 ? rawName : filenameFromUrl(rawUrl),
    mime_type: typeof rawMime === 'string' ? rawMime : undefined,
    asset_type: typeof rawType === 'string' ? rawType : undefined,
  }
}

function toFiles(value: unknown): MediaCellFile[] {
  if (typeof value === 'string' && value) return [{ url: value, name: filenameFromUrl(value) }]
  if (Array.isArray(value))
    return value
      .map((v) => {
        if (typeof v === 'string' && v.length > 0) {
          return { url: v, name: filenameFromUrl(v) }
        }
        if (v && typeof v === 'object') return mediaFileFromRecord(v as Record<string, unknown>)
        return null
      })
      .filter((v): v is MediaCellFile => v != null)
  return []
}

function isImageFile(file: MediaCellFile): boolean {
  if (file.mime_type?.startsWith('image/')) return true
  if (file.asset_type === 'image') return true
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?|#|$)/i.test(file.url)
}

async function downloadMediaFile(file: MediaCellFile) {
  const name = file.name || filenameFromUrl(file.url)
  const res = await fetch(file.url)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function MediaFileThumbReadonly({ file }: { file: MediaCellFile }) {
  const name = file.name || filenameFromUrl(file.url)
  if (isImageFile(file)) {
    return (
      <Tooltip label={name} side="top" wide>
        <img
          src={file.url}
          alt={name}
          className="h-spacing-7 rounded-spacing-1 w-7 shrink-0 object-cover"
        />
      </Tooltip>
    )
  }
  return (
    <Tooltip label={name} side="top" wide>
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="border-border bg-secondary text-muted-foreground hover:bg-hover-subtle hover:text-foreground h-spacing-7 rounded-spacing-1 flex w-7 shrink-0 items-center justify-center border transition-colors"
        aria-label={name}
      >
        <FileText className="icon-sm" />
      </a>
    </Tooltip>
  )
}

function MediaFileThumbButton({
  file,
  onClick,
}: {
  file: MediaCellFile
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const name = file.name || filenameFromUrl(file.url)
  return (
    <Tooltip label={name} side="top" wide>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onClick(e)
        }}
        className="h-spacing-7 rounded-spacing-1 hover:ring-border flex w-7 shrink-0 items-center justify-center transition-colors hover:ring-1"
        aria-label={`${name} options`}
      >
        {isImageFile(file) ? (
          <img src={file.url} alt="" className="h-spacing-7 rounded-spacing-1 w-7 object-cover" />
        ) : (
          <span className="border-border bg-secondary text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-full w-full items-center justify-center rounded-[inherit] border">
            <FileText className="icon-sm" />
          </span>
        )}
      </button>
    </Tooltip>
  )
}

export function MediaCell({ value, onChange, readonly, openOnMount }: BaseCellProps) {
  const files = toFiles(value)
  const [menuOpen, setMenuOpen] = useState(() => Boolean(openOnMount && !readonly))
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [fileMenuFile, setFileMenuFile] = useState<MediaCellFile | null>(null)
  const [fileMenuPos, setFileMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSource, setPickerSource] = useState<MediaSource>('library')
  const [uploading, setUploading] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const selectedAssetUrlRef = useRef<string | null>(null)
  const filesRef = useRef(files)

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    if (!menuOpen && !fileMenuFile) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-task-media-add-menu]')) return
      if (target?.closest('[data-task-media-file-menu]')) return
      if (triggerRef.current?.contains(target)) return
      setMenuOpen(false)
      setFileMenuFile(null)
      setFileMenuPos(null)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen, fileMenuFile])

  const appendFile = (file: MediaCellFile | null) => {
    if (!file) return
    const url = file.url.trim()
    const currentFiles = filesRef.current
    if (!url || currentFiles.some((entry) => entry.url === url)) return
    const next = [...currentFiles, { ...file, url }]
    filesRef.current = next
    onChange(next)
  }

  const appendUrl = (url: string) => {
    appendFile({ url, name: filenameFromUrl(url) })
  }

  const removeFile = (url: string) => {
    const next = filesRef.current.filter((entry) => entry.url !== url)
    filesRef.current = next
    onChange(next.length > 0 ? next : [])
    setFileMenuFile(null)
    setFileMenuPos(null)
  }

  const openFileMenu = (file: MediaCellFile, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setFileMenuPos({ top: rect.bottom + 4, left: rect.left })
    setFileMenuFile(file)
    setMenuOpen(false)
  }

  const attachFileToChat = (file: MediaCellFile) => {
    useSpacesStore.getState().setChatCollapsed(false)
    window.dispatchEvent(
      new CustomEvent('space-vibey:attach-file', {
        detail: {
          url: file.url,
          name: file.name || filenameFromUrl(file.url),
          mime_type: file.mime_type,
        },
      }),
    )
    setFileMenuFile(null)
    setFileMenuPos(null)
  }

  const openSource = (source: MediaSource) => {
    setPickerSource(source)
    setPickerOpen(true)
    setMenuOpen(false)
  }

  const uploadFile = async (file: File): Promise<MediaCellFile | null> => {
    if (!isMediaLibrarySupportedUploadFile(file)) {
      toast.error(MEDIA_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
      return null
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)
    formData.append('category', 'product')
    const result = await backendUpload<{
      success?: boolean
      asset?: MediaAsset
      url?: string
    }>('/api/media/upload', formData)
    return (
      (result.asset ? assetToFile(result.asset) : null) ??
      (result.url
        ? {
            url: result.url,
            name: file.name,
            mime_type: file.type || undefined,
            asset_type: file.type.startsWith('image/')
              ? 'image'
              : file.type.startsWith('video/')
                ? 'video'
                : 'document',
          }
        : null)
    )
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList) return
    const selectedFiles = Array.from(fileList)
    if (fileInputRef.current) fileInputRef.current.value = ''
    void (async () => {
      setUploading(true)
      try {
        const uploadedFiles: MediaCellFile[] = []
        for (const file of selectedFiles) {
          const uploadedFile = await uploadFile(file)
          const currentFiles = filesRef.current
          if (
            uploadedFile &&
            !currentFiles.some((entry) => entry.url === uploadedFile.url) &&
            !uploadedFiles.some((entry) => entry.url === uploadedFile.url)
          ) {
            uploadedFiles.push(uploadedFile)
          }
        }
        if (uploadedFiles.length > 0) {
          const next = [...filesRef.current, ...uploadedFiles]
          filesRef.current = next
          onChange(next)
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage,
        )
      } finally {
        setUploading(false)
      }
    })()
  }

  const toggleMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.left })
    setMenuOpen((open) => !open)
  }

  if (readonly) {
    if (files.length === 0) {
      return <ImageIcon className="icon-sm text-muted-foreground" />
    }
    return (
      <div className="flex items-center gap-1.5">
        {files.slice(0, 3).map((file, i) => (
          <MediaFileThumbReadonly key={`${file.url}-${i}`} file={file} />
        ))}
        {files.length > 3 && (
          <span className="typo-caption text-muted-foreground">+{files.length - 3}</span>
        )}
      </div>
    )
  }

  const addTriggerClass =
    files.length === 0
      ? 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle h-spacing-7 rounded-spacing-1 flex w-7 shrink-0 items-center justify-center transition-colors'
      : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle h-spacing-5 rounded-spacing-1 flex w-5 shrink-0 items-center justify-center transition-colors'

  return (
    <>
      <div className="gap-spacing-1 flex items-center">
        {files.length > 0 &&
          files
            .slice(0, 3)
            .map((file, i) => (
              <MediaFileThumbButton
                key={`${file.url}-${i}`}
                file={file}
                onClick={(e) => openFileMenu(file, e)}
              />
            ))}
        {files.length > 3 && (
          <span className="typo-caption text-muted-foreground">+{files.length - 3}</span>
        )}
        {uploading ? (
          <span
            className={
              files.length === 0
                ? 'text-muted-foreground h-spacing-7 flex w-7 shrink-0 items-center justify-center'
                : 'text-muted-foreground h-spacing-5 flex w-5 shrink-0 items-center justify-center'
            }
            aria-label="Uploading files"
            aria-live="polite"
          >
            <Loader2 className="icon-sm animate-spin" />
          </span>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            onClick={toggleMenu}
            className={addTriggerClass}
            aria-label={files.length === 0 ? 'Add files' : 'Add more files'}
          >
            {files.length === 0 ? <ImageIcon className="icon-sm" /> : <Plus className="icon-xs" />}
          </button>
        )}
      </div>

      {fileMenuFile &&
        fileMenuPos &&
        createPortal(
          <div
            data-task-media-file-menu
            className="dropdown-menu-solid z-dropdown rounded-spacing-2 py-spacing-1 fixed w-52"
            style={{ top: fileMenuPos.top, left: fileMenuPos.left }}
          >
            <button
              type="button"
              onClick={() => {
                window.open(fileMenuFile.url, '_blank', 'noopener,noreferrer')
                setFileMenuFile(null)
                setFileMenuPos(null)
              }}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left"
            >
              <ExternalLink className="icon-sm text-muted-foreground" />
              <span>Open in new tab</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void downloadMediaFile(fileMenuFile)
                setFileMenuFile(null)
                setFileMenuPos(null)
              }}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left"
            >
              <Download className="icon-sm text-muted-foreground" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={() => attachFileToChat(fileMenuFile)}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left"
            >
              <Link2 className="icon-sm text-muted-foreground" />
              <span>Attach to chat</span>
            </button>
            <button
              type="button"
              onClick={() => removeFile(fileMenuFile.url)}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-destructive hover:bg-hover-subtle flex w-full items-center text-left"
            >
              <Trash2 className="icon-sm" />
              <span>Remove</span>
            </button>
          </div>,
          document.body,
        )}

      {menuOpen &&
        menuPos &&
        createPortal(
          <div
            data-task-media-add-menu
            className="dropdown-menu-solid z-dropdown rounded-spacing-2 py-spacing-1 fixed w-56"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                fileInputRef.current?.click()
                setMenuOpen(false)
              }}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left disabled:pointer-events-none disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="icon-sm text-muted-foreground animate-spin" />
              ) : (
                <Upload className="icon-sm text-muted-foreground" />
              )}
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => openSource('google_drive')}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left"
            >
              <HardDrive className="icon-sm text-muted-foreground" />
              <span>Google Drive</span>
            </button>
            <button
              type="button"
              onClick={() => openSource('dropbox')}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left"
            >
              <Cloud className="icon-sm text-muted-foreground" />
              <span>Dropbox</span>
            </button>
            <button
              type="button"
              onClick={() => openSource('library')}
              className="gap-spacing-2 px-spacing-3 py-spacing-1 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left"
            >
              <Images className="icon-sm text-muted-foreground" />
              <span>Media library</span>
            </button>
          </div>,
          document.body,
        )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={MEDIA_LIBRARY_FILE_INPUT_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => {
          if (selectedAssetUrlRef.current === url) {
            selectedAssetUrlRef.current = null
            setPickerOpen(false)
            return
          }
          appendUrl(url)
          setPickerOpen(false)
        }}
        onSelectAsset={(asset) => {
          const file = assetToFile(asset)
          selectedAssetUrlRef.current = file?.url ?? null
          appendFile(file)
        }}
        onUploadedUrl={appendUrl}
        onUploadedAsset={(asset) => appendFile(assetToFile(asset))}
        initialMediaSource={pickerSource}
        keepOpenAfterImport
      />
    </>
  )
}
