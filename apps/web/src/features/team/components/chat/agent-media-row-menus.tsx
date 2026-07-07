'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, MoreHorizontal } from 'lucide-react'
import type { ConversationDocument } from '@/lib/artifacts/artifact-types'

const DROPDOWN_ANCHOR_GAP_PX = 4
const ASSET_ROW_MENU_MIN_WIDTH_PX = 192
const LINK_ROW_MENU_MIN_WIDTH_PX = 208

interface AgentMediaRowMenuProps {
  menuForId: string | null
  setMenuForId: (id: string | null) => void
}

export function AssetRowMenu({
  doc,
  menuForId,
  setMenuForId,
  openUrl,
}: AgentMediaRowMenuProps & {
  doc: ConversationDocument
  openUrl?: string | null
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const open = menuForId === `doc-${doc.id}`

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menu = menuRef.current
    menu.style.top = `${rect.bottom + DROPDOWN_ANCHOR_GAP_PX}px`
    menu.style.left = `${rect.right - ASSET_ROW_MENU_MIN_WIDTH_PX}px`
    menu.style.minWidth = `${ASSET_ROW_MENU_MIN_WIDTH_PX}px`
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = (event: MouseEvent) => {
      const target = event.target as Node
      if ((target as Element).closest?.('[data-agent-media-dropdown]')) return
      if (btnRef.current?.contains(target)) return
      setMenuForId(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, setMenuForId])

  return (
    <div className="inline-flex shrink-0 items-center justify-center">
      <button
        ref={btnRef}
        type="button"
        className="rounded-spacing-2 p-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex items-center justify-center"
        aria-label="More"
        onClick={() => setMenuForId(open ? null : `doc-${doc.id}`)}
      >
        <MoreHorizontal className="icon-xs" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            data-agent-media-dropdown
            className="dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-1 fixed"
          >
            {openUrl ? (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="body-3 gap-spacing-2 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left"
                onClick={() => setMenuForId(null)}
              >
                <ExternalLink className="icon-xs shrink-0" /> Open
              </a>
            ) : null}
            <button
              type="button"
              className="body-3 gap-spacing-2 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left"
              onClick={() => {
                setMenuForId(null)
                void navigator.clipboard.writeText(doc.id)
              }}
            >
              Copy id
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}

export function LinkRowMenu({
  row,
  menuForId,
  setMenuForId,
}: AgentMediaRowMenuProps & {
  row: { id: string; url: string; messageId: string }
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const open = menuForId === row.id

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !menuRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menu = menuRef.current
    menu.style.top = `${rect.bottom + DROPDOWN_ANCHOR_GAP_PX}px`
    menu.style.left = `${rect.right - LINK_ROW_MENU_MIN_WIDTH_PX}px`
    menu.style.minWidth = `${LINK_ROW_MENU_MIN_WIDTH_PX}px`
  }, [open])

  useEffect(() => {
    if (!open) return
    const handle = (event: MouseEvent) => {
      const target = event.target as Node
      if ((target as Element).closest?.('[data-agent-media-dropdown]')) return
      if (btnRef.current?.contains(target)) return
      setMenuForId(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, setMenuForId])

  return (
    <div className="inline-flex shrink-0 items-center justify-center">
      <button
        ref={btnRef}
        type="button"
        className="rounded-spacing-2 p-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex items-center justify-center"
        aria-label="More"
        onClick={() => setMenuForId(open ? null : row.id)}
      >
        <MoreHorizontal className="icon-xs" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            data-agent-media-dropdown
            className="dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-1 fixed"
          >
            <button
              type="button"
              className="body-3 gap-spacing-2 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left"
              onClick={() => {
                setMenuForId(null)
                window.open(row.url, '_blank', 'noopener,noreferrer')
              }}
            >
              Open in new tab
            </button>
            <button
              type="button"
              className="body-3 gap-spacing-2 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left"
              onClick={() => {
                setMenuForId(null)
                window.dispatchEvent(
                  new CustomEvent('team-scroll-to-message', { detail: row.messageId }),
                )
              }}
            >
              Go to message
            </button>
            <button
              type="button"
              className="body-3 gap-spacing-2 hover:bg-hover-subtle px-spacing-2 py-spacing-1 flex w-full items-center text-left"
              onClick={() => {
                setMenuForId(null)
                void navigator.clipboard.writeText(row.url)
              }}
            >
              Copy link
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
