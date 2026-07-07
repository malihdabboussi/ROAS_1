export function ChannelComposerLinkInput({
  open,
  value,
  onChange,
  onApply,
  onClose,
}: {
  open: boolean
  value: string
  onChange: (value: string) => void
  onApply: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="border-border flex items-center gap-2 border-b px-3 py-1.5">
      <input
        type="url"
        placeholder="https://…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onApply()
          }
          if (event.key === 'Escape') {
            onClose()
          }
        }}
        className="border-border text-foreground focus:border-primary body-3 min-w-0 flex-1 rounded border bg-transparent px-2 py-1 outline-none"
        autoFocus
      />
      <button
        type="button"
        onClick={onApply}
        className="bg-primary/10 text-primary hover:bg-primary/20 rounded px-2.5 py-1 text-xs transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground hover:bg-hover-subtle rounded px-2.5 py-1 text-xs transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
