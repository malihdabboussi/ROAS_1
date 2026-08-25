'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  fetchAgencyClient,
  fetchAgencyClients,
  type AgencyClient,
  type AgencyClientWorkspace,
} from '@/lib/agency-clients'
import { useOrgStore } from '@/lib/org'
import { clientScopeHref, resolveClientScope, type ResolvedClientScope } from './client-scope-match'

type ClientScopeContextValue = {
  clients: AgencyClient[]
  selectedClientId: string | null
  scope: ResolvedClientScope | null
  loading: boolean
  setSelectedClientId: (clientId: string | null) => void
}

const ClientScopeContext = createContext<ClientScopeContextValue | null>(null)
const UNSCOPED_CLIENT_CONTEXT: ClientScopeContextValue = {
  clients: [],
  selectedClientId: null,
  scope: null,
  loading: false,
  setSelectedClientId: () => undefined,
}

export function ClientScopeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/home'
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const requestedClientId = searchParams.get('client')?.trim() || null
  const [selectedClientId, setSelectedClientState] = useState<string | null>(requestedClientId)
  const [clients, setClients] = useState<AgencyClient[]>([])
  const [workspace, setWorkspace] = useState<AgencyClientWorkspace | null>(null)
  const [clientsLoading, setClientsLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(Boolean(requestedClientId))

  useEffect(() => {
    if (requestedClientId) {
      setSelectedClientState(requestedClientId)
      return
    }
    try {
      setSelectedClientState(localStorage.getItem(`roas-client-scope:${activeOrgId ?? 'personal'}`))
    } catch {
      setSelectedClientState(null)
    }
  }, [activeOrgId, requestedClientId])

  useEffect(() => {
    let cancelled = false
    setClientsLoading(true)
    void fetchAgencyClients('', false)
      .then((response) => {
        if (!cancelled) setClients(response.clients)
      })
      .catch(() => {
        if (!cancelled) setClients([])
      })
      .finally(() => {
        if (!cancelled) setClientsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  useEffect(() => {
    if (!selectedClientId) {
      setWorkspace(null)
      setWorkspaceLoading(false)
      return
    }
    let cancelled = false
    setWorkspace(null)
    setWorkspaceLoading(true)
    void fetchAgencyClient(selectedClientId, false)
      .then((nextWorkspace) => {
        if (!cancelled) setWorkspace(nextWorkspace)
      })
      .catch(() => {
        if (!cancelled) setWorkspace(null)
      })
      .finally(() => {
        if (!cancelled) setWorkspaceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedClientId])

  const selectedWorkspace = workspace?.client.id === selectedClientId ? workspace : null
  const client =
    clients.find((row) => row.id === selectedClientId) ?? selectedWorkspace?.client ?? null
  const scope = useMemo(
    () => (client ? resolveClientScope(client, selectedWorkspace) : null),
    [client, selectedWorkspace],
  )
  const loading = clientsLoading || workspaceLoading

  const setSelectedClientId = useCallback(
    (clientId: string | null) => {
      setSelectedClientState(clientId)
      try {
        const key = `roas-client-scope:${activeOrgId ?? 'personal'}`
        if (clientId) localStorage.setItem(key, clientId)
        else localStorage.removeItem(key)
      } catch {
        // URL state remains authoritative when browser storage is unavailable.
      }
      const href = clientScopeHref(`${pathname}?${searchParams.toString()}`, clientId)
      router.push(href, { scroll: false })
    },
    [activeOrgId, pathname, router, searchParams],
  )

  useEffect(() => {
    if (!selectedClientId) return
    const applyScope = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      const href = anchor.getAttribute('href')
      if (!href || /^(#|mailto:|tel:|javascript:|https?:\/\/)/i.test(href)) return
      anchor.setAttribute('href', clientScopeHref(href, selectedClientId))
    }
    document.addEventListener('pointerdown', applyScope, true)
    document.addEventListener('contextmenu', applyScope, true)
    return () => {
      document.removeEventListener('pointerdown', applyScope, true)
      document.removeEventListener('contextmenu', applyScope, true)
    }
  }, [selectedClientId])

  useEffect(() => {
    if (!selectedClientId || requestedClientId) return
    router.replace(clientScopeHref(`${pathname}?${searchParams.toString()}`, selectedClientId), {
      scroll: false,
    })
  }, [pathname, requestedClientId, router, searchParams, selectedClientId])

  useEffect(() => {
    if (loading || !selectedClientId || scope) return
    setSelectedClientId(null)
  }, [loading, scope, selectedClientId, setSelectedClientId])

  const value = useMemo(
    () => ({ clients, selectedClientId, scope, loading, setSelectedClientId }),
    [clients, loading, scope, selectedClientId, setSelectedClientId],
  )

  return (
    <ClientScopeContext.Provider value={value}>
      {selectedClientId && !scope ? (
        <div className="bg-background flex h-full min-h-0 w-full items-center justify-center">
          <Loader2
            className="icon-md text-muted-foreground animate-spin"
            aria-label="Loading client workspace"
          />
        </div>
      ) : (
        children
      )}
    </ClientScopeContext.Provider>
  )
}

export function useClientScope() {
  return useContext(ClientScopeContext) ?? UNSCOPED_CLIENT_CONTEXT
}
