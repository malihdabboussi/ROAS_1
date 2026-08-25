'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Check, Search, X } from 'lucide-react'
import { visiblePipelineClients } from '@/lib/agency-clients'
import { useClientScope } from '@/lib/client-scope'
import { cn } from '@/lib/utils/cn'

export function ClientScopeSelector() {
  const { clients, selectedClientId, scope, loading, setSelectedClientId } = useClientScope()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const visibleClients = useMemo(() => {
    const filteredClients = visiblePipelineClients(clients, {
      query,
      alwaysIncludeIds: selectedClientId ? [selectedClientId] : [],
    })

    if (!selectedClientId) return filteredClients

    const selectedClient = filteredClients.find((client) => client.id === selectedClientId)
    if (!selectedClient) return filteredClients

    return [selectedClient, ...filteredClients.filter((client) => client.id !== selectedClientId)]
  }, [clients, query, selectedClientId])

  const closeMenu = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu()
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [closeMenu, open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'btn-icon-bare hover:bg-hover-subtle',
          selectedClientId && 'nav-glass-selected-purple px-spacing-2 gap-spacing-1',
        )}
        aria-label={scope ? `Client filter: ${scope.clientName}` : 'Filter by client'}
        title={scope ? `Client: ${scope.clientName}` : 'Filter by client'}
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : setOpen(true))}
      >
        <Building2 className="icon-sm" aria-hidden />
        {scope ? <span className="body-4">1</span> : null}
      </button>
      {open ? (
        <div className="z-dropdown mt-spacing-1 absolute left-0 top-full">
          <div className="dropdown-menu-solid min-w-64 max-h-80 flex flex-col overflow-hidden">
            <div className="px-spacing-2 py-spacing-1 gap-spacing-2 flex items-center">
              <span className="body-3 text-foreground flex-1 font-medium">Client workspace</span>
              {selectedClientId ? (
                <button
                  type="button"
                  className="btn-icon-bare hover:bg-hover-subtle"
                  aria-label="Clear client filter"
                  onClick={() => {
                    setSelectedClientId(null)
                    closeMenu()
                  }}
                >
                  <X className="icon-xs" />
                </button>
              ) : null}
            </div>
            <label className="border-border px-spacing-2 py-spacing-2 gap-spacing-2 flex items-center border-y">
              <Search className="icon-sm text-muted-foreground shrink-0" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients"
                className="input-glass body-4 placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
                autoFocus
              />
            </label>
            <div className="p-spacing-2 min-h-0 flex-1 overflow-y-auto">
              <button
                type="button"
                className="hover:bg-hover-subtle px-spacing-2 py-spacing-2 gap-spacing-2 rounded-spacing-1 flex w-full items-center text-left"
                onClick={() => {
                  setSelectedClientId(null)
                  closeMenu()
                }}
              >
                <span className="h-spacing-5 w-spacing-5 flex items-center justify-center">
                  {!selectedClientId ? <Check className="icon-sm" /> : null}
                </span>
                <span className="body-3">All clients</span>
              </button>
              {visibleClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className="hover:bg-hover-subtle px-spacing-2 py-spacing-2 gap-spacing-2 rounded-spacing-1 flex w-full items-center text-left"
                  onClick={() => {
                    setSelectedClientId(client.id)
                    closeMenu()
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
              {!loading && visibleClients.length === 0 ? (
                <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-2">
                  {query.trim() ? 'No clients match your search.' : 'No active clients.'}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
