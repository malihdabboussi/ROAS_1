export function MetaPublishModalErrorSection({
  publishError,
  onClose,
  onRetry,
}: {
  publishError: string | null
  onClose: () => void
  onRetry: () => void
}) {
  return (
    <div className="mt-spacing-4 space-y-spacing-3">
      <div className="border-border border-t" />
      <div className="rounded-spacing-2 p-spacing-3 bg-red-500/10">
        <p className="body-3 text-destructive font-medium">Publish failed</p>
        {publishError && <p className="typo-caption text-destructive/70 mt-1">{publishError}</p>}
      </div>
      <div className="gap-spacing-2 flex">
        <button
          type="button"
          onClick={onClose}
          className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 flex-1 font-medium"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 flex-1 font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
