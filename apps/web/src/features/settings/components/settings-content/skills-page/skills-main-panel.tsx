'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import type {
  MissionAgent,
  MissionAgentSkill,
  MissionAgentSkillResource,
} from '@/lib/agents/agent-skill-types'
import { formatSkillName } from '@/lib/agents/agent-display'
import { SkillsBreadcrumbHeader } from './skills-breadcrumb-header'
import { SkillsInlineDetailPanel } from './skills-inline-detail-panel'
import type {
  ResourceTreeNode,
  SkillsGroupBy,
  SkillsGroupSort,
  SkillTypeFilter,
} from './skills-page.types'
import { SkillsTreeSidebar } from './skills-tree-sidebar'
import { SkillsViewSwitcher, type SkillsAgentTabMenuActions } from './skills-view-switcher'

export function SkillsMainPanel({
  agents,
  skillsViewKey,
  onSelectSkillsView,
  selectedAgentKey,
  search,
  setSearch,
  skillTypeFilters,
  toggleSkillTypeFilter,
  skillsGroupBy,
  setSkillsGroupBy,
  skillsGroupSort,
  setSkillsGroupSort,
  totalSkillCount,
  loadError,
  skillsLoading,
  filteredSkills,
  detailSkillResolved,
  detailResource,
  detailResourceId,
  setDetailResourceId,
  onSelectSkill,
  canViewOfficialSkillContent,
  toggleBusyId,
  onToggleEnabled,
  onSkillsChanged,
  setDeleteTarget,
  addSkillMenuOpen,
  setAddSkillMenuOpen,
  openCreateFresh,
  openCreateWithJaime,
  skillUploadInputRef,
  handleUploadSkill,
  extracting,
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
  onBackFromDetail,
  agentTabMenuActions,
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
  saveResourceContent,
  moveSkillResource,
  renameSkillResource,
  deleteSkillResource,
  startAddResourceInFolder,
  uploadResourceFileToFolder,
  folderUploadInputRef,
  folderUploadPathRef,
  downloadSkillResourceFile,
  downloadSkillMd,
  catalogFolders,
  skillKeyToFolderId,
  folderBusy,
  onCreateFolder,
  onEnsureDefaultAgencyFolder,
  onSetSkillFolder,
}: {
  agents: MissionAgent[]
  skillsViewKey: 'all' | string
  onSelectSkillsView: (viewKey: 'all' | string) => void
  selectedAgentKey: string
  search: string
  setSearch: (v: string) => void
  skillTypeFilters: SkillTypeFilter[]
  toggleSkillTypeFilter: (filter: SkillTypeFilter) => void
  skillsGroupBy: SkillsGroupBy
  setSkillsGroupBy: (value: SkillsGroupBy) => void
  skillsGroupSort: SkillsGroupSort
  setSkillsGroupSort: (value: SkillsGroupSort) => void
  totalSkillCount: number
  loadError: string | null
  skillsLoading: boolean
  filteredSkills: MissionAgentSkill[]
  detailSkillResolved: MissionAgentSkill | null
  detailResource: MissionAgentSkillResource | null
  detailResourceId: string | null
  setDetailResourceId: Dispatch<SetStateAction<string | null>>
  onSelectSkill: (skill: MissionAgentSkill) => void
  onSelectResource: (skill: MissionAgentSkill, resourceId: string) => void
  canViewOfficialSkillContent: boolean
  toggleBusyId: string | null
  onToggleEnabled: (skill: MissionAgentSkill, enabled: boolean) => void | Promise<void>
  onSkillsChanged: () => void
  setDeleteTarget: (skill: MissionAgentSkill) => void
  addSkillMenuOpen: boolean
  setAddSkillMenuOpen: (open: boolean) => void
  openCreateFresh: () => void
  openCreateWithJaime: (target?: { agentKey: string; agentName?: string | null }) => void
  skillUploadInputRef: RefObject<HTMLInputElement | null>
  handleUploadSkill: (files: FileList | File[]) => void
  extracting: boolean
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
  onBackFromDetail: () => void
  agentTabMenuActions: SkillsAgentTabMenuActions
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
  catalogFolders?: Array<{ id: string; name: string }>
  skillKeyToFolderId?: Record<string, string>
  folderBusy?: boolean
  onCreateFolder?: (name: string) => void | Promise<void>
  onEnsureDefaultAgencyFolder?: () => void | Promise<void>
  onSetSkillFolder?: (skillKey: string, folderId: string | null) => void | Promise<void>
}) {
  const createTargetAgentKey = skillsViewKey === 'all' ? selectedAgentKey : skillsViewKey
  const createTargetAgentName =
    agents.find((agent) => agent.agent_key === createTargetAgentKey)?.name ?? null
  const breadcrumbSkillName = detailSkillResolved ? formatSkillName(detailSkillResolved.name) : null

  return (
    <div className="border-border flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border">
      <SkillsBreadcrumbHeader skillName={breadcrumbSkillName} />
      <SkillsViewSwitcher
        agents={agents}
        activeViewKey={skillsViewKey}
        onSelectView={onSelectSkillsView}
        agentTabMenuActions={agentTabMenuActions}
        hideBottomBorder={!!detailSkillResolved}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {detailSkillResolved ? (
          <SkillsInlineDetailPanel
            detailSkillResolved={detailSkillResolved}
            detailResource={detailResource}
            detailResourceId={detailResourceId}
            setDetailResourceId={setDetailResourceId}
            resourceTree={resourceTree}
            expandedFolders={expandedFolders}
            setExpandedFolders={setExpandedFolders}
            skillDetailMarkdownExportRef={skillDetailMarkdownExportRef}
            detailExportMenuOpen={detailExportMenuOpen}
            setDetailExportMenuOpen={setDetailExportMenuOpen}
            detailExportingPdf={detailExportingPdf}
            handleSkillDetailPdf={handleSkillDetailPdf}
            handleSkillDetailMarkdown={handleSkillDetailMarkdown}
            handleSkillDetailJson={handleSkillDetailJson}
            onBack={onBackFromDetail}
            canViewOfficialSkillContent={canViewOfficialSkillContent}
            addResourceMenuOpen={addResourceMenuOpen}
            setAddResourceMenuOpen={setAddResourceMenuOpen}
            addingResourcePath={addingResourcePath}
            setAddingResourcePath={setAddingResourcePath}
            resourceBusy={resourceBusy}
            resourceUploadInputRef={resourceUploadInputRef}
            addResourcePathInputRef={addResourcePathInputRef}
            writeLocked={writeLocked}
            startAddResourceManually={startAddResourceManually}
            commitAddResourceManually={commitAddResourceManually}
            handleUploadResourceFile={handleUploadResourceFile}
            saveResourceContent={saveResourceContent}
            moveSkillResource={moveSkillResource}
            renameSkillResource={renameSkillResource}
            deleteSkillResource={deleteSkillResource}
            startAddResourceInFolder={startAddResourceInFolder}
            uploadResourceFileToFolder={uploadResourceFileToFolder}
            folderUploadInputRef={folderUploadInputRef}
            folderUploadPathRef={folderUploadPathRef}
            downloadSkillResourceFile={downloadSkillResourceFile}
            downloadSkillMd={downloadSkillMd}
          />
        ) : (
          <SkillsTreeSidebar
            agents={agents}
            skillsViewKey={skillsViewKey}
            search={search}
            setSearch={setSearch}
            skillTypeFilters={skillTypeFilters}
            toggleSkillTypeFilter={toggleSkillTypeFilter}
            skillsGroupBy={skillsGroupBy}
            setSkillsGroupBy={setSkillsGroupBy}
            skillsGroupSort={skillsGroupSort}
            setSkillsGroupSort={setSkillsGroupSort}
            totalSkillCount={totalSkillCount}
            loadError={loadError}
            skillsLoading={skillsLoading}
            filteredSkills={filteredSkills}
            detailSkillId={null}
            detailResourceId={null}
            onSelectSkill={onSelectSkill}
            canViewOfficialSkillContent={canViewOfficialSkillContent}
            toggleBusyId={toggleBusyId}
            onToggleEnabled={onToggleEnabled}
            onSkillsChanged={onSkillsChanged}
            setDeleteTarget={setDeleteTarget}
            selectedAgentKey={createTargetAgentKey}
            addSkillMenuOpen={addSkillMenuOpen}
            setAddSkillMenuOpen={setAddSkillMenuOpen}
            openCreateFresh={openCreateFresh}
            openCreateWithJaime={() =>
              openCreateWithJaime({
                agentKey: createTargetAgentKey,
                agentName: createTargetAgentName,
              })
            }
            skillUploadInputRef={skillUploadInputRef}
            handleUploadSkill={handleUploadSkill}
            extracting={extracting}
            catalogFolders={catalogFolders}
            skillKeyToFolderId={skillKeyToFolderId}
            folderBusy={folderBusy}
            onCreateFolder={onCreateFolder}
            onEnsureDefaultAgencyFolder={onEnsureDefaultAgencyFolder}
            onSetSkillFolder={onSetSkillFolder}
          />
        )}
      </div>
    </div>
  )
}
