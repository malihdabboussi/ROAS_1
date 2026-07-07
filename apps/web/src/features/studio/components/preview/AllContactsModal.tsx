'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, RefreshCw, Search, Upload, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { AllContactsImportGhlDialog } from '@/components/contacts'
import {
  fetchAllContacts,
  importContactsToCampaign,
  type CrmContactRow,
  type CrmSort,
} from '../../services/leads.service'
import { AllContactsAddManualDialog } from './AllContactsAddManualDialog'
import { AllContactsImportAcDialog } from './AllContactsImportAcDialog'
import { AllContactsImportCsvDialog } from './AllContactsImportCsvDialog'
import { AllContactsModalTable } from './AllContactsModalTable'

type AllContactsModalProps = {
  campaignId: string
  onClose: () => void
  /** Called when contacts are linked to this campaign (footer action). */
  onImported: () => void
}

export function AllContactsModal({ campaignId, onClose, onImported }: AllContactsModalProps) {
  const tagColorByName: Record<string, string> = {}

  const [rows, setRows] = useState<CrmContactRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [addingToCampaign, setAddingToCampaign] = useState(false)

  const [search, setSearch] = useState('')
  const [sort] = useState<CrmSort>('created_at.desc')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const modalRef = useRef<HTMLDivElement>(null)
  const importMenuRef = useRef<HTMLDivElement>(null)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [ghlOpen, setGhlOpen] = useState(false)
  const [acOpen, setAcOpen] = useState(false)

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setOffset(0)
  }, [debouncedSearch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = importMenuRef.current
      if (el && !el.contains(e.target as Node)) setImportMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const load = useCallback(
    async (mode: 'replace' | 'append' = 'replace') => {
      setLoading(true)
      const useOffset = mode === 'append' ? offset : 0
      const res = await fetchAllContacts({
        limit,
        offset: useOffset,
        sort,
        search: debouncedSearch || undefined,
      })
      setTotal(res.total ?? 0)
      setRows((prev) =>
        mode === 'append' ? [...prev, ...(res.contacts ?? [])] : (res.contacts ?? []),
      )
      setOffset(useOffset + limit)
      setLoading(false)
    },
    [offset, sort, debouncedSearch],
  )

  useEffect(() => {
    load('replace')
  }, [debouncedSearch])

  const hasMore = rows.length < total

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.id)))
    }
  }

  const handleAddToCampaign = async () => {
    if (selected.size === 0) return
    setAddingToCampaign(true)
    try {
      const result = await importContactsToCampaign(campaignId, Array.from(selected))
      toast.success(
        `Added ${result.imported} contact${result.imported !== 1 ? 's' : ''} to campaign`,
      )
      setSelected(new Set())
      onImported()
      onClose()
    } finally {
      setAddingToCampaign(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
  }

  const refreshAfterCrmImport = () => {
    load('replace')
  }

  return createPortal(
    <>
      <div className="z-modal-backdrop fixed inset-0 bg-black/55" onClick={handleBackdropClick} />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center p-6">
        <div
          ref={modalRef}
          className="surface-card wizard-container-border rounded-spacing-4 relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="border-border flex flex-shrink-0 items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <Users className="text-muted-foreground h-5 w-5" />
              <div>
                <h2 className="title-h6 text-foreground">ALL CONTACTS</h2>
                <p className="body-4 text-muted-foreground mt-0.5">{total} contacts total</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="btn-icon-bare">
              <X className="icon-sm" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="border-border flex flex-shrink-0 items-center gap-3 border-b px-6 py-3">
            <div className="relative max-w-sm flex-1">
              <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts..."
                className="input-glass input-leading h-9 w-full pr-3"
              />
            </div>

            <div className="flex-1" />

            <div className="relative" ref={importMenuRef}>
              <button
                type="button"
                onClick={() => setImportMenuOpen((v) => !v)}
                className="button-glass-blue inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </span>
              </button>
              {importMenuOpen && (
                <div className="mt-spacing-1 z-dropdown absolute right-0 top-full">
                  <div className="dropdown-menu-solid p-spacing-2 min-w-[220px]">
                    <button
                      type="button"
                      className="hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-2 w-full rounded text-left"
                      onClick={() => {
                        setImportMenuOpen(false)
                        setManualOpen(true)
                      }}
                    >
                      Add manually
                    </button>
                    <button
                      type="button"
                      className="hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-2 w-full rounded text-left"
                      onClick={() => {
                        setImportMenuOpen(false)
                        setCsvOpen(true)
                      }}
                    >
                      Import from CSV
                    </button>
                    <button
                      type="button"
                      className="hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-2 w-full rounded text-left"
                      onClick={() => {
                        setImportMenuOpen(false)
                        setGhlOpen(true)
                      }}
                    >
                      Import from GoHighLevel
                    </button>
                    <button
                      type="button"
                      className="hover:bg-hover-subtle body-3 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-2 w-full rounded text-left"
                      onClick={() => {
                        setImportMenuOpen(false)
                        setAcOpen(true)
                      }}
                    >
                      Import from ActiveCampaign
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => load('replace')}
              disabled={loading}
              className="btn-icon-glass"
            >
              <RefreshCw className={`icon-sm ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Body */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <AllContactsModalTable
              rows={rows}
              total={total}
              loading={loading}
              selected={selected}
              hasMore={hasMore}
              tagColorByName={tagColorByName}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onLoadMore={() => load('append')}
            />
          </div>

          {/* Footer — link checked rows to this campaign */}
          <div className="border-border flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t px-6 py-3">
            <span className="body-3 text-muted-foreground">
              {selected.size === 0
                ? 'Select contacts to add them to this campaign'
                : `${selected.size} selected`}
            </span>
            <button
              type="button"
              onClick={handleAddToCampaign}
              disabled={selected.size === 0 || addingToCampaign}
              className="button-glass-accent inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {addingToCampaign ? 'Adding…' : 'Add to campaign'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <AllContactsAddManualDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreated={refreshAfterCrmImport}
        campaignId={campaignId}
      />
      <AllContactsImportCsvDialog
        open={csvOpen}
        onClose={() => setCsvOpen(false)}
        onImported={refreshAfterCrmImport}
        campaignId={campaignId}
      />
      <AllContactsImportGhlDialog
        open={ghlOpen}
        onClose={() => setGhlOpen(false)}
        onImported={refreshAfterCrmImport}
        campaignId={campaignId}
      />
      <AllContactsImportAcDialog
        open={acOpen}
        onClose={() => setAcOpen(false)}
        onImported={refreshAfterCrmImport}
        campaignId={campaignId}
      />
    </>,
    document.body,
  )
}
