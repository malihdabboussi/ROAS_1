'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import type { DriveFileBrowserModalProps } from '@/components/media/drive-file-browser-modal.types'
import { DriveFileBrowserPanel } from '@/components/media/DriveFileBrowserPanel'

export function DriveFileBrowserModal(props: DriveFileBrowserModalProps) {
  const { open, onClose } = props

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Google Drive</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Browse and choose files from Google Drive.
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full min-w-0 max-w-none sm:h-[80vh] sm:max-h-[80vh] sm:max-w-4xl">
            <DriveFileBrowserPanel layout="modal" {...props} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
