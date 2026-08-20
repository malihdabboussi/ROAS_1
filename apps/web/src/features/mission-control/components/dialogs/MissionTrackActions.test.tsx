import { createElement, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuickMissionsLauncherProvider, useQuickMissionsLauncher } from '@/lib/missions'
import type { Mission, MissionSubtask } from '../../types'
import { MissionTrackActions } from './MissionTrackActions'

const mission = {
  id: 'mission-1',
  title: 'Claude Club Pre-Call Strategy Map',
  space_id: 'space-1',
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

function LauncherProbe() {
  const launcher = useQuickMissionsLauncher()
  if (!launcher.open) return null
  return createElement(
    'div',
    { 'data-testid': 'launched-playbook' },
    `${launcher.playbookKey}:${launcher.parentMissionId}:${launcher.spaceId}`,
  )
}

function renderActions(ui: ReactNode) {
  return render(
    createElement(QuickMissionsLauncherProvider, null, ui, createElement(LauncherProbe)),
  )
}

afterEach(() => {
  cleanup()
})

describe('MissionTrackActions', () => {
  it('opens extend options under the last task and queues post-call', async () => {
    const onExtend = vi.fn().mockResolvedValue(undefined)
    renderActions(
      createElement(MissionTrackActions, {
        mission,
        subtasks: [preCall],
        onExtend,
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Extend this mission' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Post-call strategy/ }))

    await waitFor(() => {
      expect(onExtend).toHaveBeenCalledWith('post-call-strategy')
    })
  })

  it('still offers other missions after post-call is already on the track', () => {
    renderActions(
      createElement(MissionTrackActions, {
        mission,
        subtasks: [
          preCall,
          { ...preCall, id: 'subtask-2', title: 'Task 4 — Post-call strategy map' },
        ],
        onExtend: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Extend this mission' }))
    expect(screen.queryByRole('menuitem', { name: /Post-call strategy/ })).toBeNull()
    expect(screen.getByRole('menuitem', { name: /Webinar Fulfillment/ })).toBeTruthy()
  })

  it('launches another playbook with this mission as parent', () => {
    renderActions(
      createElement(MissionTrackActions, {
        mission,
        subtasks: [preCall],
        onExtend: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Extend this mission' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Webinar Fulfillment/ }))

    expect(screen.getByTestId('launched-playbook').textContent).toBe(
      'webinar-fulfillment:mission-1:space-1',
    )
  })
})
