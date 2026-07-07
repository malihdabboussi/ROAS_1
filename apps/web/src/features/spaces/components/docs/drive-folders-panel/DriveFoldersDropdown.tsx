import { CheckCircle2, Loader2, RefreshCw, Trash2, Unplug } from 'lucide-react'
import type { DriveFolderMapping } from '@/lib/services/drive-mappings-api'
import { DriveMappingStatusIndicator } from './DriveMappingStatusIndicator'
import { formatLastSynced } from './drive-folders-panel-utils'

interface DriveFoldersDropdownProps {
  loading: boolean
  connected: boolean
  mappings: DriveFolderMapping[]
  busyIds: Set<string>
  anySyncing: boolean
  onAddFolder: () => void
  onSyncNow: (mapping: DriveFolderMapping) => void
  onToggleEnabled: (mapping: DriveFolderMapping) => void
  onDeleteMapping: (mapping: DriveFolderMapping) => void
}

export function DriveFoldersDropdown({
  loading,
  connected,
  mappings,
  busyIds,
  anySyncing,
  onAddFolder,
  onSyncNow,
  onToggleEnabled,
  onDeleteMapping,
}: DriveFoldersDropdownProps) {
  return (
    <>
      <div className="mb-spacing-2 gap-spacing-2 px-spacing-1 flex items-center justify-between">
        <span className="typo-section-label text-muted-foreground">Drive folders</span>
        <button
          type="button"
          onClick={onAddFolder}
          disabled={!connected}
          className="badge-glass badge-glass-green rounded-spacing-2 gap-spacing-1 px-spacing-2 py-spacing-1 typo-caption inline-flex items-center font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-3 w-3" />
          Add folder
        </button>
      </div>

      {loading ? (
        <div className="gap-spacing-2 px-spacing-2 py-spacing-3 body-4 text-muted-foreground flex items-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading Drive mappings...
        </div>
      ) : null}

      {!loading && !connected ? (
        <div className="gap-spacing-1 px-spacing-2 py-spacing-2 body-4 text-muted-foreground inline-flex items-center">
          <Unplug className="h-3.5 w-3.5" />
          Google Drive is not connected.
        </div>
      ) : null}

      {!loading && connected && mappings.length === 0 ? (
        <p className="px-spacing-2 py-spacing-2 body-4 text-muted-foreground">
          No mapped Drive folders yet.
        </p>
      ) : null}

      {!loading && connected && mappings.length > 0 ? (
        <div className="space-y-spacing-2 max-h-80 overflow-y-auto pr-spacing-1">
          {mappings.map((mapping) => (
            <DriveFolderMappingRow
              key={mapping.id}
              mapping={mapping}
              busy={busyIds.has(mapping.id)}
              onSyncNow={onSyncNow}
              onToggleEnabled={onToggleEnabled}
              onDeleteMapping={onDeleteMapping}
            />
          ))}
        </div>
      ) : null}
      {anySyncing ? (
        <p className="px-spacing-2 pt-spacing-2 typo-caption text-muted-foreground">
          Sync in progress. Large folders can take a few minutes.
        </p>
      ) : null}
    </>
  )
}

function DriveFolderMappingRow({
  mapping,
  busy,
  onSyncNow,
  onToggleEnabled,
  onDeleteMapping,
}: {
  mapping: DriveFolderMapping
  busy: boolean
  onSyncNow: (mapping: DriveFolderMapping) => void
  onToggleEnabled: (mapping: DriveFolderMapping) => void
  onDeleteMapping: (mapping: DriveFolderMapping) => void
}) {
  return (
    <div className="gap-spacing-3 rounded-spacing-2 border-border px-spacing-2 py-spacing-2 flex items-start justify-between border">
      <div className="min-w-0 flex-1">
        <p className="body-2 text-foreground truncate">{mapping.drive_folder_name}</p>
        {mapping.last_synced_at ? (
          <p className="mt-spacing-0-5 typo-caption text-muted-foreground">
            Last synced: {formatLastSynced(mapping.last_synced_at)}
          </p>
        ) : null}
        {mapping.last_sync_error ? (
          <p className="mt-spacing-0-5 typo-caption text-destructive truncate">
            {mapping.last_sync_error}
          </p>
        ) : null}
      </div>
      <div className="gap-spacing-1 flex flex-col items-end">
        <DriveMappingStatusIndicator mapping={mapping} />
        <div className="gap-spacing-1 flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => onSyncNow(mapping)}
            disabled={busy}
            className="hover:bg-hover-subtle hover:text-foreground rounded-md p-1 text-muted-foreground transition-colors disabled:opacity-40"
            title="Sync now"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleEnabled(mapping)}
            disabled={busy}
            className="hover:bg-hover-subtle hover:text-foreground rounded-md px-spacing-2 py-spacing-1 typo-caption text-muted-foreground transition-colors disabled:opacity-40"
            title={mapping.enabled ? 'Disable sync' : 'Enable sync'}
          >
            {mapping.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={() => onDeleteMapping(mapping)}
            disabled={busy}
            className="hover:bg-destructive/10 rounded-md p-1 text-destructive transition-colors disabled:opacity-40"
            title="Remove mapping"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
