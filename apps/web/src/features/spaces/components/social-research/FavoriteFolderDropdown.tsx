'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, FolderPlus, Loader2, Search, Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { FavoriteFolder } from '../../services/favorite-folders.service'

interface FavoriteFolderDropdownProps {
  folders: FavoriteFolder[]
  /** Folder ids this post currently belongs to (filled stars / checks). */
  selectedIds: string[]
  onToggleFolder: (folder: FavoriteFolder) => void | Promise<void>
  onCreateFolder: (name: string) => Promise<FavoriteFolder | null>
  /** The star (or any trigger) rendered in place. Attach `triggerRef` to the clickable element. */
  trigger: (opts: {
    open: boolean
    toggle: () => void
    favorited: boolean
    triggerRef: RefObject<HTMLButtonElement | null>
  }) => ReactNode
}

/**
 * Star-button dropdown for adding a post to favorite folders: search bar, a
 * "New folder" row (uses the search text as the name), then the folder list
 * with checkmarks. Portal + fixed positioning mirrors SelectCell.
 */
export function FavoriteFolderDropdown({
  folders,
  selectedIds,
  onToggleFolder,
  onCreateFolder,
  trigger,
}: FavoriteFolderDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
  } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const favorited = selectedIds.length > 0

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return folders
    return folders.filter((f) => f.name.toLowerCase().includes(q))
  }, [folders, search])

  const createName = search.trim()
  const exactMatch = folders.some((f) => f.name.toLowerCase() === createName.toLowerCase())

  const positionDropdown = useCallback(() => {
    const t = triggerRef.current
    const panel = dropdownRef.current
    if (!open || !t || !panel) return
    const rect = t.getBoundingClientRect()
    const pad = 8
    const menuH = Math.min(panel.offsetHeight, window.innerHeight - pad * 2)
    const spaceBelow = window.innerHeight - rect.bottom - pad
    const placeAbove = menuH > spaceBelow && rect.top - pad > spaceBelow
    const w = 224
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
    if (placeAbove) setPos({ top: null, bottom: window.innerHeight - rect.top + 4, left })
    else setPos({ top: rect.bottom + 4, bottom: null, left })
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      setSearch('')
      return
    }
    positionDropdown()
    const id = requestAnimationFrame(() => {
      positionDropdown()
      searchRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, positionDropdown])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!dropdownRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', positionDropdown, true)
    window.addEventListener('resize', positionDropdown)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', positionDropdown, true)
      window.removeEventListener('resize', positionDropdown)
    }
  }, [open, positionDropdown])

  const handleCreate = useCallback(async () => {
    if (creating) return
    const name = createName || 'New folder'
    setCreating(true)
    try {
      const folder = await onCreateFolder(name)
      if (folder) {
        await onToggleFolder(folder)
        setSearch('')
      }
    } finally {
      setCreating(false)
    }
  }, [creating, createName, onCreateFolder, onToggleFolder])

  return (
    <>
      {trigger({ open, toggle: () => setOpen((v) => !v), favorited, triggerRef })}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[100001] flex flex-col overflow-hidden"
            style={{
              top: pos?.top ?? undefined,
              bottom: pos?.bottom ?? undefined,
              left: pos?.left ?? 0,
              visibility: pos ? 'visible' : 'hidden',
              pointerEvents: pos ? 'auto' : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-menu-solid w-56 overflow-hidden rounded-xl">
              <div className="border-b border-[var(--color-border)] p-2">
                <div className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2 py-1">
                  <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search folders..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && createName && !exactMatch) void handleCreate()
                    }}
                    className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                  />
                </div>
              </div>

              <div className="max-h-[260px] overflow-y-auto py-1">
                {!exactMatch && (
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={creating}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <FolderPlus className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                    )}
                    <span className="min-w-0 truncate">
                      {createName ? `New folder "${createName}"` : 'New folder'}
                    </span>
                  </button>
                )}
                {filteredFolders.map((folder) => {
                  const isIn = selected.has(folder.id)
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => void onToggleFolder(folder)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                    >
                      <Star
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          isIn
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[var(--color-muted-foreground)]',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                        {folder.name}
                      </span>
                      {isIn && <Check className="h-3 w-3 shrink-0 text-[var(--foreground)]" />}
                    </button>
                  )
                })}
                {filteredFolders.length === 0 && folders.length > 0 && (
                  <p className="px-3 py-2 text-[11px] text-[var(--color-muted-foreground)]">
                    No folders match
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
