'use client'

import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PageGraderClient } from '../../services/page-grader-send.service'

export function PageGraderBulkClientStep({
  query,
  setQuery,
  loading,
  needsConnect,
  loadError,
  clients,
  filteredClients,
  selectedClientId,
  setSelectedClientId,
  selectedClient,
  onClose,
  openIntegrations,
  onContinue,
}: {
  query: string
  setQuery: (v: string) => void
  loading: boolean
  needsConnect: boolean
  loadError: string | null
  clients: PageGraderClient[]
  filteredClients: PageGraderClient[]
  selectedClientId: string | null
  setSelectedClientId: (id: string) => void
  selectedClient: PageGraderClient | null
  onClose: () => void
  openIntegrations: () => void
  onContinue: () => void
}) {
  return (
    <>
      <div className="border-border border-b px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients"
          className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
          disabled={needsConnect}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading clients…
          </div>
        ) : needsConnect ? (
          <div className="space-y-spacing-2 px-2 py-3">
            <p className="text-foreground text-xs">
              Connect The ROAS Portal in Settings first (API Base URL + API key), then send tasks
              here.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose()
                openIntegrations()
              }}
              className="button-glass-accent w-full rounded-md px-2 py-1.5 text-xs font-medium"
            >
              Open Integrations
            </button>
          </div>
        ) : loadError ? (
          <p className="text-destructive px-2 py-3 text-xs">{loadError}</p>
        ) : filteredClients.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-xs">
            {clients.length === 0 ? 'No clients found.' : 'No clients match your search.'}
          </p>
        ) : (
          filteredClients.map((client) => {
            const selected = client.id === selectedClientId
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClientId(client.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                  selected
                    ? 'bg-secondary text-foreground'
                    : 'text-foreground hover:bg-hover-subtle',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{client.name}</span>
                {selected ? <Check className="text-foreground h-3.5 w-3.5 shrink-0" /> : null}
              </button>
            )
          })
        )}
      </div>
      <div className="border-border border-t px-3 py-2">
        {selectedClient ? (
          <div className="bg-secondary mb-2 flex items-center gap-2 rounded-md px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Selected client
              </p>
              <p className="text-foreground truncate text-xs font-medium">{selectedClient.name}</p>
            </div>
            <Check className="text-foreground h-3.5 w-3.5 shrink-0" />
          </div>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-hover-subtle flex-1 rounded-md px-2 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedClientId || loading || needsConnect}
            onClick={onContinue}
            className="button-glass-accent flex-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
