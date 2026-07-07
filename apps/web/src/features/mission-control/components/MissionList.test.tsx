import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionList } from './MissionList'
import type { Mission, MissionAgent, MissionSubtask } from '../types'

const baseMission: Mission = {
  id: 'mission-1',
  user_id: 'user-1',
  parent_mission_id: null,
  campaign_id: 'campaign-1',
  title: 'Launch plan',
  brief: null,
  description: null,
  status: 'in_progress',
  priority: 'medium',
  assigned_agent_key: 'atlas',
  current_agent_key: 'atlas',
  progress_notes: null,
  plan_id: null,
  correlation_id: 'corr-1',
  idempotency_key: 'idem-1',
  retry_count: 0,
  input: {},
  output: {},
  error: null,
  scheduled_at: null,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-21T10:00:00.000Z',
  started_at: null,
  completed_at: null,
  subtask_total: 1,
  subtask_done: 0,
  subtask_agent_keys: ['atlas'],
}

const agents: MissionAgent[] = [
  {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'atlas',
    name: 'Atlas',
    role: 'Research',
    status: 'working',
    skills: [],
    image_url: null,
    created_at: '2026-06-20T10:00:00.000Z',
    updated_at: '2026-06-21T10:00:00.000Z',
  },
]

const subtask: MissionSubtask = {
  id: 'subtask-1',
  mission_id: 'mission-1',
  user_id: 'user-1',
  title: 'Draft launch copy',
  status: 'awaiting_human',
  assigned_agent_key: 'atlas',
  assignee_type: 'agent',
  assigned_user_id: null,
  awaiting_human_since: null,
  sla_escalate_at: null,
  sla_escalated_at: null,
  bounce_reason: null,
  sort_order: 0,
  depends_on: [],
  output: {},
  feedback: null,
  deliverable_id: null,
  scheduled_at: null,
  created_at: '2026-06-20T10:00:00.000Z',
  updated_at: '2026-06-21T10:00:00.000Z',
}

describe('MissionList', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders mission title, status, progress, and assigned agent', () => {
    render(
      <MissionList
        missions={[baseMission]}
        agents={agents}
        campaigns={[]}
        selectedMissionId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Launch plan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Atlas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0/1').length).toBeGreaterThan(0)
  })

  it('renders expanded subtasks with their status label', () => {
    render(
      <MissionList
        missions={[baseMission]}
        agents={agents}
        campaigns={[]}
        selectedMissionId={null}
        onSelect={vi.fn()}
        subtasksByMissionId={{ 'mission-1': [subtask] }}
        expandedSubtaskMissionIds={new Set(['mission-1'])}
        onToggleSubtaskExpand={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Draft launch copy').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Awaiting you').length).toBeGreaterThan(0)
  })
})
