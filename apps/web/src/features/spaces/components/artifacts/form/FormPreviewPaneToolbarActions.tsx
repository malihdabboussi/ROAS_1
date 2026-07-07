'use client'

import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  Inbox,
  Loader2,
  MoreVertical,
  Settings,
} from 'lucide-react'

export const FORM_PUBLISH_DROPDOWN_WIDTH_PX = 320

const toolbarIconButtonClass =
  'text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-spacing-7 w-spacing-7 items-center justify-center rounded-spacing-2 transition-colors'

const toolbarBorderIconButtonClass = `${toolbarIconButtonClass} border-border border`

interface FormPreviewPaneToolbarActionsProps {
  trailingAfterDivider?: ReactNode
  fullscreenButton?: ReactNode
  publishButtonRef: RefObject<HTMLButtonElement | null>
  menuButtonRef: RefObject<HTMLButtonElement | null>
  menuOpen: boolean
  publishDropdownOpen: boolean
  dropdownPosition: { top: number; left: number }
  isPublished: boolean
  publishedUrl: string | null
  publishing: boolean
  copiedUrl: boolean
  onOpenResponses: () => void
  onOpenSettings: () => void
  onToggleMenu: () => void
  onTogglePublishDropdown: () => void
  onPublish: () => void
  onUnpublish: () => void
  onCopyPublishedUrl: () => void
  onPublishedUrlOpen: () => void
}

export function FormPreviewPaneToolbarActions({
  trailingAfterDivider,
  fullscreenButton,
  publishButtonRef,
  menuButtonRef,
  menuOpen,
  publishDropdownOpen,
  dropdownPosition,
  isPublished,
  publishedUrl,
  publishing,
  copiedUrl,
  onOpenResponses,
  onOpenSettings,
  onToggleMenu,
  onTogglePublishDropdown,
  onPublish,
  onUnpublish,
  onCopyPublishedUrl,
  onPublishedUrlOpen,
}: FormPreviewPaneToolbarActionsProps) {
  return (
    <div className="gap-spacing-1 flex shrink-0 items-center">
      {trailingAfterDivider}
      <button
        type="button"
        onClick={onOpenResponses}
        className={toolbarIconButtonClass}
        aria-label="View responses"
        data-form-responses-trigger
      >
        <Inbox className="icon-sm" />
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        className={toolbarIconButtonClass}
        aria-label="Form settings"
        data-form-settings-trigger
      >
        <Settings className="icon-sm" />
      </button>
      <div className="border-l-glass mx-spacing-1 h-spacing-4 w-0 shrink-0 self-center" aria-hidden />
      {fullscreenButton}
      <button
        ref={menuButtonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggleMenu()
        }}
        className={toolbarBorderIconButtonClass}
        aria-label="Form options"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="icon-sm" />
      </button>

      <div className="relative flex items-stretch">
        <button
          ref={publishButtonRef}
          type="button"
          disabled={publishing}
          onClick={onTogglePublishDropdown}
          className="chip-glass-green rounded-spacing-2 h-spacing-8 px-spacing-2-5 gap-spacing-1-5 flex items-center transition-all disabled:opacity-50"
        >
          {publishing ? (
            <Loader2 className="icon-sm shrink-0 animate-spin" />
          ) : (
            <Globe className="icon-sm shrink-0" />
          )}
          <span className="body-3 font-medium">
            {publishing ? 'Processing...' : isPublished ? 'Published' : 'Publish'}
          </span>
          <ChevronDown className="icon-sm shrink-0" />
        </button>
        {publishDropdownOpen && typeof document !== 'undefined'
          ? createPortal(
              <div
                data-form-publish-dropdown
                className="surface-card border-border z-dropdown rounded-spacing-2 p-spacing-2 fixed w-80 border shadow-lg"
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                }}
              >
                {!isPublished ? (
                  <button
                    type="button"
                    onClick={onPublish}
                    disabled={publishing}
                    className="body-3 hover:bg-secondary text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                  >
                    <Globe className="icon-md" />
                    <span>Publish</span>
                  </button>
                ) : (
                  <>
                    {publishedUrl ? (
                      <div className="px-spacing-3 py-spacing-2">
                        <div className="gap-spacing-1-5 flex items-center">
                          <input
                            readOnly
                            value={publishedUrl}
                            onFocus={(event) => event.currentTarget.select()}
                            className="h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 body-2 text-foreground w-full border outline-none"
                          />
                          <button
                            type="button"
                            onClick={onCopyPublishedUrl}
                            data-tooltip="Copy"
                            data-side="bottom"
                            className="tooltip rounded-spacing-2 text-muted-foreground hover:text-foreground p-spacing-2 flex-shrink-0 transition-colors"
                          >
                            {copiedUrl ? (
                              <Check className="icon-md text-primary" />
                            ) : (
                              <Copy className="icon-md" />
                            )}
                          </button>
                          <a
                            href={publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onPublishedUrlOpen}
                            data-tooltip="Open"
                            data-side="bottom"
                            className="tooltip rounded-spacing-2 text-muted-foreground hover:text-foreground p-spacing-2 flex-shrink-0 transition-colors"
                          >
                            <ExternalLink className="icon-md" />
                          </a>
                        </div>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={onUnpublish}
                      disabled={publishing}
                      className="body-3 text-destructive hover:bg-destructive/10 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                    >
                      <Globe className="icon-md" />
                      <span>Unpublish</span>
                    </button>
                  </>
                )}
              </div>,
              document.body,
            )
          : null}
      </div>
    </div>
  )
}
