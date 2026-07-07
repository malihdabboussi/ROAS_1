'use client'

import { useCallback, useRef, useState, type RefObject } from 'react'
import {
  ChevronDown,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Plus,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { Tooltip } from '@/components/ui/tooltip'
import { extractDocumentText } from '@/features/brain/services/sk.service'
import {
  detectBrainUploadKind,
  isExtractableBrainUploadKind,
} from '@/features/brain/utils/upload-validation'
import type { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { presignPutUploadFile } from '@/lib/media/presigned-client-upload'
import { cn } from '@/lib/utils/cn'
import { useSpacesStore } from '../../store/use-spaces-store'

export type DocsAddDocMenuProps = {
  open: boolean
  setOpen: (v: boolean) => void
  rootRef: RefObject<HTMLDivElement | null>
  docsCloud: ReturnType<typeof useCloudAttach>
  createItem: (title: string, extras?: Record<string, unknown>) => Promise<unknown>
  campaignId?: string | null
  trigger?: 'button' | 'none'
  align?: 'left' | 'right'
  fixedPosition?: { top: number; left: number } | null
  renderCloudModals?: boolean
}

const DOC_UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,.md,.markdown,.txt,.csv,.tsv,.json,.xml,.yaml,.yml,.xls,.xlsx,.xlsm,.ppt,.pptx,image/*,text/*'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function plainTextToDocBody(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  return trimmed
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function resolveDocUploadType(file: File): string {
  const kind = detectBrainUploadKind(file)
  if (kind === 'pdf') return 'pdf'
  if (kind === 'image') return 'image'
  if (/\.(md|markdown)$/i.test(file.name)) return 'markdown'
  if (/\.(txt|csv|tsv|json|xml|ya?ml)$/i.test(file.name) || file.type.startsWith('text/'))
    return 'text'
  if (kind === 'document') return 'document'
  return 'upload'
}

function isSupportedDocUpload(file: File): boolean {
  const kind = detectBrainUploadKind(file)
  if (kind === 'audio' || kind === 'video') return false
  if (kind !== 'unsupported') return true
  return /\.(xls|xlsx|xlsm|ppt|pptx)$/i.test(file.name)
}

function docTitleFromFileName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'Untitled'
  return trimmed.replace(/\.[^.]+$/, '') || trimmed
}

export function DocsAddDocMenu({
  open,
  setOpen,
  rootRef,
  docsCloud,
  createItem,
  campaignId,
  trigger = 'button',
  align = 'right',
  fixedPosition = null,
  renderCloudModals = true,
}: DocsAddDocMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)

  const handleLocalUploadClick = useCallback(() => {
    if (uploading) return
    setOpen(false)
    fileInputRef.current?.click()
  }, [setOpen, uploading])

  const handleFilesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || uploading) return
      setUploading(true)
      let uploaded = 0
      try {
        for (const file of Array.from(files)) {
          const kind = detectBrainUploadKind(file)
          if (!isSupportedDocUpload(file)) {
            toast.error(`Unsupported file type: ${file.name}`)
            continue
          }

          const confirmed = await presignPutUploadFile({
            file,
            category: 'upload',
            name: file.name,
            ...(campaignId ? { campaign_id: campaignId } : {}),
            ...(activeSpaceId ? { space_id: activeSpaceId } : {}),
          })
          const fileUrl = confirmed.url || confirmed.asset?.public_url
          if (!fileUrl) throw new Error('Upload failed')

          let docBody: string | null = null
          if (isExtractableBrainUploadKind(kind)) {
            try {
              const text = await extractDocumentText(file, { fileUrl })
              docBody = plainTextToDocBody(text)
            } catch {
              docBody = null
            }
          } else if (kind === 'text') {
            docBody = plainTextToDocBody(await file.text())
          } else if (file.type.startsWith('image/')) {
            docBody = `<p><img src="${fileUrl}" alt="${escapeHtml(docTitleFromFileName(file.name))}" /></p>`
          }

          await createItem(docTitleFromFileName(file.name), {
            doc_body: docBody,
            custom_data: {
              _view_type: 'doc',
              _doc_source: 'space',
              _doc_type: resolveDocUploadType(file),
              _doc_file_url: fileUrl,
              _doc_file_name: file.name,
              _doc_mime_type: file.type || 'application/octet-stream',
            },
          })
          uploaded++
        }
        if (uploaded > 0) {
          toast.success(uploaded === 1 ? 'Document uploaded' : `${uploaded} documents uploaded`)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [activeSpaceId, campaignId, createItem, uploading],
  )

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={DOC_UPLOAD_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFilesSelected(e.target.files)
        }}
      />
      {trigger === 'button' ? (
        <Tooltip label="Add document" side="bottom">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              disabled={uploading}
              className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1 px-3 py-2 font-semibold transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 shrink-0" />
              )}
              Doc
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
          </span>
        </Tooltip>
      ) : null}
      {open && (
        <div
          className={cn(
            'dropdown-menu-solid z-dropdown mt-spacing-1 min-w-[13rem] rounded-spacing-2 py-spacing-1 shadow-lg',
            fixedPosition ? 'fixed' : 'absolute top-full',
            !fixedPosition && align === 'left' ? 'left-0' : null,
            !fixedPosition && align === 'right' ? 'right-0' : null,
          )}
          style={fixedPosition ? fixedPosition : undefined}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
            onClick={() => {
              setOpen(false)
              void createItem('New doc', { custom_data: { _view_type: 'doc' } })
            }}
          >
            <FileText className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            New draft
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
            onClick={() => {
              setOpen(false)
              void createItem('New visual doc', {
                custom_data: {
                  _view_type: 'doc',
                  _doc_visual_default_mode: 'visual',
                  _doc_visual_status: 'none',
                },
              })
            }}
          >
            <ImageIcon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
            New visual doc
          </button>
          <div className="my-1 h-px bg-[var(--color-border)]" />
          <CloudAttachMenuItems
            onLocalUpload={handleLocalUploadClick}
            onDrive={() => {
              setOpen(false)
              docsCloud.openDrive()
            }}
            onDropbox={() => {
              setOpen(false)
              docsCloud.openDropbox()
            }}
            localLabel={uploading ? 'Uploading…' : 'Upload file'}
            driveLabel="Google Drive"
            dropboxLabel="Dropbox"
            localIcon={
              uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-muted-foreground)]" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              )
            }
            driveIcon={<HardDrive className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />}
            dropboxIcon={<Cloud className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />}
            itemClassName="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]"
          />
        </div>
      )}
      {renderCloudModals ? (
        <>
          <DriveFileBrowserModal
            open={docsCloud.showDrivePicker}
            onClose={() => docsCloud.setShowDrivePicker(false)}
            onSelectDriveFile={(file) => {
              docsCloud.setShowDrivePicker(false)
              void createItem(file.name || 'Drive document', {
                custom_data: { _view_type: 'doc', source_type: 'drive', drive_file_id: file.id },
              })
              toast.success('Document added from Drive')
            }}
          />
          <DropboxFileBrowserModal
            open={docsCloud.showDropboxPicker}
            onClose={() => docsCloud.setShowDropboxPicker(false)}
            onSelectFileForChat={(file) => {
              docsCloud.setShowDropboxPicker(false)
              void createItem(file.name || 'Dropbox document', {
                custom_data: { _view_type: 'doc', source_type: 'dropbox' },
              })
              toast.success('Document added from Dropbox')
            }}
          />
        </>
      ) : null}
    </div>
  )
}
