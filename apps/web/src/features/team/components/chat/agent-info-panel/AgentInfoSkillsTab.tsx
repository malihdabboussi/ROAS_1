'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { fetchAgentSkillDenies, setAgentSkillOverride } from '@/lib/agents'
import {
  AgentInfoSkillCatalogSection,
  type AgentInfoSkillCatalogKey,
} from './AgentInfoSkillCatalogSection'
import {
  AgentInfoSkillPeekPortal,
  buildAgentInfoSkillPeek,
  type AgentInfoSkillPeekPayload,
  type AgentInfoSkillPeekWorkflow,
} from './AgentInfoSkillPeekPortal'
import { AgentInfoSkillWorkflowsSection } from './AgentInfoSkillWorkflowsSection'
import type { AgentInfoPanelProps } from './agent-info-panel.types'

export type AgentInfoSkillsTabProps = Pick<
  AgentInfoPanelProps,
  'skillsLoading' | 'agentSkills' | 'agentWorkflows' | 'skillsError' | 'selectedAgentKey'
> & {
  disabled?: boolean
}

export function AgentInfoSkillsTab(props: AgentInfoSkillsTabProps) {
  const router = useRouter()
  const { skillsLoading, agentSkills, agentWorkflows, skillsError, selectedAgentKey, disabled } =
    props

  const [peek, setPeek] = useState<AgentInfoSkillPeekPayload | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  const [catalogCollapsed, setCatalogCollapsed] = useState<
    Partial<Record<AgentInfoSkillCatalogKey, boolean>>
  >({})

  const [denied, setDenied] = useState<Set<string>>(new Set())
  const [togglePending, setTogglePending] = useState<string | null>(null)

  useEffect(() => {
    setCatalogCollapsed({})
    setDenied(new Set())
    if (!selectedAgentKey) return
    let cancelled = false
    fetchAgentSkillDenies(selectedAgentKey)
      .then((keys) => {
        if (!cancelled) setDenied(new Set(keys))
      })
      .catch(() => {
        // Non-fatal: assume all skills enabled.
      })
    return () => {
      cancelled = true
    }
  }, [selectedAgentKey])

  const handleSkillToggle = async (skillKey: string, enabled: boolean) => {
    if (!selectedAgentKey || togglePending) return
    setTogglePending(skillKey)
    setDenied((prev) => {
      const next = new Set(prev)
      if (enabled) next.delete(skillKey)
      else next.add(skillKey)
      return next
    })
    try {
      await setAgentSkillOverride(selectedAgentKey, skillKey, enabled)
    } catch {
      setDenied((prev) => {
        const next = new Set(prev)
        if (enabled) next.add(skillKey)
        else next.delete(skillKey)
        return next
      })
    } finally {
      setTogglePending(null)
    }
  }

  const toggleCatalog = (key: AgentInfoSkillCatalogKey) => {
    setCatalogCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const customSkills = useMemo(
    () => agentSkills.filter((row) => row.is_system !== true),
    [agentSkills],
  )
  const platformSkills = useMemo(
    () => agentSkills.filter((row) => row.is_system === true),
    [agentSkills],
  )

  const cancelHide = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  const scheduleHide = () => {
    cancelHide()
    hideTimerRef.current = window.setTimeout(() => {
      setPeek(null)
      hideTimerRef.current = null
    }, 280)
  }

  useEffect(() => {
    return () => cancelHide()
  }, [])

  const showPeek = (
    e: MouseEvent<HTMLElement>,
    title: string,
    body: string,
    wf: AgentInfoSkillPeekWorkflow,
  ) => {
    cancelHide()
    setPeek(buildAgentInfoSkillPeek(e.currentTarget, title, body, wf))
  }

  const manageFooter = disabled ? (
    <div className="border-border pt-spacing-3 pb-spacing-3 shrink-0 border-t">
      <p className="body-4 text-muted-foreground text-center">
        View only — ask an admin to manage skills.
      </p>
    </div>
  ) : (
    <div className="border-border pt-spacing-3 pb-spacing-3 shrink-0 border-t">
      <button
        type="button"
        onClick={() =>
          router.push(`/team/skills?agent=${encodeURIComponent(selectedAgentKey ?? '')}`)
        }
        className="button-glass-primary rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 w-full text-left"
      >
        Manage Skills
      </button>
    </div>
  )

  if (skillsLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="gap-spacing-2 py-spacing-4 flex min-h-0 flex-1 flex-col items-center justify-center">
          <VibeyChatOrb state="processing" style="elastic" />
          <p className="body-4 text-muted-foreground">Loading skills...</p>
        </div>
        {manageFooter}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AgentInfoSkillPeekPortal peek={peek} onPeekEnter={cancelHide} onPeekLeave={scheduleHide} />
      <div
        className="space-y-spacing-3 pb-spacing-3 min-h-0 flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
        onScroll={() => setPeek(null)}
      >
        {customSkills.length > 0 ? (
          <AgentInfoSkillCatalogSection
            title="Custom"
            catalogKey="custom"
            first
            collapsedMap={catalogCollapsed}
            onToggle={toggleCatalog}
            skills={customSkills}
            nameButtonClass="text-foreground"
            showPeek={showPeek}
            scheduleHide={scheduleHide}
            denied={denied}
            pendingKey={togglePending}
            onSkillToggle={handleSkillToggle}
          />
        ) : null}
        {platformSkills.length > 0 ? (
          <AgentInfoSkillCatalogSection
            title="Platform"
            catalogKey="platform"
            first={customSkills.length === 0}
            collapsedMap={catalogCollapsed}
            onToggle={toggleCatalog}
            skills={platformSkills}
            nameButtonClass="text-foreground/90"
            showPeek={showPeek}
            scheduleHide={scheduleHide}
            denied={denied}
            pendingKey={togglePending}
            onSkillToggle={handleSkillToggle}
          />
        ) : null}
        <AgentInfoSkillWorkflowsSection
          workflows={agentWorkflows}
          hasSkills={customSkills.length + platformSkills.length > 0}
          showPeek={showPeek}
          scheduleHide={scheduleHide}
        />
        {skillsError ? <p className="body-4 mt-spacing-2 text-destructive">{skillsError}</p> : null}
      </div>
      {manageFooter}
    </div>
  )
}
