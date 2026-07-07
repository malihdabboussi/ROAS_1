import { type ChangeEvent, useRef, useState } from 'react'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { THEME_ERRORS } from '../../config/theme-errors.config'
import type { ThemeImageEntry } from '../../types'

export interface ImageUploadCardProps {
  images: ThemeImageEntry[]
  onUpload?: (file: File, name: string, description: string) => Promise<void>
  onRemove?: (index: number) => void
  onUpdate?: (index: number, updates: { name?: string; description?: string }) => void
  isReadOnly?: boolean
  maxImages: number
  category: string
  emptyTitle: string
  acceptHint: string
}

export function ImageUploadCard({
  images,
  onUpload,
  onRemove,
  onUpdate,
  isReadOnly,
  maxImages,
  category,
  emptyTitle,
  acceptHint,
}: ImageUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [pendingDescription, setPendingDescription] = useState('')

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPendingName(file.name.replace(/\.[^.]+$/, ''))
    setPendingDescription('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleConfirmUpload = async () => {
    if (!pendingFile || !pendingName.trim()) return
    setIsUploading(true)
    try {
      await onUpload?.(pendingFile, pendingName.trim(), pendingDescription.trim())
      setPendingFile(null)
      setPendingName('')
      setPendingDescription('')
    } catch {
      toast.error(THEME_ERRORS.UPLOAD_FAILED.userMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancelUpload = () => {
    setPendingFile(null)
    setPendingName('')
    setPendingDescription('')
  }

  return (
    <div className="space-y-spacing-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isReadOnly}
      />

      {pendingFile && (
        <div className="card-glass rounded-spacing-2 p-spacing-4 border border-primary/30 space-y-spacing-3">
          <div className="gap-spacing-3 flex items-start">
            <div className="rounded-spacing-2 h-16 w-16 shrink-0 overflow-hidden border border-border">
              <img
                src={URL.createObjectURL(pendingFile)}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-spacing-2 min-w-0 flex-1">
              <input
                type="text"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                placeholder="Name this image..."
                className="input-glass body-3 w-full"
                autoFocus
              />
              <input
                type="text"
                value={pendingDescription}
                onChange={(e) => setPendingDescription(e.target.value)}
                placeholder="Short description (e.g., 'Front-facing, studio lighting')"
                className="input-glass body-3 w-full"
              />
            </div>
          </div>
          <div className="gap-spacing-2 flex justify-end">
            <button
              type="button"
              onClick={handleCancelUpload}
              className="button-compact button-glass-neutral"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmUpload}
              disabled={!pendingName.trim() || isUploading}
              className="button-compact button-glass-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <span className="relative z-10 flex items-center gap-spacing-1">
                  <Loader2 className="icon-sm animate-spin" /> Uploading...
                </span>
              ) : (
                <span className="relative z-10">Upload</span>
              )}
            </button>
          </div>
        </div>
      )}

      {images.map((img, index) => (
        <div
          key={img.asset_id}
          className="card-glass rounded-spacing-2 p-spacing-3 border border-border"
        >
          <div className="gap-spacing-3 flex items-start">
            <div className="rounded-spacing-2 h-14 w-14 shrink-0 overflow-hidden border border-border">
              <img src={img.url} alt={img.name} className="h-full w-full object-cover" />
            </div>
            <div className="space-y-spacing-1 min-w-0 flex-1">
              <input
                type="text"
                value={img.name}
                onChange={(e) => onUpdate?.(index, { name: e.target.value })}
                disabled={isReadOnly}
                className="body-3 w-full border-0 bg-transparent font-medium text-foreground focus:outline-none disabled:cursor-default"
              />
              <input
                type="text"
                value={img.description}
                onChange={(e) => onUpdate?.(index, { description: e.target.value })}
                disabled={isReadOnly}
                placeholder="Add a description..."
                className="typo-caption w-full border-0 bg-transparent text-muted-foreground focus:outline-none disabled:cursor-default"
              />
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => onRemove?.(index)}
                className="btn-icon-glass-destructive shrink-0"
                aria-label={`Remove ${img.name}`}
              >
                <Trash2 className="icon-sm" />
              </button>
            )}
          </div>
        </div>
      ))}

      {!isReadOnly &&
        images.length < maxImages &&
        !pendingFile &&
        (images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="card-glass rounded-spacing-2 p-spacing-6 hover:border-primary/50 flex w-full flex-col items-center border border-dashed border-border text-center transition-colors"
          >
            <Upload className="mb-spacing-2 h-spacing-10 w-spacing-10 text-muted-foreground" />
            <p className="body-3 font-medium text-foreground">{emptyTitle}</p>
            <p className="typo-caption mt-spacing-1 text-muted-foreground">{acceptHint}</p>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="gap-spacing-2 px-spacing-3 py-spacing-3 rounded-spacing-2 body-3 hover:border-primary/50 flex w-full items-center justify-center border border-dashed border-border font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="icon-md" />
            Add {category} ({images.length}/{maxImages})
          </button>
        ))}
    </div>
  )
}
