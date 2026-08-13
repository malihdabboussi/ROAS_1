'use client'

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, MoreHorizontal, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import { OptionBadge, OptionDot } from '@/components/ui/status/OptionBadge'
import type { SelectOption } from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'
import type { BaseCellProps } from './cell-types'
import {
  ColorPickerPopover,
  initialTagPanelValueFromOption,
  MAX_CUSTOM_TAG_SWATCHES,
  positionTagFullPickerNextToPresets,
  readCustomSwatchesFromStorage,
  shouldSaveAsNewCustom,
  TAG_COLORS,
  tagCustomSwatchesKey,
} from './field-color-presets-popover'
import { ResponsiveTagChips } from './ResponsiveTagChips'

const DEFAULT_NEW_TAG_COLOR = 'blue' satisfies (typeof TAG_COLORS)[number]['id']

function slugOptionId(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function newTagOptionId(label: string, options: { id: string }[]): string {
  let id = slugOptionId(label)
  if (!id) {
    id = `tag_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '').slice(0, 12) : String(Date.now())}`
  }
  const existing = new Set(options.map((o) => o.id))
  if (!existing.has(id)) return id
  let n = 2
  let candidate = `${id}_${n}`
  while (existing.has(candidate)) {
    n += 1
    candidate = `${id}_${n}`
  }
  return candidate
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((entry): entry is string => typeof entry === 'string')
  return []
}

interface MultiSelectProps extends BaseCellProps {
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  /** When set, custom tag swatches are persisted in space fielddef `tag_custom_swatches` */
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  customTrigger?: React.ReactNode
  fieldRowVariant?: 'default' | 'kanban'
}

export function MultiSelectCell({
  field,
  value,
  onChange,
  readonly,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  customTrigger,
  fieldRowVariant = 'default',
  openOnMount,
}: MultiSelectProps) {
  const selectedIds = toStringArray(value)
  const options = field.options ?? []
  const selectedOptions = options.filter((o) => selectedIds.includes(o.id))
  const kanbanEmpty =
    fieldRowVariant === 'kanban' && selectedOptions.length === 0 && customTrigger == null

  const [open, setOpen] = useState(!!openOnMount)
  const [search, setSearch] = useState('')
  const [colorPicker, setColorPicker] = useState<{
    optionId: string
    top: number
    left: number
  } | null>(null)
  const [optionMenu, setOptionMenu] = useState<{
    optionId: string
    top: number
    left: number
  } | null>(null)
  const [renaming, setRenaming] = useState<{ optionId: string; draft: string } | null>(null)
  const optionMenuRef = useRef<HTMLDivElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const colorMenuRef = useRef<HTMLDivElement>(null)
  const tagFullPickerRef = useRef<HTMLDivElement>(null)
  const [tagThemePos, setTagThemePos] = useState<{ top: number; left: number } | null>(null)
  const [tagPanelValue, setTagPanelValue] = useState('#6366f1')
  const tagPanelValueRef = useRef(tagPanelValue)
  tagPanelValueRef.current = tagPanelValue
  const openFullPanelPendingCommitRef = useRef(false)
  const [customSwatches, setCustomSwatches] = useState<string[]>(
    () => field.tag_custom_swatches ?? [],
  )
  const [pos, setPos] = useState<{
    top: number | null
    bottom: number | null
    left: number
  } | null>(null)
  const didMigrateFromLocalStorage = useRef(false)

  const tryCommitCustomFromFullPanel = useCallback(() => {
    if (!openFullPanelPendingCommitRef.current) return
    openFullPanelPendingCommitRef.current = false
    const v = tagPanelValueRef.current.trim()
    setCustomSwatches((prev) => {
      if (!shouldSaveAsNewCustom(v, prev)) return prev
      const next = [...prev, v].slice(-MAX_CUSTOM_TAG_SWATCHES)
      onTagCustomSwatchesChange?.(field.id, next)
      return next
    })
  }, [field.id, onTagCustomSwatchesChange])

  const tagFromServer = JSON.stringify(field.tag_custom_swatches ?? [])
  useEffect(() => {
    setCustomSwatches([...(field.tag_custom_swatches ?? [])])
  }, [field.id, tagFromServer])

  useEffect(() => {
    if (didMigrateFromLocalStorage.current) return
    if ((field.tag_custom_swatches?.length ?? 0) > 0) {
      didMigrateFromLocalStorage.current = true
      return
    }
    if (!onTagCustomSwatchesChange) {
      return
    }
    const fromLs = readCustomSwatchesFromStorage(field.id)
    if (fromLs.length === 0) {
      didMigrateFromLocalStorage.current = true
      return
    }
    didMigrateFromLocalStorage.current = true
    onTagCustomSwatchesChange(field.id, fromLs)
    try {
      localStorage.removeItem(tagCustomSwatchesKey(field.id))
    } catch {
      // ignore
    }
  }, [field.id, field.tag_custom_swatches, onTagCustomSwatchesChange])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 240
    const estH = 340
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < estH + 12
    const maxLeft = window.innerWidth - dropdownWidth - 8
    const left = Math.max(8, Math.min(rect.left, maxLeft))
    if (placeAbove) {
      setPos({ top: null, bottom: window.innerHeight - rect.top + 4, left })
    } else {
      setPos({ top: rect.bottom + 4, bottom: null, left })
    }
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (tagThemePos) {
        e.stopPropagation()
        e.preventDefault()
        tryCommitCustomFromFullPanel()
        setTagThemePos(null)
        return
      }
      if (colorPicker) {
        e.stopPropagation()
        e.preventDefault()
        setColorPicker(null)
        return
      }
      setOpen(false)
    }
    document.addEventListener('keydown', handleKey, true)
    return () => document.removeEventListener('keydown', handleKey, true)
  }, [open, colorPicker, tagThemePos, tryCommitCustomFromFullPanel])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (dropdownRef.current?.contains(t)) return
      if (triggerRef.current?.contains(t)) return
      if (colorMenuRef.current?.contains(t)) return
      if (tagFullPickerRef.current?.contains(t)) return
      if (optionMenuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  useEffect(() => {
    if (!colorPicker) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (tagFullPickerRef.current?.contains(t)) return

      if (tagThemePos) {
        tryCommitCustomFromFullPanel()
        setTagThemePos(null)
        if (
          colorMenuRef.current?.contains(t) ||
          dropdownRef.current?.contains(t) ||
          triggerRef.current?.contains(t) ||
          optionMenuRef.current?.contains(t)
        ) {
          return
        }
        setColorPicker(null)
        setOpen(false)
        return
      }

      if (colorMenuRef.current?.contains(t)) return
      setColorPicker(null)
    }
    const id = setTimeout(() => {
      document.addEventListener('mousedown', onDown, true)
    }, 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [colorPicker, tagThemePos, tryCommitCustomFromFullPanel])

  useEffect(() => {
    if (!optionMenu) return
    const onDown = (e: MouseEvent) => {
      if (optionMenuRef.current?.contains(e.target as Node)) return
      setOptionMenu(null)
    }
    const id = setTimeout(() => document.addEventListener('mousedown', onDown, true), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', onDown, true)
    }
  }, [optionMenu])

  useEffect(() => {
    if (renaming) setTimeout(() => renameRef.current?.focus(), 50)
  }, [renaming])

  function openOptionMenu(e: React.MouseEvent, optionId: string) {
    e.stopPropagation()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuW = 160
    setOptionMenu((p) => {
      if (p?.optionId === optionId) return null
      return {
        optionId,
        top: r.bottom + 4,
        left: Math.min(Math.max(8, r.left), window.innerWidth - menuW - 8),
      }
    })
  }

  function commitRename() {
    if (!renaming || !onUpdateOption) return
    const trimmed = renaming.draft.trim()
    if (trimmed && trimmed !== options.find((o) => o.id === renaming.optionId)?.label) {
      onUpdateOption(field.id, renaming.optionId, { label: trimmed })
    }
    setRenaming(null)
  }

  function handleDeleteOption(optionId: string) {
    if (!onDeleteOption) return
    const next = selectedIds.filter((id) => id !== optionId)
    if (next.length !== selectedIds.length) onChange(next)
    onDeleteOption(field.id, optionId)
    setOptionMenu(null)
  }

  const filtered = useMemo(() => {
    if (!search) return options
    const q = search.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  const exactMatch = useMemo(
    () => options.some((o) => o.label.toLowerCase() === search.toLowerCase()),
    [options, search],
  )

  function toggle(optionId: string) {
    const next = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId]
    onChange(next)
  }

  function handleCreate() {
    const label = search.trim()
    if (!label || !onCreateOption) return
    const id = newTagOptionId(label, field.options ?? [])
    const option: SelectOption = { id, label, color: DEFAULT_NEW_TAG_COLOR }
    onCreateOption(field.id, option)
    onChange([...selectedIds, id])
    setSearch('')
  }

  function applyTagColor(colorId: string) {
    if (!onUpdateOption || !colorPicker) return
    if (tagThemePos) tryCommitCustomFromFullPanel()
    onUpdateOption(field.id, colorPicker.optionId, { color: colorId })
    setTagThemePos(null)
  }

  function openColorMenu(e: React.MouseEvent, optionId: string) {
    e.stopPropagation()
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuW = 176
    openFullPanelPendingCommitRef.current = false
    setColorPicker((p) => {
      if (p?.optionId === optionId) return null
      const left = Math.min(Math.max(8, r.left), window.innerWidth - menuW - 8)
      return { optionId, top: r.bottom + 4, left }
    })
    setTagThemePos(null)
  }

  if (readonly) {
    if (selectedOptions.length === 0)
      return <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    return <ResponsiveTagChips options={selectedOptions} />
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className={cn(
          'flex min-w-0 max-w-full items-center gap-1 text-left',
          customTrigger ? 'w-auto' : kanbanEmpty ? 'h-full w-full justify-center' : 'w-full',
        )}
      >
        {customTrigger ??
          (selectedOptions.length > 0 ? (
            <ResponsiveTagChips options={selectedOptions} />
          ) : (
            <Tags className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          ))}
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[100000] w-60 overflow-hidden rounded-xl"
            style={{
              top: pos.top ?? undefined,
              bottom: pos.bottom ?? undefined,
              left: pos.left,
            }}
          >
            <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] p-2">
              <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search or create…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || !search.trim()) return
                  e.preventDefault()
                  if (!onCreateOption) return
                  if (exactMatch) return
                  handleCreate()
                }}
                className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
              />
            </div>

            <div className="max-h-[220px] overflow-y-auto py-1">
              {filtered.map((opt) => {
                const active = selectedIds.includes(opt.id)
                const isRenaming = renaming?.optionId === opt.id
                return (
                  <div
                    key={opt.id}
                    className="group/opt flex w-full items-center gap-0.5 px-1.5 py-0.5"
                  >
                    {onUpdateOption && (
                      <button
                        type="button"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                        onClick={(e) => openColorMenu(e, opt.id)}
                        title="Tag color"
                      >
                        <OptionDot color={opt.color} size="sm" />
                      </button>
                    )}
                    {isRenaming ? (
                      <input
                        ref={renameRef}
                        type="text"
                        value={renaming.draft}
                        onChange={(e) => setRenaming({ ...renaming, draft: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitRename()
                          }
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                        onBlur={commitRename}
                        className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-transparent px-2 py-1 text-xs text-[var(--foreground)] outline-none"
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => toggle(opt.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                        >
                          <OptionBadge option={opt} />
                        </button>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          {onUpdateOption || onDeleteOption ? (
                            <>
                              {active && (
                                <Check className="h-3.5 w-3.5 text-[var(--color-primary)] group-hover/opt:hidden" />
                              )}
                              <button
                                type="button"
                                onClick={(e) => openOptionMenu(e, opt.id)}
                                className={`h-6 w-6 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-all hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] ${active ? 'hidden group-hover/opt:flex' : 'hidden group-hover/opt:flex'}`}
                                title="Options"
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            active && <Check className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {search.trim() && !exactMatch && onCreateOption && (
                <button
                  type="button"
                  onClick={() => handleCreate()}
                  className="flex w-full items-center gap-2 border-t border-[var(--color-border)] px-3 py-2 text-left text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <Plus className="h-3 w-3" />
                  Create &ldquo;{search.trim()}&rdquo;
                </button>
              )}

              {filtered.length === 0 && !search.trim() && (
                <p className="px-3 py-3 text-center text-xs text-[var(--color-muted-foreground)]">
                  No tags yet
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}

      {optionMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={optionMenuRef}
            className="dropdown-menu-solid fixed z-[100000] w-40 overflow-hidden rounded-xl py-1 shadow-lg"
            style={{ top: optionMenu.top, left: optionMenu.left }}
          >
            {onUpdateOption && (
              <button
                type="button"
                onClick={() => {
                  const opt = options.find((o) => o.id === optionMenu.optionId)
                  setRenaming({ optionId: optionMenu.optionId, draft: opt?.label ?? '' })
                  setOptionMenu(null)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <Pencil className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                Rename
              </button>
            )}
            {onUpdateOption && (
              <button
                type="button"
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  openFullPanelPendingCommitRef.current = false
                  setTagThemePos(null)
                  setColorPicker({
                    optionId: optionMenu.optionId,
                    top: r.bottom + 4,
                    left: Math.min(r.left, window.innerWidth - 220),
                  })
                  setOptionMenu(null)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <OptionDot size="sm" />
                Change color
              </button>
            )}
            {onDeleteOption && (
              <button
                type="button"
                onClick={() => handleDeleteOption(optionMenu.optionId)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <Trash2 className="h-3 w-3 shrink-0" />
                Delete
              </button>
            )}
          </div>,
          document.body,
        )}

      {colorPicker &&
        onUpdateOption &&
        typeof document !== 'undefined' &&
        createPortal(
          <ColorPickerPopover
            ref={colorMenuRef}
            top={colorPicker.top}
            left={colorPicker.left}
            customSwatches={customSwatches}
            onSelect={(c) => applyTagColor(c)}
            onOpenFullPicker={() => {
              openFullPanelPendingCommitRef.current = true
              const opt = options.find((o) => o.id === colorPicker.optionId)
              setTagPanelValue(initialTagPanelValueFromOption(opt?.color))
              const menu = colorMenuRef.current
              if (!menu) return
              setTagThemePos(positionTagFullPickerNextToPresets(menu.getBoundingClientRect()))
            }}
          />,
          document.body,
        )}

      {tagThemePos &&
        colorPicker &&
        onUpdateOption &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tagFullPickerRef}
            className="fixed z-[100001]"
            style={{ top: tagThemePos.top, left: tagThemePos.left }}
          >
            <ColorPickerPanelStandalone
              key={colorPicker.optionId}
              value={tagPanelValue}
              onChange={(v) => {
                setTagPanelValue(v)
                onUpdateOption(field.id, colorPicker.optionId, { color: v })
              }}
              allowGradient
            />
          </div>,
          document.body,
        )}
    </>
  )
}
