import { type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Info } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import type { SpaceShareLevel } from '../../../services/spaces.service'
import { PERMISSION_OPTIONS, type PermissionMenuPosition } from './use-template-confirm-dialog-options'

interface TemplatePrivacySectionProps {
  isPrivate: boolean
  level: SpaceShareLevel
  submitting: boolean
  permissionOpen: boolean
  permissionTriggerRef: RefObject<HTMLButtonElement | null>
  permissionMenuPos: PermissionMenuPosition | null
  onPermissionOpenChange: (open: boolean | ((open: boolean) => boolean)) => void
  onLevelChange: (level: SpaceShareLevel) => void
  onPrivateChange: (isPrivate: boolean) => void
}

export function TemplatePrivacySection({
  isPrivate,
  level,
  submitting,
  permissionOpen,
  permissionTriggerRef,
  permissionMenuPos,
  onPermissionOpenChange,
  onLevelChange,
  onPrivateChange,
}: TemplatePrivacySectionProps) {
  const levelLabel = PERMISSION_OPTIONS.find((option) => option.value === level)?.label ?? 'Admin'

  return (
    <div className="border-border pt-spacing-4 space-y-spacing-3 border-t">
      {!isPrivate ? (
        <div className="gap-spacing-3 flex items-center justify-between">
          <div className="gap-spacing-2 flex items-center">
            <span className="body-2 text-foreground font-medium">Default permission</span>
            <Tooltip
              label="What level new org members get when this Space is shared with the team"
              side="top"
            >
              <Info className="text-muted-foreground h-3.5 w-3.5" aria-hidden />
            </Tooltip>
          </div>
          <div className="relative" data-create-space-permission-dropdown>
            <button
              ref={permissionTriggerRef}
              type="button"
              disabled={submitting}
              aria-expanded={permissionOpen}
              aria-haspopup="listbox"
              onClick={() => onPermissionOpenChange((open) => !open)}
              className="border-border bg-background body-3 text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-3 hover:bg-hover-subtle focus:ring-ring flex h-8 min-w-40 items-center justify-between border text-left outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-muted-foreground font-medium">{levelLabel}</span>
              <ChevronDown
                className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform ${permissionOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          </div>
        </div>
      ) : null}

      {permissionOpen && !isPrivate && permissionMenuPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="listbox"
              data-create-space-permission-menu
              className="dropdown-menu-solid z-dropdown p-spacing-2 fixed max-h-[min(280px,calc(100vh-16px))] overflow-y-auto shadow-lg outline-none"
              style={{
                top: permissionMenuPos.top,
                left: permissionMenuPos.left,
                width: permissionMenuPos.width,
                minWidth: 192,
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="space-y-spacing-0">
                {PERMISSION_OPTIONS.map((option) => {
                  const isSelected = level === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'dropdown-sort-option-selected text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      } `}
                      onClick={() => {
                        onLevelChange(option.value)
                        onPermissionOpenChange(false)
                      }}
                    >
                      <span className="font-medium">{option.label}</span>
                      {isSelected ? (
                        <div className="dropdown-sort-check ml-spacing-2">
                          <TemplatePermissionOptionCheckGlyph />
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}

      <div className="gap-spacing-3 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="body-2 text-foreground font-medium">Make Private</p>
          <p className="body-4 text-muted-foreground mt-spacing-1">
            Only you and invited members have access
          </p>
        </div>
        <Switch checked={isPrivate} onCheckedChange={onPrivateChange} disabled={submitting} />
      </div>
    </div>
  )
}

function TemplatePermissionOptionCheckGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="tint-green relative z-30 h-2.5 w-2.5 drop-shadow-sm"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}
