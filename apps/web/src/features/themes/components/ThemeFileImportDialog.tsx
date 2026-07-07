'use client'

import { useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { FileText, Upload, X } from 'lucide-react'
import type { UserThemeColors } from '@/features/themes/types'
import { backendUpload } from '@/lib/api/backend-client'
import { THEME_ERRORS } from '../config/theme-errors.config'
import { THEME_MESSAGES } from '../config/theme-messages.config'

const ACCEPT_TYPES = '.pdf,.skill,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx'

interface ThemeFileImportDialogProps {
  open: boolean
  onClose: () => void
  onImport: (data: {
    colors: UserThemeColors
    fontHeading: string | null
    fontBody: string | null
    suggestedName: string
    logoUrl: string | null
  }) => void
}

type ImportState = 'input' | 'extracting' | 'preview'

export function ThemeFileImportDialog({ open, onClose, onImport }: ThemeFileImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<ImportState>('input')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [extractedData, setExtractedData] = useState<{
    colors: UserThemeColors
    fontHeading: string | null
    fontBody: string | null
    suggestedName: string
    logoUrl: string | null
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx']
    if (!ext || !allowed.includes(ext)) {
      setError(THEME_ERRORS.FILE_TYPE_INVALID.userMessage)
      return
    }
    setFile(selectedFile)
    setError(null)
  }

  const handleExtract = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }
    setState('extracting')
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await backendUpload<{
        success: boolean
        data?: {
          colors: UserThemeColors
          fontHeading: string | null
          fontBody: string | null
          suggestedName: string
          logoUrl: string | null
        }
        error?: string
      }>('/themes/extract/file', formData)
      if (!result.success) {
        throw new Error(
          (result as { error?: string }).error || 'Failed to extract colors from file',
        )
      }
      const data = (result as { data?: typeof extractedData }).data
      setExtractedData(data ?? null)
      setState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract colors from file')
      setState('input')
    }
  }

  const handleApply = () => {
    if (extractedData) {
      onImport(extractedData)
      onClose()
      setFile(null)
      setState('input')
      setExtractedData(null)
    }
  }

  const handleCancel = () => {
    onClose()
    setFile(null)
    setState('input')
    setExtractedData(null)
    setError(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  if (!open) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100004] bg-modal-overlay" />
        <DialogPrimitive.Content className="p-spacing-4 fixed inset-0 z-[100005] flex items-center justify-center overflow-hidden">
          <div className="surface-card rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-[var(--color-border)]">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-icon-bare btn-close-absolute right-spacing-2 top-spacing-2 absolute"
            >
              <X className="h-4 w-4" />
            </button>
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>
                {THEME_MESSAGES.IMPORT_FILE_TITLE.message}
              </DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="px-spacing-6 py-spacing-4 flex-1 overflow-y-auto">
              {state === 'input' && (
                <div className="space-y-spacing-6">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-spacing-3 p-spacing-8 cursor-pointer border-2 border-dashed text-center transition-all ${
                      isDragging
                        ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]'
                        : 'hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-muted)]/30 border-[var(--color-border)]'
                    }`}
                  >
                    {file ? (
                      <div className="space-y-spacing-3">
                        <FileText className="mx-auto h-12 w-12 text-[var(--color-primary)]" />
                        <div>
                          <p className="body-2 font-medium text-[var(--color-foreground)]">
                            {file.name}
                          </p>
                          <p className="typo-caption text-[var(--color-muted-foreground)]">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFile(null)
                            setError(null)
                          }}
                          className="button-glass-neutral px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 font-medium"
                        >
                          Choose Different File
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-spacing-3">
                        <Upload className="mx-auto h-12 w-12 text-[var(--color-muted-foreground)]" />
                        <div>
                          <p className="body-2 mb-spacing-2 font-medium text-[var(--color-foreground)]">
                            Drop a file here or click to browse
                          </p>
                          <p className="typo-caption text-[var(--color-muted-foreground)]">
                            PDF, image, or doc
                          </p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_TYPES}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileSelect(f)
                      }}
                      className="hidden"
                    />
                  </div>
                  {error && (
                    <div className="rounded-spacing-2 border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/10 p-spacing-4 border">
                      <p className="body-3 text-[var(--color-destructive)]">{error}</p>
                    </div>
                  )}
                  <div className="gap-spacing-3 flex">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="button-glass-neutral px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium"
                    >
                      {THEME_MESSAGES.BUTTON_CANCEL.message}
                    </button>
                    <button
                      type="button"
                      onClick={handleExtract}
                      disabled={!file}
                      className="button-glass-accent px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium disabled:opacity-50"
                    >
                      {THEME_MESSAGES.BUTTON_EXTRACT.message}
                    </button>
                  </div>
                </div>
              )}
              {state === 'extracting' && (
                <div className="py-spacing-12 text-center">
                  <div className="mb-spacing-4 mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                  <p className="body-2 text-[var(--color-muted-foreground)]">
                    Extracting branding from file...
                  </p>
                </div>
              )}
              {state === 'preview' && extractedData && (
                <div className="space-y-spacing-6">
                  <div>
                    <h3 className="body-1 mb-spacing-4 font-semibold text-[var(--color-foreground)]">
                      {THEME_MESSAGES.PREVIEW_TITLE.message}
                    </h3>
                    <div className="space-y-spacing-4">
                      <div>
                        <p className="body-3 mb-spacing-2 font-medium text-[var(--color-muted-foreground)]">
                          {THEME_MESSAGES.PREVIEW_SECTION_PRIMARY.message}
                        </p>
                        <div className="gap-spacing-2 grid grid-cols-4">
                          {[
                            { key: 'primary', label: 'Primary' },
                            { key: 'secondaryAccent1', label: 'Accent 1' },
                            { key: 'secondaryAccent2', label: 'Accent 2' },
                            { key: 'heading', label: 'Heading' },
                          ].map(({ key, label }) => (
                            <div key={key} className="gap-spacing-1 flex flex-col items-center">
                              <div
                                className="rounded-spacing-2 h-16 w-full border border-[var(--color-border)]"
                                style={{
                                  background: (
                                    extractedData.colors as unknown as Record<string, string>
                                  )[key],
                                }}
                              />
                              <span className="typo-caption text-[var(--color-muted-foreground)]">
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="body-3 mb-spacing-2 font-medium text-[var(--color-muted-foreground)]">
                          {THEME_MESSAGES.PREVIEW_SUGGESTED_NAME.message}
                        </p>
                        <p className="body-2 text-[var(--color-foreground)]">
                          {extractedData.suggestedName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="gap-spacing-3 flex">
                    <button
                      type="button"
                      onClick={() => {
                        setState('input')
                        setExtractedData(null)
                        setFile(null)
                      }}
                      className="button-glass-neutral px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium"
                    >
                      {THEME_MESSAGES.BUTTON_TRY_ANOTHER.message}
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="button-glass-accent px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium"
                    >
                      {THEME_MESSAGES.BUTTON_APPLY_THEME.message}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
