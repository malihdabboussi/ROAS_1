'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { MissionAgent, MissionAgentSkill } from '@/features/mission-control/types'
import { fetchSkillRecommendationDetail } from '@/features/skill-recommendations/services/skill-recommendations.service'
import { TeamHrSideChatLayout } from '@/features/team-2/containers/TeamHrSideChatLayout'
import {
  useTeamFocusStore,
  type TeamSkillsPageContext,
} from '@/features/team-2/store/use-team-focus-store'
import { useUserRole } from '@/hooks/use-user-role'
import { useAgentMenuActions } from '@/lib/agents'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { CreateSkillDialog } from './skills-page/dialogs/create-skill-dialog'
import { DeleteSkillDialog } from './skills-page/dialogs/delete-skill-dialog'
import { SkillDetailMobileFullscreen } from './skills-page/dialogs/skill-detail-mobile-fullscreen'
import { SkillsMainPanel } from './skills-page/skills-main-panel'
import { isOfficialSkill } from './skills-page/skills-page.utils'
import type { SkillsAgentTabMenuActions } from './skills-page/skills-view-switcher'
import { useSkillsPage } from './skills-page/use-skills-page'

const MAX_VISIBLE_SKILLS_IN_HR_CONTEXT = 20
const MAX_SELECTED_RESOURCE_PATHS_IN_HR_CONTEXT = 20
const MAX_SKILL_MARKDOWN_CONTEXT_CHARS = 4000
const MAX_RESOURCE_CONTEXT_CHARS = 2500

