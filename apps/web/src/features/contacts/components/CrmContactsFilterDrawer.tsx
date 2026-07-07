'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import type {
  FilterField,
  FilterState,
  MultiSelectLogic,
} from '@/features/contacts/services/crm-contacts-api'
import { tagNameToTintClass } from '@/features/properties/constants/tag-picker-colors'

type FunnelOption = { id: string; title: string | null }

function isArrayValue(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function getMultiSelectField(filters: FilterState, key: string): FilterField {
  const existing = filters[key]
  if (existing && existing.operator === 'is' && isArrayValue(existing.value)) return existing
  return { operator: 'is', value: [], multiSelectLogic: 'any' }
}

export function CrmContactsFilterDrawer(props: {
  open: boolean
  onClose: () => void
  filters: FilterState
  onApply: (filters: FilterState) => void
  funnels: FunnelOption[]
}) {
  const { open, onClose, filters, onApply, funnels } = props

  const [mounted, setMounted] = useState(false)
  const [local, setLocal] = useState<FilterState>(filters)
  const [search, setSearch] = useState('')
  const [tagAddInput, setTagAddInput] = useState('')
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => setLocal(filters), [filters])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filteredFunnels = useMemo(() => {
    if (!search.trim()) return funnels
    const s = search.toLowerCase()
    return funnels.filter((f) => (f.title ?? '').toLowerCase().includes(s))
  }, [funnels, search])

  const setMultiSelectLogic = (key: string, logic: MultiSelectLogic) => {
    setLocal((prev) => {
      const field = getMultiSelectField(prev, key)
      return { ...prev, [key]: { ...field, multiSelectLogic: logic } }
    })
  }

  const toggleMultiSelect = (key: string, value: string) => {
    setLocal((prev) => {
      const field = getMultiSelectField(prev, key)
      const selected = new Set(field.value as string[])
      if (selected.has(value)) selected.delete(value)
      else selected.add(value)
      return { ...prev, [key]: { ...field, value: Array.from(selected) } }
    })
  }

  const addTagFilter = (raw: string) => {
    const label = raw.trim()
    if (!label) return
    setLocal((prev) => {
      const field = getMultiSelectField(prev, 'tagIds')
      const selected = new Set(field.value as string[])
      if (selected.has(label)) return prev
      selected.add(label)
      return { ...prev, tagIds: { ...field, value: Array.from(selected) } }
    })
    setTagAddInput('')
  }

  const setDate = (key: 'dateFrom' | 'dateTo', v: string) => {
    setLocal((prev) => {
      if (!v) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { operator: 'is', value: v } }
    })
  }

  const setSourceDomain = (v: string) => {
    setLocal((prev) => {
      if (!v.trim()) {
        const next = { ...prev }
        delete next.sourceDomain
        return next
      }
      return { ...prev, sourceDomain: { operator: 'is', value: v.trim() } }
    })
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose()
  }

  const clearAll = () => setLocal({})

  const apply = () => {
    const next: FilterState = {}
    for (const [k, f] of Object.entries(local)) {
      if (!f) continue
      if (f.operator === 'is_empty' || f.operator === 'is_not_empty') {
        next[k] = f
        continue
      }
      if (Array.isArray(f.value)) {
        if (f.value.length > 0) next[k] = f
        continue
      }
      if (typeof f.value === 'string') {
        if (f.value.trim()) next[k] = f
        continue
      }
    }
    onApply(next)
  }

  if (!mounted) return null
  if (!open) return null

  const tagField = getMultiSelectField(local, 'tagIds')
  const funnelField = getMultiSelectField(local, 'funnelIds')

  const dateFrom = typeof local.dateFrom?.value === 'string' ? local.dateFrom.value : ''
  const dateTo = typeof local.dateTo?.value === 'string' ? local.dateTo.value : ''
  const sourceDomain = typeof local.sourceDomain?.value === 'string' ? local.sourceDomain.value : ''

  return createPortal(
    <>
      <div className="z-modal-backdrop" onClick={handleBackdropClick} />
      <div className="z-modal-content fixed inset-0 flex items-stretch justify-end">
        <div
          ref={drawerRef}
          className="surface-card border-border anim-slide-over-in-right flex h-full w-96 flex-col border-l shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="surface-card border-border p-spacing-4 space-y-spacing-3 flex-shrink-0 border-b">
            <div className="flex items-center justify-between">
              <h2 className="title-h6">Filters</h2>
              <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
                <X className="icon-sm" />
              </button>
            </div>

            <div className="relative">
              <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search funnels..."
                className="input-glass input-leading body-2 h-spacing-8 py-spacing-1 pr-spacing-3 w-full"
              />
            </div>
          </div>

          {/* Body */}
          <div className="p-spacing-4 space-y-spacing-6 flex-1 overflow-y-auto">
            {/* Tags */}
            <div className="space-y-spacing-3">
              <div className="flex items-center justify-between">
                <div className="typo-caption text-muted-foreground uppercase">Tags</div>
                <div className="gap-spacing-2 flex items-center">
                  <button
                    type="button"
                    onClick={() => setMultiSelectLogic('tagIds', 'any')}
                    className={`badge-glass badge-glass-sm ${tagField.multiSelectLogic !== 'all' ? 'badge-glass-blue' : 'badge-glass-muted'}`}
                  >
                    Any
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultiSelectLogic('tagIds', 'all')}
                    className={`badge-glass badge-glass-sm ${tagField.multiSelectLogic === 'all' ? 'badge-glass-blue' : 'badge-glass-muted'}`}
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="gap-spacing-2 flex">
                <input
                  type="text"
                  value={tagAddInput}
                  onChange={(e) => setTagAddInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTagFilter(tagAddInput)
                    }
                  }}
                  placeholder="Add tag to filter..."
                  className="input-glass min-w-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => addTagFilter(tagAddInput)}
                  className="button-glass-neutral shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
                >
                  Add
                </button>
              </div>

              {!isArrayValue(tagField.value) || tagField.value.length === 0 ? (
                <div className="body-3 text-muted-foreground">No tag filters</div>
              ) : (
                <div className="border-border rounded-spacing-2 overflow-hidden border">
                  {(tagField.value as string[]).map((name) => {
                    const selected = true
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleMultiSelect('tagIds', name)}
                        className={`gap-spacing-2 px-spacing-3 py-spacing-2 body-3 border-border flex w-full items-center border-b text-left last:border-b-0 ${
                          selected
                            ? 'dropdown-option-selected'
                            : 'hover:bg-hover-subtle text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={selected}
                          className="accent-primary"
                        />
                        <span
                          className={`w-spacing-2 h-spacing-2 inline-block rounded-full ${tagNameToTintClass(name)}`}
                        />
                        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
                          {name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Funnels */}
            <div className="space-y-spacing-3">
              <div className="typo-caption text-muted-foreground uppercase">Funnels</div>
              {filteredFunnels.length === 0 ? (
                <div className="body-3 text-muted-foreground">No funnels</div>
              ) : (
                <div className="border-border rounded-spacing-2 overflow-hidden border">
                  {filteredFunnels.map((f) => {
                    const selected =
                      isArrayValue(funnelField.value) && funnelField.value.includes(f.id)
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleMultiSelect('funnelIds', f.id)}
                        className={`gap-spacing-2 px-spacing-3 py-spacing-2 body-3 border-border flex w-full items-center border-b text-left last:border-b-0 ${
                          selected
                            ? 'dropdown-option-selected'
                            : 'hover:bg-hover-subtle text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={selected}
                          className="accent-primary"
                        />
                        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
                          {f.title ?? 'Untitled'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Source domain */}
            <div className="space-y-spacing-2">
              <div className="typo-caption text-muted-foreground uppercase">Source domain</div>
              <input
                value={sourceDomain}
                onChange={(e) => setSourceDomain(e.target.value)}
                placeholder="e.g., mydomain.com"
                className="input-glass w-full"
              />
            </div>

            {/* Date range */}
            <div className="space-y-spacing-3">
              <div className="typo-caption text-muted-foreground uppercase">Created date</div>
              <div className="gap-spacing-2 grid grid-cols-2">
                <div className="space-y-spacing-1">
                  <div className="body-4 text-muted-foreground">From</div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDate('dateFrom', e.target.value)}
                    className="input-glass w-full"
                  />
                </div>
                <div className="space-y-spacing-1">
                  <div className="body-4 text-muted-foreground">To</div>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDate('dateTo', e.target.value)}
                    className="input-glass w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="surface-card border-border p-spacing-4 gap-spacing-3 flex flex-shrink-0 items-center border-t">
            <button
              type="button"
              onClick={clearAll}
              className="button-glass-neutral flex-1 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={apply}
              className="button-glass-accent flex-1 rounded-lg px-4 py-2 text-sm font-medium"
            >
              <span className="relative z-10">Apply</span>
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
