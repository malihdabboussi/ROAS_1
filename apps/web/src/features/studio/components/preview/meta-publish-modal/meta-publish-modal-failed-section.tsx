export function MetaPublishModalFailedSection({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-spacing-4 space-y-spacing-3">
      <div className="border-border border-t" />
      <p className="body-3 text-muted-foreground">Fix the issues above and try again.</p>
      <button
        type="button"
        onClick={onClose}
        className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 w-full font-medium"
      >
        Close
      </button>
    </div>
  )
}