export default function SkillsPageContent() {
  const searchParams = useSearchParams()
  const recommendationId = searchParams.get('recommendationId')
  const handledRecommendationIdRef = useRef<string | null>(null)
  const {
    agents,
    agentsLoading,
    skillsViewKey,
    setSkillsView,
    selectedAgentKey,
    skillsLoading,
    loadError,
    search,
    setSearch,
    skillTypeFilters,
    toggleSkillTypeFilter,
    skillsGroupBy,
    setSkillsGroupBy,
    skillsGroupSort,
    setSkillsGroupSort,
    totalSkillCount,
    detailSkill,
    setDetailSkill,
    detailResourceId,
    setDetailResourceId,
    detailExportMenuOpen,
    setDetailExportMenuOpen,
    detailExportingPdf,
    skillDetailMarkdownExportRef,
    deleteTarget,
    setDeleteTarget,
    deleteTargetAgent,
    deleting,
    refreshSkills,
    expandedFolders,
    setExpandedFolders,
    selectedAgent,
    filteredSkills,
    detailSkillResolved,
    detailResource,
    resourceTree,
    toggleBusyId,
    onToggleEnabled,
    onConfirmDelete,
    handleSkillDetailPdf,
    handleSkillDetailMarkdown,
    handleSkillDetailJson,
    createOpen,
    setCreateOpen,
    addSkillMenuOpen,
    setAddSkillMenuOpen,
    draftName,
    setDraftName,
    draftDescription,
    setDraftDescription,
    draftMarkdown,
    setDraftMarkdown,
    draftResources,
    setDraftResources,
    draftSelectedResourceId,
    setDraftSelectedResourceId,
    draftExpandedFolders,
    setDraftExpandedFolders,
    creating,
    createError,
    draftAddFilesOpen,
    setDraftAddFilesOpen,
    addingRefName,
    setAddingRefName,
    addRefInputRef,
    skillUploadInputRef,
    assetInputRef,
    draftResourceTree,
    resetCreateDialog,
    openCreateFresh,
    openCreateForAgent,
    triggerUploadForAgent,
    openCreateWithJaime,
    openCreateFromRecommendation,
    handleUploadSkill,
    enableAllCustomSkillsForAgent,
    extracting,
    startAddReference,
    commitAddReference,
    handleAddAssetFiles,
    handleDeleteDraftResource,
    handleCreateSkill,
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
  } = useSkillsPage()

  const { openAgent } = useAgentMenuActions()
  const { role: platformRole, isSuperadmin } = useUserRole()
  const canViewOfficialSkillContent = platformRole === 'admin' || isSuperadmin

  const agentTabMenuActions = useMemo<SkillsAgentTabMenuActions>(
    () => ({
      onCopyAgentKey: async (agent: MissionAgent) => {
        await navigator.clipboard.writeText(agent.agent_key)
        toast.success('Agent key copied')
      },
      onCopyAgentId: async (agent: MissionAgent) => {
        await navigator.clipboard.writeText(agent.id)
        toast.success('Agent ID copied')
      },
      onOpenInNewTab: (agent: MissionAgent) => {
        openInNewTab(`/team?agent=${encodeURIComponent(agent.agent_key)}`)
      },
      onNewSkill: (agent: MissionAgent) => {
        openCreateForAgent(agent.agent_key)
      },
      onUploadSkill: (agent: MissionAgent) => {
        triggerUploadForAgent(agent.agent_key)
      },
      onEnableAll: (agent: MissionAgent) => {
        void enableAllCustomSkillsForAgent(agent.agent_key)
      },
      onOpenChat: (agent: MissionAgent) => {
        openAgent(agent.agent_key)
      },
    }),
    [enableAllCustomSkillsForAgent, openAgent, openCreateForAgent, triggerUploadForAgent],
  )

  const hrAgent = useMemo(() => agents.find((agent) => agent.agent_key === 'hr') ?? null, [agents])

  const focusAgent = useMemo(() => {
    if (skillsViewKey === 'all') return selectedAgent
    return agents.find((a) => a.agent_key === skillsViewKey) ?? selectedAgent
  }, [skillsViewKey, agents, selectedAgent])

  const skillsAwarenessContext = useMemo<TeamSkillsPageContext>(() => {
    const selectedSkillResourcePaths = detailSkillResolved?.resources?.map((r) => r.file_path) ?? []
    const markdown = trimForHrContext(
      detailSkillResolved?.markdown_content ?? '',
      MAX_SKILL_MARKDOWN_CONTEXT_CHARS,
    )
    const resourceContent = trimForHrContext(
      detailResource?.content ?? '',
      MAX_RESOURCE_CONTEXT_CHARS,
    )

    return {
      viewKey: skillsViewKey,
      panel: detailResource
        ? 'skill-resource'
        : detailSkillResolved
          ? 'skill-instructions'
          : 'skill-list',
      selectedAgentKey,
      searchQuery: search.trim(),
      activeFilters: skillTypeFilters,
      totalSkillCount,
      visibleSkillCount: filteredSkills.length,
      visibleSkills: filteredSkills.slice(0, MAX_VISIBLE_SKILLS_IN_HR_CONTEXT).map(skillToSummary),
      visibleSkillsTruncated: filteredSkills.length > MAX_VISIBLE_SKILLS_IN_HR_CONTEXT,
      loadError,
      selectedSkill: detailSkillResolved
        ? {
            ...skillToSummary(detailSkillResolved),
            markdown_excerpt: markdown.text,
            markdown_truncated: markdown.truncated,
            resource_paths: selectedSkillResourcePaths.slice(
              0,
              MAX_SELECTED_RESOURCE_PATHS_IN_HR_CONTEXT,
            ),
            resource_paths_truncated:
              selectedSkillResourcePaths.length > MAX_SELECTED_RESOURCE_PATHS_IN_HR_CONTEXT,
          }
        : null,
      selectedResource: detailResource
        ? {
            file_path: detailResource.file_path,
            content_type: detailResource.content_type,
            storage_url: detailResource.storage_url,
            content_excerpt: resourceContent.text,
            content_truncated: resourceContent.truncated,
          }
        : null,
    }
  }, [
    skillsViewKey,
    selectedAgentKey,
    search,
    skillTypeFilters,
    totalSkillCount,
    filteredSkills,
    loadError,
    detailSkillResolved,
    detailResource,
  ])

  const setFocusedAgent = useTeamFocusStore((s) => s.setFocusedAgent)
  useEffect(() => {
    setFocusedAgent(focusAgent, 'skills', skillsAwarenessContext)
    return () => setFocusedAgent(null, 'skills')
  }, [focusAgent, skillsAwarenessContext, setFocusedAgent])

  const [skillsMobileLayout, setSkillsMobileLayout] = useState(false)
  const [mobileSkillTreeOpen, setMobileSkillTreeOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setSkillsMobileLayout(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!detailSkill) setMobileSkillTreeOpen(false)
  }, [detailSkill])

  useEffect(() => {
    setDetailSkill(null)
    setDetailResourceId(null)
    setDetailExportMenuOpen(false)
  }, [skillsViewKey, setDetailSkill, setDetailResourceId, setDetailExportMenuOpen])

  useEffect(() => {
    if (!recommendationId) {
      handledRecommendationIdRef.current = null
      return
    }
    if (handledRecommendationIdRef.current === recommendationId) return
    handledRecommendationIdRef.current = recommendationId
    void fetchSkillRecommendationDetail(recommendationId)
      .then((recommendation) => {
        openCreateFromRecommendation(recommendation)
      })
      .catch(() => {
        toast.error('Failed to load skill recommendation')
      })
  }, [recommendationId, openCreateFromRecommendation])

  const handleSelectSkill = useCallback(
    (skill: MissionAgentSkill) => {
      setDetailSkill(skill)
      setDetailResourceId(null)
      setDetailExportMenuOpen(false)
    },
    [setDetailSkill, setDetailResourceId, setDetailExportMenuOpen],
  )

  const handleSelectResource = useCallback(
    (skill: MissionAgentSkill, resourceId: string) => {
      if (isOfficialSkill(skill) && !canViewOfficialSkillContent) return
      setDetailSkill(skill)
      setDetailResourceId(resourceId)
      setDetailExportMenuOpen(false)
    },
    [canViewOfficialSkillContent, setDetailSkill, setDetailResourceId, setDetailExportMenuOpen],
  )

  const handleBackFromDetail = useCallback(() => {
    setDetailSkill(null)
    setDetailResourceId(null)
    setDetailExportMenuOpen(false)
  }, [setDetailSkill, setDetailResourceId, setDetailExportMenuOpen])

  return (
    <>
      <TeamHrSideChatLayout
        className="h-full min-h-0 w-full flex-1"
        hrAgent={hrAgent}
        hrAgentLoading={agentsLoading}
      >
        <SkillsMainPanel
          agents={agents}
          skillsViewKey={skillsViewKey}
          onSelectSkillsView={setSkillsView}
          selectedAgentKey={selectedAgentKey}
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
          skillsLoading={skillsLoading || agentsLoading}
          filteredSkills={filteredSkills}
          detailSkillResolved={skillsMobileLayout ? null : detailSkillResolved}
          detailResource={detailResource}
          detailResourceId={detailResourceId}
          setDetailResourceId={setDetailResourceId}
          onSelectSkill={handleSelectSkill}
          onSelectResource={handleSelectResource}
          canViewOfficialSkillContent={canViewOfficialSkillContent}
          toggleBusyId={toggleBusyId}
          onToggleEnabled={onToggleEnabled}
          onSkillsChanged={refreshSkills}
          setDeleteTarget={setDeleteTarget}
          addSkillMenuOpen={addSkillMenuOpen}
          setAddSkillMenuOpen={setAddSkillMenuOpen}
          openCreateFresh={openCreateFresh}
          openCreateWithJaime={openCreateWithJaime}
          skillUploadInputRef={skillUploadInputRef}
          handleUploadSkill={handleUploadSkill}
          extracting={extracting}
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
          onBackFromDetail={handleBackFromDetail}
          agentTabMenuActions={agentTabMenuActions}
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
          downloadSkillMd={() => {
            if (detailSkillResolved) downloadSkillMd(detailSkillResolved)
          }}
        />
      </TeamHrSideChatLayout>

      {skillsMobileLayout && detailSkillResolved ? (
        <SkillDetailMobileFullscreen
          detailSkillResolved={detailSkillResolved}
          detailResource={detailResource}
          detailResourceId={detailResourceId}
          setDetailResourceId={setDetailResourceId}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          resourceTree={resourceTree}
          skillDetailMarkdownExportRef={skillDetailMarkdownExportRef}
          detailExportMenuOpen={detailExportMenuOpen}
          setDetailExportMenuOpen={setDetailExportMenuOpen}
          detailExportingPdf={detailExportingPdf}
          handleSkillDetailPdf={handleSkillDetailPdf}
          handleSkillDetailMarkdown={handleSkillDetailMarkdown}
          handleSkillDetailJson={handleSkillDetailJson}
          treeOpen={mobileSkillTreeOpen}
          onOpenTree={() => setMobileSkillTreeOpen(true)}
          onCloseTree={() => setMobileSkillTreeOpen(false)}
          onClose={handleBackFromDetail}
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
          downloadSkillMd={() => {
            if (detailSkillResolved) downloadSkillMd(detailSkillResolved)
          }}
        />
      ) : null}

      <CreateSkillDialog
        createOpen={createOpen}
        creating={creating}
        setCreateOpen={setCreateOpen}
        resetCreateDialog={resetCreateDialog}
        draftName={draftName}
        setDraftName={setDraftName}
        draftDescription={draftDescription}
        setDraftDescription={setDraftDescription}
        draftMarkdown={draftMarkdown}
        setDraftMarkdown={setDraftMarkdown}
        draftResources={draftResources}
        setDraftResources={setDraftResources}
        draftSelectedResourceId={draftSelectedResourceId}
        setDraftSelectedResourceId={setDraftSelectedResourceId}
        draftExpandedFolders={draftExpandedFolders}
        setDraftExpandedFolders={setDraftExpandedFolders}
        draftResourceTree={draftResourceTree}
        createError={createError}
        draftAddFilesOpen={draftAddFilesOpen}
        setDraftAddFilesOpen={setDraftAddFilesOpen}
        addingRefName={addingRefName}
        setAddingRefName={setAddingRefName}
        addRefInputRef={addRefInputRef}
        assetInputRef={assetInputRef}
        startAddReference={startAddReference}
        commitAddReference={commitAddReference}
        handleAddAssetFiles={handleAddAssetFiles}
        handleDeleteDraftResource={handleDeleteDraftResource}
        handleCreateSkill={handleCreateSkill}
      />

      <DeleteSkillDialog
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
        selectedAgent={deleteTargetAgent}
      />
    </>
  )
}

function skillToSummary(skill: MissionAgentSkill): TeamSkillsPageContext['visibleSkills'][number] {
  return {
    agent_key: skill.agent_key,
    skill_key: skill.skill_key,
    name: skill.name,
    description: skill.description,
    is_enabled: skill.is_enabled,
    source: skill.source ?? (isOfficialSkill(skill) ? 'system' : 'user'),
  }
}

function trimForHrContext(value: string, limit: number): { text: string; truncated: boolean } {
  const text = value.trim()
  if (text.length <= limit) return { text, truncated: false }
  return { text: text.slice(0, limit).trimEnd(), truncated: true }
}
