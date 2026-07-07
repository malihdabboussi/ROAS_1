'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AvatarMenuTarget } from '@/lib/artifacts'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { fetchAvatar, updateAvatar } from '../../services/artifact-preview.service'
import type { Avatar } from '../../types'
import {
  avatarToText,
  downloadJSON,
  downloadMarkdown,
  sanitizeFilename,
} from '../../utils/artifact-export'
import { stampMadeWithVibeyFooterOnAllPages } from '../../utils/artifact-pdf-jspdf-footer'
import { ARTIFACT_HTML2PDF_PAGEBREAK } from '../../utils/artifact-pdf-shared'
import { buildAvatarPdfExportRoot } from '../../utils/avatar-pdf-export'
import { AvatarPreviewBody } from './AvatarPreviewBody'
import { AvatarPreviewToolbar } from './AvatarPreviewToolbar'
import { StudioAvatarMenuDropdown } from './StudioAvatarMenuDropdown'
import {
  clonePersona,
  newCustomFieldId,
  setPersonaPath,
  type CustomField,
  type JsonPath,
} from './avatar-preview-persona-types'

interface AvatarPreviewProps {
  avatarId: string
  hideToolbar?: boolean
  /** Deep-work Back (same row as title + actions). */
  toolbarLeading?: ReactNode
  /** Until `avatar.name` loads, show list selection label. */
  headerTitleFallback?: string
  toolbarTrailing?: ReactNode
  /** Spaces slide-over: `?artifact=` full view. */
  onOpenFullView?: () => void
  /** After kebab delete: host closes slide / clears selection. */
  onResourceDeleted?: () => void
  /** When API row omits `campaign_id`, duplicate/move use this campaign. */
  fallbackCampaignId?: string | null
}

