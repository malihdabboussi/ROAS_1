'use client'

import { Download, Loader2 } from 'lucide-react'

export function DropboxFileBrowserModalFooter({
  showClose = true,
  onClose,
  onSelectFileForChat,
  selectedCount,
  batchImporting,
  batchProgress,
  onBatchImport,
}: {
  showClose?: boolean
  onClose: () => void
  onSelectFileForChat?: (file: File) => void
  selectedCount: number
  batchImporting: boolean
  batchProgress: number
  onBatchImport: () => void
}) {
  return (
    <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
      <div>
        {selectedCount > 0 && (
          <p className="body-3 text-muted-foreground">{selectedCount} selected</p>
        )}
      </div>
      <div className="gap-spacing-2 flex items-center">
        {showClose ? (
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
          >
            Close
          </button>
        ) : null}
        {onSelectFileForChat && selectedCount > 0 && (
          <button
            type="button"
            disabled={batchImporting}
            onClick={() => onBatchImport()}
            className="button-glass-accent body-3 flex items-center gap-2 rounded-lg px-4 py-2 font-medium disabled:opacity-40"
          >
            {batchImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Importing {batchProgress}/{selectedCount}...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Import {selectedCount} Selected
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
