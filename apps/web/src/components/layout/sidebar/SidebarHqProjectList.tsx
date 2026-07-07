'use client'

import Link from 'next/link'
import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRightLeft,
  ExternalLink,
  FolderGit2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { TransferDialog } from '@/components/transfer'
import { deleteProject, renameProject } from '@/features/projects/services/projects.service'
import type { ProjectRepo } from '@/features/projects/types'
import { useOrgStore } from '@/lib/org'

export function SidebarHqProjectList({
  projects,
  setSidebarProjects,
  pathname,
}: {
  projects: ProjectRepo[]
  setSidebarProjects: Dispatch<SetStateAction<ProjectRepo[]>>
  pathname: string
}) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [transferProject, setTransferProject] = useState<{ id: string; name: string } | null>(null)
  const { isOrgContext, memberships } = useOrgStore()
  const hasOtherContexts = memberships.length > 0 || isOrgContext()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })

  const openMenu = (id: string, btn: HTMLButtonElement) => {
    const rect = btn.getBoundingClientRect()
    setMenuPos({ top: rect.top, left: rect.right + 8 })
    setMenuId(id)
  }

  const proj = menuId ? projects.find((p) => p.id === menuId) : null

  const handleRenameSubmit = async () => {
    const trimmed = renameValue.trim()
    if (!trimmed || !renamingId) {
      setRenamingId(null)
      return
    }
    try {
      const updated = await renameProject(renamingId, trimmed)
      setSidebarProjects((prev) =>
        prev.map((p) => (p.id === renamingId ? { ...p, name: updated.name } : p)),
      )
    } catch {
      /* non-fatal */
    }
    setRenamingId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id)
      setSidebarProjects((prev) => prev.filter((p) => p.id !== id))
    } catch {
      /* non-fatal */
    }
    setMenuId(null)
  }

  return (
    <div className="space-y-0.5">
      {projects.map((p) => {
        const href = `/projects/${p.id}`
        const isCurrentPage = pathname === `/projects/${p.id}`
        if (renamingId === p.id) {
          return (
            <div key={p.id} className="flex items-center gap-2 px-1">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleRenameSubmit()
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onBlur={() => void handleRenameSubmit()}
                autoFocus
                placeholder="Project name"
                className="input-glass body-3 flex-1 px-2 py-1"
              />
            </div>
          )
        }
        return (
          <div key={p.id} className="group relative flex items-center">
            <Link
              href={href}
              className={`nav-glass-hover-purple flex w-full items-center gap-2 rounded-lg px-3 py-1.5 transition-all ${
                isCurrentPage
                  ? 'nav-glass-selected-purple nav-glass-text-purple'
                  : 'text-[var(--color-muted-foreground)]'
              }`}
            >
              <FolderGit2 className="h-4 w-4 shrink-0" />
              <span className="body-3 truncate">{p.name}</span>
            </Link>
            <button
              ref={menuId === p.id ? triggerRef : undefined}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                openMenu(p.id, e.currentTarget)
              }}
              className="absolute right-1 rounded p-0.5 text-[var(--color-muted-foreground)] opacity-0 transition-opacity hover:text-[var(--color-foreground)] group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}

      {menuId &&
        proj &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMenuId(null)} aria-hidden />
            <div
              className="fixed z-[70] w-60 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1 shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                onClick={() => {
                  setRenameValue(proj.name)
                  setRenamingId(proj.id)
                  setMenuId(null)
                }}
                className="body-3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
              >
                <Pencil className="h-4 w-4" />
                Rename
              </button>
              <Link
                href={`/projects/${proj.id}`}
                onClick={() => setMenuId(null)}
                className="body-3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Link>
              {hasOtherContexts && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setTransferProject({ id: proj.id, name: proj.name })
                    setMenuId(null)
                  }}
                  className="body-3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Move / Copy to...
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(proj.id)}
                className="body-3 text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-3 py-1.5 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </>,
          document.body,
        )}
      {transferProject && (
        <TransferDialog
          open
          onClose={() => setTransferProject(null)}
          entityType="project"
          entityId={transferProject.id}
          entityName={transferProject.name}
          onTransferComplete={() => window.location.reload()}
        />
      )}
    </div>
  )
}
