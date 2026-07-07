'use client'

import { createPortal } from 'react-dom'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { backendPost } from '@/lib/api/backend-client'
import type { Presentation } from '@/lib/artifacts/artifact-types'

export type PresentationDomainOption = {
  id: string
  domain_name: string
  domain_type?: 'generated' | 'custom'
  status?: string
}

interface PresentationDomainSectionProps {
  presentation: Presentation
  domains: PresentationDomainOption[]
  domainsLoading: boolean
  selectedDomainId: string
  setSelectedDomainId: (domainId: string) => void
  domainDropdownOpen: boolean
  setDomainDropdownOpen: Dispatch<SetStateAction<boolean>>
  domainDropdownTriggerRef: RefObject<HTMLButtonElement | null>
  domainDropdownPos: { top: number; left: number; width: number }
  domainActionLoading: boolean
  setDomainActionLoading: (loading: boolean) => void
  setAddDomainOpen: (open: boolean) => void
  setPresentations: Dispatch<SetStateAction<Presentation[]>>
  onOpenDomainsWorkspace: (section: 'domains') => void
}

function domainVerificationBadge(domain: PresentationDomainOption | null | undefined) {
  if (!domain?.status) return null

  return (
    <span
      className={`badge-glass badge-glass-sm shrink-0 ${
        domain.status === 'verified'
          ? 'badge-glass-green'
          : domain.status === 'error' || domain.status === 'ssl_failed'
            ? 'badge-glass-red'
            : 'badge-glass-orange'
      }`}
    >
      {domain.status === 'verified' ? 'Verified' : 'Not verified'}
    </span>
  )
}

