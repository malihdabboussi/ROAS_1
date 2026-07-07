'use client'

import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Check, Layers, ListFilter, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { TOOLBAR_DOCK_SLOT_SPRING } from '@/lib/ui/toolbar-motion'
import { skillsGroupByLabel } from './skills-catalog-sections'
import { SkillsGroupByPopover } from './skills-group-by-popover'
import { SkillsNewSkillButton } from './skills-new-skill-button'
import type { SkillsGroupBy, SkillsGroupSort, SkillTypeFilter } from './skills-page.types'
import { DEFAULT_SKILL_TYPE_FILTERS } from './skills-page.types'

export function SkillsListToolbar({
  skillsViewKey,
  skillsGroupBy,
  setSkillsGroupBy,
  skillsGroupSort,
  setSkillsGroupSort,
  search,
  setSearch,
  skillTypeFilters,
  toggleSkillTypeFilter,
  selectedAgentKey,
  addSkillMenuOpen,
  setAddSkillMenuOpen,
  openCreateFresh,
  openCreateWithJaime,
  skillUploadInputRef,
  handleUploadSkill,
  extracting,
}: {
  skillsViewKey: 'all' | string
  skillsGroupBy: SkillsGroupBy
  setSkillsGroupBy: (value: SkillsGroupBy) => void
  skillsGroupSort: SkillsGroupSort
  setSkillsGroupSort: (value: SkillsGroupSort) => void
  search: string
  setSearch: (v: string) => void
  skillTypeFilters: SkillTypeFilter[]
  toggleSkillTypeFilter: (filter: SkillTypeFilter) => void
  selectedAgentKey: string
  addSkillMenuOpen: boolean
  setAddSkillMenuOpen: (open: boolean) => void
  openCreateFresh: () => void
  openCreateWithJaime: () => void
  skillUploadInputRef: RefObject<HTMLInputElement | null>
  handleUploadSkill: (files: FileList | File[]) => void
  extracting: boolean
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [groupByOpen, setGroupByOpen] = useState(false)
  const groupByBtnRef = useRef<HTMLSpanElement>(null)

  const groupByActiveLabel = skillsGroupByLabel(skillsGroupBy, skillsViewKey)

  const filterActive =
    skillTypeFilters.length !== DEFAULT_SKILL_TYPE_FILTERS.length ||
    !DEFAULT_SKILL_TYPE_FILTERS.every((f) => skillTypeFilters.includes(f))

  const filterRowCls = (active: boolean) =>
    `gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left hover:bg-[var(--color-secondary)] ${
      active ? 'text-foreground font-medium' : 'text-muted-foreground'
    }`

  const dockIconBtnCls =
    'rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'

  return (
    <>
      <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 bg-[var(--background)] px-4 py-2">
        <div className="flex min-w-0 flex-nowrap items-center gap-1">
          <Tooltip label="Group by" side="bottom">
            <span ref={groupByBtnRef} className="inline-flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => setGroupByOpen((o) => !o)}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                  groupByActiveLabel
                    ? 'badge-glass-purple'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                }`}
              >
                <Layers className="h-3 w-3" />
                {groupByActiveLabel ?? 'Group by'}
              </button>
            </span>
          </Tooltip>
        </div>

        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
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
                    placeholder="Search…"
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
                  <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
                    <span className="inline-flex">
                      <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        className={dockIconBtnCls}
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

          <Popover.Root open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
            <div className="flex h-7 shrink-0 items-center justify-center">
              <AnimatePresence mode="popLayout" initial={false}>
                {filterActive ? (
                  <motion.div
                    key="skills-filter-active"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={TOOLBAR_DOCK_SLOT_SPRING}
                    className="flex h-7 items-center justify-center"
                  >
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className="badge-glass badge-glass-blue rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
                      >
                        <ListFilter className="h-3.5 w-3.5 shrink-0" />
                        <span>Filtered</span>
                      </button>
                    </Popover.Trigger>
                  </motion.div>
                ) : (
                  <motion.div
                    key="skills-filter-idle"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={TOOLBAR_DOCK_SLOT_SPRING}
                    className="flex h-7 items-center justify-center"
                  >
                    <Tooltip
                      label="Filter skills"
                      side="bottom"
                      triggerClassName="flex h-full items-center"
                    >
                      <span className="inline-flex">
                        <Popover.Trigger asChild>
                          <button
                            type="button"
                            className={dockIconBtnCls}
                            aria-label="Filter skills"
                            aria-expanded={filterMenuOpen}
                          >
                            <ListFilter className="h-3.5 w-3.5" />
                          </button>
                        </Popover.Trigger>
                      </span>
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-1 uppercase tracking-wide">
                  Show
                </p>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={skillTypeFilters.includes('custom')}
                  className={filterRowCls(skillTypeFilters.includes('custom'))}
                  onClick={() => toggleSkillTypeFilter('custom')}
                >
                  <BookOpen className="icon-sm shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">Custom skills</span>
                  {skillTypeFilters.includes('custom') ? (
                    <Check className="icon-sm shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={skillTypeFilters.includes('official')}
                  className={filterRowCls(skillTypeFilters.includes('official'))}
                  onClick={() => toggleSkillTypeFilter('official')}
                >
                  <BookOpen className="icon-sm shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">Official skills</span>
                  {skillTypeFilters.includes('official') ? (
                    <Check className="icon-sm shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />

          <SkillsNewSkillButton
            variant="toolbar"
            selectedAgentKey={selectedAgentKey}
            addSkillMenuOpen={addSkillMenuOpen}
            setAddSkillMenuOpen={setAddSkillMenuOpen}
            openCreateFresh={openCreateFresh}
            openCreateWithJaime={openCreateWithJaime}
            skillUploadInputRef={skillUploadInputRef}
            handleUploadSkill={handleUploadSkill}
            extracting={extracting}
          />
        </div>
      </div>

      <SkillsGroupByPopover
        open={groupByOpen}
        onClose={() => setGroupByOpen(false)}
        anchorRef={groupByBtnRef}
        skillsViewKey={skillsViewKey}
        skillsGroupBy={skillsGroupBy}
        skillsGroupSort={skillsGroupSort}
        onGroupByChange={setSkillsGroupBy}
        onGroupSortChange={setSkillsGroupSort}
      />
    </>
  )
}
