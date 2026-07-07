'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, Globe, Search, X } from 'lucide-react'
import type { CustomDomain } from '@/lib/domains/domains.types'
import type { Funnel } from '@/lib/artifacts/artifact-types'
import { cn } from '@/lib/utils/cn'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'

export function FunnelCustomDomainSection(props: {
  funnel: Funnel
  domains: CustomDomain[]
  domainsLoading: boolean
  selectedDomainId: string
  setSelectedDomainId: (id: string) => void
  domainActionLoading: boolean
  onConnect: (domainId: string) => void | Promise<void>
  onDisconnect: () => void | Promise<void>
  onOpenDomainsWorkspace: () => void
  onOpenAddDomain: () => void
}) {
  const {
    funnel,
    domains,
    domainsLoading,
    selectedDomainId,
    setSelectedDomainId,
    domainActionLoading,
    onConnect,
    onDisconnect: _onDisconnect,
    onOpenDomainsWorkspace,
    onOpenAddDomain,
  } = props

  const [domainSearch, setDomainSearch] = useState('')
  const selectedDomain = useMemo(() => {
    if (!selectedDomainId) return null
    return (
      (domains ?? []).find(
        (d) => d.domain_type !== 'generated' && d.id === selectedDomainId,
      ) ?? null
    )
  }, [domains, selectedDomainId])

  const customDomains = useMemo(
    () => (domains ?? []).filter((d) => d.domain_type !== 'generated'),
    [domains],
  )
  const connectedDomain = useMemo(
    () =>
      funnel.domain_id
        ? customDomains.find((d) => d.id === funnel.domain_id) ?? null
        : null,
    [customDomains, funnel.domain_id],
  )

  const filteredDomains = useMemo(() => {
    const q = domainSearch.trim().toLowerCase()
    if (!q) return customDomains
    return customDomains.filter((d) => d.domain_name.toLowerCase().includes(q))
  }, [customDomains, domainSearch])

  const summary = domainsLoading
    ? 'Loading…'
    : connectedDomain
      ? connectedDomain.domain_name
      : selectedDomain
        ? selectedDomain.domain_name
        : customDomains.length === 0
          ? 'No domains'
          : 'Choose domain'

  const panelAnchorRef = useRef<HTMLButtonElement>(null)
  const panelMenuRef = useRef<HTMLDivElement>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  )

  const needsDomainVerification =
    !funnel.domain_id &&
    !!selectedDomainId &&
    !!selectedDomain &&
    selectedDomain.status !== 'verified'

  useLayoutEffect(() => {
    if (!panelOpen || !panelAnchorRef.current) return
    const rect = panelAnchorRef.current.getBoundingClientRect()
    setPanelPos({ top: rect.bottom + 6, left: rect.left, width: rect.width })
  }, [panelOpen])

  useEffect(() => {
    if (!panelOpen) setDomainSearch('')
  }, [panelOpen])

  useEffect(() => {
    if (!panelOpen) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (panelAnchorRef.current?.contains(t)) return
      if (t.closest('[data-funnel-domain-panel]')) return
      setPanelOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [panelOpen])

  const domainVerificationLabel = (d: CustomDomain | null | undefined) =>
    d?.status ? (
      <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
        {d.status === 'verified' ? 'Verified' : 'Not verified'}
      </span>
    ) : null

  const handlePickDomain = (d: CustomDomain) => {
    if (domainActionLoading) return
    setSelectedDomainId(d.id)
    if (d.status === 'verified' && funnel.domain_id !== d.id) {
      void onConnect(d.id)
    }
  }

  const handleAddNew = () => {
    setPanelOpen(false)
    onOpenAddDomain()
  }

  return (
    <>
      <button
        ref={panelAnchorRef}
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        className="flex w-full items-center justify-between transition-colors hover:opacity-80"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="body-3 font-semibold text-[var(--foreground)]">Custom Domain</span>
        </div>
        <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
          <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
            {summary}
          </span>
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
              panelOpen && 'rotate-90',
            )}
          />
        </div>
      </button>

      {panelOpen &&
        panelPos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelMenuRef}
            data-funnel-domain-panel=""
            {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
            className="dropdown-menu-solid fixed z-[99999] flex max-h-96 flex-col overflow-hidden rounded-xl shadow-lg"
            style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
          >
            {domainsLoading ? (
              <div className="px-4 py-3">
                <p className="body-3 text-[var(--color-muted-foreground)]">Loading domains...</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {customDomains.length > 0 ? (
                  <div className="shrink-0 px-4 py-2">
                    <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
                      <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                      <input
                        type="search"
                        value={domainSearch}
                        onChange={(e) => setDomainSearch(e.target.value)}
                        placeholder="Search domains…"
                        disabled={domainActionLoading}
                        className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                      />
                      {domainSearch ? (
                        <button
                          type="button"
                          disabled={domainActionLoading}
                          onClick={() => setDomainSearch('')}
                          className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-2">
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={handleAddNew}
                      disabled={domainActionLoading}
                      className="body-3 flex h-8 w-full items-center rounded-lg px-3 text-left font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50"
                    >
                      + Add New
                    </button>

                    {customDomains.length === 0 ? (
                      <p className="body-3 px-3 py-2 text-[var(--color-muted-foreground)]">
                        No custom domains yet.
                      </p>
                    ) : null}

                    {customDomains.length > 0 &&
                      filteredDomains.map((d) => {
                        const connectedHere = funnel.domain_id === d.id
                        return (
                          <button
                            key={d.id}
                            type="button"
                            disabled={domainActionLoading}
                            onClick={() => handlePickDomain(d)}
                            className={cn(
                              'body-3 flex h-8 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50',
                              connectedHere && 'bg-[var(--color-secondary)]',
                            )}
                          >
                            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                              <span className="truncate">{d.domain_name}</span>
                              {domainVerificationLabel(d)}
                            </span>
                            {connectedHere ? (
                              <span className="badge-glass-blue flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
                                <Check className="h-3 w-3 shrink-0 stroke-2 text-current" aria-hidden />
                              </span>
                            ) : null}
                          </button>
                        )
                      })}

                    {customDomains.length > 0 &&
                      !domainActionLoading &&
                      domainSearch.trim() &&
                      filteredDomains.length === 0 ? (
                      <p className="body-3 px-3 py-2 text-[var(--color-muted-foreground)]">
                        No matching domains.
                      </p>
                    ) : null}
                  </div>
                </div>

                {needsDomainVerification ? (
                  <div className="shrink-0 border-t border-[var(--border)] px-2 pb-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenDomainsWorkspace()}
                      disabled={domainActionLoading}
                      className="body-3 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-50"
                    >
                      Verify domain
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
