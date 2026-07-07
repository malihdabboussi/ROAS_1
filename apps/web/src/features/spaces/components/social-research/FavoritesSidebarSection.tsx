'use client'

import { useState } from 'react'
import { Check, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { FavoriteFolder } from '../../services/favorite-folders.service'
import { AccordionSection } from './AccordionSection'

export type ResearchSidebarFavoriteEntry = {
  folder: FavoriteFolder
  count: number
}

interface FavoritesSidebarSectionProps {
  favoriteFolders: ResearchSidebarFavoriteEntry[]
  activeFolderId: string | null
  onSelectFolder: (folderId: string) => void
  onCreateFolder: (name: string) => unknown
  onRenameFolder: (folder: FavoriteFolder, name: string) => void
  onDeleteFolder: (folder: FavoriteFolder) => void
}

/** "Favorites" accordion at the top of the research sidebar — folder rows with
 * live counts, inline create/rename, hover delete. */
export function FavoritesSidebarSection({
  favoriteFolders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FavoritesSidebarSectionProps) {
  const [open, setOpen] = useState(true)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')

  const commitNewFolder = () => {
    const name = newFolderName.trim()
    setNewFolderOpen(false)
    setNewFolderName('')
    if (name) void onCreateFolder(name)
  }

  const commitFolderRename = (folder: FavoriteFolder) => {
    const name = editFolderName.trim()
    setEditingFolderId(null)
    if (name && name !== folder.name) onRenameFolder(folder, name)
  }

  return (
    <AccordionSection
      title="Favorites"
      titlePeekBody="Star posts to collect them here."
      open={open}
      onToggle={() => setOpen((v) => !v)}
      action={
        newFolderOpen ? (
          <div className="px-spacing-2 py-spacing-1 flex w-full items-center gap-1.5">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNewFolder()
                if (e.key === 'Escape') {
                  setNewFolderOpen(false)
                  setNewFolderName('')
                }
              }}
              placeholder="Folder name..."
              className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--color-secondary)] px-1.5 py-0.5 text-xs text-[var(--foreground)] outline-none"
            />
            <button
              type="button"
              onClick={commitNewFolder}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
            >
              <Check className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            className="px-spacing-2 py-spacing-1 flex w-full items-center gap-1.5 rounded-xl text-left text-xs font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <Plus className="h-3 w-3 shrink-0" />
            New folder
          </button>
        )
      }
    >
      {favoriteFolders.map(({ folder, count }) => {
        const isActive = activeFolderId === folder.id
        const isEditing = editingFolderId === folder.id
        return (
          <div
            key={folder.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!isEditing) onSelectFolder(folder.id)
            }}
            onKeyDown={(e) => {
              if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onSelectFolder(folder.id)
              }
            }}
            className={cn(
              'group/fav px-spacing-2 py-spacing-1 flex cursor-pointer items-center gap-1.5 rounded-xl text-xs font-medium transition-colors',
              isActive
                ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
            )}
          >
            {isEditing ? (
              <>
                <input
                  autoFocus
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') commitFolderRename(folder)
                    if (e.key === 'Escape') setEditingFolderId(null)
                  }}
                  className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--color-secondary)] px-1.5 py-0.5 text-xs text-[var(--foreground)] outline-none"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    commitFolderRename(folder)
                  }}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <Check className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{folder.name}</span>
                <div className="relative flex h-4 shrink-0 items-center">
                  <span
                    className={cn(
                      'shrink-0 text-[11px] text-[var(--color-muted-foreground)] transition-all duration-200 ease-out',
                      'group-hover/fav:pointer-events-none group-hover/fav:translate-x-1 group-hover/fav:opacity-0',
                    )}
                  >
                    {count}
                  </span>
                  <div className="absolute right-0 flex translate-x-2 items-center gap-0.5 opacity-0 transition-all duration-200 ease-out group-hover/fav:translate-x-0 group-hover/fav:opacity-100">
                    <button
                      type="button"
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingFolderId(folder.id)
                        setEditFolderName(folder.name)
                      }}
                      className="flex h-4 w-4 items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      title="Delete folder"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteFolder(folder)
                      }}
                      className="flex h-4 w-4 items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })}
    </AccordionSection>
  )
}
