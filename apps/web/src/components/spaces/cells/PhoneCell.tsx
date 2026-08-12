'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ChevronDown, Phone, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  SPACES_CELL_TOAST_ERRORS,
  SPACES_CELL_TOAST_SUCCESS,
} from '@/lib/config/spaces-toast-errors.config'
import { COUNTRY_DIAL_LIST } from '@/lib/constants/countries'
import { cn } from '@/lib/utils/cn'
import type { BaseCellProps } from './cell-types'

function toPhone(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const PHONE_RE = /^[+]?[\d\s().-]{7,20}$/
const MIN_DIGITS = 7

function detectCountryCode(phone: string): string {
  if (!phone.startsWith('+')) return 'US'
  const sorted = [...COUNTRY_DIAL_LIST].sort((a, b) => b.dial.length - a.dial.length)
  for (const c of sorted) {
    if (phone.startsWith(c.dial)) return c.code
  }
  return 'US'
}

function stripDialCode(phone: string, dialCode: string): string {
  if (phone.startsWith(dialCode)) return phone.slice(dialCode.length).trim()
  return phone.replace(/^\+/, '').trim()
}

export function PhoneCell({
  field: _field,
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
  openOnMount,
  bulkInlineEditor,
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const phone = toPhone(value)
  const kanbanEmpty = fieldRowVariant === 'kanban' && !phone
  const [open, setOpen] = useState(!!openOnMount && !bulkInlineEditor)
  const [countryCode, setCountryCode] = useState(() => detectCountryCode(phone))
  const [localNumber, setLocalNumber] = useState(() => {
    const c = COUNTRY_DIAL_LIST.find((e) => e.code === detectCountryCode(phone))
    return c ? stripDialCode(phone, c.dial) : phone.replace(/^\+\d+\s*/, '')
  })
  const [error, setError] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const countrySearchRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const selectedCountry = useMemo(
    () => COUNTRY_DIAL_LIST.find((c) => c.code === countryCode) ?? COUNTRY_DIAL_LIST[0]!,
    [countryCode],
  )

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRY_DIAL_LIST
    const q = countrySearch.toLowerCase()
    return COUNTRY_DIAL_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    )
  }, [countrySearch])

  useEffect(() => {
    const cc = detectCountryCode(phone)
    setCountryCode(cc)
    const c = COUNTRY_DIAL_LIST.find((e) => e.code === cc)
    setLocalNumber(c ? stripDialCode(phone, c.dial) : phone.replace(/^\+\d+\s*/, ''))
  }, [phone])

  useEffect(() => {
    if (!open) {
      setError('')
      setCountryOpen(false)
      setCountrySearch('')
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 280
    const maxLeft = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft)) })
  }, [open])

  useEffect(() => {
    if (open && !countryOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, countryOpen])

  useEffect(() => {
    if (bulkInlineEditor) setTimeout(() => inputRef.current?.focus(), 50)
  }, [bulkInlineEditor])

  useEffect(() => {
    if (countryOpen) setTimeout(() => countrySearchRef.current?.focus(), 50)
  }, [countryOpen])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!dropdownRef.current?.contains(t) && !triggerRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (countryOpen) {
          setCountryOpen(false)
          setCountrySearch('')
          e.stopPropagation()
        } else setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey, true)
    }
  }, [open, countryOpen])

  function commit() {
    const trimmed = localNumber.trim()
    if (!trimmed) {
      if (phone) {
        onChange('')
        toast.success(SPACES_CELL_TOAST_SUCCESS.PHONE_CLEARED.userMessage)
      }
      setOpen(false)
      return
    }
    const full = `${selectedCountry.dial} ${trimmed}`
    const digitCount = full.replace(/\D/g, '').length
    if (!PHONE_RE.test(full) || digitCount < MIN_DIGITS) {
      setError('Enter a valid phone number (min 7 digits)')
      toast.error(SPACES_CELL_TOAST_ERRORS.INVALID_PHONE.userMessage)
      return
    }
    setError('')
    if (full !== phone) {
      onChange(full)
      toast.success(SPACES_CELL_TOAST_SUCCESS.PHONE_SAVED.userMessage)
    }
    setOpen(false)
  }

  if (!readonly && bulkInlineEditor) {
    return (
      <div className="w-full overflow-hidden rounded-lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 p-1">
          <button
            type="button"
            onClick={() => setCountryOpen((o) => !o)}
            className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <span>{selectedCountry.flag}</span>
            <span className="text-[var(--color-muted-foreground)]">{selectedCountry.dial}</span>
            <ChevronDown className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]" />
          </button>
          <input
            ref={inputRef}
            type="tel"
            value={localNumber}
            onChange={(e) => {
              setLocalNumber(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
            }}
            placeholder="Phone number"
            className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
          />
        </div>
        {countryOpen && (
          <div className="border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                ref={countrySearchRef}
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country…"
                className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
              />
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCountryCode(c.code)
                    setCountryOpen(false)
                    setCountrySearch('')
                    setTimeout(() => inputRef.current?.focus(), 50)
                  }}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${c.code === countryCode ? 'bg-[var(--color-hover-subtle)]' : ''}`}
                >
                  <span>{c.flag}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">{c.name}</span>
                  <span className="shrink-0 text-[var(--color-muted-foreground)]">{c.dial}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-2 py-1.5 text-[11px] text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </div>
        )}
      </div>
    )
  }

  if (readonly) {
    return phone ? (
      <a
        href={`tel:${phone}`}
        className="block min-w-0 max-w-full truncate text-sm text-blue-400 transition-colors hover:text-blue-300"
        title={phone}
      >
        {phone}
      </a>
    ) : (
      <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
    )
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
          'flex min-w-0 max-w-full items-center gap-1.5 text-left',
          kanbanEmpty ? 'h-full w-full justify-center' : 'w-full',
        )}
        title={phone || 'Add phone'}
      >
        {phone ? (
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--foreground)]">{phone}</span>
        ) : (
          <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
        )}
      </button>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid fixed z-[99999] w-[280px] overflow-hidden rounded-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                onClick={() => setCountryOpen((o) => !o)}
                className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span>{selectedCountry.flag}</span>
                <span className="text-[var(--color-muted-foreground)]">{selectedCountry.dial}</span>
                <ChevronDown className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]" />
              </button>
              <input
                ref={inputRef}
                type="tel"
                value={localNumber}
                onChange={(e) => {
                  setLocalNumber(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commit()
                  }
                }}
                placeholder="Phone number"
                className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
              />
            </div>

            {countryOpen && (
              <div className="border-t border-[var(--color-border)]">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Search className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
                  <input
                    ref={countrySearchRef}
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search country…"
                    className="min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountryCode(c.code)
                        setCountryOpen(false)
                        setCountrySearch('')
                        setTimeout(() => inputRef.current?.focus(), 50)
                      }}
                      className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${c.code === countryCode ? 'bg-[var(--color-hover-subtle)]' : ''}`}
                    >
                      <span>{c.flag}</span>
                      <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-[var(--color-muted-foreground)]">
                        {c.dial}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-2 py-1.5 text-[11px] text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {error}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