export function PresentationDomainSection({
  presentation,
  domains,
  domainsLoading,
  selectedDomainId,
  setSelectedDomainId,
  domainDropdownOpen,
  setDomainDropdownOpen,
  domainDropdownTriggerRef,
  domainDropdownPos,
  domainActionLoading,
  setDomainActionLoading,
  setAddDomainOpen,
  setPresentations,
  onOpenDomainsWorkspace,
}: PresentationDomainSectionProps) {
  const customDomains = domains.filter((domain) => domain.domain_type !== 'generated')
  const connectedDomain = presentation.domain_id
    ? customDomains.find((domain) => domain.id === presentation.domain_id)
    : null
  const selectedDomain = selectedDomainId
    ? customDomains.find((domain) => domain.id === selectedDomainId)
    : null
  const selectedDomainLabel = selectedDomain?.domain_name || 'Select a domain'
  const isConnected = !!presentation.domain_id
  const canConnect =
    !isConnected &&
    !!selectedDomainId &&
    selectedDomain?.status === 'verified' &&
    !domainActionLoading
  const needsDomainVerification =
    !isConnected &&
    !!selectedDomainId &&
    !!selectedDomain &&
    selectedDomain.status !== 'verified'
  const canDisconnect = isConnected && !domainActionLoading

  const connectDomain = async () => {
    if (!selectedDomainId) return
    setDomainActionLoading(true)
    try {
      const result = await backendPost<{ success: boolean; published_url?: string | null }>(
        '/api/domains/connect-presentation',
        {
          domain_id: selectedDomainId,
          presentation_id: presentation.id,
        },
      )
      setPresentations((prev) =>
        prev.map((item) =>
          item.id === presentation.id
            ? {
                ...item,
                domain_id: selectedDomainId,
                published_url: result.published_url ?? item.published_url,
              }
            : item,
        ),
      )
    } finally {
      setDomainActionLoading(false)
    }
  }

  const disconnectDomain = async () => {
    setDomainActionLoading(true)
    try {
      const result = await backendPost<{ success: boolean; published_url?: string | null }>(
        '/api/domains/disconnect-presentation',
        {
          presentation_id: presentation.id,
        },
      )
      setPresentations((prev) =>
        prev.map((item) =>
          item.id === presentation.id
            ? {
                ...item,
                domain_id: null,
                published_url: result.published_url ?? item.published_url,
              }
            : item,
        ),
      )
    } finally {
      setDomainActionLoading(false)
    }
  }

  return (
    <div className="space-y-spacing-2 pt-spacing-4 border-border border-t">
      <div className="gap-spacing-2 flex items-center">
        <Globe className="icon-sm text-muted-foreground" />
        <span className="body-3 text-foreground font-medium">Custom Domain</span>
      </div>
      {domainsLoading ? (
        <p className="body-3 text-muted-foreground">Loading domains...</p>
      ) : (
        <>
          {customDomains.length === 0 ? (
            <p className="body-3 text-muted-foreground">No custom domains yet.</p>
          ) : (
            <div className="gap-spacing-2 flex items-stretch">
              <div className="gap-spacing-3 flex min-w-0 flex-1 flex-col">
                <div className="relative">
                  <button
                    ref={domainDropdownTriggerRef}
                    type="button"
                    onClick={() => setDomainDropdownOpen((open) => !open)}
                    disabled={domainActionLoading}
                    className="gap-spacing-2 h-spacing-10 px-spacing-3 input-glass rounded-spacing-2 flex w-full items-center justify-between transition-colors"
                  >
                    <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
                      <span className="body-3 text-foreground truncate text-left">
                        {selectedDomainLabel}
                      </span>
                      {domainVerificationBadge(selectedDomain)}
                    </div>
                    <ChevronDown
                      className={`icon-sm text-muted-foreground shrink-0 transition-transform ${
                        domainDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {domainDropdownOpen &&
                    typeof document !== 'undefined' &&
                    createPortal(
                      <div
                        className="z-dropdown fixed"
                        style={{
                          top: domainDropdownPos.top,
                          left: domainDropdownPos.left,
                          width: domainDropdownPos.width,
                        }}
                        data-dropdown
                      >
                        <div className="dropdown-menu-solid rounded-spacing-2 max-h-60 overflow-hidden">
                          <div className="p-spacing-1 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setDomainDropdownOpen(false)
                                setAddDomainOpen(true)
                              }}
                              className="px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle hover:text-foreground text-muted-foreground flex w-full items-center justify-between text-left transition-all"
                            >
                              <span>+ Add New Domain</span>
                            </button>
                            <div className="border-border my-1 border-t" />
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDomainId('')
                                setDomainDropdownOpen(false)
                              }}
                              className="px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle hover:text-foreground text-muted-foreground flex w-full items-center justify-between text-left transition-all"
                            >
                              <span>Select a domain</span>
                            </button>
                            {customDomains.map((domain) => {
                              const isSelected = selectedDomainId === domain.id
                              return (
                                <button
                                  key={domain.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedDomainId(domain.id)
                                    setDomainDropdownOpen(false)
                                  }}
                                  className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 gap-spacing-2 flex w-full items-center justify-between text-left transition-all ${
                                    isSelected
                                      ? 'dropdown-option-selected'
                                      : 'hover:bg-hover-subtle hover:text-foreground text-muted-foreground'
                                  }`}
                                >
                                  <span className="gap-spacing-2 flex min-w-0 flex-1 items-center">
                                    <span className="truncate">{domain.domain_name}</span>
                                    {domainVerificationBadge(domain)}
                                  </span>
                                  {isSelected && <Check className="icon-sm text-foreground shrink-0" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>,
                      document.body,
                    )}
                </div>
                <div className="px-spacing-3">
                  {presentation.published_url ? (
                    <a
                      href={presentation.published_url}
                      target="_blank"
                      rel="noreferrer"
                      className="body-3 text-muted-foreground hover:text-foreground max-w-full truncate underline decoration-dotted transition-colors"
                      title={presentation.published_url}
                    >
                      {presentation.published_url}
                    </a>
                  ) : (
                    <span className="body-3 text-muted-foreground">
                      {connectedDomain ? `Connected: ${connectedDomain.domain_name}` : 'Not connected'}
                    </span>
                  )}
                </div>
              </div>
              {isConnected ? (
                <button
                  type="button"
                  onClick={() => void disconnectDomain()}
                  disabled={!canDisconnect}
                  className="button-glass-destructive h-spacing-10 px-spacing-3 rounded-spacing-2 body-3 inline-flex shrink-0 items-center justify-center font-medium disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : needsDomainVerification ? (
                <button
                  type="button"
                  onClick={() => onOpenDomainsWorkspace('domains')}
                  disabled={domainActionLoading}
                  className="button-glass-orange h-spacing-10 px-spacing-3 rounded-spacing-2 body-3 inline-flex shrink-0 items-center justify-center font-medium disabled:opacity-50"
                >
                  Verify
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void connectDomain()}
                  disabled={!canConnect}
                  className="button-glass-accent h-spacing-10 px-spacing-3 rounded-spacing-2 body-3 inline-flex shrink-0 items-center justify-center font-medium disabled:opacity-50"
                >
                  Connect
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
