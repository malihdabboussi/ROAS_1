'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bookmark, CheckCircle2, ChevronUp, PlusSquare, RotateCcw } from 'lucide-react'
import { SPACES_CUSTOMIZE_VIEW_LABELS } from '../config/spaces-customize-view.config'

const SAVE_VIEW_MOTION_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 40,
  mass: 0.78,
}

interface SaveViewDropdownProps {
  visible: boolean
  onSaveView: () => void
  onEnableAutosave: () => void
  onSaveAsNewView: () => void
  onRevertChanges: () => void
}

export function SaveViewDropdown({
  visible,
  onSaveView,
  onEnableAutosave,
  onSaveAsNewView,
  onRevertChanges,
}: SaveViewDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    if (!visible) setOpen(false)
  }, [visible])

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {visible && (
        <motion.div
          ref={rootRef}
          className="relative shrink-0 self-center"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={SAVE_VIEW_MOTION_SPRING}
        >
          <div className="badge-glass badge-glass-yellow rounded-spacing-2 flex shrink-0 flex-nowrap items-stretch overflow-hidden whitespace-nowrap !p-0">
            <button
              type="button"
              onClick={() => {
                onSaveView()
                setOpen(false)
              }}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border-0 bg-transparent px-2.5 py-1 text-xs font-semibold text-inherit shadow-none transition-opacity hover:opacity-90"
            >
              {SPACES_CUSTOMIZE_VIEW_LABELS.SAVE_VIEW}
            </button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center border-y-0 border-l border-r-0 border-[rgba(128,128,128,0.3)] bg-transparent px-1 py-1 text-inherit shadow-none transition-opacity hover:opacity-90"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Save view options"
            >
              <ChevronUp
                className={`h-2.5 w-2.5 shrink-0 transition-transform ${open ? '' : 'rotate-180'}`}
              />
            </button>
          </div>

          {open && (
            <div className="dropdown-menu-solid absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  onSaveView()
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="flex items-center gap-2 text-[var(--foreground)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                  {SPACES_CUSTOMIZE_VIEW_LABELS.SAVE_VIEW}
                </span>
                <kbd className="text-[10px] text-[var(--color-muted-foreground)]">
                  {isMac ? '⌘ ↵' : 'Ctrl ↵'}
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => {
                  onEnableAutosave()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <Bookmark className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                {SPACES_CUSTOMIZE_VIEW_LABELS.ENABLE_AUTOSAVE}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveAsNewView()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <PlusSquare className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                {SPACES_CUSTOMIZE_VIEW_LABELS.SAVE_AS_NEW_VIEW}
              </button>
              <div className="my-1 h-px bg-[var(--color-border)]" />
              <button
                type="button"
                onClick={() => {
                  onRevertChanges()
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                {SPACES_CUSTOMIZE_VIEW_LABELS.REVERT_CHANGES}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
