'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Blocks, FileText, Image as ImageIcon, Plus } from 'lucide-react'
import { DELIVERABLE_ICONS } from '@/app/(dashboard)/campaigns/[id]/_lib/constants'
import type { DeliverableCategory, MissionDeliverable } from '../types'

const CATEGORY_META: Record<
  DeliverableCategory,
  { label: string; icon: typeof FileText; emptyLabel: string }
> = {
  documents: { label: 'Documents', icon: FileText, emptyLabel: 'No documents' },
  media: { label: 'Media', icon: ImageIcon, emptyLabel: 'No media' },
  artifacts: { label: 'Artifacts', icon: Blocks, emptyLabel: 'No artifacts' },
}

interface MissionDeliverableCellProps {
  category: DeliverableCategory
  items: MissionDeliverable[]
  onAdd?: () => void
  onOpen?: (d: MissionDeliverable) => void
}

export function MissionDeliverableCell({
  category,
  items,
  onAdd,
  onOpen,
}: MissionDeliverableCellProps) {
  const meta = CATEGORY_META[category]
  const Icon = meta.icon
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 240
    const maxLeft = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft)) })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: PointerEvent) => {
      const t = e.target as Node
      if (dropdownRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutside, true)
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('pointerdown', handleOutside, true)
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-dropdown
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="flex min-w-0 max-w-full items-center gap-1.5 text-left"
        title={meta.label}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        {items.length > 0 ? (
          <span className="body-4 tabular-nums text-[var(--foreground)]">{items.length}</span>
        ) : (
          <span className="body-4 text-[var(--color-muted-foreground)]">—</span>
        )}
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[99999] w-[240px] overflow-hidden rounded-xl"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border)] px-3 py-2">
              <span className="typo-caption text-[var(--color-muted-foreground)]">
                {meta.label}
              </span>
            </div>

            <div className="max-h-[220px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="body-4 px-3 py-4 text-center text-[var(--color-muted-foreground)]">
                  {meta.emptyLabel}
                </div>
              ) : (
                items.map((d) => {
                  const DIcon = DELIVERABLE_ICONS[d.type] || FileText
                  return (
                    <button
                      key={d.id}
                      type="button"
                      title={d.title || 'Untitled'}
                      onClick={() => {
                        onOpen?.(d)
                        setOpen(false)
                      }}
                      className="body-4 flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <DIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                      <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                        {d.title || 'Untitled'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {onAdd && (
              <div className="border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    onAdd()
                    setOpen(false)
                  }}
                  className="body-4 flex w-full items-center gap-2 px-3 py-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add {meta.label.toLowerCase()}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
