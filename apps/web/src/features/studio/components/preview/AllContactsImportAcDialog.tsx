'use client'

import { useCallback, useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { AlertCircle, Check, RefreshCw, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchActiveCampaignContactsPage,
  getCrmSyncStatus,
  importContactsToCampaign,
  importCrmContactsInBatches,
  startCrmSync,
  type AcListContact,
  type CrmSyncJobStatus,
} from '../../services/leads.service'

const PAGE_SIZE = 100

function displayName(c: AcListContact): string {
  const a = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
  return a || '—'
}

export function AllContactsImportAcDialog(props: {
  open: boolean
  onClose: () => void
  onImported: () => void
  campaignId?: string | null
}) {
  const { open, onClose, onImported, campaignId } = props
  const [rows, setRows] = useState<AcListContact[]>([])
  const [total, setTotal] = useState(0)
  /** Next ActiveCampaign API offset (sum of rows fetched for current search). */
  const [nextApiOffset, setNextApiOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [bulkJobId, setBulkJobId] = useState<string | null>(null)
  const [bulkStatus, setBulkStatus] = useState<CrmSyncJobStatus | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const runFetch = useCallback(
    async (mode: 'replace' | 'append', offset: number) => {
      if (mode === 'replace') setLoading(true)
      else setLoadingMore(true)
      setError(null)
      if (mode === 'replace') {
        setRows([])
        setNextApiOffset(0)
      }
      try {
        const page = await fetchActiveCampaignContactsPage({
          limit: PAGE_SIZE,
          offset,
          search: debouncedSearch || undefined,
        })
        setTotal(page.total)
        if (mode === 'replace') {
          setRows(page.contacts)
          setNextApiOffset(page.contacts.length)
        } else {
          setRows((prev) => [...prev, ...page.contacts])
          setNextApiOffset(offset + page.contacts.length)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load contacts'
        setError(
          /404|not\s*found/i.test(msg)
            ? 'ActiveCampaign is not connected. Connect it in Settings → Integrations.'
            : msg,
        )
        if (mode === 'replace') {
          setRows([])
          setNextApiOffset(0)
          setTotal(0)
        }
      } finally {
        if (mode === 'replace') setLoading(false)
        else setLoadingMore(false)
      }
    },
    [debouncedSearch],
  )

  useEffect(() => {
    if (!open) {
      setRows([])
      setTotal(0)
      setNextApiOffset(0)
      setSelected(new Set())
      setSearch('')
      setDebouncedSearch('')
      setError(null)
      setBulkJobId(null)
      setBulkStatus(null)
      return
    }
    setSelected(new Set())
    void runFetch('replace', 0)
  }, [open, debouncedSearch, runFetch])

  const pollBulk = useCallback(async () => {
    if (!bulkJobId) return
    const s = await getCrmSyncStatus(bulkJobId)
    setBulkStatus(s)
    if (s.status === 'succeeded') {
      toast.success(
        `Sync complete: ${s.imported} imported, ${s.skipped} skipped (${s.fetched} contacts processed)`,
      )
      onImported()
      setBulkJobId(null)
      setBulkStatus(null)
      void runFetch('replace', 0)
    }
  }, [bulkJobId, onImported, runFetch])

  useEffect(() => {
    if (!bulkJobId) return
    void pollBulk()
    const t = setInterval(() => void pollBulk(), 3000)
    return () => clearInterval(t)
  }, [bulkJobId, pollBulk])

  const hasMore = nextApiOffset < total

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllVisible = () => {
    const ids = rows.map((c) => c.id)
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOn) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const handleClose = () => {
    onClose()
  }

  const handleRefresh = () => {
    setSelected(new Set())
    void runFetch('replace', 0)
  }

  const handleLoadMore = () => {
    void runFetch('append', nextApiOffset)
  }

  const handleSyncEntireAccount = async () => {
    try {
      const { jobId } = await startCrmSync('activecampaign')
      setBulkJobId(jobId)
      setBulkStatus(null)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start sync'
      toast.error(msg)
    }
  }

  const handleDismissBulkFailed = () => {
    setBulkJobId(null)
    setBulkStatus(null)
  }

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true)
    try {
      const picked = rows.filter((c) => selected.has(c.id))
      const contacts = picked
        .map((c) => {
          const email = (c.email || '').trim().toLowerCase()
          if (!email) return null
          return {
            email,
            first_name: c.firstName?.trim() || null,
            last_name: c.lastName?.trim() || null,
            phone: c.phone?.trim() || null,
            contact_source: 'import',
            contact_source_detail: 'activecampaign',
          }
        })
        .filter(Boolean) as Array<{
        email: string
        first_name: string | null
        last_name: string | null
        phone: string | null
        contact_source: string
        contact_source_detail: string
      }>

      const result = await importCrmContactsInBatches(contacts)
      if (campaignId && result.contact_ids.length > 0) {
        await importContactsToCampaign(campaignId, result.contact_ids)
      }
      toast.success(
        `Imported ${result.imported} contact${result.imported !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped)` : ''}`,
      )
      onImported()
      handleClose()
    } finally {
      setImporting(false)
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Import from ActiveCampaign</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden">
            <button
              type="button"
              onClick={handleClose}
              className="btn-icon-bare btn-close-absolute"
            >
              <X className="icon-sm" />
            </button>
            <div className="border-border flex-shrink-0 border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <img src="/Integrations/ActiveCampaign.png" alt="" className="h-8 w-8 rounded" />
                <div>
                  <h2 className="title-h6">Import from ActiveCampaign</h2>
                  <p className="body-4 text-muted-foreground mt-0.5">
                    Loads {PAGE_SIZE} at a time — use Load more or search to find contacts.
                  </p>
                </div>
              </div>
            </div>

            {!bulkJobId && (
              <div className="flex w-full min-w-0 flex-shrink-0 flex-wrap items-center gap-2 px-6 py-2">
                <div className="relative max-w-sm flex-1">
                  <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="input-glass input-leading h-9 w-full pr-3"
                  />
                </div>
                <span className="body-4 text-muted-foreground whitespace-nowrap">
                  Showing {rows.length.toLocaleString()} of {total.toLocaleString()}
                  {selected.size > 0 ? ` · ${selected.size} selected` : ''}
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSyncEntireAccount()}
                    className="button-glass-neutral body-4 rounded-lg px-3 py-2 font-medium"
                  >
                    Sync entire account
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={loading}
                    className="btn-icon-glass"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={`icon-sm ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto px-6 py-3">
              {bulkJobId ? (
                <div className="flex flex-col gap-3 py-8">
                  <p className="body-2 text-foreground font-medium">Background sync</p>
                  {!bulkStatus ? (
                    <p className="body-3 text-muted-foreground">Starting…</p>
                  ) : (
                    <>
                      <p className="body-3 text-muted-foreground">
                        Status: <span className="text-foreground">{bulkStatus.status}</span>
                      </p>
                      <p className="body-3 text-muted-foreground">
                        {bulkStatus.total_remote != null
                          ? `${bulkStatus.fetched.toLocaleString()} / ${bulkStatus.total_remote.toLocaleString()} contacts`
                          : `${bulkStatus.fetched.toLocaleString()} contacts processed`}
                      </p>
                      <p className="body-3 text-muted-foreground">
                        Imported {bulkStatus.imported.toLocaleString()} · Skipped{' '}
                        {bulkStatus.skipped.toLocaleString()}
                      </p>
                      {bulkStatus.status === 'failed' && bulkStatus.last_error && (
                        <p className="body-3 text-destructive">{bulkStatus.last_error}</p>
                      )}
                      {bulkStatus.status === 'failed' && (
                        <button
                          type="button"
                          onClick={handleDismissBulkFailed}
                          className="button-glass-neutral body-3 mt-2 w-fit rounded-lg px-4 py-2"
                        >
                          Dismiss
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : loading && rows.length === 0 ? (
                <p className="body-3 text-muted-foreground py-8 text-center">Loading…</p>
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="text-destructive h-10 w-10" />
                  <p className="body-2 text-destructive">{error}</p>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="button-glass-neutral rounded-lg px-4 py-2"
                  >
                    Retry
                  </button>
                </div>
              ) : rows.length === 0 ? (
                <p className="body-3 text-muted-foreground py-8 text-center">No contacts</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="w-10 px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={toggleAllVisible}
                          className="hover:bg-hover-subtle rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center"
                        >
                          <span
                            className={`rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center border border-dotted ${
                              rows.length > 0 && rows.every((c) => selected.has(c.id))
                                ? 'border-primary/50'
                                : 'border-border'
                            }`}
                            aria-hidden
                          >
                            {rows.length > 0 && rows.every((c) => selected.has(c.id)) ? (
                              <Check className="icon-xs text-primary" aria-hidden />
                            ) : (
                              <div className="icon-xs" aria-hidden />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="typo-caption text-muted-foreground px-2 py-2 text-left uppercase">
                        Name
                      </th>
                      <th className="typo-caption text-muted-foreground px-2 py-2 text-left uppercase">
                        Email
                      </th>
                      <th className="typo-caption text-muted-foreground px-2 py-2 text-left uppercase">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr
                        key={c.id}
                        className="border-border hover:bg-hover-subtle cursor-pointer border-b"
                        onClick={() => toggle(c.id)}
                      >
                        <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => toggle(c.id)}
                            className="hover:bg-hover-subtle rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center"
                          >
                            <span
                              className={`rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center border border-dotted ${
                                selected.has(c.id) ? 'border-primary/50' : 'border-border'
                              }`}
                              aria-hidden
                            >
                              {selected.has(c.id) ? (
                                <Check className="icon-xs text-primary" aria-hidden />
                              ) : (
                                <div className="icon-xs" aria-hidden />
                              )}
                            </span>
                          </button>
                        </td>
                        <td className="body-3 px-2 py-2">{displayName(c)}</td>
                        <td className="body-3 text-muted-foreground px-2 py-2">{c.email || '—'}</td>
                        <td className="body-3 text-muted-foreground px-2 py-2">{c.phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {hasMore && !error && rows.length > 0 && !bulkJobId && (
              <div className="border-border flex flex-shrink-0 justify-center border-t px-6 py-2">
                <button
                  type="button"
                  disabled={loadingMore || loading}
                  onClick={handleLoadMore}
                  className="button-glass-neutral body-3 rounded-lg px-4 py-2 font-medium disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}

            <div className="border-border flex flex-shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
              <button
                type="button"
                onClick={handleClose}
                className="button-glass-neutral inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                {bulkJobId && bulkStatus?.status !== 'failed' ? 'Close' : 'Cancel'}
              </button>
              {!bulkJobId && (
                <button
                  type="button"
                  disabled={selected.size === 0 || importing}
                  onClick={handleImport}
                  className="button-glass-accent inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? 'Importing…' : `Import selected (${selected.size})`}
                </button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
