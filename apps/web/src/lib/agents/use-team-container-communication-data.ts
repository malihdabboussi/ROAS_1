'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { fetchLlmModels, type LlmModelOption } from '@/lib/chat/llm-models-api'
import { clampDropdownLeft } from '@/lib/ui/dropdown-positioning'
import { listAgentChannels } from './agent-channels-api'
import type { AgentChannel } from './agent-channels'
import type { MissionAgent } from './mission-agents-api'

export function useTeamContainerCommunicationData(selected: MissionAgent | null) {
  const [modelOptions, setModelOptions] = useState<LlmModelOption[]>([])
  const [communicationSaving, setCommunicationSaving] = useState(false)
  const [communicationError, setCommunicationError] = useState<string | null>(null)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [channels, setChannels] = useState<AgentChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [showTelegramSetup, setShowTelegramSetup] = useState(false)
  const [showSlackSetup, setShowSlackSetup] = useState(false)
  const [showReadyEmployees, setShowReadyEmployees] = useState(false)
  const [channelDisconnecting, setChannelDisconnecting] = useState(false)
  const [slackDisconnecting, setSlackDisconnecting] = useState(false)
  const [digestEnabled, setDigestEnabled] = useState(false)
  const [digestTime, setDigestTime] = useState('08:00')
  const [digestSaving, setDigestSaving] = useState(false)
  const [digestDropdownOpen, setDigestDropdownOpen] = useState(false)
  const [digestDropdownPos, setDigestDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [preferredChannel, setPreferredChannel] = useState<'studio' | 'telegram' | 'slack'>(
    'studio',
  )
  const [channelSaving, setChannelSaving] = useState(false)
  const [agentInfoOpen, setAgentInfoOpen] = useState(false)
  const [campaignPanelOpen, setCampaignPanelOpen] = useState(false)
  const [modelDropdownPos, setModelDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [userPublicSlug, setUserPublicSlug] = useState<string | null>(null)

  const digestDropdownBtnRef = useRef<HTMLButtonElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownBtnRef = useRef<HTMLButtonElement>(null)

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true)
    try {
      const data = await listAgentChannels()
      setChannels(data)
    } catch {
      setChannels([])
    } finally {
      setChannelsLoading(false)
    }
  }, [])

  useLayoutEffect(() => {
    if (!modelDropdownOpen || !modelDropdownBtnRef.current) return
    const rect = modelDropdownBtnRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 240)
    setModelDropdownPos({
      top: rect.bottom + 4,
      left: clampDropdownLeft(rect.left, width),
      width,
    })
  }, [modelDropdownOpen])

  useLayoutEffect(() => {
    if (!digestDropdownOpen || !digestDropdownBtnRef.current) return
    const rect = digestDropdownBtnRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 112)
    setDigestDropdownPos({
      top: rect.bottom + 4,
      left: clampDropdownLeft(rect.left, width),
      width,
    })
  }, [digestDropdownOpen])

  useEffect(() => {
    if (selected?.level === 'system') {
      setShowTelegramSetup(false)
      setShowSlackSetup(false)
    }
  }, [selected?.level])

  useEffect(() => {
    let cancelled = false
    cachedFetch('llm-models', fetchLlmModels, { ttlMs: 300_000 })
      .then((models) => {
        if (!cancelled) setModelOptions(models)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    void loadChannels()
  }, [loadChannels])

  useEffect(() => {
    if (!selected || selected.level !== 'c_level') return
    backendGet<{
      preferred_channel?: string
      daily_digest_enabled?: boolean
      daily_digest_time?: string
      public_agent_slug?: string | null
    }>('/api/missions/profile/settings')
      .then((data) => {
        const ch = data.preferred_channel
        if (ch === 'telegram') setPreferredChannel('telegram')
        else if (ch === 'slack') setPreferredChannel('slack')
        else setPreferredChannel('studio')
        setDigestEnabled(data.daily_digest_enabled ?? false)
        setDigestTime(data.daily_digest_time ?? '08:00')
        setUserPublicSlug(data.public_agent_slug ?? null)
      })
      .catch(() => null)
  }, [selected?.level, selected?.id])

  useEffect(() => {
    if (!selected || selected.level === 'c_level') return
    if (userPublicSlug !== null) return
    backendGet<{ public_agent_slug?: string | null }>('/api/missions/profile/settings')
      .then((data) => setUserPublicSlug(data.public_agent_slug ?? null))
      .catch(() => null)
  }, [selected?.id])

  useEffect(() => {
    if (!modelDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(target) &&
        !target.closest('[data-model-dropdown-portal]') &&
        !modelDropdownBtnRef.current?.contains(target)
      ) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [modelDropdownOpen])

  useEffect(() => {
    if (!digestDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) setDigestDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [digestDropdownOpen])

  return {
    modelOptions,
    communicationSaving,
    setCommunicationSaving,
    communicationError,
    setCommunicationError,
    modelDropdownOpen,
    setModelDropdownOpen,
    channels,
    setChannels,
    channelsLoading,
    showTelegramSetup,
    setShowTelegramSetup,
    showSlackSetup,
    setShowSlackSetup,
    showReadyEmployees,
    setShowReadyEmployees,
    channelDisconnecting,
    setChannelDisconnecting,
    slackDisconnecting,
    setSlackDisconnecting,
    digestEnabled,
    setDigestEnabled,
    digestTime,
    setDigestTime,
    digestSaving,
    setDigestSaving,
    digestDropdownOpen,
    setDigestDropdownOpen,
    digestDropdownPos,
    preferredChannel,
    setPreferredChannel,
    channelSaving,
    setChannelSaving,
    agentInfoOpen,
    setAgentInfoOpen,
    campaignPanelOpen,
    setCampaignPanelOpen,
    modelDropdownRef,
    modelDropdownBtnRef,
    modelDropdownPos,
    digestDropdownBtnRef,
    loadChannels,
    userPublicSlug,
    setUserPublicSlug,
  }
}
