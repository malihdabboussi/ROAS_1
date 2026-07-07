'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, Palette, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { SelectOption, SpaceSchema } from '../types/space-schema'
import { FieldSchemaColorPicker } from './field-schema-color-picker'
import { OptionDot } from './OptionBadge'

interface CategoryEditorModalProps {
  open: boolean
  schema: SpaceSchema
  fieldId: string
  title?: string
  onClose: () => void
  onSchemaChange: (next: SpaceSchema) => Promise<void>
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function CategoryRow({
  option,
  onRename,
  onChangeColor,
  onDelete,
  customSwatches,
  onCustomSwatchesChange,
}: {
  option: SelectOption
  onRename: (label: string) => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  customSwatches: string[]
  onCustomSwatchesChange: (swatches: string[]) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(option.label)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const colorAnchorRef = useRef<HTMLButtonElement>(null)

  const MENU_WIDTH_PX = 160

  useLayoutEffect(() => {
    if (!menuOpen || !menuTriggerRef.current) {
      setMenuPos(null)
      return
    }
    const rect = menuTriggerRef.current.getBoundingClientRect()
    const pad = 8
    let left = rect.right - MENU_WIDTH_PX
    left = Math.max(pad, Math.min(left, window.innerWidth - MENU_WIDTH_PX - pad))
    setMenuPos({ top: rect.bottom + 4, left })
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || menuTriggerRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onScroll = () => setMenuOpen(false)
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  function commitRename() {
    const trimmed = renameDraft.trim()
    if (trimmed && trimmed !== option.label) onRename(trimmed)
    setRenaming(false)
  }

  return (
    <div className="group relative flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-2 py-2">
      <div className="relative shrink-0">
        <button
          ref={colorAnchorRef}
          type="button"
          onClick={() => {
            setColorPickerOpen((o) => !o)
            setMenuOpen(false)
          }}
          className="focus-visible:ring-ring flex items-center justify-center rounded p-0.5 focus-visible:outline-none focus-visible:ring-2"
          aria-label="Change color"
        >
          <OptionDot color={option.color} size="sm" />
        </button>
        {colorPickerOpen && (
          <FieldSchemaColorPicker
            anchorRef={colorAnchorRef}
            open={colorPickerOpen}
            value={option.color}
            onChange={onChangeColor}
            onClose={() => setColorPickerOpen(false)}
            customSwatches={customSwatches}
            onCustomSwatchesChange={onCustomSwatchesChange}
          />
        )}
      </div>

      {renaming ? (
        <input
          autoFocus
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') setRenaming(false)
          }}
          onBlur={commitRename}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold uppercase tracking-wide text-[var(--foreground)] outline-none"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">
          {option.label}
        </span>
      )}

      <div className="relative">
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="shrink-0 rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--foreground)] group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>

        {menuOpen &&
          menuPos &&
          createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="dropdown-menu-solid fixed z-modal-layer-4 w-40 rounded-xl py-1 shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setRenameDraft(option.label)
                  setRenaming(true)
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <Pencil className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setColorPickerOpen(true)
                  setMenuOpen(false)
                }}
                className="hover:bg-hover-subtle flex w-full items-center gap-2 px-3 py-1.5 text-sm text-[var(--foreground)] transition-colors"
              >
                <Palette className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                Change Color
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onDelete()
                  setMenuOpen(false)
                }}
                className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors"
              >
                <Trash2 className="text-destructive h-3.5 w-3.5" />
                Delete
              </button>
            </div>,
            document.body,
          )}
      </div>
    </div>
  )
}

export function CategoryEditorModal({
  open,
  schema,
  fieldId,
  title = 'Edit categories',
  onClose,
  onSchemaChange,
}: CategoryEditorModalProps) {
  const [draft, setDraft] = useState<SpaceSchema>(schema)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('blue')
  const [pickerOpen, setPickerOpen] = useState(false)
  const newColorAnchorRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) setDraft(schema)
  }, [open, schema])

  const targetField = draft.fields.find((f) => f.id === fieldId)
  const options = targetField?.options ?? []
  const tagCustomSwatches = targetField?.tag_custom_swatches ?? []

  if (!open || !targetField) return null

  function updateTagCustomSwatches(next: string[]) {
    setDraft({
      ...draft,
      fields: draft.fields.map((f) => (f.id === fieldId ? { ...f, tag_custom_swatches: next } : f)),
    })
  }

  function updateOptions(next: SelectOption[]) {
    setDraft({
      ...draft,
      fields: draft.fields.map((f) => (f.id === fieldId ? { ...f, options: next } : f)),
    })
  }

  function commitAdd() {
    const trimmed = newName.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    updateOptions([
      ...options,
      { id: slugify(trimmed) || `cat_${Date.now()}`, label: trimmed, color: newColor },
    ])
    setNewName('')
    setNewColor('blue')
    setAdding(false)
  }

  return createPortal(
    <div className="z-modal-backdrop-above flex items-center justify-center p-2">
      <div className="z-modal-content surface-card border-border relative w-full max-w-lg overflow-hidden rounded-2xl border shadow-2xl">
        <div className="px-spacing-4 sm:px-spacing-6 flex items-center justify-between py-4">
          <h2 className="title-h6">{title}</h2>
          <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-spacing-4 sm:px-spacing-6 max-h-[60vh] overflow-y-auto py-4">
          <div className="space-y-1.5">
            {options.map((opt) => (
              <CategoryRow
                key={opt.id}
                option={opt}
                onRename={(label) =>
                  updateOptions(options.map((o) => (o.id === opt.id ? { ...o, label } : o)))
                }
                onChangeColor={(color) =>
                  updateOptions(options.map((o) => (o.id === opt.id ? { ...o, color } : o)))
                }
                onDelete={() => updateOptions(options.filter((o) => o.id !== opt.id))}
                customSwatches={tagCustomSwatches}
                onCustomSwatchesChange={updateTagCustomSwatches}
              />
            ))}
          </div>

          {adding && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border-2 border-[rgb(var(--vibe-purple))] px-2 py-2">
              <div className="relative shrink-0">
                <button
                  ref={newColorAnchorRef}
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  className="focus-visible:ring-ring flex items-center justify-center rounded p-0.5 focus-visible:outline-none focus-visible:ring-2"
                  aria-label="Choose color"
                >
                  <OptionDot color={newColor} size="sm" />
                </button>
                {pickerOpen && (
                  <FieldSchemaColorPicker
                    anchorRef={newColorAnchorRef}
                    open={pickerOpen}
                    value={newColor}
                    onChange={setNewColor}
                    onClose={() => setPickerOpen(false)}
                    customSwatches={tagCustomSwatches}
                    onCustomSwatchesChange={updateTagCustomSwatches}
                  />
                )}
              </div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAdd()
                  if (e.key === 'Escape') setAdding(false)
                }}
                onBlur={() => {
                  if (!newName.trim()) setAdding(false)
                }}
                placeholder="Category name"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
              />
            </div>
          )}

          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-1.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
            >
              <Plus className="h-3 w-3" />
              Add category
            </button>
          )}
        </div>

        <div className="px-spacing-4 py-spacing-4 sm:px-spacing-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void onSchemaChange(draft)
              onClose()
            }}
            className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium"
          >
            <span className="relative z-10">Apply changes</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
