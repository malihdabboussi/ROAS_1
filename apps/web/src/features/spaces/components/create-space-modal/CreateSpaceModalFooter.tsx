interface CreateSpaceModalFooterProps {
  submitting: boolean
  onCancel: () => void
  onSubmit: () => void
}

export function CreateSpaceModalFooter({
  submitting,
  onCancel,
  onSubmit,
}: CreateSpaceModalFooterProps) {
  return (
    <div className="border-border px-spacing-6 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-end border-t">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="button-default button-glass-neutral disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="button-default button-glass-accent disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Continue'}
      </button>
    </div>
  )
}
