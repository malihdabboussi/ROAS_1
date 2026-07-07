'use client'

import { useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { FileSpreadsheet, X } from 'lucide-react'
import { toast } from 'sonner'
import { importContactsToCampaign, importCrmContactsBatch } from '../../services/leads.service'

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (c === '"') {
      inQuotes = !inQuotes
    } else if ((c === ',' && !inQuotes) || c === '\r') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur.trim())
  return out
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\n/).filter((l) => l.trim().length > 0)
  return lines.map(parseCsvLine)
}

export function AllContactsImportCsvDialog(props: {
  open: boolean
  onClose: () => void
  onImported: () => void
  campaignId?: string | null
}) {
  const { open, onClose, onImported, campaignId } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handleClose = () => {
    onClose()
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length < 2) {
        toast.error('CSV must include a header row and at least one data row')
        return
      }
      const headers = rows[0]!.map((h) => h.toLowerCase().replace(/^\ufeff/, ''))
      const emailIdx = headers.findIndex((h) => h === 'email' || h === 'e-mail')
      if (emailIdx < 0) {
        toast.error('CSV must include an "email" column')
        return
      }
      const firstIdx = headers.indexOf('first_name')
      const lastIdx = headers.indexOf('last_name')
      const nameIdx = headers.indexOf('name')
      const phoneIdx = headers.indexOf('phone')

      const contacts: Array<{
        email: string
        first_name?: string | null
        last_name?: string | null
        phone?: string | null
        contact_source: string
        contact_source_detail: string
      }> = []

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r]!
        const email = (row[emailIdx] || '').trim().toLowerCase()
        if (!email) continue
        let first_name: string | null = null
        let last_name: string | null = null
        if (firstIdx >= 0 && row[firstIdx]) first_name = row[firstIdx]!.trim() || null
        if (lastIdx >= 0 && row[lastIdx]) last_name = row[lastIdx]!.trim() || null
        if (nameIdx >= 0 && row[nameIdx] && !first_name && !last_name) {
          const parts = row[nameIdx]!.trim().split(/\s+/)
          first_name = parts[0] || null
          last_name = parts.length > 1 ? parts.slice(1).join(' ') : null
        }
        const phone = phoneIdx >= 0 && row[phoneIdx] ? row[phoneIdx]!.trim() || null : null
        contacts.push({
          email,
          first_name,
          last_name,
          phone,
          contact_source: 'import',
          contact_source_detail: 'csv',
        })
      }

      const result = await importCrmContactsBatch(contacts)
      if (campaignId && result.contact_ids.length > 0) {
        await importContactsToCampaign(campaignId, result.contact_ids)
      }
      toast.success(
        `Imported ${result.imported} contact${result.imported !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped)` : ''}`,
      )
      onImported()
      handleClose()
    } finally {
      setBusy(false)
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
            <DialogPrimitive.Title>Import from CSV</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 relative w-full max-w-md">
            <button
              type="button"
              onClick={handleClose}
              className="btn-icon-bare btn-close-absolute"
            >
              <X className="icon-sm" />
            </button>
            <div className="mb-spacing-4 flex items-center gap-2">
              <FileSpreadsheet className="text-muted-foreground h-5 w-5" />
              <h2 className="title-h6">Import from CSV</h2>
            </div>
            <p className="body-3 text-muted-foreground mb-spacing-4">
              Include an <span className="text-foreground">email</span> column. Optional:{' '}
              <span className="text-foreground">first_name</span>,{' '}
              <span className="text-foreground">last_name</span>,{' '}
              <span className="text-foreground">name</span>,{' '}
              <span className="text-foreground">phone</span>. Existing emails are skipped.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onPickFile}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="button-glass-accent body-3 w-full rounded-lg py-2 font-medium disabled:opacity-50"
            >
              {busy ? 'Importing…' : 'Choose CSV file'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
