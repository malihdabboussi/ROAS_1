'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Globe, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { backendGet } from '@/lib/api/backend-client'
import {
  DOMAINS_TOAST_ERRORS,
  DOMAINS_TOAST_SUCCESS,
} from '@/lib/domains/domains-toast-errors.config'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'

type DomainRow = {
  id: string
  domain_name: string
  domain_type?: 'generated' | 'custom'
  status?: string
}

type ModalView = 'pick' | 'add'

export function ConnectCustomDomainModal({
  open,
  onClose,
  onConnect,
  title,
}: {
  open: boolean
  onClose: () => void
  onConnect: (domainId: string) => Promise<void>
  title: string
}) {
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null)
  const [view, setView] = useState<ModalView>('pick')
  const [newDomainName, setNewDomainName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const loadDomains = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await backendGet<{ success: boolean; domains: DomainRow[] }>('/api/domains')
      setDomains(result.domains ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setSelectedDomainId(null)
    setView('pick')
    setNewDomainName('')
    setIsAdding(false)
    void loadDomains()
  }, [open])

  const verifiedCustomDomains = useMemo(
    () => (domains ?? []).filter((d) => d.domain_type === 'custom' && d.status === 'verified'),
    [domains],
  )

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return
    setIsAdding(true)
    try {
      const result = await customDomainsApi.add(newDomainName.trim())
      if (!result.success || !result.domain) {
        toast.error(result.error || DOMAINS_TOAST_ERRORS.ADD_DOMAIN_FAILED.userMessage)
        return
      }
      toast.success(DOMAINS_TOAST_SUCCESS.DOMAIN_ADDED.userMessage)
      setNewDomainName('')
      setView('pick')
      await loadDomains()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : DOMAINS_TOAST_ERRORS.ADD_DOMAIN_FAILED.userMessage,
      )
    } finally {
      setIsAdding(false)
    }
  }

  const busy = connecting || isAdding

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(openState) => {
        if (!openState && !busy) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">{view === 'add' ? 'Add New Domain' : title}</h2>
                  <button onClick={onClose} disabled={busy} className="btn-icon-bare">
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  {view === 'add'
                    ? 'Add a domain you own, then verify DNS to connect it.'
                    : 'Pick a verified custom domain or add a new one.'}
                </p>
              </div>

              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                {view === 'add' ? (
                  <div className="space-y-spacing-2">
                    <label htmlFor="new-domain-name" className="body-3 text-foreground">
                      Domain Name *
                    </label>
                    <input
                      id="new-domain-name"
                      type="text"
                      className="input-glass w-full"
                      value={newDomainName}
                      onChange={(e) => setNewDomainName(e.target.value)}
                      placeholder="promo.example.com"
                      disabled={isAdding}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void handleAddDomain()
                        }
                      }}
                    />
                    <p className="body-4 text-muted-foreground">
                      Enter the full host (example: promo.example.com) without http:// or https://
                    </p>
                  </div>
                ) : loading ? (
                  <div className="body-3 text-muted-foreground py-spacing-6 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading domains...
                  </div>
                ) : error ? (
                  <div className="body-3 text-destructive break-words">{error}</div>
                ) : verifiedCustomDomains.length === 0 ? (
                  <div className="py-spacing-4 gap-spacing-3 flex flex-col items-center text-center">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                      <Globe className="text-primary h-5 w-5" />
                    </div>
                    <p className="body-3 text-muted-foreground">No verified custom domains yet.</p>
                  </div>
                ) : (
                  <div className="space-y-spacing-2">
                    {verifiedCustomDomains.map((d) => {
                      const active = selectedDomainId === d.id
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDomainId(d.id)}
                          className={`body-3 w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                            active
                              ? 'bg-primary/10 text-foreground border-primary'
                              : 'border-border text-foreground hover:bg-hover-subtle'
                          }`}
                        >
                          {d.domain_name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
                {view === 'add' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('pick')}
                      disabled={isAdding}
                      className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAddDomain()}
                      disabled={isAdding || !newDomainName.trim()}
                      className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAdding ? (
                        <span className="gap-spacing-2 flex items-center">
                          <Loader2 className="icon-sm animate-spin" />
                          Adding...
                        </span>
                      ) : (
                        'Add Domain'
                      )}
                    </button>
                  </>
                ) : loading || error ? (
                  <button
                    type="button"
                    onClick={onClose}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                ) : verifiedCustomDomains.length === 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('add')}
                      className="button-glass-accent gap-spacing-2 flex items-center rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      <Plus className="icon-sm" />
                      Add New Domain
                    </button>
                  </>
                ) : (
                  <>
                    <div className="gap-spacing-2 flex items-center">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={connecting}
                        className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setView('add')}
                        disabled={connecting}
                        className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground gap-spacing-1 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="icon-xs" />
                        Add New
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!selectedDomainId || connecting}
                      onClick={() => {
                        if (!selectedDomainId) return
                        setConnecting(true)
                        void onConnect(selectedDomainId).finally(() => setConnecting(false))
                      }}
                      className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {connecting ? 'Connecting...' : 'Connect'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
