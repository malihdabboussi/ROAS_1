'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteAgentSkill,
  fetchAgentSkills,
  fetchAgentSkillsForAgents,
  fetchMissionAgents,
  renameAgent,
  reorderAgents,
  updateAgentSkill,
} from '@/features/mission-control/services/missions.service'
import type {
  MissionAgent,
  MissionAgentSkill,
  MissionAgentSkillResource,
} from '@/features/mission-control/types'
import { exportCampaignMarkdownDomToPdf } from '@/lib/artifacts'
import {
  createSkillFolder,
  ensureDefaultAgencySkillFolder,
  fetchSkillCatalogBundle,
  setSkillFolder,
  type SkillFolder,
  type SkillTag,
} from '@/lib/agents/skill-catalog-api'
import { formatSkillName } from '@/features/team/constants/team.constants'
import { downloadJSON, downloadMarkdown } from './skills-export-utils'
import {
  DEFAULT_SKILL_TYPE_FILTERS,
  DEFAULT_SKILLS_GROUP_BY,
  DEFAULT_SKILLS_GROUP_SORT,
  type SkillsGroupBy,
  type SkillsGroupSort,
  type SkillTypeFilter,
} from './skills-page.types'
import {
  buildResourceTree,
  buildSkillMarkdown,
  collectFolderPaths,
  isOfficialSkill,
  safeSkillFilename,
} from './skills-page.utils'

