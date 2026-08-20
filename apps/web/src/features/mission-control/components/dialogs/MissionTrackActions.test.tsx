import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Mission, MissionSubtask } from '../../types'
import { MissionTrackActions } from './MissionTrackActions'

const mission = {
  id: 'mission-1',
  title: 'Claude Club Pre-Call Strategy Map',
  input: { playbook_id: 'client-strategy' },
} as unknown as Mission

const preCall: MissionSubtask = {
  id: 'subtask-1',
  mission_id: 'mission-1',
  user_id: 'user-1',
  title: 'Task 2 — Pre-call strategy map',
  status: 'done',
  assigned_agent_key: 'nate',
  assignee_type: 'agent',
  assigned_user_id: null,
  awaiting_human_since: null,
  sla_escalate_at: null,
  sla_escalated_at: null,
  bounce_reason: null,
  sort_order: 1,
  depends_on: [],
  output: {},
  feedback: null,
  deliverable_id: null,
  scheduled_at: null,
  created_at: '2026-08-19T00:00:00.000Z',
  updated_at: '2026-08-19T00:00:00.000Z',
}

afterEach(() => {
  cleanup()
})

describe('MissionTrackActions', () => {
  it('offers post-call on a Client Strategy track and queues the extend action', async () => {
    const onExtend = vi.fn().mockResolvedValue(undefined)
    render(<MissionTrackActions mission={mission} subtasks={[preCall]} onExtend={onExtend} />)

    fireEvent.click(screen.getByRole('button', { name: 'Post-call strategy' }))

    await waitFor(() => {
      expect(onExtend).toHaveBeenCalledWith('post-call-strategy')
    })
  })

  it('hides continue-track actions after post-call is already on the mission', () => {
    render(
      <MissionTrackActions
        mission={mission}
        subtasks={[
          preCall,
          { ...preCall, id: 'subtask-2', title: 'Task 4 — Post-call strategy map' },
        ]}
        onExtend={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Post-call strategy' })).toBeNull()
  })
})
