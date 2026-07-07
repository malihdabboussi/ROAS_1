'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  SPACES_CELL_TOAST_ERRORS,
  SPACES_CELL_TOAST_SUCCESS,
} from '../../config/spaces-toast-errors.config'
import type { BaseCellProps } from './cell-types'

interface CurrencyDef {
  code: string
  symbol: string
  name: string
}

const CURRENCIES: CurrencyDef[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
]

const fmtCache: Record<string, Intl.NumberFormat> = {}
function getFmt(code: string): Intl.NumberFormat {
  if (!fmtCache[code])
    fmtCache[code] = new Intl.NumberFormat('en-US', { style: 'currency', currency: code })
  return fmtCache[code]
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function readCurrency(value: unknown): string {
  if (typeof value === 'object' && value !== null && 'currency' in value) {
    return String((value as { currency: string }).currency)
  }
  return 'USD'
}

function readAmount(value: unknown): number | null {
  if (typeof value === 'object' && value !== null && 'amount' in value) {
    return toNumber((value as { amount: unknown }).amount)
  }
  return toNumber(value)
}

export function CurrencyCell({
  value,
  onChange,
  readonly,
  openOnMount,
  bulkInlineEditor,
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const num = readAmount(value)
  const currencyCode = readCurrency(value)
  const [open, setOpen] = useState(!!openOnMount && !bulkInlineEditor)
  const [draft, setDraft] = useState(num != null ? String(num) : '')
  const [selectedCurrency, setSelectedCurrency] = useState(currencyCode)
  const [error, setError] = useState('')
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const activeCurrency = useMemo(
    () => CURRENCIES.find((c) => c.code === selectedCurrency) ?? CURRENCIES[0]!,
    [selectedCurrency],
  )
  const fmt = useMemo(() => getFmt(activeCurrency.code), [activeCurrency.code])

  useEffect(() => {
    setDraft(num != null ? String(num) : '')
  }, [num])
  useEffect(() => {
    setSelectedCurrency(currencyCode)
  }, [currencyCode])
  useEffect(() => {
    if (!open) {
      setError('')
      setCurrencyOpen(false)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropW = 240
    const maxLeft = window.innerWidth - dropW - 8
    setPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, maxLeft)) })
  }, [open])

  useEffect(() => {
    if (open && !currencyOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, currencyOpen])

  useEffect(() => {
    if (bulkInlineEditor) setTimeout(() => inputRef.current?.focus(), 50)
  }, [bulkInlineEditor])

  useEffect(() => {
    if (!open) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!dropdownRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (currencyOpen) {
          setCurrencyOpen(false)
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
  }, [open, currencyOpen])

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed) {
      if (num != null) {
        onChange(null)
        toast.success(SPACES_CELL_TOAST_SUCCESS.AMOUNT_CLEARED.userMessage)
      }
      setOpen(false)
      return
    }
    const parsed = Number(trimmed)
    if (Number.isNaN(parsed)) {
      setError('Enter a valid amount')
      toast.error(SPACES_CELL_TOAST_ERRORS.INVALID_AMOUNT.userMessage)
      return
    }
    setError('')
    const next =
      selectedCurrency === 'USD' ? parsed : { amount: parsed, currency: selectedCurrency }
    onChange(next)
    toast.success(SPACES_CELL_TOAST_SUCCESS.AMOUNT_SAVED.userMessage)
    setOpen(false)
  }

  if (!readonly && bulkInlineEditor) {
    return (
      <div className="w-full overflow-hidden rounded-lg" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 p-1">
          <button
            type="button"
            onClick={() => setCurrencyOpen((o) => !o)}
            className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <span className="text-[var(--foreground)]">{activeCurrency.symbol}</span>
            <span className="text-[var(--color-muted-foreground)]">{activeCurrency.code}</span>
            <ChevronDown className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]" />
          </button>
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              }
            }}
            placeholder="0.00"
            className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
          />
        </div>
        {currencyOpen && (
          <div className="max-h-[220px] overflow-y-auto border-t border-[var(--color-border)] py-1">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setSelectedCurrency(c.code)
                  setCurrencyOpen(false)
                  setTimeout(() => inputRef.current?.focus(), 50)
                }}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${c.code === selectedCurrency ? 'bg-[var(--color-hover-subtle)]' : ''}`}
              >
                <span className="w-5 shrink-0 text-center font-medium text-[var(--foreground)]">
                  {c.symbol}
                </span>
                <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">{c.name}</span>
                <span className="shrink-0 text-[var(--color-muted-foreground)]">{c.code}</span>
              </button>
            ))}
          </div>
        )}
        {error ? (
          <div className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-2 py-1.5 text-[11px] text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </div>
        ) : (
          <div className="flex justify-end px-1 py-0.5">
            <button
              type="button"
              onClick={commit}
              className="rounded px-2 py-0.5 text-[11px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
            >
              Save
            </button>
          </div>
        )}
      </div>
    )
  }

  if (readonly) {
    return num != null ? (
      <span className="text-sm text-[var(--foreground)]">{fmt.format(num)}</span>
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
        className="flex min-w-0 items-center text-left"
        title={
          num != null
            ? fmt.format(num)
            : `Add amount · ${activeCurrency.code} (${activeCurrency.symbol})`
        }
      >
        {num != null ? (
          <span className="min-w-0 truncate text-xs text-[var(--foreground)]">
            {fmt.format(num)}
          </span>
        ) : (
          <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
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
          >
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                onClick={() => setCurrencyOpen((o) => !o)}
                className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <span className="text-[var(--foreground)]">{activeCurrency.symbol}</span>
                <span className="text-[var(--color-muted-foreground)]">{activeCurrency.code}</span>
                <ChevronDown className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]" />
              </button>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commit()
                  }
                }}
                placeholder="0.00"
                className={`min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] ${error ? 'text-red-400' : ''}`}
              />
            </div>

            {currencyOpen && (
              <div className="max-h-[220px] overflow-y-auto border-t border-[var(--color-border)] py-1">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCurrency(c.code)
                      setCurrencyOpen(false)
                      setTimeout(() => inputRef.current?.focus(), 50)
                    }}
                    className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${c.code === selectedCurrency ? 'bg-[var(--color-hover-subtle)]' : ''}`}
                  >
                    <span className="w-5 shrink-0 text-center font-medium text-[var(--foreground)]">
                      {c.symbol}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                      {c.name}
                    </span>
                    <span className="shrink-0 text-[var(--color-muted-foreground)]">{c.code}</span>
                  </button>
                ))}
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
