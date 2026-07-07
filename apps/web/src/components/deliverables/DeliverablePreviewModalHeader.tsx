'use client'

export function DeliverablePreviewModalHeader({
  displayTitle,
  titleDraft,
  setTitleDraft,
  editingTitle,
  setEditingTitle,
  savingTitle,
  titleRenameable,
  handleTitleSave,
}: {
  displayTitle: string
  titleDraft: string
  setTitleDraft: (title: string) => void
  editingTitle: boolean
  setEditingTitle: (editing: boolean) => void
  savingTitle: boolean
  titleRenameable: boolean
  handleTitleSave: () => Promise<void>
}) {
  return (
    <div className="px-spacing-6 pt-spacing-4 pb-spacing-1 flex-shrink-0 overflow-hidden">
      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => void handleTitleSave()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleTitleSave()
            }
            if (e.key === 'Escape') {
              e.stopPropagation()
              setTitleDraft(displayTitle)
              setEditingTitle(false)
            }
          }}
          className="title-h6 text-foreground ring-border focus-visible:ring-ring w-full rounded-md bg-transparent outline-none ring-1"
          aria-label="Rename file"
        />
      ) : titleRenameable ? (
        <button
          type="button"
          onClick={() => {
            if (savingTitle) return
            setTitleDraft(displayTitle)
            setEditingTitle(true)
          }}
          title="Click to rename"
          className="block w-full cursor-text text-left"
        >
          <h2 className="title-h6 text-foreground hover:bg-hover-subtle truncate rounded-md transition-colors">
            {displayTitle}
          </h2>
        </button>
      ) : (
        <h2 className="title-h6 text-foreground truncate" title={displayTitle}>
          {displayTitle}
        </h2>
      )}
    </div>
  )
}
