'use client'

import type { MouseEvent } from 'react'
import type { MissionAgentWorkflow } from '@/lib/agents'
import { cn } from '@/lib/utils/cn'
import type { AgentInfoSkillPeekWorkflow } from './AgentInfoSkillPeekPortal'

type AgentInfoSkillWorkflowsSectionProps = {
  workflows: MissionAgentWorkflow[]
  hasSkills: boolean
  showPeek: (
    event: MouseEvent<HTMLElement>,
    title: string,
    body: string,
    workflow: AgentInfoSkillPeekWorkflow,
  ) => void
  scheduleHide: () => void
}

export function AgentInfoSkillWorkflowsSection({
  workflows,
  hasSkills,
  showPeek,
  scheduleHide,
}: AgentInfoSkillWorkflowsSectionProps) {
  if (workflows.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-spacing-1', hasSkills ? 'mt-spacing-3' : undefined)}>
      <p className="typo-section-label text-muted-foreground/60">Workflows</p>
      <ul className="space-y-spacing-1">
        {workflows.map((workflow) => (
          <li key={workflow.id}>
            <button
              type="button"
              className="body-3 text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-2 w-full truncate text-left transition-colors"
              onMouseEnter={(event) =>
                showPeek(event, workflow.name ?? '', workflow.description ?? '', workflow)
              }
              onMouseLeave={scheduleHide}
            >
              {workflow.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
