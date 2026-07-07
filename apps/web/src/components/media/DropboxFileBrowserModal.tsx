'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import type { DropboxFileBrowserModalProps } from '@/components/media/dropbox-file-browser-modal.types'
import { DropboxFileBrowserPanel } from '@/components/media/DropboxFileBrowserPanel'

export type { DropboxFileBrowserModalProps } from '@/components/media/dropbox-file-browser-modal.types'

export function DropboxFileBrowserModal(props: DropboxFileBrowserModalProps) {
  const { open, onClose, embedded = false } = props

  if (embedded) {
    return <DropboxFileBrowserPanel layout="embedded" {...props} />
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Dropbox</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full max-w-none sm:h-[80vh] sm:max-h-[80vh] sm:max-w-4xl">
            <DropboxFileBrowserPanel layout="modal" {...props} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
