'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { RefreshCw, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchGhlContactsForImport,
  getCrmSyncStatus,
  importContactsToCampaign,
  importCrmContactsBatch,
  startCrmSync,
  type CrmSyncJobStatus,
  type GhlListContact,
} from '@/lib/contacts'
import { AllContactsImportGhlDialogBody } from './AllContactsImportGhlDialogBody'
import {
  getGhlContactDisplayName,
  getGhlImportContacts,
} from './AllContactsImportGhlDialog.helpers'

type AllContactsImportGhlDialogProps = {
  open: boolean
  onClose: () => void
  onImported: () => void
  campaignId?: string | null
}

export function AllContactsImportGhlDialog({
  open,
  onClose,
  onImported,
  campaignId,
}: AllContactsImportGhlDialogProps) {
  const [rows, setRows] = useState<GhlListContact[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkJobId, setBulkJobId] = useState<string | null>(null)
  const [bulkStatus, setBulkStatus] = useState<CrmSyncJobStatus | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchGhlContactsForImport()
      setRows(list)
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : 'Failed to load contacts'
      setError(
        /404|not\s*found/i.test(msg)
          ? 'GoHighLevel is not connected. Connect it in Settings \u2192 Integrations.'
          : msg,
      )
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setRows([])
      setSelected(new Set())
      setSearch('')
      setError(null)
      setBulkJobId(null)
      setBulkStatus(null)
      return
    }
    load()
  }, [open, load])

  const pollBulk = useCallback(async () => {
    if (!bulkJobId) return
    const status = await getCrmSyncStatus(bulkJobId)
    setBulkStatus(status)
    if (status.status === 'succeeded') {
      toast.success(
        `Sync complete: ${status.imported} imported, ${status.skipped} skipped (${status.fetched} contacts processed)`,
      )
      onImported()
      setBulkJobId(null)
      setBulkStatus(null)
      void load()
    }
  }, [bulkJobId, onImported, load])

  useEffect(() => {
    if (!bulkJobId) return
    void pollBulk()
    const timer = setInterval(() => void pollBulk(), 3000)
    return () => clearInterval(timer)
  }, [bulkJobId, pollBulk])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((contact) => {
      const blob = [getGhlContactDisplayName(contact), contact.email, contact.phone]
        .join(' ')
        .toLowerCase()
      return blob.includes(query)
    })
  }, [rows, search])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    const ids = filtered.map((contact) => contact.id)
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleSyncEntireAccount = async () => {
    try {
      const { jobId } = await startCrmSync('gohighlevel')
      setBulkJobId(jobId)
      setBulkStatus(null)
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : 'Failed to start sync'
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
    const contacts = getGhlImportContacts(rows, selected)

    try {
      const result = await importCrmContactsBatch(contacts)
      if (campaignId && result.contact_ids.length > 0) {
        await importContactsToCampaign(campaignId, result.contact_ids)
      }
      toast.success(
        `Imported ${result.imported} contact${result.imported !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped)` : ''}`,
      )
      onImported()
      onClose()
    } finally {
      setImporting(false)
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Import from GoHighLevel</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Select contacts to copy into Vibey from GoHighLevel.
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden">
            <button type="button" onClick={onClose} className="btn-icon-bare btn-close-absolute">
              <X className="icon-sm" />
            </button>
            <div className="border-border px-spacing-6 py-spacing-4 flex-shrink-0 border-b">
              <div className="gap-spacing-2 flex items-center">
                <img
                  src="/Integrations/GHL.png"
                  alt=""
                  className="h-spacing-8 w-spacing-8 rounded-spacing-2"
                />
                <div>
                  <h2 className="title-h6 text-foreground">Import from GoHighLevel</h2>
                  <p className="body-4 text-muted-foreground mt-spacing-0-5">
                    Select contacts to copy into Vibey. Connect GHL under Settings{' '}
                    {'\u2192'} Integrations if this fails.
                  </p>
                </div>
              </div>
            </div>

            {!bulkJobId && (
              <div className="gap-spacing-2 px-spacing-6 py-spacing-2 flex w-full min-w-0 flex-shrink-0 flex-wrap items-center">
                <div className="relative max-w-sm flex-1">
                  <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={'Search\u2026'}
                    className="input-glass input-leading h-spacing-9 w-full pr-spacing-3"
                  />
                </div>
                <div className="gap-spacing-2 ml-auto flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => void handleSyncEntireAccount()}
                    className="button-default button-glass-neutral"
                  >
                    Sync entire account
                  </button>
                  <button
                    type="button"
                    onClick={load}
                    disabled={loading}
                    className="btn-icon-glass"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={`icon-sm ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            )}

            <div className="px-spacing-6 py-spacing-3 min-h-0 flex-1 overflow-auto">
              <AllContactsImportGhlDialogBody
                bulkJobId={bulkJobId}
                bulkStatus={bulkStatus}
                loading={loading}
                rowsCount={rows.length}
                error={error}
                filteredContacts={filtered}
                selectedIds={selected}
                onToggle={toggle}
                onToggleAll={toggleAllFiltered}
                onRetry={load}
                onDismissBulkFailed={handleDismissBulkFailed}
              />
            </div>

            <div className="border-border gap-spacing-2 px-spacing-6 py-spacing-3 flex flex-shrink-0 items-center justify-end border-t">
              <button
                type="button"
                onClick={onClose}
                className="button-default button-glass-neutral inline-flex items-center gap-spacing-2"
              >
                {bulkJobId && bulkStatus?.status !== 'failed' ? 'Close' : 'Cancel'}
              </button>
              {!bulkJobId && (
                <button
                  type="button"
                  disabled={selected.size === 0 || importing}
                  onClick={handleImport}
                  className="button-default button-glass-accent inline-flex items-center gap-spacing-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? 'Importing\u2026' : `Import selected (${selected.size})`}
                </button>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
