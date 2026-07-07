'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight, UserCog } from 'lucide-react'
import { useOrgStore, type OrgRole } from '@/features/org/store/use-org-store'
import { useUserRole } from '@/hooks/use-user-role'

const ROLE_SUBMENU_WIDTH = 224

const ROLE_OPTIONS: Array<{ value: OrgRole; label: string }> = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'creator', label: 'Creator' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
]

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  creator: 'Creator',
  editor: 'Editor',
  viewer: 'Viewer',
}

export function AvatarRoleSimulatorSection({ onClose }: { onClose: () => void }) {
  const { role: platformRole } = useUserRole()
  const { activeOrgId, myRole, roleOverride, setRoleOverride } = useOrgStore()
  const [subMenuOpen, setSubMenuOpen] = React.useState(false)
  const subTriggerRef = React.useRef<HTMLButtonElement>(null)
  const subMenuRef = React.useRef<HTMLDivElement>(null)
  const [subMenuPos, setSubMenuPos] = React.useState({ top: 0, left: 0 })

  React.useLayoutEffect(() => {
    if (!subMenuOpen || !subTriggerRef.current) return

    const update = () => {
      const el = subTriggerRef.current
      const panel = subMenuRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const gap = 4
      const margin = 8
      let left = rect.right + gap
      if (left + ROLE_SUBMENU_WIDTH > window.innerWidth - margin) {
        left = rect.left - ROLE_SUBMENU_WIDTH - gap
      }
      if (left < margin) {
        left = window.innerWidth - ROLE_SUBMENU_WIDTH - margin
      }
      if (left < margin) left = margin
      const panelH = panel?.offsetHeight ?? 0
      let top = rect.bottom - panelH
      if (top < margin) top = margin
      setSubMenuPos({ top, left })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [subMenuOpen])

  React.useEffect(() => {
    if (!subMenuOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (subTriggerRef.current?.contains(target) || subMenuRef.current?.contains(target)) {
        return
      }
      setSubMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [subMenuOpen])

  if (platformRole !== 'admin' || !activeOrgId || !myRole) return null

  const activeLabel = roleOverride ? ROLE_LABELS[roleOverride] : ROLE_LABELS[myRole]

  return (
    <div className="border-b border-[var(--color-border)] py-1">
      <button
        ref={subTriggerRef}
        type="button"
        onClick={() => setSubMenuOpen(!subMenuOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
      >
        <UserCog className="text-muted-foreground h-4 w-4 flex-shrink-0" />
        <span className="body-2 min-w-0 flex-1 truncate text-left">See as a</span>
        <span className="body-3 text-muted-foreground truncate">{activeLabel}</span>
        <ChevronRight className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
      </button>

      {subMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={subMenuRef}
            data-avatar-dropdown
            className="border-border bg-card text-card-foreground rounded-spacing-2 z-dropdown fixed w-56 overflow-hidden border shadow-lg"
            style={{ top: subMenuPos.top, left: subMenuPos.left }}
          >
            {ROLE_OPTIONS.map((option) => {
              const selected = myRole === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRoleOverride(option.value)
                    setSubMenuOpen(false)
                    onClose()
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 transition-colors ${
                    selected
                      ? 'avatar-org-submenu-row-selected'
                      : 'hover:bg-[var(--color-secondary)]'
                  }`}
                >
                  <span className="body-3 min-w-0 flex-1 truncate text-left">{option.label}</span>
                  {selected && <Check className="text-primary h-4 w-4 flex-shrink-0" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
