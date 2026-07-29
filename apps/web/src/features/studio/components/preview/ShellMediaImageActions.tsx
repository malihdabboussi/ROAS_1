'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, MessageSquare, PenLine } from 'lucide-react'
import {
  AspectRatioMenuOption,
  AspectRatioPickerGlyph,
  CHATGPT_STYLE_ASPECT_OPTIONS,
  type ChatGptStyleAspectRatio,
  type MediaImageEditController,
} from '@/components/media'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { cn } from '@/lib/utils/cn'

export async function downloadMediaTarget(target: ShellArtifactViewerTarget): Promise<void> {
  if (!target.fileUrl) return
  const response = await fetch(target.fileUrl)
  if (!response.ok) throw new Error('download failed')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = target.fileName || target.title || 'image'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function ShellMediaAspectRatioAction({ editor }: { editor: MediaImageEditController }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const changeAspectRatio = useCallback(
    (ratio: ChatGptStyleAspectRatio) => {
      if (!editor.supportedAspectRatios.includes(ratio)) return
      setOpen(false)
      editor.setAspectRatio(ratio)
      void editor.generate({
        aspectRatio: ratio,
        prompt:
          'Resize this image to the selected aspect ratio. Preserve the subject, style, details, and composition as closely as possible. Extend the scene naturally where needed.',
      })
    },
    [editor],
  )

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        disabled={editor.isGenerating}
        onClick={() => setOpen((value) => !value)}
        aria-label="Aspect ratio"
        className="body-4 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 px-spacing-2 flex h-7 items-center border disabled:opacity-50"
      >
        <AspectRatioPickerGlyph />
        Aspect ratio
        <ChevronDown className="h-3 w-3" />
      </button>
      {open ? (
        <div className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown absolute right-0 top-8 flex min-w-64 flex-col">
          <p className="body-3 text-muted-foreground px-spacing-2 pb-spacing-1">
            Generate this image with a different aspect ratio
          </p>
          {CHATGPT_STYLE_ASPECT_OPTIONS.filter((option) =>
            editor.supportedAspectRatios.includes(option.ratio),
          ).map((option) => (
            <AspectRatioMenuOption
              key={option.ratio}
              ratio={option.ratio}
              label={option.label}
              selected={editor.aspectRatio === option.ratio}
              onSelect={() => changeAspectRatio(option.ratio)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ShellMediaMarkupAction({
  active,
  disabled,
  onToggle,
}: {
  active: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-label="Markup"
      aria-pressed={active}
      className={cn(
        'button-compact gap-spacing-1 disabled:opacity-50',
        active ? 'button-glass-primary' : 'button-glass-neutral',
      )}
    >
      <PenLine className="icon-sm" />
      Markup
    </button>
  )
}

export function ShellMediaActionsMenu({
  target,
  onOpenChat,
  onOpenCanva,
}: {
  target: ShellArtifactViewerTarget
  onOpenChat: () => void
  onOpenCanva?: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-icon-bare"
        aria-label="More image actions"
      >
        <ExternalLink className="icon-sm" />
      </button>
      {open ? (
        <div className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown absolute right-0 top-8 flex min-w-44 flex-col">
          {target.fileUrl ? (
            <a
              href={target.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="hub-dock-flyout-row gap-spacing-2"
            >
              <ExternalLink className="icon-sm shrink-0" />
              Open in new tab
            </a>
          ) : null}
          {onOpenCanva ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenCanva()
              }}
              className="hub-dock-flyout-row gap-spacing-2"
            >
              <img
                src="/Integrations/Canva.png"
                alt=""
                className="icon-sm rounded-spacing-1 shrink-0 object-contain"
              />
              Open in Canva
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenChat()
            }}
            className="hub-dock-flyout-row gap-spacing-2"
          >
            <MessageSquare className="icon-sm shrink-0" />
            Open in chat
          </button>
        </div>
      ) : null}
    </div>
  )
}
