'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Edit2, Trash2 } from 'lucide-react'

export function ItemMenuDropdown({
  anchorRef,
  onClose,
  onRename,
  onDelete,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.right })
  }, [anchorRef])

  useEffect(() => {
    if (!anchorRef.current) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !anchorRef.current?.contains(target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  return createPortal(
    <div
      data-dropdown
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-40 border shadow-lg"
      style={{ top: pos.top, left: pos.left, transform: 'translateX(-100%)' }}
    >
      <button
        type="button"
        onClick={() => {
          onRename()
          onClose()
        }}
        className="gap-spacing-2 body-3 text-muted-foreground hover:bg-muted/20 hover:text-foreground px-spacing-3 py-spacing-2 flex w-full items-center text-left"
      >
        <Edit2 className="h-4 w-4" />
        <span>Rename</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onDelete()
          onClose()
        }}
        className="gap-spacing-2 body-3 px-spacing-3 py-spacing-2 text-destructive [&_svg]:text-destructive flex w-full items-center text-left hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </button>
    </div>,
    document.body,
  )
}

export function RenameInput({
  initialValue,
  onConfirm,
  onCancel,
}: {
  initialValue: string
  onConfirm: (value: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = () => {
    const v = value.trim() || initialValue
    onConfirm(v)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSubmit()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={handleSubmit}
      className="body-2 ring-border text-foreground focus:ring-foreground/40 min-w-0 flex-1 rounded bg-transparent px-1 outline-none ring-1"
    />
  )
}
