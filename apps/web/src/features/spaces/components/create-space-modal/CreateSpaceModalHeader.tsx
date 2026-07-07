import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface CreateSpaceModalHeaderProps {
  submitting: boolean
  onClose: () => void
}

export function CreateSpaceModalHeader({ submitting, onClose }: CreateSpaceModalHeaderProps) {
  return (
    <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
      <div className="gap-spacing-3 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <DialogPrimitive.Title className="title-h6 text-foreground">
            Create a Space
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
            A Space represents teams, departments, or groups, each with its own Lists, workflows,
            and settings.
          </DialogPrimitive.Description>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="btn-icon-bare shrink-0 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="icon-xs" />
        </button>
      </div>
    </div>
  )
}
