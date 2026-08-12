'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, Contact, Plus, Search, X } from 'lucide-react'
import { backendGet, backendPost } from '@/lib/api/backend-client'

interface ContactBasic {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
}

interface ContactsResponse {
  data: ContactBasic[]
  total: number
}

const cache = new Map<string, ContactBasic>()

function displayName(contact: ContactBasic): string {
  return (
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.email ||
    contact.phone ||
    'Contact'
  )
}

function initials(label: string): string {
  return (
    label
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function ContactCell({
  value,
  onChange,
  readonly,
}: {
  value: unknown
  onChange: (value: unknown) => void
  readonly?: boolean
}) {
  const contactId = typeof value === 'string' && value ? value : null
  const [selected, setSelected] = useState<ContactBasic | null>(
    contactId ? (cache.get(contactId) ?? null) : null,
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ContactBasic[]>([])
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!contactId) {
      setSelected(null)
      return
    }
    const cached = cache.get(contactId)
    if (cached) {
      setSelected(cached)
      return
    }
    let cancelled = false
    backendGet<ContactBasic[]>(`/api/leads/contacts/basics?ids=${encodeURIComponent(contactId)}`)
      .then((rows) => {
        const row = rows[0] ?? null
        if (row) cache.set(row.id, row)
        if (!cancelled) setSelected(row)
      })
      .catch(() => {
        if (!cancelled) setSelected(null)
      })
    return () => {
      cancelled = true
    }
  }, [contactId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    backendGet<ContactsResponse>(
      `/api/leads/contacts?search=${encodeURIComponent(query)}&limit=20&offset=0`,
    )
      .then((res) => {
        if (cancelled) return
        for (const row of res.data ?? []) cache.set(row.id, row)
        setResults(res.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setResults([])
      })
    return () => {
      cancelled = true
    }
  }, [open, query])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPos(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    const width = 320
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPos({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const close = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && dropdownRef.current?.contains(target)) return
      if (target && triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const selectedLabel = selected ? displayName(selected) : null
  const canCreate = useMemo(() => isEmail(query.trim()), [query])

  async function createContact() {
    const email = query.trim().toLowerCase()
    if (!isEmail(email)) return
    const created = await backendPost<ContactBasic>('/api/leads/contacts', { email })
    cache.set(created.id, created)
    onChange(created.id)
    setSelected(created)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={readonly}
        onClick={() => !readonly && setOpen((next) => !next)}
        className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex min-w-0 max-w-full items-center text-left disabled:cursor-default disabled:hover:bg-transparent"
      >
        {selectedLabel ? (
          <>
            <span className="bg-secondary h-spacing-6 w-spacing-6 typo-caption flex shrink-0 items-center justify-center rounded-full font-semibold">
              {initials(selectedLabel)}
            </span>
            <span className="min-w-0 truncate">{selectedLabel}</span>
          </>
        ) : (
          <>
            <Contact className="icon-sm text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Add contact</span>
          </>
        )}
      </button>
      {open && pos ? (
        <div
          ref={dropdownRef}
          data-dropdown
          className="dropdown-menu-solid z-dropdown rounded-spacing-3 border-border fixed flex max-h-80 w-80 flex-col overflow-hidden border shadow-lg"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border-b">
            <Search className="icon-sm text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contacts..."
              className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="icon-xs" />
              </button>
            ) : null}
          </div>
          <div className="p-spacing-1 min-h-0 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setSelected(null)
                setOpen(false)
              }}
              className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center"
            >
              <X className="icon-sm" />
              Clear
            </button>
            {canCreate ? (
              <button
                type="button"
                onClick={() => void createContact()}
                className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center"
              >
                <Plus className="icon-sm" />
                Create {query.trim()}
              </button>
            ) : null}
            {results.map((contact) => {
              const active = contact.id === contactId
              const label = displayName(contact)
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => {
                    onChange(contact.id)
                    setSelected(contact)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="hover:bg-hover-subtle text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 body-3 flex w-full items-center"
                >
                  <span className="bg-secondary h-spacing-6 w-spacing-6 typo-caption flex shrink-0 items-center justify-center rounded-full font-semibold">
                    {initials(label)}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="text-foreground block truncate">{label}</span>
                    {contact.email ? (
                      <span className="typo-caption text-muted-foreground block truncate">
                        {contact.email}
                      </span>
                    ) : null}
                  </span>
                  {active ? <Check className="icon-sm text-primary shrink-0" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </>
  )
}
