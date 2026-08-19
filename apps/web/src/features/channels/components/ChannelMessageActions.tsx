'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { fixedFloatingPortalStyle } from '@/lib/ui'
import { BrandedEmojiPicker } from './BrandedEmojiPicker'
import { ChannelMessageQuickReactions } from './ChannelMessageReactions'
import {
  isChannelMessageHtml,
  stripChannelMessageHtml,
} from './channel-message-bubble-utils'

export function ChannelMessageActions({
  messageId,
  rawContent,
  isOwn,
  onStartEdit,
  onDelete,
  onToggleReaction,
}: {
  messageId: string
  rawContent: string
  isOwn: boolean
  onStartEdit: () => void
  onDelete: (messageId: string) => Promise<void>
  onToggleReaction: (key: string) => void
}) {
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 })
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const closeAll = useCallback(() => {
    setEmojiPickerOpen(false)
    setMenuOpen(false)
  }, [])

  const openEmojiPicker = () => {
    const btn = emojiButtonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setEmojiPos({ top: rect.bottom + 8, left: rect.right })
    setEmojiPickerOpen(true)
  }

  const openMenu = () => {
    const btn = menuButtonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 })
    setMenuOpen(true)
  }

  useEffect(() => {
    if (!emojiPickerOpen && !menuOpen) return
    const handler = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        emojiPickerRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target) ||
        menuButtonRef.current?.contains(target)
      ) {
        return
      }
      closeAll()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [emojiPickerOpen, menuOpen, closeAll])

  const startEdit = () => {
    onStartEdit()
    setMenuOpen(false)
  }

  const copyMessage = () => {
    const text = isChannelMessageHtml(rawContent) ? stripChannelMessageHtml(rawContent) : rawContent
    void navigator.clipboard.writeText(text)
    toast.success('Copied')
    setMenuOpen(false)
  }

  const handleDelete = async () => {
    setMenuOpen(false)
    try {
      await onDelete(messageId)
    } catch {
      toast.error('Could not delete message.')
    }
  }

  const popupOpen = emojiPickerOpen || menuOpen

  return (
    <>
      <div
        className={`border-border bg-card absolute -top-3 right-2 z-10 items-center gap-0.5 rounded-lg border px-1 py-0.5 shadow-md ${popupOpen ? 'flex' : 'hidden group-hover:flex'}`}
      >
        <ChannelMessageQuickReactions onToggleReaction={onToggleReaction} />
        <Tooltip label="More reactions" side="top" delayMs={300}>
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={openEmojiPicker}
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors"
          >
            <span className="text-base">+</span>
          </button>
        </Tooltip>
        <div className="bg-border mx-0.5 h-4 w-px" />
        {isOwn && (
          <Tooltip label="Edit" side="top" delayMs={300}>
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit"
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}
        <Tooltip label="More" side="top" delayMs={300}>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={openMenu}
            aria-label="More"
            className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      {menuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="dropdown-menu-solid z-dropdown fixed w-44 py-1"
            style={fixedFloatingPortalStyle(menuPos)}
          >
            {isOwn && (
              <button
                type="button"
                onClick={startEdit}
                className="text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
              >
                <Pencil className="text-muted-foreground h-3.5 w-3.5" /> Edit message
              </button>
            )}
            <button
              type="button"
              onClick={copyMessage}
              className="text-foreground hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
            >
              <Copy className="text-muted-foreground h-3.5 w-3.5" /> Copy message
            </button>
            {isOwn && (
              <>
                <div className="border-border my-1 border-t" />
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="text-destructive hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete message
                </button>
              </>
            )}
          </div>,
          document.body,
        )}

      {emojiPickerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={emojiPickerRef}
            className="z-dropdown fixed"
            style={fixedFloatingPortalStyle(emojiPos, { transform: 'translateX(-100%)' })}
          >
            <BrandedEmojiPicker
              onEmojiClick={(data) => {
                onToggleReaction(data.emoji)
                setEmojiPickerOpen(false)
              }}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
