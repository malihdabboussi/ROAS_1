import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { usePanelResize } from '@/components/layout/usePanelResize'
import {
  fetchReadyEmployeeLibrary,
  hireReadyEmployee,
} from '@/lib/agents/ready-employees-api'
import { useTeams } from '@/lib/agents/use-agent-teams'
import { useTeam2Perms } from '@/lib/agents/use-agent-team-permissions'
import type { ReadyEmployeeProfile } from '@/lib/agents/ready-employee-types'
import { fetchCampaign, updateCampaign } from '@/lib/campaigns/campaign-api'
import { setChatCreditsExhausted } from '@/lib/chat/chat-credit-state'
import { CAMPAIGN_CORE_AGENT_KEYS } from '@/features/team/constants/team.constants'
import { fetchHrInsightsViaLlm } from './ready-employees-hr-insights-llm'
import {
  FILTER_TABS,
  PROJECT_MANAGER_ROLE_KEYS,
  ROLE_TEAM,
} from './ready-employees-modal.constants'
import type { HrInsightsData, ReadyEmployeesModalProps } from './ready-employees-modal.types'

export function useReadyEmployeesModal({
  open,
  onClose,
  onHired,
  existingAgentNames = [],
  agents = [],
  campaignId,
  initialTeamFilter = null,
}: ReadyEmployeesModalProps) {
  const [profiles, setProfiles] = useState<ReadyEmployeeProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null)
  const [hireLoading, setHireLoading] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [teamFilter, setTeamFilter] = useState<string | null>(null)
  const [hrInsightsLoading, setHrInsightsLoading] = useState(false)
  const [hrInsights, setHrInsights] = useState<HrInsightsData | null>(null)
  const [campaignConfig, setCampaignConfig] = useState<Record<string, unknown>>({})
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const { teams } = useTeams()
  const perms = useTeam2Perms()
  const hireTeams = useMemo(
    () => (perms.isAdmin ? teams : teams.filter((team) => perms.teamIds.includes(team.id))),
    [perms.isAdmin, perms.teamIds, teams],
  )
  const isProfileLocked = useCallback(
    (profile: ReadyEmployeeProfile) => profile.level === 'c_level' || (!perms.isAdmin && profile.level === 'manager'),
    [perms.isAdmin],
  )

  const {
    chatWidthPercent: libraryWidthPercent,
    isDragging,
    containerRef,
    handleMouseDown,
  } = usePanelResize({ defaultWidthPercent: 68, minPercent: 50, maxPercent: 80 })

  const hrAgent = useMemo(() => agents.find((a) => a.agent_key === 'hr'), [agents])
  const teamAgentKeys = useMemo(
    () => new Set(agents.filter((a) => a.level !== 'system').map((a) => a.agent_key)),
    [agents],
  )
  const hireableProfiles = useMemo(
    () => profiles.filter((p) => !CAMPAIGN_CORE_AGENT_KEYS.has(p.role_key)),
    [profiles],
  )
  const potentialProfiles = useMemo(
    () => hireableProfiles.filter((p) => !teamAgentKeys.has(p.role_key)),
    [hireableProfiles, teamAgentKeys],
  )
  const highlightedHire = useMemo(() => {
    const topKey = hrInsights?.cascade_hires.find((h) => !teamAgentKeys.has(h.agent_key))?.agent_key
    if (!topKey) return null
    const profile = potentialProfiles.find((p) => p.role_key === topKey)
    const reason = hrInsights?.cascade_hires.find((h) => h.agent_key === topKey)?.reason ?? ''
    return profile ? { profile, reason } : null
  }, [hrInsights, potentialProfiles, teamAgentKeys])

  const takenNames = useMemo(
    () => new Set(existingAgentNames.map((n) => n.toLowerCase())),
    [existingAgentNames],
  )

  const getDisplayName = useCallback(
    (profile: ReadyEmployeeProfile) => {
      const ciTaken = new Set([...takenNames])
      if (!ciTaken.has(profile.default_name.toLowerCase())) return profile.default_name
      for (const name of profile.name_pool ?? []) {
        if (!ciTaken.has(name.toLowerCase())) return name
      }
      return profile.default_name
    },
    [takenNames],
  )

  useEffect(() => {
    if (!open) return
    setSelectedTeamId((prev) =>
      prev && hireTeams.some((team) => team.id === prev) ? prev : (hireTeams[0]?.id ?? ''),
    )
  }, [hireTeams, open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const hasMatchingFilter = initialTeamFilter
      ? FILTER_TABS.some((tab) => tab.id === initialTeamFilter)
      : false
    setTeamFilter(hasMatchingFilter && initialTeamFilter !== 'all' ? initialTeamFilter : null)
    Promise.all([
      fetchReadyEmployeeLibrary().catch(
        () => [] as Awaited<ReturnType<typeof fetchReadyEmployeeLibrary>>,
      ),
      campaignId ? fetchCampaign(campaignId).catch(() => null) : Promise.resolve(null),
    ])
      .then(([rows, campaign]) => {
        if (cancelled) return
        setProfiles(rows)
        if (rows[0]) setSelectedRoleKey(rows[0].role_key)
        const cfg = (campaign as { config?: Record<string, unknown> } | null)?.config ?? {}
        setCampaignConfig(cfg)
        const stored = cfg.hr_insights as HrInsightsData | undefined
        if (stored?.team_gaps) setHrInsights(stored)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load ready employees')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, campaignId, initialTeamFilter])

  const selectRole = useCallback(
    (key: string) => {
      if (key === selectedRoleKey) return
      setSelectedRoleKey(key)
      setPreviewKey((p) => p + 1)
    },
    [selectedRoleKey],
  )

  const filteredProfiles = useMemo(() => {
    let list = hireableProfiles
    if (teamFilter === 'manager') {
      list = hireableProfiles.filter((p) => PROJECT_MANAGER_ROLE_KEYS.has(p.role_key))
    } else if (teamFilter && teamFilter !== 'all') {
      list = hireableProfiles.filter((p) => ROLE_TEAM[p.role_key]?.label === teamFilter)
    }
    const DOMAIN_ORDER: Record<string, number> = {
      Marketing: 0,
      Product: 1,
      Operations: 2,
      Support: 3,
    }
    return [...list].sort((a, b) => {
      const domA = DOMAIN_ORDER[ROLE_TEAM[a.role_key]?.label ?? ''] ?? 99
      const domB = DOMAIN_ORDER[ROLE_TEAM[b.role_key]?.label ?? ''] ?? 99
      if (domA !== domB) return domA - domB
      const mgrA = PROJECT_MANAGER_ROLE_KEYS.has(a.role_key) ? 0 : 1
      const mgrB = PROJECT_MANAGER_ROLE_KEYS.has(b.role_key) ? 0 : 1
      return mgrA - mgrB
    })
  }, [hireableProfiles, teamFilter])

  const selected = useMemo(
    () => hireableProfiles.find((p) => p.role_key === selectedRoleKey) ?? null,
    [hireableProfiles, selectedRoleKey],
  )

  const handleHire = async () => {
    if (!selected) return
    if (isProfileLocked(selected)) return
    setHireLoading(true)
    setError(null)
    try {
      const result = await hireReadyEmployee({
        role_key: selected.role_key,
        name: getDisplayName(selected),
        team_id: selectedTeamId || null,
      })
      onHired(result.agent?.agent_key)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hire employee')
    } finally {
      setHireLoading(false)
    }
  }

  const handleHireFromRecommendation = useCallback(
    async (profile: ReadyEmployeeProfile) => {
      setHireLoading(true)
      setError(null)
      try {
        if (isProfileLocked(profile)) return
        const result = await hireReadyEmployee({
          role_key: profile.role_key,
          name: getDisplayName(profile),
          team_id: selectedTeamId || null,
        })
        onHired(result.agent?.agent_key)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to hire employee')
      } finally {
        setHireLoading(false)
      }
    },
    [getDisplayName, isProfileLocked, onHired, selectedTeamId],
  )

  const handleGetHrInsights = useCallback(async () => {
    if (!hrAgent) return
    setHrInsightsLoading(true)
    try {
      const parsed = await fetchHrInsightsViaLlm({
        hrAgentId: hrAgent.id,
        agents,
        potentialProfiles,
      })
      if (campaignId) {
        const newConfig = { ...campaignConfig, hr_insights: parsed }
        await updateCampaign(campaignId, { config: newConfig })
        setCampaignConfig(newConfig)
      }
      setHrInsights(parsed)
    } catch (err) {
      if (err instanceof Error && err.message === '__CREDITS_EXHAUSTED__') {
        setChatCreditsExhausted(true)
        return
      }
      toast.error('HR insights are unavailable right now. Please try again.')
      console.error('HR insights call failed:', err)
    } finally {
      setHrInsightsLoading(false)
    }
  }, [hrAgent, agents, potentialProfiles, campaignId, campaignConfig])

  const [isMobileLib, setIsMobileLib] = useState(false)
  const [mobileLibView, setMobileLibView] = useState<'list' | 'detail'>('list')
  const [hrCollapsed, setHrCollapsed] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobileLib(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  useEffect(() => {
    if (open) setMobileLibView('list')
  }, [open])

  return {
    profiles,
    loading,
    error,
    selectedRoleKey,
    hireLoading,
    previewKey,
    teamFilter,
    setTeamFilter,
    hrInsightsLoading,
    hrInsights,
    libraryWidthPercent,
    isDragging,
    containerRef,
    handleMouseDown,
    hrAgent,
    filteredProfiles,
    selected,
    getDisplayName,
    selectRole,
    handleHire,
    handleHireFromRecommendation,
    handleGetHrInsights,
    highlightedHire,
    hireTeams,
    selectedTeamId,
    setSelectedTeamId,
    isProfileLocked,
    isMobileLib,
    mobileLibView,
    setMobileLibView,
    hrCollapsed,
    setHrCollapsed,
  }
}

export type ReadyEmployeesModalViewModel = ReturnType<typeof useReadyEmployeesModal>
