'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { AgentTeamExternalMember, AgentTeamMember, MissionAgent } from '@/lib/agents'
import { isSystemAgent } from '@/lib/agents/system-agent-contracts'
import type { SlackDiscoveredPerson } from '../../services/slack-people.service'
import type { TeamDetailOrgMember } from './team-detail-member-types'

export type TeamDetailAddPanelPosition = {
  top: number
  left: number
  width: number
}

function positionFromAnchor(
  anchor: HTMLElement,
  width: number,
  heightGuess: number,
): TeamDetailAddPanelPosition {
  const rect = anchor.getBoundingClientRect()
  const pad = 8
  let left = rect.left
  if (left + width > window.innerWidth - pad) {
    left = Math.max(pad, window.innerWidth - width - pad)
  }
  let top = rect.bottom + 4
  if (top + heightGuess > window.innerHeight - pad) {
    top = Math.max(pad, rect.top - heightGuess - 4)
  }
  return { top, left, width }
}

function useDismissablePanel(
  open: boolean,
  panelRef: RefObject<HTMLDivElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [anchorRef, onClose, open, panelRef])
}

function useFocusWhenOpen(open: boolean, inputRef: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [inputRef, open])
}

export function useTeamDetailAddPanels({
  orgMembers,
  userMembers,
  agents,
  allAgents,
  externalMembers = [],
  externalPeople = [],
}: {
  orgMembers: TeamDetailOrgMember[]
  userMembers: AgentTeamMember[]
  agents: MissionAgent[]
  allAgents: MissionAgent[]
  externalMembers?: AgentTeamExternalMember[]
  externalPeople?: SlackDiscoveredPerson[]
}) {
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [addMemberQuery, setAddMemberQuery] = useState('')
  const [addMemberPos, setAddMemberPos] = useState<TeamDetailAddPanelPosition | null>(null)
  const addMemberCardRef = useRef<HTMLDivElement>(null)
  const addMemberAnchorRef = useRef<HTMLButtonElement>(null)
  const addMemberPanelRef = useRef<HTMLDivElement>(null)
  const addMemberInputRef = useRef<HTMLInputElement>(null)

  const [addAgentOpen, setAddAgentOpen] = useState(false)
  const [addAgentQuery, setAddAgentQuery] = useState('')
  const [addAgentPos, setAddAgentPos] = useState<TeamDetailAddPanelPosition | null>(null)
  const addAgentCardRef = useRef<HTMLDivElement>(null)
  const addAgentAnchorRef = useRef<HTMLButtonElement>(null)
  const addAgentPanelRef = useRef<HTMLDivElement>(null)
  const addAgentInputRef = useRef<HTMLInputElement>(null)

  const [toolbarAddOpen, setToolbarAddOpen] = useState(false)
  const [toolbarAddQuery, setToolbarAddQuery] = useState('')
  const [toolbarAddPos, setToolbarAddPos] = useState<TeamDetailAddPanelPosition | null>(null)
  const toolbarAddAnchorRef = useRef<HTMLButtonElement>(null)
  const toolbarAddPanelRef = useRef<HTMLDivElement>(null)
  const toolbarAddInputRef = useRef<HTMLInputElement>(null)

  const closeAddMember = useCallback(() => setAddMemberOpen(false), [])
  const closeAddAgent = useCallback(() => setAddAgentOpen(false), [])
  const closeToolbarAdd = useCallback(() => setToolbarAddOpen(false), [])

  const memberUserIds = useMemo(() => new Set(userMembers.map((m) => m.user_id)), [userMembers])
  const externalPersonIds = useMemo(
    () => new Set(externalMembers.map((member) => member.person_id)),
    [externalMembers],
  )

  const filterExternalPeople = useCallback(
    (queryValue: string) => {
      const query = queryValue.trim().toLowerCase()
      return externalPeople
        .filter((person) => !externalPersonIds.has(person.id))
        .filter((person) => {
          if (!query) return true
          return [person.display_name, person.email, person.title]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        })
        .sort((a, b) => a.display_name.localeCompare(b.display_name))
    },
    [externalPeople, externalPersonIds],
  )

  const filteredExternalPeople = useMemo(
    () => filterExternalPeople(addMemberQuery),
    [addMemberQuery, filterExternalPeople],
  )

  const filteredToolbarExternalPeople = useMemo(
    () => filterExternalPeople(toolbarAddQuery),
    [filterExternalPeople, toolbarAddQuery],
  )

  const filteredOrgMembers = useMemo(() => {
    const query = addMemberQuery.trim().toLowerCase()
    return orgMembers
      .filter((m) => !memberUserIds.has(m.user_id))
      .filter((m) => {
        if (!query) return true
        const name = (m.profiles?.full_name ?? '').toLowerCase()
        const email = (m.profiles?.email ?? '').toLowerCase()
        return name.includes(query) || email.includes(query)
      })
      .sort((a, b) =>
        (a.profiles?.full_name ?? a.profiles?.email ?? '').localeCompare(
          b.profiles?.full_name ?? b.profiles?.email ?? '',
        ),
      )
  }, [addMemberQuery, memberUserIds, orgMembers])

  const filteredToolbarHumans = useMemo(() => {
    const query = toolbarAddQuery.trim().toLowerCase()
    return orgMembers
      .filter((m) => !memberUserIds.has(m.user_id))
      .filter((m) => {
        if (!query) return true
        const name = (m.profiles?.full_name ?? '').toLowerCase()
        const email = (m.profiles?.email ?? '').toLowerCase()
        return name.includes(query) || email.includes(query)
      })
      .sort((a, b) =>
        (a.profiles?.full_name ?? a.profiles?.email ?? '').localeCompare(
          b.profiles?.full_name ?? b.profiles?.email ?? '',
        ),
      )
  }, [memberUserIds, orgMembers, toolbarAddQuery])

  const filteredAgents = useMemo(() => {
    const memberKeys = new Set(agents.map((a) => a.agent_key))
    const query = addAgentQuery.trim().toLowerCase()
    return allAgents
      .filter((a) => !isSystemAgent(a.agent_key))
      .filter((a) => !memberKeys.has(a.agent_key))
      .filter((a) => {
        if (!query) return true
        return (
          a.name.toLowerCase().includes(query) || (a.agent_key ?? '').toLowerCase().includes(query)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [addAgentQuery, agents, allAgents])

  const filteredToolbarAgents = useMemo(() => {
    const memberKeys = new Set(agents.map((a) => a.agent_key))
    const query = toolbarAddQuery.trim().toLowerCase()
    return allAgents
      .filter((a) => !isSystemAgent(a.agent_key))
      .filter((a) => !memberKeys.has(a.agent_key))
      .filter((a) => {
        if (!query) return true
        return (
          a.name.toLowerCase().includes(query) || (a.agent_key ?? '').toLowerCase().includes(query)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [agents, allAgents, toolbarAddQuery])

  const toggleToolbarAddMembers = useCallback(() => {
    setToolbarAddOpen((open) => {
      const next = !open
      if (next) {
        setAddMemberOpen(false)
        setAddAgentOpen(false)
      }
      return next
    })
  }, [])

  const openToolbarAddMembers = useCallback(() => {
    setAddMemberOpen(false)
    setAddAgentOpen(false)
    setToolbarAddOpen(true)
  }, [])

  const toggleAddMemberPanel = useCallback(() => {
    setToolbarAddOpen(false)
    setAddMemberOpen((open) => !open)
  }, [])

  const toggleAddAgentPanel = useCallback(() => {
    setToolbarAddOpen(false)
    setAddAgentOpen((open) => !open)
  }, [])

  useLayoutEffect(() => {
    if (!addMemberOpen || !addMemberAnchorRef.current || !addMemberCardRef.current) {
      setAddMemberPos(null)
      return
    }
    const width = addMemberCardRef.current.getBoundingClientRect().width
    setAddMemberPos(positionFromAnchor(addMemberAnchorRef.current, width, 320))
  }, [addMemberOpen])

  useLayoutEffect(() => {
    if (!addAgentOpen || !addAgentAnchorRef.current || !addAgentCardRef.current) {
      setAddAgentPos(null)
      return
    }
    const width = addAgentCardRef.current.getBoundingClientRect().width
    setAddAgentPos(positionFromAnchor(addAgentAnchorRef.current, width, 320))
  }, [addAgentOpen])

  useLayoutEffect(() => {
    if (!toolbarAddOpen || !toolbarAddAnchorRef.current) {
      setToolbarAddPos(null)
      return
    }
    const anchorWidth = toolbarAddAnchorRef.current.getBoundingClientRect().width
    setToolbarAddPos(
      positionFromAnchor(
        toolbarAddAnchorRef.current,
        Math.min(360, Math.max(280, anchorWidth)),
        400,
      ),
    )
  }, [toolbarAddOpen])

  useDismissablePanel(addMemberOpen, addMemberPanelRef, addMemberAnchorRef, closeAddMember)
  useDismissablePanel(addAgentOpen, addAgentPanelRef, addAgentAnchorRef, closeAddAgent)
  useDismissablePanel(toolbarAddOpen, toolbarAddPanelRef, toolbarAddAnchorRef, closeToolbarAdd)

  useEffect(() => {
    if (addMemberOpen) setAddMemberQuery('')
  }, [addMemberOpen])

  useEffect(() => {
    if (addAgentOpen) setAddAgentQuery('')
  }, [addAgentOpen])

  useEffect(() => {
    if (toolbarAddOpen) setToolbarAddQuery('')
  }, [toolbarAddOpen])

  useFocusWhenOpen(addMemberOpen, addMemberInputRef)
  useFocusWhenOpen(addAgentOpen, addAgentInputRef)
  useFocusWhenOpen(toolbarAddOpen, toolbarAddInputRef)

  return {
    addMemberOpen,
    addMemberQuery,
    addMemberPos,
    addMemberCardRef,
    addMemberAnchorRef,
    addMemberPanelRef,
    addMemberInputRef,
    setAddMemberQuery,
    filteredOrgMembers,
    filteredExternalPeople,
    toggleAddMemberPanel,
    closeAddMember,
    addAgentOpen,
    addAgentQuery,
    addAgentPos,
    addAgentCardRef,
    addAgentAnchorRef,
    addAgentPanelRef,
    addAgentInputRef,
    setAddAgentQuery,
    filteredAgents,
    toggleAddAgentPanel,
    closeAddAgent,
    toolbarAddOpen,
    toolbarAddQuery,
    toolbarAddPos,
    toolbarAddAnchorRef,
    toolbarAddPanelRef,
    toolbarAddInputRef,
    setToolbarAddQuery,
    filteredToolbarHumans,
    filteredToolbarExternalPeople,
    filteredToolbarAgents,
    toggleToolbarAddMembers,
    openToolbarAddMembers,
    closeToolbarAdd,
    memberUserIds,
    externalPersonIds,
  }
}
