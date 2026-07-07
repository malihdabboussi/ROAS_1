'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { CustomizePanelSubViewHeader } from './CustomizePanelSubViewHeader'

export type CardFieldUiDef<T extends string> = {
  id: T
  label: string
  icon: ComponentType<{ className?: string }>
}

export function CardFieldsSubView<T extends string>({
  title = 'Fields',
  activeViewId,
  fieldDefs,
  value,
  normalize,
  onFieldsChange,
  onBack,
  onClose,
}: {
  title?: string
  activeViewId: string
  fieldDefs: CardFieldUiDef<T>[]
  value: T[] | null | undefined
  normalize: (value: T[] | null | undefined) => T[]
  onFieldsChange: (next: T[]) => void
  onBack: () => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const normalizedValue = useMemo(() => normalize(value), [normalize, value])
  const [localFieldIds, setLocalFieldIds] = useState<T[]>(() => normalizedValue)

  useEffect(() => {
    setLocalFieldIds(normalizedValue)
  }, [activeViewId, normalizedValue])

  const visibleSet = useMemo(() => new Set(localFieldIds), [localFieldIds])
  const hidden = useMemo(() => fieldDefs.filter((f) => !visibleSet.has(f.id)), [fieldDefs, visibleSet])

  const fieldMatchesQuery = useCallback((label: string, q: string) => {
    if (!q) return true
    return label.toLowerCase().includes(q.toLowerCase())
  }, [])

  const shownOrdered = useMemo(() => {
    const byId = new Map(fieldDefs.map((f) => [f.id, f]))
    return localFieldIds
      .map((id) => byId.get(id))
      .filter((f): f is CardFieldUiDef<T> => Boolean(f))
  }, [fieldDefs, localFieldIds])

  const shownFiltered = useMemo(
    () => shownOrdered.filter((f) => fieldMatchesQuery(f.label, search)),
    [shownOrdered, search, fieldMatchesQuery],
  )
  const hiddenFiltered = useMemo(() => {
    const list = hidden.filter((f) => fieldMatchesQuery(f.label, search))
    return [...list].sort((a, b) => a.label.localeCompare(b.label))
  }, [hidden, search, fieldMatchesQuery])

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  function toggleField(fieldId: T) {
    const isVisible = localFieldIds.includes(fieldId)
    const next = isVisible ? localFieldIds.filter((id) => id !== fieldId) : [...localFieldIds, fieldId]
    setLocalFieldIds(next)
    onFieldsChange(next)
  }

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <CustomizePanelSubViewHeader title={title} onBack={onBack} onClose={onClose} />

      <div className="shrink-0 border-b border-[var(--border)] px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="mb-1 mt-3 flex items-center justify-between">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Shown</p>
        </div>
        <div className="space-y-0.5">
          {shownFiltered.map((field) => {
            const FieldIcon = field.icon
            return (
              <div key={field.id} className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <FieldIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">{field.label}</span>
                </div>
                <Switch checked onCheckedChange={() => toggleField(field.id)} />
              </div>
            )
          })}
          {shownFiltered.length === 0 && <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching fields</p>}
        </div>

        <div className="mb-1 mt-3 flex items-center justify-between">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Hidden</p>
        </div>
        <div className="space-y-0.5">
          {hiddenFiltered.map((field) => {
            const FieldIcon = field.icon
            return (
              <div key={field.id} className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <FieldIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--color-muted-foreground)]">{field.label}</span>
                </div>
                <Switch checked={false} onCheckedChange={() => toggleField(field.id)} />
              </div>
            )
          })}
          {hidden.length === 0 && !search && <p className="body-3 py-2 text-[var(--color-muted-foreground)]">All fields are shown</p>}
          {hidden.length > 0 && hiddenFiltered.length === 0 && search && <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching fields</p>}
        </div>
      </div>
    </motion.div>
  )
}
