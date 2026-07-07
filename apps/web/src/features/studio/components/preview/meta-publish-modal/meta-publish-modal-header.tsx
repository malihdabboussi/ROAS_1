import { X } from 'lucide-react'

export function MetaPublishModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-subtle px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between border-b">
      <h2 className="title-h5 text-foreground uppercase">PUBLISH TO META</h2>
      <button type="button" onClick={onClose} className="btn-icon-bare">
        <X className="icon-sm" />
      </button>
    </div>
  )
}
