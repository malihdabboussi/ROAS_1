'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchSkillBuilderAgents,
  fetchSkillBuilderMessages,
  fetchSkillBuilderScopes,
  fetchSkillBuilderSkills,
  searchSkillBuilderUsers,
} from '../services/skill-builder.service'
import { hydrateSkillBuilderMessages } from '../services/skill-builder-chat-stream.service'
import { AppSelectMenu, ClientSearchField } from '../components/skill-builder-menus'
import { SkillBuilderChatPanel } from '../components/SkillBuilderChatPanel'
import { useChatStore } from '@web/features/studio/store/use-chat-store'
import type {
  SkillBuilderAgent,
  SkillBuilderScope,
  SkillBuilderSession,
  SkillBuilderSkill,
  SkillBuilderUser,
} from '../types/skill-builder.types'

export function SkillBuilderContainer() {
  const [userQuery, setUserQuery] = useState('')
  const [users, setUsers] = useState<SkillBuilderUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SkillBuilderUser | null>(null)

  const [scopes, setScopes] = useState<SkillBuilderScope[]>([])
  const [selectedScope, setSelectedScope] = useState<SkillBuilderScope | null>(null)

  const [agents, setAgents] = useState<SkillBuilderAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<SkillBuilderAgent | null>(null)

  const [skills, setSkills] = useState<SkillBuilderSkill[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)

  const [session, setSession] = useState<SkillBuilderSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clientSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoringSessionRef = useRef<string | null>(null)
  const pendingRestoreRef = useRef<SkillBuilderSession | null>(null)

  const orgId = selectedScope?.org_id ?? null

  const scopeLabel = useMemo(() => {
    if (!selectedUser) return 'Select a client'
    if (!selectedScope) return selectedUser.email ?? selectedUser.id
    return `${selectedUser.email ?? selectedUser.id} · ${selectedScope.label}`
  }, [selectedUser, selectedScope])

  const loadUsers = useCallback(async (q: string) => {
    setUsersLoading(true)
    setError(null)
    try {
      const data = await searchSkillBuilderUsers(q)
      setUsers(data.users)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to search users')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const formatClientLabel = useCallback((user: SkillBuilderUser) => {
    const name = user.display_name?.trim()
    const email = user.email?.trim()
    if (name && email) return `${name} · ${email}`
    return name || email || user.id
  }, [])

  const selectClient = useCallback(
    (user: SkillBuilderUser) => {
      setSelectedUser(user)
      setUserQuery(formatClientLabel(user))
      setClientDropdownOpen(false)
      setUsers([])
    },
    [formatClientLabel],
  )

  const clientOptions = useMemo(
    () => users.map((u) => ({ id: u.id, label: formatClientLabel(u) })),
    [users, formatClientLabel],
  )

  const scopeOptions = useMemo(
    () => scopes.map((s) => ({ id: s.id, label: s.label })),
    [scopes],
  )

  const agentOptions = useMemo(
    () => agents.map((a) => ({ id: a.agent_key, label: a.name || a.agent_key })),
    [agents],
  )

  useEffect(() => {
    if (!clientDropdownOpen) return
    if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current)
    clientSearchTimerRef.current = setTimeout(() => {
      void loadUsers(userQuery.trim())
    }, 250)
    return () => {
      if (clientSearchTimerRef.current) clearTimeout(clientSearchTimerRef.current)
    }
  }, [userQuery, clientDropdownOpen, loadUsers])

  useEffect(() => {
    if (!selectedUser) {
      setScopes([])
      setSelectedScope(null)
      return
    }
    void (async () => {
      try {
        const data = await fetchSkillBuilderScopes(selectedUser.id)
        setScopes(data.scopes)
        setSelectedScope(data.scopes[0] ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load scopes')
      }
    })()
  }, [selectedUser])

  useEffect(() => {
    if (!selectedUser || !selectedScope) {
      setAgents([])
      setSelectedAgent(null)
      return
    }
    void (async () => {
      try {
        const data = await fetchSkillBuilderAgents(selectedUser.id, orgId)
        setAgents(data.agents)
        setSelectedAgent(data.agents[0] ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load agents')
      }
    })()
  }, [selectedUser, selectedScope, orgId])

  const reloadSkills = useCallback(async () => {
    if (!selectedUser || !selectedAgent) return
    setSkillsLoading(true)
    try {
      const data = await fetchSkillBuilderSkills(selectedUser.id, orgId, selectedAgent.agent_key)
      setSkills(data.skills)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load skills')
    } finally {
      setSkillsLoading(false)
    }
  }, [selectedUser, selectedAgent, orgId])

  useEffect(() => {
    void reloadSkills()
  }, [reloadSkills])

  useEffect(() => {
    if (restoringSessionRef.current) return
    setSession(null)
  }, [selectedUser?.id, selectedScope?.id, selectedAgent?.agent_key])

  useEffect(() => {
    const pending = pendingRestoreRef.current
    if (!pending || scopes.length === 0) return
    const scope = pending.org_id
      ? (scopes.find((s) => s.org_id === pending.org_id) ?? null)
      : (scopes.find((s) => s.kind === 'personal') ?? scopes[0] ?? null)
    if (scope) setSelectedScope(scope)
  }, [scopes])

  useEffect(() => {
    const pending = pendingRestoreRef.current
    if (!pending || agents.length === 0) return
    const agent = agents.find((a) => a.agent_key === pending.target_agent_key) ?? null
    if (agent) {
      setSelectedAgent(agent)
      pendingRestoreRef.current = null
      restoringSessionRef.current = null
    }
  }, [agents])

  const restoreSessionContext = useCallback((picked: SkillBuilderSession) => {
    restoringSessionRef.current = picked.id
    pendingRestoreRef.current = picked
    setSelectedUser({
      id: picked.acting_user_id,
      email: picked.acting_user_email,
      display_name: null,
      created_at: null,
    })
    setUserQuery(picked.acting_user_email ?? picked.acting_user_id)
    setClientDropdownOpen(false)
    setUsers([])
  }, [])

  const handleSessionChange = useCallback(
    (next: SkillBuilderSession | null) => {
      setSession(next)
      if (!next) return
      restoreSessionContext(next)
      void fetchSkillBuilderMessages(next.id)
        .then((data) => {
          ;useChatStore.getState().setMessages(
            next.id,
            hydrateSkillBuilderMessages(next.id, data.messages),
          )
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Failed to load session messages')
        })
    },
    [restoreSessionContext],
  )

  return (
    <div className="gap-spacing-6 flex min-h-0 flex-1 flex-col">
      {error && (
        <div className="rounded-spacing-2 border border-red-500/40 bg-red-500/10 px-spacing-4 py-spacing-3 body-3 text-red-200">
          {error}
        </div>
      )}

      <div className="surface-card border-border gap-spacing-4 rounded-spacing-2 grid overflow-visible border p-spacing-4 md:grid-cols-3">
        <div className="gap-spacing-2 flex flex-col overflow-visible">
          <label className="body-4 text-muted-foreground font-medium">Client</label>
          <ClientSearchField
            value={userQuery}
            loading={usersLoading}
            open={clientDropdownOpen}
            options={clientOptions}
            onQueryChange={(next) => {
              setUserQuery(next)
              if (selectedUser && next !== formatClientLabel(selectedUser)) {
                setSelectedUser(null)
              }
            }}
            onOpenChange={setClientDropdownOpen}
            onSelect={(id) => {
              const user = users.find((u) => u.id === id)
              if (user) selectClient(user)
            }}
          />
        </div>

        <div className="gap-spacing-2 flex flex-col overflow-visible">
          <label className="body-4 text-muted-foreground font-medium">Scope</label>
          <AppSelectMenu
            ariaLabel="Select scope"
            value={selectedScope?.id ?? ''}
            options={scopeOptions}
            disabled={!selectedUser}
            placeholder="Select scope"
            onChange={(id) => {
              const scope = scopes.find((s) => s.id === id) ?? null
              setSelectedScope(scope)
            }}
          />
          <p className="body-4 text-muted-foreground">{scopeLabel}</p>
        </div>

        <div className="gap-spacing-2 flex flex-col overflow-visible">
          <label className="body-4 text-muted-foreground font-medium">Target agent</label>
          <AppSelectMenu
            ariaLabel="Select target agent"
            value={selectedAgent?.agent_key ?? ''}
            options={agentOptions}
            disabled={!selectedScope}
            placeholder="Select agent"
            onChange={(id) => {
              const agent = agents.find((a) => a.agent_key === id) ?? null
              setSelectedAgent(agent)
            }}
          />
        </div>
      </div>

      <div className="gap-spacing-4 grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="surface-card border-border flex min-h-[420px] flex-col overflow-hidden rounded-spacing-2 border">
          <div className="border-border px-spacing-4 py-spacing-3 border-b">
            <h3 className="title-h4 text-foreground">Skills on agent</h3>
          </div>
          <div className="p-spacing-4 flex-1 overflow-y-auto">
            {skillsLoading ? (
              <p className="body-3 text-muted-foreground">Loading skills…</p>
            ) : skills.length === 0 ? (
              <p className="body-3 text-muted-foreground">No skills yet for this agent.</p>
            ) : (
              <ul className="gap-spacing-3 flex flex-col">
                {skills.map((skill) => (
                  <li
                    key={skill.id}
                    className="rounded-spacing-2 border-border border p-spacing-3"
                  >
                    <p className="body-2 text-foreground font-medium">{skill.name}</p>
                    <p className="body-4 text-muted-foreground mt-spacing-1">{skill.skill_key}</p>
                    <p className="body-3 text-muted-foreground mt-spacing-2 line-clamp-3">
                      {skill.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <SkillBuilderChatPanel
          selectedUser={selectedUser}
          selectedScope={selectedScope}
          selectedAgent={selectedAgent}
          orgId={orgId}
          session={session}
          onSessionChange={handleSessionChange}
          onSkillsChanged={() => void reloadSkills()}
        />
      </div>
    </div>
  )
}
