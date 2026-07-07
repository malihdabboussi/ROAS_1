'use client'

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ChevronDown, FolderOpen, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

export function TrainingAddPane({
  onStageText,
  onStageLink,
  onPickFile,
  onOpenMediaLibrary,
}: {
  onStageText: (title: string, body: string) => boolean
  onStageLink: (url: string) => boolean
  onPickFile: (file: File) => void
  onOpenMediaLibrary: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadMenuRef = useRef<HTMLDivElement>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false)

  useEffect(() => {
    if (!uploadMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (!uploadMenuRef.current?.contains(e.target as Node)) {
        setUploadMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [uploadMenuOpen])

  const lines = content.split(/\r?\n/)
  const urlLines = lines.map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l))
  const nonUrlText = lines
    .filter((l) => !/^https?:\/\//i.test(l.trim()))
    .join('\n')
    .trim()
  const hasText = nonUrlText.length > 0
  const computedTitle = title.trim() || nonUrlText.split('\n')[0]?.slice(0, 80).trim() || ''
  const canSubmit = urlLines.length > 0 || (hasText && computedTitle.length > 0)

  const submit = () => {
    let linksStaged = 0
    let linksSkipped = 0
    urlLines.forEach((u) => {
      if (onStageLink(u)) linksStaged += 1
      else linksSkipped += 1
    })
    if (linksStaged > 0) {
      toast.success(`${linksStaged} link${linksStaged === 1 ? '' : 's'} staged.`)
    }
    if (linksSkipped > 0) {
      toast.info(`Skipped ${linksSkipped} duplicate link${linksSkipped === 1 ? '' : 's'}.`)
    }
    if (hasText && computedTitle) {
      const added = onStageText(computedTitle, nonUrlText)
      if (added) toast.success('Text note staged.')
      else toast.info('Text note already in staging.')
    }
    setContent('')
    setTitle('')
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(onPickFile)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="gap-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            'rounded-spacing-2 border-border surface-bg group relative flex min-h-0 flex-1 flex-col border transition-colors',
            dragOver && 'border-primary bg-primary/5',
          )}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <textarea
            placeholder={'Paste text, links, or notes here...\n\nYou can drop files in too.'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="px-spacing-3 py-spacing-2 body-3 placeholder:text-muted-foreground text-foreground min-h-0 w-full flex-1 resize-none bg-transparent outline-none"
          />
          {urlLines.length === 0 && !hasText ? (
            <div className="border-border bg-secondary px-spacing-3 py-spacing-2 shrink-0 border-t">
              <p className="typo-caption text-muted-foreground">
                URLs auto-stage as links. Everything else becomes a text note.
              </p>
            </div>
          ) : null}
          <div
            ref={uploadMenuRef}
            className={cn(
              'absolute right-2 top-2 transition-all duration-200 ease-out',
              uploadMenuOpen
                ? 'pointer-events-auto translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-2 opacity-0 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
            )}
          >
            <button
              type="button"
              onClick={() => setUploadMenuOpen((v) => !v)}
              className="chip-glass-neutral body-4 text-foreground hover:bg-hover-subtle gap-spacing-1 rounded-spacing-2 px-spacing-2 h-spacing-7 flex items-center font-medium"
            >
              <Upload className="icon-sm shrink-0" />
              Upload
              <ChevronDown className="icon-xs shrink-0" />
            </button>
            {uploadMenuOpen ? (
              <div className="surface-card card-elevated border-border rounded-spacing-2 mt-spacing-1 absolute right-0 top-full z-10 min-w-[180px] border p-1">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMenuOpen(false)
                    inputRef.current?.click()
                  }}
                  className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-full items-center text-left"
                >
                  <Upload className="icon-md shrink-0" />
                  Browse files
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMenuOpen(false)
                    onOpenMediaLibrary()
                  }}
                  className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-1 px-spacing-2 py-spacing-1 flex w-full items-center text-left"
                >
                  <FolderOpen className="icon-md shrink-0" />
                  Media Library
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {hasText ? (
          <input
            type="text"
            placeholder={`Title (optional, defaults to: ${computedTitle || 'first line'})`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full shrink-0 border"
          />
        ) : null}
        {urlLines.length > 0 || hasText ? (
          <div className="typo-caption text-muted-foreground gap-spacing-2 flex shrink-0 flex-wrap items-center">
            {urlLines.length > 0 ? (
              <span>
                {urlLines.length} link{urlLines.length === 1 ? '' : 's'} detected
              </span>
            ) : null}
            {urlLines.length > 0 && hasText ? <span>·</span> : null}
            {hasText ? <span>Text note will be staged</span> : null}
          </div>
        ) : null}
      </div>
      <div className="py-spacing-2 shrink-0">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="button-glass-accent body-3 py-spacing-2 gap-spacing-2 flex w-full shrink-0 items-center justify-center rounded-spacing-2 font-medium disabled:opacity-40"
        >
          <Plus className="icon-xs" /> Add to staging
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".txt,.md,.skill,.csv,.json,.xml,.yaml,.yml,.pdf,.docx,.doc,.pptx,.xls,.xlsx,.xlsm,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.mp3,.wav,.mp4,.mov"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(e.target.files ?? [])
          files.forEach(onPickFile)
          e.target.value = ''
        }}
      />
    </div>
  )
}
