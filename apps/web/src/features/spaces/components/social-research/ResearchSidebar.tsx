'use client'

import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { FavoriteFolder } from '../../services/favorite-folders.service'
import type { SavedTopicSearchSummary } from '../../services/social-research.service'
import type { SocialPlatform, SocialTrackedAccount } from '../../types/space-schema'
import { AccordionSection } from './AccordionSection'
import { DeleteSavedTopicSearchConfirmModal } from './DeleteSavedTopicSearchConfirmModal'
import {
  FavoritesSidebarSection,
  type ResearchSidebarFavoriteEntry,
} from './FavoritesSidebarSection'
import { cachedSocialProfileImageUrl } from './social-image-proxy'

const PLATFORM_SHORT: Record<SocialPlatform, string> = {
  youtube: 'YT',
  instagram: 'IG',
  tiktok: 'TT',
  twitter: 'X',
}

function lastRunLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export type ResearchSidebarPeopleEntry = {
  platform: SocialPlatform
  account: SocialTrackedAccount
  accountKey: string
}

export type { ResearchSidebarFavoriteEntry }

interface ResearchSidebarProps {
  favoriteFolders: ResearchSidebarFavoriteEntry[]
  favoritesActiveFolderId: string | null
  onSelectFavoriteFolder: (folderId: string) => void
  onCreateFavoriteFolder: (name: string) => unknown
  onRenameFavoriteFolder: (folder: FavoriteFolder, name: string) => void
  onDeleteFavoriteFolder: (folder: FavoriteFolder) => void
  peopleAccounts: ResearchSidebarPeopleEntry[]
  peopleActiveKey: string | null
  peopleNewActive: boolean
  topicSearchAvailable: boolean
  savedSearches: SavedTopicSearchSummary[]
  topicActiveId: string | null
  topicNewActive: boolean
  topicLoadingId: string | null
  peopleAllActive: boolean
  topicAllActive: boolean
  onSelectAllPeople: () => void
  onSelectAllTopics: () => void
  onNewAccount: () => void
  onSelectAccount: (accountKey: string) => void
  onNewSearch: () => void
  onSelectSearch: (search: SavedTopicSearchSummary) => void
  onRenameSearch: (search: SavedTopicSearchSummary, title: string) => void
  onDeleteSearch: (search: SavedTopicSearchSummary) => void | Promise<void>
}

