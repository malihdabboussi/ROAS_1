'use client'

import {
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
} from 'react'
import { RxDoubleArrowLeft } from 'react-icons/rx'
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import * as Popover from '@radix-ui/react-popover'
import { motion } from 'framer-motion'
import { ChevronsDown, ChevronsUp, FilePlus, Loader2, Plus, Search, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { MissionAgentSkillResource } from '@/features/mission-control/types'
import { cn } from '@/lib/utils/cn'
import { ResourceTree } from './resource-tree'
import {
  buildSkillResourceMovePath,
  getSkillResourceDndErrorMessage,
  parseSkillResourceDragId,
  type SkillResourceTreeDndZone,
} from './skill-resource-tree-dnd-apply'
import { SkillTreeRow } from './skill-tree-row'
import { SkillTreeRowActionsMenu } from './skill-tree-row-actions-menu'
import type { SkillTreeMenuTarget, SkillTreeRowMenuState } from './skill-tree-row-menu.types'
import type { ResourceTreeNode } from './skills-page.types'
import {
  collectResourceTreeFolderPaths,
  filterResourceTree,
  skillMdMatchesTreeSearch,
} from './skills-page.utils'
import { useTriggerIsVisible } from './use-trigger-is-visible'

const SKILL_TREE_ICON_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground h-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center px-spacing-1 transition-colors disabled:pointer-events-none disabled:opacity-40'

export function SkillDetailTreePanel({
  resourceTree,
  expandedFolders,
  setExpandedFolders,
  detailResourceId,
  setDetailResourceId,
  resetKey,
  onSelectResourceId,
  addResourceMenuOpen,
  setAddResourceMenuOpen,
  addingResourcePath,
  setAddingResourcePath,
  resourceBusy,
  resourceUploadInputRef,
  addResourcePathInputRef,
  writeLocked,
  startAddResourceManually,
  commitAddResourceManually,
  onUploadResourceFile,
  resources,
  onMoveSkillResource,
  detailExportingPdf,
  handleSkillDetailPdf,
  downloadSkillMd,
  handleSkillDetailJson,
  downloadSkillResourceFile,
  renameSkillResource,
  deleteSkillResource,
  startAddResourceInFolder,
  uploadResourceFileToFolder,
  folderUploadInputRef,
  folderUploadPathRef,
  onCollapse,
  openCompactSearch,
  onOpenCompactSearchConsumed,
}: {
  resourceTree: ResourceTreeNode[]
  resources: MissionAgentSkillResource[]
  expandedFolders: Set<string>
  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>
  detailResourceId: string | null
  setDetailResourceId: Dispatch<SetStateAction<string | null>>
  /** Resets local tree search when the open skill changes */
  resetKey?: string
  onSelectResourceId?: (id: string | null) => void
  addResourceMenuOpen: boolean
  setAddResourceMenuOpen: (open: boolean) => void
  addingResourcePath: string | null
  setAddingResourcePath: Dispatch<SetStateAction<string | null>>
  resourceBusy: boolean
  resourceUploadInputRef: RefObject<HTMLInputElement | null>
  addResourcePathInputRef: RefObject<HTMLInputElement | null>
  writeLocked: boolean
  startAddResourceManually: () => void
  commitAddResourceManually: () => void | Promise<void>
  onUploadResourceFile: (files: FileList | File[], folderPath?: string) => void | Promise<void>
  onMoveSkillResource: (resourceId: string, newFilePath: string) => void | Promise<void>
  detailExportingPdf: boolean
  handleSkillDetailPdf: () => void | Promise<void>
  downloadSkillMd: () => void
  handleSkillDetailJson: () => void
  downloadSkillResourceFile: (resourceId: string) => void
  renameSkillResource: (resourceId: string, currentPath: string) => void | Promise<void>
  deleteSkillResource: (resourceId: string) => void | Promise<void>
  startAddResourceInFolder: (folderPath: string) => void
  uploadResourceFileToFolder: (folderPath: string) => void
  folderUploadInputRef: RefObject<HTMLInputElement | null>
  folderUploadPathRef: RefObject<string | null>
  onCollapse?: () => void
  openCompactSearch?: boolean
  onOpenCompactSearchConsumed?: () => void
}) {
  const addTriggerRef = useRef<HTMLButtonElement>(null)
  const isAddTriggerVisible = useTriggerIsVisible(addTriggerRef)
  const [treeSearch, setTreeSearch] = useState('')
  const [compactSearchOpen, setCompactSearchOpen] = useState(false)
  const [treeDndActiveId, setTreeDndActiveId] = useState<string | null>(null)
  const [rowMenu, setRowMenu] = useState<SkillTreeRowMenuState>(null)
  const treeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )
  const dndEnabled = !writeLocked && resources.length > 0
  const folderPaths = useMemo(() => collectResourceTreeFolderPaths(resourceTree), [resourceTree])
  const filteredTree = useMemo(
    () => filterResourceTree(resourceTree, treeSearch),
    [resourceTree, treeSearch],
  )
  const showSkillMd = skillMdMatchesTreeSearch(treeSearch)
  const allFoldersExpanded =
    folderPaths.length > 0 && folderPaths.every((path) => expandedFolders.has(path))
  const treeToolbarPinnedOpen =
    compactSearchOpen || Boolean(treeSearch.trim()) || addResourceMenuOpen

  useEffect(() => {
    setTreeSearch('')
    setCompactSearchOpen(false)
    setAddingResourcePath(null)
    setAddResourceMenuOpen(false)
    setRowMenu(null)
  }, [resetKey, setAddResourceMenuOpen, setAddingResourcePath])

  useEffect(() => {
    if (!rowMenu) return
    const { target } = rowMenu
    if (target.kind === 'skill-md') {
      if (!showSkillMd) setRowMenu(null)
      return
    }
    if (target.kind === 'file') {
      if (!resources.some((resource) => resource.id === target.resourceId)) {
        setRowMenu(null)
      }
      return
    }
    if (!folderPaths.includes(target.path)) {
      setRowMenu(null)
    }
  }, [rowMenu, resources, folderPaths, showSkillMd])

  const closeRowMenu = useCallback(() => setRowMenu(null), [])

  const openRowMenuAtPointer = useCallback(
    (target: SkillTreeMenuTarget, e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setRowMenu({ target, pointer: { x: e.clientX, y: e.clientY } })
    },
    [],
  )

  const openRowMenuFromButton = useCallback(
    (target: SkillTreeMenuTarget, e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      setRowMenu({ target, pointer: { x: rect.right, y: rect.bottom + 4 } })
    },
    [],
  )

  const getResourceById = useCallback(
    (resourceId: string) => resources.find((resource) => resource.id === resourceId),
    [resources],
  )

  const handleCopyPath = useCallback(async (path: string) => {
    await navigator.clipboard.writeText(path)
    toast.success('Path copied')
  }, [])

  const handleExportSkillMdMarkdown = useCallback(() => {
    downloadSkillMd()
  }, [downloadSkillMd])

  const handleExportSkillMdPdf = useCallback(async () => {
    const previousResourceId = detailResourceId
    setDetailResourceId(null)
    onSelectResourceId?.(null)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await handleSkillDetailPdf()
    if (previousResourceId) {
      setDetailResourceId(previousResourceId)
      onSelectResourceId?.(previousResourceId)
    }
  }, [detailResourceId, handleSkillDetailPdf, onSelectResourceId, setDetailResourceId])

  const handleExportSkillMdJson = useCallback(() => {
    handleSkillDetailJson()
  }, [handleSkillDetailJson])

  const handleToggleFolderFromMenu = useCallback(
    (folderPath: string, expanded: boolean) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        if (expanded) next.delete(folderPath)
        else next.add(folderPath)
        return next
      })
    },
    [setExpandedFolders],
  )

  useEffect(() => {
    if (!openCompactSearch) return
    setCompactSearchOpen(true)
    onOpenCompactSearchConsumed?.()
  }, [openCompactSearch, onOpenCompactSearchConsumed])

  useEffect(() => {
    const q = treeSearch.trim()
    if (!q) return
    const paths = collectResourceTreeFolderPaths(filteredTree)
    if (paths.length === 0) return
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      for (const path of paths) next.add(path)
      return next
    })
  }, [treeSearch, filteredTree, setExpandedFolders])

  const handleToggleAllFolders = () => {
    if (allFoldersExpanded) {
      setExpandedFolders(new Set())
      return
    }
    setExpandedFolders(new Set(folderPaths))
  }

  const handleSelectResourceId = (id: string | null) => {
    setDetailResourceId(id)
    onSelectResourceId?.(id)
  }

  const handleSelectFile = (id: string) => {
    handleSelectResourceId(id)
  }

  const handleTreeDragStart = useCallback((event: { active: { id: string | number } }) => {
    setTreeDndActiveId(String(event.active.id))
  }, [])

  const handleTreeDragCancel = useCallback(() => {
    setTreeDndActiveId(null)
  }, [])

  const handleTreeDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setTreeDndActiveId(null)
      if (!over) return

      const activeDrag = parseSkillResourceDragId(String(active.id))
      if (!activeDrag) return

      const match = String(over.id).match(/^dnd:drop:(.+):(before|after|into)$/)
      if (!match || match[1] == null || match[2] == null) return

      const result = buildSkillResourceMovePath(
        resources,
        activeDrag.resourceId,
        match[1],
        match[2] as SkillResourceTreeDndZone,
      )
      if (!result.ok) {
        if (result.reason !== 'same-path') {
          toast.error(getSkillResourceDndErrorMessage(result.reason))
        }
        return
      }

      if (result.expandFolderPath) {
        setExpandedFolders((prev) => {
          const next = new Set(prev)
          next.add(result.expandFolderPath!)
          return next
        })
      }

      void onMoveSkillResource(activeDrag.resourceId, result.newPath)
    },
    [onMoveSkillResource, resources, setExpandedFolders],
  )

  const treeBody = (
    <div className="flex flex-col gap-0.5">
      {addingResourcePath !== null ? (
        <input
          ref={addResourcePathInputRef}
          type="text"
          value={addingResourcePath}
          onChange={(e) => setAddingResourcePath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commitAddResourceManually()
            if (e.key === 'Escape') setAddingResourcePath(null)
          }}
          onBlur={() => void commitAddResourceManually()}
          placeholder="references/file.md"
          className="body-4 text-foreground placeholder:text-muted-foreground border-border rounded-spacing-1 mb-spacing-1 px-spacing-2 py-spacing-1 w-full border bg-transparent outline-none focus:border-[var(--color-primary)]"
        />
      ) : null}
      {showSkillMd ? (
        <SkillTreeRow
          selected={detailResourceId === null}
          menuOpen={rowMenu?.target.kind === 'skill-md'}
          onSelect={() => handleSelectResourceId(null)}
          onContextMenu={(e) => openRowMenuAtPointer({ kind: 'skill-md' }, e)}
          onOpenMenu={(e) => openRowMenuFromButton({ kind: 'skill-md' }, e)}
        >
          SKILL.md
        </SkillTreeRow>
      ) : null}
      {filteredTree.length > 0 ? (
        <ResourceTree
          nodes={filteredTree}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          detailResourceId={detailResourceId}
          setDetailResourceId={handleSelectFile}
          listActiveId={treeDndActiveId}
          dndEnabled={dndEnabled}
          rowMenu={rowMenu}
          onOpenRowMenuAtPointer={openRowMenuAtPointer}
          onOpenRowMenuFromButton={openRowMenuFromButton}
        />
      ) : treeSearch.trim() ? (
        <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-2">No files match</p>
      ) : null}
    </div>
  )

  return (
    <div className="group flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="gap-spacing-2 p-spacing-3 flex shrink-0 items-center">
        <div className="gap-spacing-2 flex min-w-0 flex-1 items-center">
          <div className="body-3 text-foreground min-w-0 flex-1 truncate font-semibold">
            Skill tree
          </div>
          <div
            className={cn(
              'gap-spacing-0 flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
              treeToolbarPinnedOpen
                ? 'pointer-events-auto translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-4 opacity-0 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
            )}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {onCollapse ? (
              <button
                type="button"
                onClick={onCollapse}
                className={SKILL_TREE_ICON_BUTTON_CLASS}
                aria-label="Collapse skill tree"
                title="Collapse skill tree"
              >
                <RxDoubleArrowLeft className="icon-sm" aria-hidden />
              </button>
            ) : null}
            <motion.div
              initial={false}
              animate={{ width: compactSearchOpen ? 180 : 0, opacity: compactSearchOpen ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="relative w-[180px]">
                <input
                  type="text"
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                  placeholder="Search..."
                  className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 py-spacing-1 pl-spacing-3 pr-spacing-8 w-full"
                  autoFocus={compactSearchOpen}
                  aria-label="Search skill files"
                  role="searchbox"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCompactSearchOpen(false)
                    setTreeSearch('')
                  }}
                  className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
                  aria-label="Close search"
                  title="Close search"
                >
                  <X className="icon-sm" aria-hidden />
                </button>
              </div>
            </motion.div>
            {!compactSearchOpen ? (
              <button
                type="button"
                onClick={() => setCompactSearchOpen(true)}
                className={SKILL_TREE_ICON_BUTTON_CLASS}
                aria-label="Search files"
                title="Search files"
              >
                <Search className="icon-sm" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleToggleAllFolders}
              disabled={folderPaths.length === 0}
              className={SKILL_TREE_ICON_BUTTON_CLASS}
              aria-label={allFoldersExpanded ? 'Collapse all folders' : 'Expand all folders'}
              title={allFoldersExpanded ? 'Collapse all folders' : 'Expand all folders'}
            >
              {allFoldersExpanded ? (
                <ChevronsUp className="icon-sm" aria-hidden />
              ) : (
                <ChevronsDown className="icon-sm" aria-hidden />
              )}
            </button>
            <Popover.Root
              open={addResourceMenuOpen && isAddTriggerVisible}
              onOpenChange={(open) => {
                if (!open) {
                  setAddResourceMenuOpen(false)
                  return
                }
                if (isAddTriggerVisible) setAddResourceMenuOpen(true)
              }}
            >
              <Popover.Trigger asChild>
                <button
                  ref={addTriggerRef}
                  type="button"
                  disabled={writeLocked || resourceBusy}
                  className={SKILL_TREE_ICON_BUTTON_CLASS}
                  aria-label="Add file"
                  title="Add file"
                >
                  {resourceBusy ? (
                    <Loader2 className="icon-sm animate-spin" aria-hidden />
                  ) : (
                    <Plus className="icon-sm" aria-hidden />
                  )}
                </button>
              </Popover.Trigger>
              {isAddTriggerVisible ? (
                <Popover.Portal>
                  <Popover.Content
                    side="bottom"
                    align="end"
                    sideOffset={4}
                    collisionPadding={12}
                    className="dropdown-menu-solid z-dropdown w-44 py-1 outline-none"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={resourceBusy}
                      className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        setAddResourceMenuOpen(false)
                        setTimeout(() => resourceUploadInputRef.current?.click(), 0)
                      }}
                    >
                      <Upload className="icon-sm shrink-0" />
                      Upload a file
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={resourceBusy}
                      className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={startAddResourceManually}
                    >
                      <FilePlus className="icon-sm shrink-0" />
                      Add manually
                    </button>
                  </Popover.Content>
                </Popover.Portal>
              ) : null}
            </Popover.Root>
          </div>
        </div>
        {isAddTriggerVisible ? (
          <input
            ref={resourceUploadInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.json,.md,.txt,.yaml,.yml,.doc,.docx,application/pdf"
            onChange={(e) => {
              if (e.target.files?.length) void onUploadResourceFile(e.target.files)
              e.target.value = ''
            }}
          />
        ) : null}
        <input
          ref={folderUploadInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.json,.md,.txt,.yaml,.yml,.doc,.docx,application/pdf"
          onChange={(e) => {
            if (e.target.files?.length) {
              void onUploadResourceFile(e.target.files, folderUploadPathRef.current ?? undefined)
            }
            folderUploadPathRef.current = null
            e.target.value = ''
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {dndEnabled ? (
          <DndContext
            sensors={treeSensors}
            collisionDetection={pointerWithin}
            onDragStart={handleTreeDragStart}
            onDragEnd={handleTreeDragEnd}
            onDragCancel={handleTreeDragCancel}
          >
            {treeBody}
          </DndContext>
        ) : (
          treeBody
        )}
      </div>

      {rowMenu ? (
        <SkillTreeRowActionsMenu
          target={rowMenu.target}
          pointer={rowMenu.pointer}
          writeLocked={writeLocked}
          detailExportingPdf={detailExportingPdf}
          getResourceById={getResourceById}
          onClose={closeRowMenu}
          onCopyPath={handleCopyPath}
          onExportSkillMdMarkdown={handleExportSkillMdMarkdown}
          onExportSkillMdPdf={handleExportSkillMdPdf}
          onExportSkillMdJson={handleExportSkillMdJson}
          onRenameFile={renameSkillResource}
          onDownloadFile={downloadSkillResourceFile}
          onOpenFile={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          onDeleteFile={deleteSkillResource}
          onAddFileInFolder={startAddResourceInFolder}
          onUploadToFolder={uploadResourceFileToFolder}
          onToggleFolder={handleToggleFolderFromMenu}
        />
      ) : null}
    </div>
  )
}
