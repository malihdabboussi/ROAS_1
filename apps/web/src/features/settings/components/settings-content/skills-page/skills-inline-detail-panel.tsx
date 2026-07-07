'use client'

import {
  RefObject,
  SetStateAction,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type Dispatch,
} from 'react'
import { ArrowLeft, FolderTree } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { usePanelResize } from '@/components/layout/usePanelResize'
import { formatSkillName } from '@/lib/agents/agent-display'
import type { MissionAgentSkill, MissionAgentSkillResource } from '@/lib/agents/agent-skill-types'
import { SkillDetailExportDropdown } from './dialogs/skill-detail-export-dropdown'
import { SkillDetailTreePanel } from './skill-detail-tree-panel'
import { SkillTreeCollapsedRail } from './skill-tree-collapsed-rail'
import type { ResourceTreeNode } from './skills-page.types'
import { isOfficialSkill } from './skills-page.utils'
import { SkillsPreviewPanel } from './skills-preview-panel'

const dockIconBtnCls =
  'text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex items-center justify-center rounded-md p-1.5 transition-colors'

const SKILL_TREE_DEFAULT_WIDTH_PERCENT = 24
const SKILL_TREE_MIN_WIDTH_PERCENT = 18
const SKILL_TREE_MAX_WIDTH_PERCENT = 42
const COLLAPSED_SKILL_TREE_WIDTH_PX = 56
const SKILL_TREE_MIN_WIDTH_PX = 160
const SKILL_TREE_SIDEBAR_WIDTH_TRANSITION_MS = 250