export function AvatarPreview({
  avatarId,
  hideToolbar,
  toolbarLeading,
  headerTitleFallback,
  toolbarTrailing,
  onOpenFullView,
  onResourceDeleted,
  fallbackCampaignId = null,
}: AvatarPreviewProps) {
  const [avatar, setAvatar] = useState<Avatar | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPointer, setMenuPointer] = useState<{ x: number; y: number } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [draftPersonaData, setDraftPersonaData] = useState<Record<string, unknown>>({})
  const [draftName, setDraftName] = useState('')
  const [saving, setSaving] = useState(false)

  const loadAvatar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAvatar(await fetchAvatar(avatarId))
    } catch (err) {
      setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_AVATAR)
    } finally {
      setLoading(false)
    }
  }, [avatarId])

  useEffect(() => {
    void loadAvatar()
  }, [loadAvatar])

  useEffect(() => {
    setMenuOpen(false)
    setMenuPointer(null)
    setEditMode(false)
  }, [avatarId])

  const avatarMenuTarget: AvatarMenuTarget | null = avatar
    ? {
        id: avatar.id,
        name: avatar.name ?? null,
        campaign_id: avatar.campaign_id ?? fallbackCampaignId ?? null,
      }
    : null

  const onPersonaChange = useCallback((path: JsonPath, value: unknown) => {
    setDraftPersonaData((prev) => {
      const next = clonePersona(prev)
      setPersonaPath(next, path, value)
      return next
    })
  }, [])

  const onAddCustomField = useCallback(() => {
    setDraftPersonaData((prev) => {
      const next = clonePersona(prev)
      const list = Array.isArray(next.custom_fields) ? [...next.custom_fields] : []
      list.push({ id: newCustomFieldId(), label: '', value: '' })
      next.custom_fields = list
      return next
    })
  }, [])

  const onUpdateCustomField = useCallback(
    (index: number, patch: Partial<Pick<CustomField, 'label' | 'value'>>) => {
      setDraftPersonaData((prev) => {
        const next = clonePersona(prev)
        const list = Array.isArray(next.custom_fields) ? [...next.custom_fields] : []
        const current = (list[index] ?? {
          id: newCustomFieldId(),
          label: '',
          value: '',
        }) as CustomField
        list[index] = { ...current, ...patch }
        next.custom_fields = list
        return next
      })
    },
    [],
  )

  const onRemoveCustomField = useCallback((index: number) => {
    setDraftPersonaData((prev) => {
      const next = clonePersona(prev)
      if (!Array.isArray(next.custom_fields)) return next
      const list = [...next.custom_fields]
      list.splice(index, 1)
      next.custom_fields = list
      return next
    })
  }, [])

  const startEdit = useCallback(() => {
    if (!avatar) return
    setDraftPersonaData(clonePersona(avatar.persona_data as Record<string, unknown>))
    setDraftName(avatar.name ?? '')
    setEditMode(true)
  }, [avatar])

  const cancelEdit = useCallback(() => {
    setEditMode(false)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!avatar) return
    setSaving(true)
    try {
      const updated = await updateAvatar(avatar.id, {
        name: draftName.trim() || undefined,
        persona_data: draftPersonaData,
      })
      setAvatar(updated)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }, [avatar, draftName, draftPersonaData])

  const handleDownload = useCallback(
    (format: 'json' | 'md') => {
      if (!avatar) return
      try {
        const title = avatar.name || 'avatar'
        const filename =
          format === 'json'
            ? downloadJSON(avatar, title)
            : downloadMarkdown(avatarToText(avatar), title)
        console.log(`Downloaded ${filename}`)
        setDownloadMenuOpen(false)
      } catch (err) {
        console.error('Download failed:', err)
        toast.error(STUDIO_INLINE_ERRORS.DOWNLOAD_FAILED)
      }
    },
    [avatar],
  )

  const handleDownloadPDF = useCallback(async () => {
    if (!avatar) return
    setExporting(true)
    let cleanup: (() => void) | null = null
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const basename = sanitizeFilename(avatar.name ?? '', 'avatar')

      const PDF_MARGIN_MM: [number, number, number, number] = [12, 12, 18, 12]
      const PDF_CONTENT_WIDTH_MM = 210 - PDF_MARGIN_MM[1] - PDF_MARGIN_MM[3]

      const host = document.createElement('div')
      host.style.position = 'fixed'
      host.style.left = '-100000px'
      host.style.top = '0'
      host.style.width = `${PDF_CONTENT_WIDTH_MM}mm`
      host.style.opacity = '0'
      host.style.pointerEvents = 'none'
      host.setAttribute('aria-hidden', 'true')

      const { root: scopeNode, styles } = buildAvatarPdfExportRoot(avatar)

      const styleTag = document.createElement('style')
      styleTag.textContent = styles

      host.appendChild(styleTag)
      host.appendChild(scopeNode)
      document.body.appendChild(host)
      cleanup = () => {
        if (host.parentNode) host.parentNode.removeChild(host)
      }

      await new Promise((resolve) => setTimeout(resolve, 250))

      const opt = {
        margin: PDF_MARGIN_MM,
        filename: `${basename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        enableLinks: true,
        html2canvas: {
          scale: Math.max(2, Math.floor(window.devicePixelRatio || 1)),
          useCORS: true,
          backgroundColor: 'white',
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: {
          mode: [...ARTIFACT_HTML2PDF_PAGEBREAK.mode],
          avoid: [...ARTIFACT_HTML2PDF_PAGEBREAK.avoid],
        },
      }
      const worker = (html2pdf() as any).set(opt)['from'](scopeNode)
      await worker.toPdf()
      const pdf = await worker.get('pdf')
      stampMadeWithVibeyFooterOnAllPages(pdf)
      await worker.save()
      setDownloadMenuOpen(false)
    } catch (err) {
      console.error('PDF download failed:', err)
      toast.error(STUDIO_INLINE_ERRORS.DOWNLOAD_FAILED)
    } finally {
      if (cleanup) cleanup()
      setExporting(false)
    }
  }, [avatar])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="icon-md text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (error || !avatar) {
    return (
      <div className="gap-spacing-2 flex h-full flex-col items-center justify-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="body-2 text-foreground">
          {error ? 'Unable to load avatar' : 'Avatar not found'}
        </p>
        {error && <p className="body-3 text-muted-foreground">{error}</p>}
      </div>
    )
  }

  const pd = (editMode ? draftPersonaData : (avatar.persona_data ?? {})) as Record<string, unknown>

  return (
    <div
      className="flex h-full flex-col"
      onContextMenu={
        editMode
          ? undefined
          : !hideToolbar && avatarMenuTarget
            ? (event) => {
                event.preventDefault()
                setMenuPointer({ x: event.clientX, y: event.clientY })
                setMenuOpen(true)
              }
            : undefined
      }
    >
      {!hideToolbar && (
        <AvatarPreviewToolbar
          avatarName={avatar.name}
          headerTitleFallback={headerTitleFallback}
          editMode={editMode}
          draftName={draftName}
          setDraftName={setDraftName}
          saving={saving}
          exporting={exporting}
          downloadMenuOpen={downloadMenuOpen}
          setDownloadMenuOpen={setDownloadMenuOpen}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          setMenuPointer={setMenuPointer}
          menuButtonRef={menuButtonRef}
          toolbarLeading={toolbarLeading}
          toolbarTrailing={toolbarTrailing}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={() => void saveEdit()}
          onDownload={handleDownload}
          onDownloadPdf={() => void handleDownloadPDF()}
        />
      )}

      {!hideToolbar && menuOpen && avatarMenuTarget && !editMode ? (
        <StudioAvatarMenuDropdown
          avatar={avatarMenuTarget}
          anchorRef={menuButtonRef}
          pointerPosition={menuPointer}
          onClose={() => {
            setMenuOpen(false)
            setMenuPointer(null)
          }}
          onChanged={() => void loadAvatar()}
          onOpenFullView={
            onOpenFullView
              ? () => {
                  setMenuOpen(false)
                  setMenuPointer(null)
                  onOpenFullView()
                }
              : undefined
          }
          onDeleted={onResourceDeleted}
        />
      ) : null}

      <AvatarPreviewBody
        pd={pd}
        editMode={editMode}
        onPersonaChange={onPersonaChange}
        onAddCustomField={onAddCustomField}
        onUpdateCustomField={onUpdateCustomField}
        onRemoveCustomField={onRemoveCustomField}
      />
    </div>
  )
}
