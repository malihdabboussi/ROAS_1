'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import {
  listPageGraderClients,
  type PageGraderClient,
} from '../services/page-grader-send.service'

type Props = {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selectedCount: number
  onClose: () => void
  onSend: (input: { clientId: string; note: string }) => Promise<void>
}

export function PageGraderBulkSendPanel({
  anchorRef,
  selectedCount,
  onClose,
  onSend,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [clients, setClients] = useState<PageGraderClient[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const width = 280
    const rect = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.top
    const placeAbove = spaceBelow < 360 && rect.top > 360
    const rawLeft = rect.left + rect.width / 2 - width / 2
    const maxLeft = window.innerWidth - width - 8
    setPos({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rawLeft, maxLeft)),
    })
  }, [anchorRef])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void listPageGraderClients(query)
      .then((rows) => {
        if (cancelled) return
        setClients(rows)
        setSelectedClientId((prev) => {
          if (prev && rows.some((c) => c.id === prev)) return prev
          return rows[0]?.id ?? null
        })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Could not load Page Grader clients')
        setClients([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query])

  if (!pos) return null

  return createPortal(
    <div
      ref={panelRef}
      className="dropdown-menu-solid fixed flex max-h-96 w-[280px] flex-col overflow-hidden"
      style={{
        top: pos.top,
        left: pos.left,
        zIndex: 100000,
        transform: pos.top < 100 ? undefined : 'translateY(-100%)',
      }}
    >
      <div className="border-border border-b px-3 py-2">
        <p className="text-foreground text-xs font-medium">Send to Page Grader</p>
        <p className="text-muted-foreground text-xs">
          {selectedCount} task{selectedCount > 1 ? 's' : ''} → pick a client
        </p>
      </div>

      <div className="border-border border-b px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading clients…
          </div>
        ) : loadError ? (
          <p className="text-destructive px-2 py-3 text-xs">{loadError}</p>
        ) : clients.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-xs">No clients found.</p>
        ) : (
          clients.map((client) => {
            const selected = client.id === selectedClientId
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                className={
                  selected
                    ? 'bg-secondary text-foreground flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs'
                    : 'text-foreground hover:bg-hover-subtle flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs'
                }
              >
                <span className="truncate">{client.name}</span>
              </button>
            )
          })
        )}
      </div>

      <div className="border-border border-t px-3 py-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note"
          rows={2}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-md border px-2 py-1.5 text-xs outline-none"
        />
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-hover-subtle flex-1 rounded-md px-2 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedClientId || sending || loading}
            onClick={() => {
              if (!selectedClientId) return
              setSending(true)
              void onSend({ clientId: selectedClientId, note })
                .catch(() => undefined)
                .finally(() => setSending(false))
            }}
            className="button-glass-accent flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
