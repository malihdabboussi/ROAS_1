'use client'

export function DriveFileBrowserShareInlineRow({
  shareFileId,
  shareEmail,
  setShareEmail,
  shareRole,
  setShareRole,
  onShare,
  onCancel,
}: {
  shareFileId: string | null
  shareEmail: string
  setShareEmail: (v: string) => void
  shareRole: 'reader' | 'writer' | 'commenter'
  setShareRole: (r: 'reader' | 'writer' | 'commenter') => void
  onShare: () => void
  onCancel: () => void
}) {
  if (!shareFileId) return null
  return (
    <div className="px-spacing-6 py-spacing-2 flex items-center gap-2">
      <span className="body-4 text-muted-foreground shrink-0">Share with:</span>
      <input
        autoFocus
        value={shareEmail}
        onChange={(e) => setShareEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onShare()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="email@example.com"
        className="input-glass body-3 flex-1"
      />
      <select
        value={shareRole}
        onChange={(e) => setShareRole(e.target.value as typeof shareRole)}
        className="input-glass body-4 w-28"
      >
        <option value="reader">Viewer</option>
        <option value="commenter">Commenter</option>
        <option value="writer">Editor</option>
      </select>
      <button
        type="button"
        onClick={() => onShare()}
        className="button-glass-accent body-4 rounded-lg px-3 py-1.5"
      >
        Share
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="button-glass-neutral body-4 rounded-lg px-3 py-1.5"
      >
        Cancel
      </button>
    </div>
  )
}
