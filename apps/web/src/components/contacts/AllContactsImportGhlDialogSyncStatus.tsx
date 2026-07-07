import type { CrmSyncJobStatus } from '@/lib/contacts'

type AllContactsImportGhlDialogSyncStatusProps = {
  status: CrmSyncJobStatus | null
  onDismissFailed: () => void
}

export function AllContactsImportGhlDialogSyncStatus({
  status,
  onDismissFailed,
}: AllContactsImportGhlDialogSyncStatusProps) {
  return (
    <div className="gap-spacing-3 py-spacing-8 flex flex-col">
      <p className="body-2 text-foreground font-medium">Background sync</p>
      {!status ? (
        <p className="body-3 text-muted-foreground">Starting...</p>
      ) : (
        <>
          <p className="body-3 text-muted-foreground">
            Status: <span className="text-foreground">{status.status}</span>
          </p>
          <p className="body-3 text-muted-foreground">
            {status.total_remote != null
              ? `${status.fetched.toLocaleString()} / ${status.total_remote.toLocaleString()} contacts`
              : `${status.fetched.toLocaleString()} contacts processed`}
          </p>
          <p className="body-3 text-muted-foreground">
            Imported {status.imported.toLocaleString()} {'\u00b7'} Skipped{' '}
            {status.skipped.toLocaleString()}
          </p>
          {status.status === 'failed' && status.last_error ? (
            <p className="body-3 text-destructive">{status.last_error}</p>
          ) : null}
          {status.status === 'failed' ? (
            <button
              type="button"
              onClick={onDismissFailed}
              className="button-default button-glass-neutral mt-spacing-2 w-fit"
            >
              Dismiss
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