export function useSkillsAgentsAndSkills() {
  const searchParams = useSearchParams()
  const agentFromUrl = searchParams.get('agent')
  const appliedInitialAgentRef = useRef(false)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const roleLabelRefs = useRef<Record<string, HTMLSpanElement | null>>({})

  const [agents, setAgents] = useState<MissionAgent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [selectedAgentKey, setSelectedAgentKey] = useState('')
  const [skillsViewKey, setSkillsViewKey] = useState<'all' | string>('all')
  const [skills, setSkills] = useState<MissionAgentSkill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [skillTypeFilters, setSkillTypeFilters] = useState<SkillTypeFilter[]>(
    DEFAULT_SKILL_TYPE_FILTERS,
  )
  const [skillsGroupBy, setSkillsGroupBy] = useState<SkillsGroupBy>(DEFAULT_SKILLS_GROUP_BY)
  const [skillsGroupSort, setSkillsGroupSort] = useState<SkillsGroupSort>(DEFAULT_SKILLS_GROUP_SORT)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [detailSkill, setDetailSkill] = useState<MissionAgentSkill | null>(null)
  const [detailResourceId, setDetailResourceId] = useState<string | null>(null)
  const [detailExportMenuOpen, setDetailExportMenuOpen] = useState(false)
  const [detailExportingPdf, setDetailExportingPdf] = useState(false)
  const skillDetailMarkdownExportRef = useRef<HTMLDivElement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MissionAgentSkill | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null)
  const [pinnedAgentIds, setPinnedAgentIds] = useState<Set<string>>(new Set())
  const [dragAgentId, setDragAgentId] = useState<string | null>(null)
  const [dragOverAgentId, setDragOverAgentId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [catalogFolders, setCatalogFolders] = useState<SkillFolder[]>([])
  const [catalogTags, setCatalogTags] = useState<SkillTag[]>([])
  const [skillKeyToFolderId, setSkillKeyToFolderId] = useState<Record<string, string>>({})
  const [skillKeyToTagIds, setSkillKeyToTagIds] = useState<Record<string, string[]>>({})
  const [folderBusy, setFolderBusy] = useState(false)

  const reloadCatalogOrganization = useCallback(async () => {
    try {
      const bundle = await fetchSkillCatalogBundle()
      setCatalogFolders(bundle.folders)
      setCatalogTags(bundle.tags)
      const folderMap: Record<string, string> = {}
      for (const row of bundle.folderMemberships) {
        folderMap[row.skill_key] = row.folder_id
      }
      setSkillKeyToFolderId(folderMap)
      const tagMap: Record<string, string[]> = {}
      for (const row of bundle.tagMemberships) {
        const list = tagMap[row.skill_key] ?? []
        list.push(row.tag_id)
        tagMap[row.skill_key] = list
      }
      setSkillKeyToTagIds(tagMap)
    } catch {
      // Catalog org endpoints may be unavailable until migration/API deploy.
    }
  }, [])

  useEffect(() => {
    void reloadCatalogOrganization()
  }, [reloadCatalogOrganization])

  useEffect(() => {
    let cancelled = false
    setAgentsLoading(true)
    fetchMissionAgents()
      .then((rows) => {
        if (!cancelled) setAgents(rows)
      })
      .catch(() => {
        if (!cancelled) setAgents([])
      })
      .finally(() => {
        if (!cancelled) setAgentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (agents.length === 0) return
    if (appliedInitialAgentRef.current) return
    appliedInitialAgentRef.current = true
    const fromInitial =
      agentFromUrl && agents.some((a) => a.agent_key === agentFromUrl)
        ? agentFromUrl
        : (agents.find((a) => a.agent_key === 'vibey')?.agent_key ?? agents[0]?.agent_key ?? '')
    setSelectedAgentKey(fromInitial)
  }, [agents, agentFromUrl])

  const loadSkills = useCallback(async (agentKey: string, opts?: { force?: boolean }) => {
    if (!agentKey) return
    setSkillsLoading(true)
    setLoadError(null)
    try {
      const rows = await fetchAgentSkills(agentKey, opts)
      setSkills(rows)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load skills')
      setSkills([])
    } finally {
      setSkillsLoading(false)
    }
  }, [])

  const loadAllSkills = useCallback(async (agentKeys: string[], opts?: { force?: boolean }) => {
    if (agentKeys.length === 0) {
      setSkills([])
      return
    }
    setSkillsLoading(true)
    setLoadError(null)
    try {
      // One batched summary request for every agent (skill bodies + resource
      // contents are hydrated on demand when a skill is opened).
      const rows = await fetchAgentSkillsForAgents(agentKeys, {
        summary: true,
        force: opts?.force,
      })
      // Catalog skills (`agent_key='*'`) are merged per agent; dedupe by skill_key
      // so All skills shows one card per skill.
      const seen = new Map<string, MissionAgentSkill>()
      for (const row of rows) {
        const existing = seen.get(row.skill_key)
        if (!existing || (existing.agent_key !== '*' && row.agent_key === '*')) {
          seen.set(row.skill_key, row)
        }
      }
      setSkills([...seen.values()])
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load skills')
      setSkills([])
    } finally {
      setSkillsLoading(false)
    }
  }, [])

  // Stable key so reference churn on `agents` (rename, pin, drag state) does
  // not replay the skills load — only a real roster change does.
  const agentKeysKey = useMemo(() => agents.map((a) => a.agent_key).join(','), [agents])

  useEffect(() => {
    if (skillsViewKey === 'all') {
      void loadAllSkills(agentKeysKey ? agentKeysKey.split(',') : [])
      return
    }
    if (!skillsViewKey) return
    void loadSkills(skillsViewKey)
  }, [skillsViewKey, agentKeysKey, loadSkills, loadAllSkills])

  const selectedAgent = useMemo(
    () => agents.find((a) => a.agent_key === selectedAgentKey) ?? null,
    [agents, selectedAgentKey],
  )

  const selectedAgentId = useMemo(
    () => agents.find((a) => a.agent_key === selectedAgentKey)?.id ?? null,
    [agents, selectedAgentKey],
  )

  const setSelectedAgentId = useCallback(
    (id: string) => {
      appliedInitialAgentRef.current = true
      const agent = agents.find((a) => a.id === id)
      if (agent) {
        setSelectedAgentKey(agent.agent_key)
        setSkillsViewKey(agent.agent_key)
      }
    },
    [agents],
  )

  const setSkillsView = useCallback((viewKey: 'all' | string) => {
    setSkillsViewKey(viewKey)
    if (viewKey !== 'all') {
      appliedInitialAgentRef.current = true
      setSelectedAgentKey(viewKey)
      setSkillsGroupBy((prev) => {
        if (prev === 'agent') {
          setSkillsGroupSort(DEFAULT_SKILLS_GROUP_SORT)
          return DEFAULT_SKILLS_GROUP_BY
        }
        return prev
      })
    }
  }, [])

  const handlePinAgent = useCallback((agentId: string) => {
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.id === agentId)
      if (idx === -1) return prev
      const agent = prev[idx]!
      if (agent.agent_key === 'vibey') return prev
      const vibeyIdx = prev.findIndex((a) => a.agent_key === 'vibey')
      const insertAt = vibeyIdx === -1 ? 0 : vibeyIdx + 1
      if (idx === insertAt) return prev
      const next = [...prev]
      const [moved] = next.splice(idx, 1)
      if (!moved) return prev
      next.splice(insertAt, 0, moved)
      void reorderAgents(next.map((a) => a.agent_key))
      return next
    })
    setPinnedAgentIds((prev) => new Set(prev).add(agentId))
  }, [])

  const handleRenameAgent = useCallback(
    async (agentId: string, newName: string) => {
      const agent = agents.find((a) => a.id === agentId)
      if (!agent) return
      const updated = await renameAgent(agent.agent_key, newName)
      setAgents((prev) => prev.map((a) => (a.id === agentId ? updated : a)))
    },
    [agents],
  )

  const filteredSkills = useMemo(() => {
    let list = skills.filter((skill) => {
      const official = isOfficialSkill(skill)
      if (official) return skillTypeFilters.includes('official')
      return skillTypeFilters.includes('custom')
    })
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => {
      const hay = `${s.skill_key} ${s.name} ${s.description}`.toLowerCase()
      return hay.includes(q)
    })
  }, [skills, search, skillTypeFilters])

  const toggleSkillTypeFilter = useCallback((filter: SkillTypeFilter) => {
    setSkillTypeFilters((prev) => {
      if (prev.includes(filter)) {
        if (prev.length === 1) return prev
        return prev.filter((f) => f !== filter)
      }
      return [...prev, filter]
    })
  }, [])

  const detailSkillResolved = useMemo(() => {
    if (!detailSkill) return null
    return skills.find((s) => s.id === detailSkill.id) ?? detailSkill
  }, [detailSkill, skills])

  const detailResource = useMemo(() => {
    if (!detailSkillResolved || !detailResourceId) return null
    return detailSkillResolved.resources?.find((r) => r.id === detailResourceId) ?? null
  }, [detailSkillResolved, detailResourceId])

  const resourceTree = useMemo(() => {
    if (!detailSkillResolved?.resources?.length) return []
    return buildResourceTree(detailSkillResolved.resources)
  }, [detailSkillResolved])

  useEffect(() => {
    if (!detailSkillResolved?.resources?.length) {
      setExpandedFolders(new Set())
      return
    }
    setExpandedFolders(collectFolderPaths(detailSkillResolved.resources))
  }, [detailSkillResolved])

  // The "All" view loads summary rows (no `markdown_content`, no resource
  // bodies). When a summary skill is opened, hydrate it from the full
  // per-agent endpoint — cachedFetch (`agent-skills:<key>`) makes repeat
  // opens free and shares the result with the chat slash menus.
  useEffect(() => {
    const target = detailSkillResolved
    if (!target || target.markdown_content !== undefined) return
    const agentKey = target.agent_key
    if (!agentKey) return
    let cancelled = false
    fetchAgentSkills(agentKey)
      .then((fullRows) => {
        if (cancelled) return
        const byId = new Map(fullRows.map((row) => [row.id, row]))
        setSkills((cur) =>
          cur.map((row) => {
            const full = byId.get(row.id)
            // Keep the current enabled flag — it may hold an optimistic toggle.
            return full ? { ...full, is_enabled: row.is_enabled } : row
          }),
        )
      })
      .catch(() => {
        if (cancelled) return
        // Unblock the detail view (it shows a loader while undefined).
        setSkills((cur) =>
          cur.map((row) =>
            row.id === target.id && row.markdown_content === undefined
              ? { ...row, markdown_content: '' }
              : row,
          ),
        )
      })
    return () => {
      cancelled = true
    }
  }, [detailSkillResolved])

  const onToggleEnabled = async (skill: MissionAgentSkill, enabled: boolean) => {
    const agentKey = skill.agent_key
    if (!agentKey) return
    setToggleBusyId(skill.id)
    const prev = skills
    setSkills((cur) => cur.map((s) => (s.id === skill.id ? { ...s, is_enabled: enabled } : s)))
    await updateAgentSkill(agentKey, skill.id, { is_enabled: enabled }).catch(() => {
      setSkills(prev)
    })
    setToggleBusyId(null)
  }

  const deleteSkillResourceOptimistically = useCallback((resourceId: string) => {
    let previousSkills: MissionAgentSkill[] = []
    setSkills((current) => {
      previousSkills = current
      return current.map((skill) => {
        const resources = skill.resources
        if (!resources?.some((resource) => resource.id === resourceId)) return skill
        return {
          ...skill,
          resources: resources.filter((resource) => resource.id !== resourceId),
        }
      })
    })
    return { rollback: () => setSkills(previousSkills) }
  }, [])

  const downloadSkillResourceFile = useCallback(
    (resourceId: string) => {
      if (!detailSkillResolved) return
      const r = detailSkillResolved.resources?.find((x) => x.id === resourceId)
      if (!r) return
      const body = r.content?.trim() ?? ''
      const title = r.file_path.split('/').pop() ?? r.file_path
      downloadMarkdown(
        body,
        title.replace(/\.[^.]+$/, '') || 'reference',
        safeSkillFilename(r.file_path),
      )
    },
    [detailSkillResolved],
  )

  const moveSkillResourceOptimistically = useCallback(
    (
      resourceId: string,
      newFilePath: string,
    ): {
      rollback: () => void
      applyPersisted: (resource: MissionAgentSkillResource) => void
    } => {
      let previousSkills: MissionAgentSkill[] = []
      setSkills((current) => {
        previousSkills = current
        return current.map((skill) => {
          const resources = skill.resources
          if (!resources?.some((resource) => resource.id === resourceId)) return skill
          return {
            ...skill,
            resources: resources.map((resource) =>
              resource.id === resourceId ? { ...resource, file_path: newFilePath } : resource,
            ),
          }
        })
      })

      return {
        rollback: () => setSkills(previousSkills),
        applyPersisted: (persistedResource) => {
          setSkills((current) =>
            current.map((skill) => {
              const resources = skill.resources
              if (!resources?.some((resource) => resource.id === resourceId)) return skill
              return {
                ...skill,
                resources: resources.map((resource) =>
                  resource.id === resourceId ? persistedResource : resource,
                ),
              }
            }),
          )
        },
      }
    },
    [],
  )

  const enableAllCustomSkillsForAgent = useCallback(
    async (agentKey: string) => {
      const toEnable = skills.filter(
        (skill) => skill.agent_key === agentKey && !isOfficialSkill(skill) && !skill.is_enabled,
      )
      for (const skill of toEnable) {
        await onToggleEnabled(skill, true)
      }
    },
    [skills],
  )

  const onConfirmDelete = () => {
    if (!deleteTarget) return
    const agentKey = deleteTarget.agent_key
    if (!agentKey) return
    const toDelete = deleteTarget
    setDeleting(true)
    deleteAgentSkill(agentKey, toDelete.id)
      .then(() => {
        setSkills((cur) => cur.filter((s) => s.id !== toDelete.id))
        setDetailSkill((d) => (d?.id === toDelete.id ? null : d))
      })
      .finally(() => {
        setDeleting(false)
        setDeleteTarget(null)
      })
  }

  const refreshSkills = useCallback(() => {
    // Force past the cachedFetch TTL — refresh is only requested after
    // mutations, where stale data would undo optimistic UI.
    if (skillsViewKey === 'all') {
      void loadAllSkills(agentKeysKey ? agentKeysKey.split(',') : [], { force: true })
      return
    }
    if (skillsViewKey) void loadSkills(skillsViewKey, { force: true })
  }, [skillsViewKey, agentKeysKey, loadAllSkills, loadSkills])

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setFolderBusy(true)
      try {
        await createSkillFolder(trimmed)
        await reloadCatalogOrganization()
        setSkillsGroupBy('folder')
      } finally {
        setFolderBusy(false)
      }
    },
    [reloadCatalogOrganization],
  )

  const handleEnsureDefaultAgencyFolder = useCallback(async () => {
    setFolderBusy(true)
    try {
      await ensureDefaultAgencySkillFolder()
      await reloadCatalogOrganization()
      setSkillsGroupBy('folder')
    } finally {
      setFolderBusy(false)
    }
  }, [reloadCatalogOrganization])

  const handleSetSkillFolder = useCallback(
    async (skillKey: string, folderId: string | null) => {
      await setSkillFolder(skillKey, folderId)
      setSkillKeyToFolderId((prev) => {
        const next = { ...prev }
        if (!folderId) delete next[skillKey]
        else next[skillKey] = folderId
        return next
      })
    },
    [],
  )

  const deleteTargetAgent = useMemo(() => {
    if (!deleteTarget) return selectedAgent
    return agents.find((a) => a.agent_key === deleteTarget.agent_key) ?? selectedAgent
  }, [deleteTarget, agents, selectedAgent])

  const downloadSkillMd = useCallback((skill: MissionAgentSkill) => {
    downloadMarkdown(
      buildSkillMarkdown(skill),
      formatSkillName(skill.name),
      safeSkillFilename(skill.skill_key),
    )
  }, [])

  const handleSkillDetailPdf = useCallback(async () => {
    if (
      !detailSkillResolved ||
      detailResourceId ||
      !skillDetailMarkdownExportRef.current ||
      detailExportingPdf
    )
      return
    setDetailExportMenuOpen(false)
    setDetailExportingPdf(true)
    try {
      await exportCampaignMarkdownDomToPdf({
        contentElement: skillDetailMarkdownExportRef.current,
        campaignId: null,
        filenameBase: formatSkillName(detailSkillResolved.name),
        preferPrintPipeline: true,
      })
    } finally {
      setDetailExportingPdf(false)
    }
  }, [detailSkillResolved, detailResourceId, detailExportingPdf])

  const handleSkillDetailMarkdown = useCallback(() => {
    if (!detailSkillResolved) return
    setDetailExportMenuOpen(false)
    if (!detailResourceId) {
      downloadMarkdown(
        buildSkillMarkdown(detailSkillResolved),
        formatSkillName(detailSkillResolved.name),
        safeSkillFilename(detailSkillResolved.skill_key),
      )
      return
    }
    const r = detailSkillResolved.resources?.find((x) => x.id === detailResourceId)
    if (!r) return
    const body = r.content?.trim() ?? ''
    const title = r.file_path.split('/').pop() ?? r.file_path
    downloadMarkdown(
      body,
      title.replace(/\.[^.]+$/, '') || 'reference',
      safeSkillFilename(r.file_path),
    )
  }, [detailSkillResolved, detailResourceId])

  const handleSkillDetailJson = useCallback(() => {
    if (!detailSkillResolved) return
    setDetailExportMenuOpen(false)
    downloadJSON(
      detailSkillResolved,
      formatSkillName(detailSkillResolved.name),
      safeSkillFilename(detailSkillResolved.skill_key),
    )
  }, [detailSkillResolved])

  return {
    carouselRef,
    roleLabelRefs,
    agents,
    setAgents,
    agentsLoading,
    selectedAgentKey,
    setSelectedAgentKey,
    skillsViewKey,
    setSkillsView,
    selectedAgentId,
    setSelectedAgentId,
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
    totalSkillCount: skills.length,
    viewMode,
    setViewMode,
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
    toggleBusyId,
    pinnedAgentIds,
    dragAgentId,
    setDragAgentId,
    dragOverAgentId,
    setDragOverAgentId,
    expandedFolders,
    setExpandedFolders,
    catalogFolders,
    catalogTags,
    skillKeyToFolderId,
    skillKeyToTagIds,
    folderBusy,
    handleCreateFolder,
    handleEnsureDefaultAgencyFolder,
    handleSetSkillFolder,
    reloadCatalogOrganization,
    selectedAgent,
    handlePinAgent,
    handleRenameAgent,
    filteredSkills,
    detailSkillResolved,
    detailResource,
    resourceTree,
    loadSkills,
    moveSkillResourceOptimistically,
    deleteSkillResourceOptimistically,
    downloadSkillResourceFile,
    onToggleEnabled,
    enableAllCustomSkillsForAgent,
    onConfirmDelete,
    downloadSkillMd,
    handleSkillDetailPdf,
    handleSkillDetailMarkdown,
    handleSkillDetailJson,
  }
}
