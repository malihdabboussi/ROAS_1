import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react'
import { Download, Loader2, MoreVertical } from 'lucide-react'
import { normalizeEmDashToHyphen } from '../../utils/normalize-em-dash'

interface AvatarPreviewToolbarProps {
  avatarName: string | null
  headerTitleFallback?: string
  editMode: boolean
  draftName: string
  setDraftName: (value: string) => void
  saving: boolean
  exporting: boolean
  downloadMenuOpen: boolean
  setDownloadMenuOpen: Dispatch<SetStateAction<boolean>>
  menuOpen: boolean
  setMenuOpen: Dispatch<SetStateAction<boolean>>
  setMenuPointer: Dispatch<SetStateAction<{ x: number; y: number } | null>>
  menuButtonRef: RefObject<HTMLButtonElement | null>
  toolbarLeading?: ReactNode
  toolbarTrailing?: ReactNode
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDownload: (format: 'json' | 'md') => void
  onDownloadPdf: () => void
}

export function AvatarPreviewToolbar({
  avatarName,
  headerTitleFallback,
  editMode,
  draftName,
  setDraftName,
  saving,
  exporting,
  downloadMenuOpen,
  setDownloadMenuOpen,
  menuOpen,
  setMenuOpen,
  setMenuPointer,
  menuButtonRef,
  toolbarLeading,
  toolbarTrailing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDownload,
  onDownloadPdf,
}: AvatarPreviewToolbarProps) {
  return (
    <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex min-w-0 items-center border-b">
      <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
        {toolbarLeading}
        {editMode ? (
          <input
            type="text"
            className="body-3 text-foreground min-w-0 flex-1 rounded-spacing-2 border border-border bg-background px-spacing-2 py-spacing-1 font-medium outline-none"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            aria-label="Avatar name"
          />
        ) : (
          <span className="body-3 min-w-0 truncate font-medium text-foreground">
            {normalizeEmDashToHyphen(avatarName ?? headerTitleFallback ?? 'Untitled Avatar')}
          </span>
        )}
      </div>
      <div className="gap-spacing-1 flex min-w-0 shrink-0 flex-nowrap items-center justify-end">
        {!editMode ? (
          <>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                data-tooltip="Download"
                data-side="bottom"
                disabled={exporting}
                className="tooltip h-spacing-7 text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex aspect-square shrink-0 items-center justify-center rounded-spacing-2 transition-colors disabled:opacity-50"
                aria-label="Download"
                aria-expanded={downloadMenuOpen}
                aria-haspopup="menu"
              >
                {exporting ? (
                  <Loader2 className="icon-sm shrink-0 animate-spin" />
                ) : (
                  <Download className="icon-sm shrink-0" />
                )}
              </button>
              {downloadMenuOpen && (
                <>
                  <div
                    className="z-dropdown fixed inset-0"
                    onClick={() => setDownloadMenuOpen(false)}
                  />
                  <div className="dropdown-menu-solid z-dropdown absolute right-0 top-full mt-spacing-1 w-[180px] py-spacing-1">
                    <button
                      type="button"
                      onClick={() => void onDownloadPdf()}
                      disabled={exporting}
                      className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                    >
                      {exporting ? 'Exporting...' : 'PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload('md')}
                      className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                    >
                      Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownload('json')}
                      className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                    >
                      JSON
                    </button>
                  </div>
                </>
              )}
            </div>
            {toolbarTrailing}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuPointer(null)
                setMenuOpen((open) => !open)
              }}
              data-tooltip="Avatar options"
              data-side="bottom"
              aria-label="Avatar options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="tooltip h-spacing-7 border-border text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex aspect-square shrink-0 items-center justify-center rounded-spacing-2 border transition-colors"
            >
              <MoreVertical className="icon-sm shrink-0" />
            </button>
            <button
              type="button"
              onClick={onStartEdit}
              className="body-3 chip-glass-green flex h-spacing-8 items-center gap-spacing-2 rounded-spacing-2 px-spacing-2 font-medium"
            >
              Edit
            </button>
          </>
        ) : (
          <>
            {toolbarTrailing}
            <button
              type="button"
              onClick={onCancelEdit}
              className="body-3 h-spacing-7 text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex shrink-0 items-center rounded-spacing-2 px-spacing-2 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onSaveEdit}
              className="body-3 chip-glass-green flex h-spacing-8 items-center gap-spacing-2 rounded-spacing-2 px-spacing-2 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
