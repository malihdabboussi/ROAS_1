'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { normalizeContactVisibleFieldOrderIds } from '../../../../lib/contact-view-field-meta'
import type { ViewDef } from '../../../../types/space-schema'
import { CONTACT_FIELD_DEFS } from './contacts-customize.config'

export function ContactsFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: {
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [localContactIds, setLocalContactIds] = useState<string[]>(() =>
    normalizeContactVisibleFieldOrderIds(activeView.visible_fields),
  )
  useEffect(() => {
    setLocalContactIds(normalizeContactVisibleFieldOrderIds(activeView.visible_fields))
  }, [activeView.id])

  const visibleSet = useMemo(() => new Set(localContactIds), [localContactIds])

  const hidden = useMemo(
    () => CONTACT_FIELD_DEFS.filter((f) => !visibleSet.has(f.id)),
    [visibleSet],
  )

  const contactFieldMatchesQuery = useCallback((label: string, q: string) => {
    if (!q) return true
    return label.toLowerCase().includes(q.toLowerCase())
  }, [])

  const shownOrdered = useMemo(() => {
    const byId = new Map(CONTACT_FIELD_DEFS.map((f) => [f.id, f]))
    return localContactIds
      .map((id) => byId.get(id))
      .filter((f): f is (typeof CONTACT_FIELD_DEFS)[number] => Boolean(f))
  }, [localContactIds])

  const shownFiltered = useMemo(
    () => shownOrdered.filter((f) => contactFieldMatchesQuery(f.label, search)),
    [shownOrdered, search, contactFieldMatchesQuery],
  )
  const hiddenFiltered = useMemo(() => {
    const list = hidden.filter((f) => contactFieldMatchesQuery(f.label, search))
    return [...list].sort((a, b) => a.label.localeCompare(b.label))
  }, [hidden, search, contactFieldMatchesQuery])

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  function toggleField(fieldId: string) {
    const current = localContactIds
    const isVisible = current.includes(fieldId)
    const next = isVisible ? current.filter((id) => id !== fieldId) : [...current, fieldId]
    setLocalContactIds(next)
    void onViewPatch({ visible_fields: next })
  }

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">Fields</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

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
              <div
                key={field.id}
                className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FieldIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">{field.label}</span>
                </div>
                <Switch
                  checked
                  onCheckedChange={() => toggleField(field.id)}
                  disabled={field.id === 'email' || field.id === 'title'}
                />
              </div>
            )
          })}
          {shownFiltered.length === 0 && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching fields</p>
          )}
        </div>

        <div className="mb-1 mt-3 flex items-center justify-between">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Hidden</p>
        </div>
        <div className="space-y-0.5">
          {hiddenFiltered.map((field) => {
            const FieldIcon = field.icon
            return (
              <div
                key={field.id}
                className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FieldIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--color-muted-foreground)]">
                    {field.label}
                  </span>
                </div>
                <Switch checked={false} onCheckedChange={() => toggleField(field.id)} />
              </div>
            )
          })}
          {hidden.length === 0 && !search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">All fields are shown</p>
          )}
          {hidden.length > 0 && hiddenFiltered.length === 0 && search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching fields</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
