import { AlertCircle } from 'lucide-react'
import type { CrmSyncJobStatus, GhlListContact } from '@/lib/contacts'
import { AllContactsImportGhlDialogSyncStatus } from './AllContactsImportGhlDialogSyncStatus'
import { AllContactsImportGhlDialogTable } from './AllContactsImportGhlDialogTable'

type AllContactsImportGhlDialogBodyProps = {
  bulkJobId: string | null
  bulkStatus: CrmSyncJobStatus | null
  loading: boolean
  rowsCount: number
  error: string | null
  filteredContacts: GhlListContact[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onRetry: () => void
  onDismissBulkFailed: () => void
}

export function AllContactsImportGhlDialogBody({
  bulkJobId,
  bulkStatus,
  loading,
  rowsCount,
  error,
  filteredContacts,
  selectedIds,
  onToggle,
  onToggleAll,
  onRetry,
  onDismissBulkFailed,
}: AllContactsImportGhlDialogBodyProps) {
  if (bulkJobId) {
    return (
      <AllContactsImportGhlDialogSyncStatus
        status={bulkStatus}
        onDismissFailed={onDismissBulkFailed}
      />
    )
  }

  if (loading && rowsCount === 0) {
    return <p className="body-3 text-muted-foreground py-spacing-8 text-center">Loading...</p>
  }

  if (error) {
    return (
      <div className="gap-spacing-3 py-spacing-8 flex flex-col items-center text-center">
        <AlertCircle className="icon-lg text-destructive" />
        <p className="body-2 text-destructive">{error}</p>
        <button type="button" onClick={onRetry} className="button-default button-glass-neutral">
          Retry
        </button>
      </div>
    )
  }

  if (filteredContacts.length === 0) {
    return <p className="body-3 text-muted-foreground py-spacing-8 text-center">No contacts</p>
  }

  return (
    <AllContactsImportGhlDialogTable
      contacts={filteredContacts}
      selectedIds={selectedIds}
      onToggle={onToggle}
      onToggleAll={onToggleAll}
    />
  )
}
