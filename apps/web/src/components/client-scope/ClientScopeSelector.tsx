'use client'

import { useEffect, useRef, useState } from 'react'
import { Building2, Check, X } from 'lucide-react'
import { useClientScope } from '@/lib/client-scope'
import { cn } from '@/lib/utils/cn'

export function ClientScopeSelector() {
  const { clients, selectedClientId, scope, loading, setSelectedClientId } = useClientScope()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'btn-icon-bare hover:bg-hover-subtle',
          selectedClientId && 'nav-glass-selected-purple px-spacing-2 gap-spacing-1 max-w-28',
        )}
        aria-label={scope ? `Client filter: ${scope.clientName}` : 'Filter by client'}
        title={scope ? `Client: ${scope.clientName}` : 'Filter by client'}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Building2 className="icon-sm" aria-hidden />
        {scope ? <span className="body-4 truncate">{scope.clientName}</span> : null}
      </button>
      {open ? (
        <div className="z-dropdown mt-spacing-1 absolute left-0 top-full">
          <div className="dropdown-menu-solid p-spacing-2 min-w-64">
            <div className="px-spacing-2 py-spacing-1 gap-spacing-2 flex items-center">
              <span className="body-3 text-foreground flex-1 font-medium">Client workspace</span>
              {selectedClientId ? (
                <button
                  type="button"
                  className="btn-icon-bare hover:bg-hover-subtle"
                  aria-label="Clear client filter"
                  onClick={() => {
                    setSelectedClientId(null)
                    setOpen(false)
                  }}
                >
                  <X className="icon-xs" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="hover:bg-hover-subtle px-spacing-2 py-spacing-2 gap-spacing-2 rounded-spacing-1 flex w-full items-center text-left"
              onClick={() => {
                setSelectedClientId(null)
                setOpen(false)
              }}
            >
              <span className="h-spacing-5 w-spacing-5 flex items-center justify-center">
                {!selectedClientId ? <Check className="icon-sm" /> : null}
              </span>
              <span className="body-3">All clients</span>
            </button>
            {clients.map((client) => (
              <button
                key={client.id}
                type="button"
                className="hover:bg-hover-subtle px-spacing-2 py-spacing-2 gap-spacing-2 rounded-spacing-1 flex w-full items-center text-left"
                onClick={() => {
                  setSelectedClientId(client.id)
                  setOpen(false)
                }}
              >
                <span className="h-spacing-5 w-spacing-5 flex items-center justify-center">
                  {selectedClientId === client.id ? <Check className="icon-sm" /> : null}
                </span>
                <span className="body-3 min-w-0 flex-1 truncate">
                  {client.display_name?.trim() || client.name}
                </span>
              </button>
            ))}
            {loading && clients.length === 0 ? (
              <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-2">
                Loading clients…
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
