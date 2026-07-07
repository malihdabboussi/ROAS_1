'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { DropboxFile } from '@/lib/services/dropbox-api'

export function DropboxFileBrowserDeleteDialog({
  deleteTarget,
  setDeleteTarget,
  confirmDelete,
}: {
  deleteTarget: DropboxFile | null
  setDeleteTarget: (file: DropboxFile | null) => void
  confirmDelete: () => void | Promise<void>
}) {
  if (!deleteTarget) return null

  return (
    <DialogPrimitive.Root
      open={!!deleteTarget}
      onOpenChange={(open) => {
        if (!open) setDeleteTarget(null)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 w-full max-w-md">
            <div className="space-y-spacing-2">
              <DialogPrimitive.Title className="title-h6">Delete File</DialogPrimitive.Title>
              <DialogPrimitive.Description className="body-2 text-muted-foreground">
                Are you sure you want to delete &quot;{deleteTarget.name}&quot;? This cannot be
                undone.
              </DialogPrimitive.Description>
            </div>
            <div className="mt-spacing-6 gap-spacing-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="button-glass-destructive rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
              >
                Delete
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