export function SkillsInlineDetailPanel({
  detailSkillResolved,
  detailResource,
  detailResourceId,
  setDetailResourceId,
  resourceTree,
  expandedFolders,
  setExpandedFolders,
  skillDetailMarkdownExportRef,
  detailExportMenuOpen,
  setDetailExportMenuOpen,
  detailExportingPdf,
  handleSkillDetailPdf,
  handleSkillDetailMarkdown,
  handleSkillDetailJson,
  onBack,
  canViewOfficialSkillContent,
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
  handleUploadResourceFile,
  moveSkillResource,
  renameSkillResource,
  deleteSkillResource,
  startAddResourceInFolder,
  uploadResourceFileToFolder,
  folderUploadInputRef,
  folderUploadPathRef,
  downloadSkillResourceFile,
  downloadSkillMd,
}: {
  detailSkillResolved: MissionAgentSkill
  detailResource: MissionAgentSkillResource | null
  detailResourceId: string | null
  setDetailResourceId: Dispatch<SetStateAction<string | null>>
  resourceTree: ResourceTreeNode[]
  expandedFolders: Set<string>
  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>
  skillDetailMarkdownExportRef: RefObject<HTMLDivElement | null>
  detailExportMenuOpen: boolean
  setDetailExportMenuOpen: Dispatch<SetStateAction<boolean>>
  detailExportingPdf: boolean
  handleSkillDetailPdf: () => void | Promise<void>
  handleSkillDetailMarkdown: () => void
  handleSkillDetailJson: () => void
  onBack: () => void
  canViewOfficialSkillContent: boolean
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
  handleUploadResourceFile: (files: FileList | File[], folderPath?: string) => void | Promise<void>
  saveResourceContent: (
    resource: MissionAgentSkillResource,
    content: string,
  ) => void | Promise<void>
  moveSkillResource: (resourceId: string, newFilePath: string) => void | Promise<void>
  renameSkillResource: (resourceId: string, currentPath: string) => void | Promise<void>
  deleteSkillResource: (resourceId: string) => void | Promise<void>
  startAddResourceInFolder: (folderPath: string) => void
  uploadResourceFileToFolder: (folderPath: string) => void
  folderUploadInputRef: RefObject<HTMLInputElement | null>
  folderUploadPathRef: RefObject<string | null>
  downloadSkillResourceFile: (resourceId: string) => void
  downloadSkillMd: () => void
}) {
  const official = isOfficialSkill(detailSkillResolved)
  const canReadOfficial = !official || canViewOfficialSkillContent
  const showTree = canReadOfficial
  const effectiveWriteLocked = writeLocked || official
  const [detailTreeOpen, setDetailTreeOpen] = useState(true)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [openCompactTreeSearch, setOpenCompactTreeSearch] = useState(false)
  const title = formatSkillName(detailSkillResolved.name)
  const {
    chatWidthPercent: treeWidthPercent,
    isDragging,
    containerRef,
    chatRef: treeRef,
    handleMouseDown,
  } = usePanelResize({
    defaultWidthPercent: SKILL_TREE_DEFAULT_WIDTH_PERCENT,
    minPercent: SKILL_TREE_MIN_WIDTH_PERCENT,
    maxPercent: SKILL_TREE_MAX_WIDTH_PERCENT,
  })
  const [containerWidthPx, setContainerWidthPx] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidthPx(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidthPx(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, detailTreeOpen, showTree])

  const treePanelPx = Math.max(
    SKILL_TREE_MIN_WIDTH_PX,
    Math.round((treeWidthPercent / 100) * containerWidthPx),
  )

  const treeSidebarWidthStyle: CSSProperties = {
    width: !detailTreeOpen
      ? '0px'
      : treeCollapsed
        ? `${COLLAPSED_SKILL_TREE_WIDTH_PX}px`
        : containerWidthPx > 0
          ? `${treePanelPx}px`
          : `${treeWidthPercent}%`,
    transition: isDragging
      ? undefined
      : `width ${SKILL_TREE_SIDEBAR_WIDTH_TRANSITION_MS}ms ease-out`,
  }

  useEffect(() => {
    setDetailTreeOpen(true)
    setTreeCollapsed(false)
    setOpenCompactTreeSearch(false)
  }, [detailSkillResolved.id])

  const handleTreeAddFile = () => {
    setTreeCollapsed(false)
    setAddResourceMenuOpen(true)
  }

  const previewPanel = (
    <SkillsPreviewPanel
      detailSkillResolved={detailSkillResolved}
      detailResource={detailResource}
      detailResourceId={detailResourceId}
      skillDetailMarkdownExportRef={skillDetailMarkdownExportRef}
      detailExportMenuOpen={detailExportMenuOpen}
      setDetailExportMenuOpen={setDetailExportMenuOpen}
      detailExportingPdf={detailExportingPdf}
      handleSkillDetailPdf={handleSkillDetailPdf}
      handleSkillDetailMarkdown={handleSkillDetailMarkdown}
      handleSkillDetailJson={handleSkillDetailJson}
      hideDetailHeader
      canViewOfficialSkillContent={canViewOfficialSkillContent}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="gap-spacing-2 px-spacing-4 py-spacing-2 flex shrink-0 items-center">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
          aria-label="Back to skills"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="gap-spacing-2 flex min-w-0 flex-1 items-baseline overflow-hidden">
          <span className="body-3 text-foreground min-w-0 truncate font-medium">
            {title}
          </span>
          <span className="body-4 text-muted-foreground shrink-0 font-mono">
            /{detailSkillResolved.skill_key}
          </span>
        </div>
        {canReadOfficial ? (
          <div className="gap-spacing-1 flex shrink-0 items-center">
            <Tooltip label={detailTreeOpen ? 'Hide files' : 'Show files'} side="bottom">
              <button
                type="button"
                onClick={() => setDetailTreeOpen((open) => !open)}
                className={`${dockIconBtnCls} ${detailTreeOpen ? 'text-foreground' : ''}`}
                aria-label={detailTreeOpen ? 'Hide skill files' : 'Show skill files'}
                aria-pressed={detailTreeOpen}
              >
                <FolderTree className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <SkillDetailExportDropdown
              detailExportMenuOpen={detailExportMenuOpen}
              setDetailExportMenuOpen={setDetailExportMenuOpen}
              detailResourceId={detailResourceId}
              detailExportingPdf={detailExportingPdf}
              handleSkillDetailPdf={handleSkillDetailPdf}
              handleSkillDetailMarkdown={handleSkillDetailMarkdown}
              handleSkillDetailJson={handleSkillDetailJson}
              exportTriggerClassName={dockIconBtnCls}
              exportIconClassName="h-3.5 w-3.5"
            />
          </div>
        ) : null}
      </div>

      <div className="pt-spacing-2 pb-spacing-3 flex min-h-0 flex-1 overflow-hidden">
        {showTree ? (
          <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1 gap-0 overflow-hidden">
            <div
              ref={treeRef}
              className="pb-spacing-3 pl-spacing-3 flex min-h-0 shrink-0 flex-col overflow-hidden will-change-[width]"
              style={treeSidebarWidthStyle}
              aria-hidden={!detailTreeOpen}
            >
              <div
                className={`card-glass flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 ${
                  detailTreeOpen ? '' : 'pointer-events-none'
                }`}
              >
                <div className={treeCollapsed ? 'hidden' : 'h-full min-h-0'}>
                  <SkillDetailTreePanel
                    resourceTree={resourceTree}
                    expandedFolders={expandedFolders}
                    setExpandedFolders={setExpandedFolders}
                    detailResourceId={detailResourceId}
                    setDetailResourceId={setDetailResourceId}
                    resetKey={detailSkillResolved.id}
                    addResourceMenuOpen={addResourceMenuOpen}
                    setAddResourceMenuOpen={setAddResourceMenuOpen}
                    addingResourcePath={addingResourcePath}
                    setAddingResourcePath={setAddingResourcePath}
                    resourceBusy={resourceBusy}
                    resourceUploadInputRef={resourceUploadInputRef}
                    addResourcePathInputRef={addResourcePathInputRef}
                    writeLocked={effectiveWriteLocked}
                    startAddResourceManually={startAddResourceManually}
                    commitAddResourceManually={commitAddResourceManually}
                    onUploadResourceFile={handleUploadResourceFile}
                    resources={detailSkillResolved.resources ?? []}
                    onMoveSkillResource={moveSkillResource}
                    detailExportingPdf={detailExportingPdf}
                    handleSkillDetailPdf={handleSkillDetailPdf}
                    downloadSkillMd={downloadSkillMd}
                    handleSkillDetailJson={handleSkillDetailJson}
                    downloadSkillResourceFile={downloadSkillResourceFile}
                    renameSkillResource={renameSkillResource}
                    deleteSkillResource={deleteSkillResource}
                    startAddResourceInFolder={startAddResourceInFolder}
                    uploadResourceFileToFolder={uploadResourceFileToFolder}
                    folderUploadInputRef={folderUploadInputRef}
                    folderUploadPathRef={folderUploadPathRef}
                    onCollapse={() => setTreeCollapsed(true)}
                    openCompactSearch={openCompactTreeSearch}
                    onOpenCompactSearchConsumed={() => setOpenCompactTreeSearch(false)}
                  />
                </div>
                {treeCollapsed ? (
                  <div className="h-full min-h-0">
                    <SkillTreeCollapsedRail
                      onExpand={() => setTreeCollapsed(false)}
                      onAddFile={handleTreeAddFile}
                      onOpenSearch={() => {
                        setTreeCollapsed(false)
                        setOpenCompactTreeSearch(true)
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            {detailTreeOpen ? (
              <ResizableDivider
                onMouseDown={handleMouseDown}
                isDragging={isDragging}
                compact
                showGrip={false}
              />
            ) : null}
            <div
              className={`pr-spacing-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
                detailTreeOpen ? 'pl-spacing-1' : ''
              }`}
            >
              <div className="surface-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
                {previewPanel}
              </div>
            </div>
          </div>
        ) : (
          <div className="pr-spacing-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="surface-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
              {previewPanel}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
