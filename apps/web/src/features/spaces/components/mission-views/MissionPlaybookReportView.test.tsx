import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { Mission, MissionDeliverable, MissionSubtask } from '@/lib/missions'
import { getMissionViewDefinition } from '../../lib/mission-view-registry'
import { MissionPlaybookReportView } from './MissionPlaybookReportView'

describe('MissionPlaybookReportView', () => {
  it('shows webinar phases, linked outputs, and the next human review', () => {
    const onOpenMission = vi.fn()
    const onOpenDeliverable = vi.fn()
    const mission = {
      id: 'webinar-1',
      title: 'Webinar Fulfillment',
      brief: 'Fulfill the client webinar.',
    } as Mission
    const subtasks = [
      {
        id: 'strategy-1',
        title: 'Task 2 - Pre-call strategy map',
        status: 'done',
        assignee_type: 'agent',
      },
      {
        id: 'copy-gate',
        title: 'Gate 3 - Approve copy package',
        status: 'awaiting_human',
        assignee_type: 'human',
      },
    ] as MissionSubtask[]
    const deliverable = {
      id: 'copy-1',
      title: 'Task 8 - WEB#5A Copy Package',
    } as MissionDeliverable

    render(
      <MissionPlaybookReportView
        mission={mission}
        definition={getMissionViewDefinition('webinar-fulfillment')!}
        subtasks={subtasks}
        deliverables={[deliverable]}
        onBack={vi.fn()}
        onOpenMission={onOpenMission}
        onOpenDeliverable={onOpenDeliverable}
      />,
    )

    expect(screen.getByText('Strategy')).toBeVisible()
    expect(screen.getByText('Copy')).toBeVisible()
    expect(screen.getByText('Creative')).toBeVisible()
    expect(screen.getByText('Activation')).toBeVisible()
    expect(screen.getByText('Your review')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Review now/i }))
    expect(onOpenMission).toHaveBeenCalledWith('copy-gate')
    fireEvent.click(screen.getByRole('button', { name: /WEB#5A Copy Package/i }))
    expect(onOpenDeliverable).toHaveBeenCalledWith(deliverable)
  })
})
