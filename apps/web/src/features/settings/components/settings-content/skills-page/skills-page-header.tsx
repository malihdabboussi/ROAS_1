'use client'

import { useState, type InputHTMLAttributes, type RefObject } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { AnimatePresence, motion } from 'framer-motion'
import { FilePlus, LayoutGrid, List, Loader2, Plus, Search, Upload } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { isSkillWriteLockedAgent } from '@/lib/agents/system-agent-contracts'
import { TOOLBAR_DOCK_SLOT_SPRING } from '@/lib/ui/toolbar-motion'

export function SkillsPageHeader({
  selectedAgentKey,
  search,
  setSearch,
  viewMode,
  setViewMode,
  addSkillMenuOpen,
  setAddSkillMenuOpen,
  openCreateFresh,
  folderInputRef,
  fileInputRef,
  handleUploadSkillFiles,
  handleUploadSingleFiles,
  extracting,
}: {
  selectedAgentKey: string
  search: string
  setSearch: (v: string) => void
  viewMode: 'grid' | 'list'
  setViewMode: (m: 'grid' | 'list') => void
  addSkillMenuOpen: boolean
  setAddSkillMenuOpen: (open: boolean) => void
  openCreateFresh: () => void
  folderInputRef: RefObject<HTMLInputElement | null>
  fileInputRef: RefObject<HTMLInputElement | null>
  handleUploadSkillFiles: (files: FileList | File[]) => void
  handleUploadSingleFiles: (files: FileList | File[]) => void
  extracting: boolean
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const targetIsSkillLocked = isSkillWriteLockedAgent(selectedAgentKey)
  const searchActive = searchOpen || search.trim().length > 0

  return (
    <div className="shrink-0">
      <div className="gap-spacing-2 flex items-center justify-end">
        <div className="gap-spacing-1 rounded-spacing-2 border-border flex shrink-0 border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={
              viewMode === 'grid'
                ? 'chip-glass-blue px-spacing-2 py-spacing-1 rounded-spacing-1'
                : 'px-spacing-2 py-spacing-1 rounded-spacing-1 text-muted-foreground hover:text-foreground'
            }
            aria-pressed={viewMode === 'grid'}
            aria-label="Grid view"
          >
            <LayoutGrid className="icon-sm" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={
              viewMode === 'list'
                ? 'chip-glass-blue px-spacing-2 py-spacing-1 rounded-spacing-1'
                : 'px-spacing-2 py-spacing-1 rounded-spacing-1 text-muted-foreground hover:text-foreground'
            }
            aria-pressed={viewMode === 'list'}
            aria-label="List view"
          >
            <List className="icon-sm" />
          </button>
        </div>

        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {searchOpen ? (
              <motion.div
                key="skills-search-field"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <input
                  autoFocus
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => {
                    if (!search.trim()) setSearchOpen(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearch('')
                      setSearchOpen(false)
                    }
                  }}
                  placeholder="Search skills"
                  className="w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                />
              </motion.div>
            ) : (
              <motion.div
                key="skills-search-icon"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip
                  label="Search skills"
                  side="bottom"
                  triggerClassName="flex h-full items-center"
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                        searchActive
                          ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                      }`}
                      aria-label="Search skills"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Popover.Root open={addSkillMenuOpen} onOpenChange={setAddSkillMenuOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={!selectedAgentKey || extracting || targetIsSkillLocked}
              title={
                targetIsSkillLocked
                  ? "This agent's skills are managed by the platform. Toggle skills on/off in the chat agent panel."
                  : undefined
              }
              className="chip-glass-green gap-spacing-1 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex shrink-0 items-center font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {extracting ? (
                <Loader2 className="icon-sm animate-spin" />
              ) : (
                <Plus className="icon-sm" />
              )}
              {extracting ? 'Extracting…' : 'New Skill'}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={4}
              collisionPadding={12}
              className="dropdown-menu-solid z-dropdown w-52 py-1 outline-none"
              onOpenAutoFocus={(e) => e.preventDefault()}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                disabled={extracting}
                className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={openCreateFresh}
              >
                <FilePlus className="icon-sm shrink-0" />
                Start fresh
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={extracting}
                className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setAddSkillMenuOpen(false)
                  setTimeout(() => folderInputRef.current?.click(), 0)
                }}
              >
                <Upload className="icon-sm shrink-0" />
                Upload folder
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={extracting}
                className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setAddSkillMenuOpen(false)
                  setTimeout(() => fileInputRef.current?.click(), 0)
                }}
              >
                <Upload className="icon-sm shrink-0" />
                Upload file
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          {...({
            webkitdirectory: '',
            directory: '',
            multiple: true,
          } as InputHTMLAttributes<HTMLInputElement>)}
          onChange={(e) => {
            if (e.target.files?.length) handleUploadSkillFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".md,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"
          onChange={(e) => {
            if (e.target.files?.length) handleUploadSingleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