export function ResearchSidebar({
  favoriteFolders,
  favoritesActiveFolderId,
  onSelectFavoriteFolder,
  onCreateFavoriteFolder,
  onRenameFavoriteFolder,
  onDeleteFavoriteFolder,
  peopleAccounts,
  peopleActiveKey,
  peopleNewActive,
  topicSearchAvailable,
  savedSearches,
  topicActiveId,
  topicNewActive,
  topicLoadingId,
  peopleAllActive,
  topicAllActive,
  onSelectAllPeople,
  onSelectAllTopics,
  onNewAccount,
  onSelectAccount,
  onNewSearch,
  onSelectSearch,
  onRenameSearch,
  onDeleteSearch,
}: ResearchSidebarProps) {
  const [peopleOpen, setPeopleOpen] = useState(true)
  const [topicOpen, setTopicOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SavedTopicSearchSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const commitRename = (search: SavedTopicSearchSummary) => {
    const title = editTitle.trim()
    setEditingId(null)
    if (title && title !== search.title) onRenameSearch(search, title)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await onDeleteSearch(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
      <div className="px-spacing-3 pt-spacing-3 pb-spacing-2 shrink-0">
        <h2 className="body-2 text-foreground font-semibold">Research By:</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <FavoritesSidebarSection
          favoriteFolders={favoriteFolders}
          activeFolderId={favoritesActiveFolderId}
          onSelectFolder={onSelectFavoriteFolder}
          onCreateFolder={onCreateFavoriteFolder}
          onRenameFolder={onRenameFavoriteFolder}
          onDeleteFolder={onDeleteFavoriteFolder}
        />

        <div className="mt-spacing-2">
          <AccordionSection
            title="People"
            titleActive={peopleAllActive}
            onTitleClick={onSelectAllPeople}
            open={peopleOpen}
            onToggle={() => setPeopleOpen((v) => !v)}
            action={
              <button
                type="button"
                onClick={onNewAccount}
                className={cn(
                  'px-spacing-2 py-spacing-1 flex w-full items-center gap-1.5 rounded-xl text-left text-xs font-medium transition-colors',
                  peopleNewActive
                    ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                )}
              >
                <Plus className="h-3 w-3 shrink-0" />
                New account
              </button>
            }
          >
            {peopleAccounts.map(({ platform, account, accountKey }) => {
              const avatarUrl = cachedSocialProfileImageUrl(platform, account)
              const isActive = peopleActiveKey === accountKey && !peopleNewActive
              return (
                <button
                  key={accountKey}
                  type="button"
                  onClick={() => onSelectAccount(accountKey)}
                  className={cn(
                    'px-spacing-2 py-spacing-1 flex w-full items-center gap-1.5 rounded-xl text-left text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                  )}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      {account.handle.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    @{account.handle}
                  </span>
                  <span className="badge-glass badge-glass-muted shrink-0 rounded px-1 py-px text-[9px] font-semibold">
                    {PLATFORM_SHORT[platform]}
                  </span>
                </button>
              )
            })}
          </AccordionSection>
        </div>

        {topicSearchAvailable ? (
          <div className="mt-spacing-2">
            <AccordionSection
              title="Topic search"
              titleActive={topicAllActive}
              onTitleClick={onSelectAllTopics}
              open={topicOpen}
              onToggle={() => setTopicOpen((v) => !v)}
              action={
                <button
                  type="button"
                  onClick={onNewSearch}
                  className={cn(
                    'px-spacing-2 py-spacing-1 flex w-full items-center gap-1.5 rounded-xl text-left text-xs font-medium transition-colors',
                    topicNewActive
                      ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                  )}
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  New search
                </button>
              }
            >
              {savedSearches.map((search) => {
                const isActive = topicActiveId === search.id && !topicNewActive
                const isEditing = search.id === editingId
                return (
                  <div
                    key={search.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!isEditing) onSelectSearch(search)
                    }}
                    onKeyDown={(e) => {
                      if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onSelectSearch(search)
                      }
                    }}
                    className={cn(
                      'group/saved px-spacing-2 py-spacing-1 flex cursor-pointer items-center gap-1.5 rounded-xl text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
                    )}
                  >
                    {isEditing ? (
                      <>
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation()
                            if (e.key === 'Enter') commitRename(search)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--color-secondary)] px-1.5 py-0.5 text-xs text-[var(--foreground)] outline-none"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            commitRename(search)
                          }}
                          className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingId(null)
                          }}
                          className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {search.title}
                        </span>
                        <div className="relative flex h-4 shrink-0 items-center">
                          <span
                            className={cn(
                              'shrink-0 text-[11px] text-[var(--color-muted-foreground)] transition-all duration-200 ease-out',
                              'group-hover/saved:pointer-events-none group-hover/saved:translate-x-1 group-hover/saved:opacity-0',
                            )}
                          >
                            {topicLoadingId === search.id
                              ? 'loading…'
                              : lastRunLabel(search.last_run_at)}
                          </span>
                          <div className="absolute right-0 flex translate-x-2 items-center gap-0.5 opacity-0 transition-all duration-200 ease-out group-hover/saved:translate-x-0 group-hover/saved:opacity-100">
                            <button
                              type="button"
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingId(search.id)
                                setEditTitle(search.title)
                              }}
                              className="flex h-4 w-4 items-center justify-center text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              title="Delete saved search"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(search)
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
          </div>
        ) : null}
      </div>

      <DeleteSavedTopicSearchConfirmModal
        open={deleteTarget !== null}
        searchTitle={deleteTarget?.title ?? ''}
        deleting={deleting}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
