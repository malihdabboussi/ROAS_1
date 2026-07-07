import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Info } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { fixedFloatingPortalStyle } from '@/lib/ui'
import type { SpaceShareLevel } from '../../services/spaces.service'

const PERMISSION_OPTIONS: ReadonlyArray<{ value: SpaceShareLevel; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'edit', label: 'Edit' },
  { value: 'view', label: 'View only' },
]

function SortOptionCheckGlyph() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="tint-green relative z-30 h-2.5 w-2.5"
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

interface CreateSpaceModalPermissionSectionProps {
  level: SpaceShareLevel
  disabled: boolean
  onLevelChange: (level: SpaceShareLevel) => void
}

export function CreateSpaceModalPermissionSection({
  level,
  disabled,
  onLevelChange,
}: CreateSpaceModalPermissionSectionProps) {
  const [permissionOpen, setPermissionOpen] = useState(false)
  const permissionTriggerRef = useRef<HTMLButtonElement>(null)
  const [permissionMenuPos, setPermissionMenuPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const levelLabel = PERMISSION_OPTIONS.find((o) => o.value === level)?.label ?? 'Full edit'

  useEffect(() => {
    if (disabled) setPermissionOpen(false)
  }, [disabled])

  useLayoutEffect(() => {
    if (!permissionOpen || disabled) {
      setPermissionMenuPos(null)
      return
    }
    const el = permissionTriggerRef.current
    if (!el) return
    const menuHeight = 220
    const margin = 8
    const compute = () => {
      const rect = el.getBoundingClientRect()
      const menuWidth = Math.max(rect.width, 192)
      let left = rect.right - menuWidth
      if (left < margin) left = margin
      if (left + menuWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - menuWidth - margin)
      }
      let top = rect.bottom + 4
      if (top + menuHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - menuHeight - 4)
      }
      setPermissionMenuPos({ top, left, width: menuWidth })
    }
    compute()
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => {
      window.removeEventListener('scroll', compute, true)
      window.removeEventListener('resize', compute)
    }
  }, [permissionOpen, disabled])

  useEffect(() => {
    if (!permissionOpen) return
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (
        el.closest('[data-create-space-permission-dropdown]') ||
        el.closest('[data-create-space-permission-menu]')
      ) {
        return
      }
      setPermissionOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [permissionOpen])

  return (
    <>
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
            disabled={disabled}
            aria-expanded={permissionOpen}
            aria-haspopup="listbox"
            onClick={() => setPermissionOpen((v) => !v)}
            className="border-border bg-background body-3 text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-3 hover:bg-hover-subtle focus:ring-primary flex h-spacing-8 min-w-40 items-center justify-between border text-left outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-muted-foreground font-medium">{levelLabel}</span>
            <ChevronDown
              className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform ${permissionOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {permissionOpen && !disabled && permissionMenuPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="listbox"
              data-create-space-permission-menu
              className="dropdown-menu-solid z-dropdown p-spacing-2 fixed max-h-[min(280px,calc(100vh-16px))] min-w-48 overflow-y-auto shadow-lg outline-none"
              style={fixedFloatingPortalStyle(permissionMenuPos, {
                width: permissionMenuPos.width,
              })}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="space-y-spacing-0">
                {PERMISSION_OPTIONS.map((opt) => {
                  const isSelected = level === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'dropdown-sort-option-selected text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      } `}
                      onClick={() => {
                        onLevelChange(opt.value)
                        setPermissionOpen(false)
                      }}
                    >
                      <span className="font-medium">{opt.label}</span>
                      {isSelected ? (
                        <div className="dropdown-sort-check ml-spacing-2">
                          <SortOptionCheckGlyph />
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
    </>
  )
}
