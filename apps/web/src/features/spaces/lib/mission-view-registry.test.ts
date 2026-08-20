import { describe, expect, it } from 'vitest'
import type { MissionDeliverable, MissionSubtask } from '@/lib/missions'
import {
  getMissionViewDefinition,
  matchesMissionPhase,
  matchesMissionPhaseDeliverable,
} from './mission-view-registry'

describe('mission view registry', () => {
  it('maps webinar workflow work into reusable report phases', () => {
    const definition = getMissionViewDefinition('webinar-fulfillment')
    const creative = definition?.phases.find((phase) => phase.id === 'creative')
    expect(creative).toBeDefined()
    expect(
      matchesMissionPhase(creative!, {
        title: 'Task 13 - Webinar Deck Bones',
      } as MissionSubtask),
    ).toBe(true)
    expect(
      matchesMissionPhaseDeliverable(creative!, {
        title: 'WEB#7 - Webinar Deck Bones',
      } as MissionDeliverable),
    ).toBe(true)
  })

  it('returns no custom definition for ordinary missions', () => {
    expect(getMissionViewDefinition(undefined)).toBeUndefined()
    expect(getMissionViewDefinition('unknown')).toBeUndefined()
  })

  it('maps task cleanup work into gather, board, and file phases', () => {
    const definition = getMissionViewDefinition('task-cleanup')
    const board = definition?.phases.find((phase) => phase.id === 'board')
    expect(definition?.eyebrow).toBe('TASK CLEANUP')
    expect(
      matchesMissionPhase(board!, {
        title: 'Task 2 — Task Cleanup Board',
      } as MissionSubtask),
    ).toBe(true)
    expect(
      matchesMissionPhaseDeliverable(board!, {
        title: 'Task Cleanup Board',
      } as MissionDeliverable),
    ).toBe(true)
  })
})
