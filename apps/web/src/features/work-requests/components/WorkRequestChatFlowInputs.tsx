'use client'

import { useEffect, useMemo, useState } from 'react'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'

function parseYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function toYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseAssetLines(value: string): Array<{ name: string; url: string }> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [left, ...rest] = line.split('|')
      const url = rest.join('|').trim()
      if (!left?.trim() || !url) return []
      return [{ name: left.trim(), url }]
    })
}

function serializeAssets(assets: Array<{ name: string; url: string }>): string {
  return assets.map((asset) => `${asset.name} | ${asset.url}`).join('\n')
}

export function WorkRequestDateStep({
  value,
  busy,
  onContinue,
  onSkip,
  required,
}: {
  value: string
  busy: boolean
  onContinue: (value: string) => void
  onSkip: () => void
  required: boolean
}) {
  const selected = useMemo(() => parseYmd(value), [value])
  const [month, setMonth] = useState(() => selected ?? new Date())

  useEffect(() => {
    if (selected) setMonth(selected)
  }, [selected])

  return (
    <div className="space-y-spacing-3">
      <div className="surface-card card-glass rounded-spacing-2 p-spacing-2">
        <MonthCalendar
          month={month}
          startDate={selected}
          endDate={selected}
          activeField="due"
          recurrence={null}
          onPrevMonth={() =>
            setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
          }
          onNextMonth={() =>
            setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
          }
          onSelectDate={(date) => onContinue(toYmd(date))}
          onJumpToday={() => {
            const today = new Date()
            setMonth(today)
            onContinue(toYmd(today))
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          {!required && (
            <button
              type="button"
              disabled={busy}
              onClick={onSkip}
              className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2"
            >
              Skip
            </button>
          )}
        </div>
        {selected ? (
          <p className="body-3 text-muted-foreground">Selected {toYmd(selected)}</p>
        ) : null}
      </div>
    </div>
  )
}

export function WorkRequestAssetsStep({
  value,
  busy,
  onContinue,
  onSkip,
  required,
}: {
  value: string
  busy: boolean
  onContinue: (value: string) => void
  onSkip: () => void
  required: boolean
}) {
  const [assets, setAssets] = useState(() => parseAssetLines(value))
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => setAssets(parseAssetLines(value)), [value])

  const addAsset = () => {
    const nextName = name.trim() || 'Asset'
    const nextUrl = url.trim()
    if (!nextUrl) return
    setAssets((current) => [...current, { name: nextName, url: nextUrl }])
    setName('')
    setUrl('')
  }

  return (
    <div className="space-y-spacing-3">
      {assets.length > 0 ? (
        <div className="space-y-spacing-2">
          {assets.map((asset, index) => (
            <div
              key={`${asset.url}-${index}`}
              className="border-border rounded-spacing-2 gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border"
            >
              <div className="min-w-0 flex-1">
                <p className="body-3 text-foreground truncate font-medium">{asset.name}</p>
                <p className="body-4 text-muted-foreground truncate">{asset.url}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAssets((current) => current.filter((_, i) => i !== index))}
                className="button-glass-neutral rounded-spacing-2 body-4 px-spacing-2 py-spacing-1 shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="body-3 text-muted-foreground">
          No assets yet. Add a Drive folder or file link.
        </p>
      )}

      <div className="gap-spacing-2 grid">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
          placeholder="Label (e.g. Source folder)"
          className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
        />
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={busy}
          placeholder="https://drive.google.com/..."
          className="body-3 rounded-spacing-2 border-border bg-background h-spacing-9 px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
        />
        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={addAsset}
          className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2 w-fit"
        >
          Add link
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          {!required && (
            <button
              type="button"
              disabled={busy}
              onClick={onSkip}
              className="button-glass-neutral rounded-spacing-2 body-3 px-spacing-3 py-spacing-2"
            >
              Skip
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onContinue(serializeAssets(assets))}
          className="button-glass-accent rounded-spacing-2 body-3 px-spacing-4 py-spacing-2 font-medium"
        >
          Next
        </button>
      </div>
    </div>
  )
}
