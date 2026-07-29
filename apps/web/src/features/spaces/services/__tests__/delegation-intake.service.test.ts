import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Space, SpaceItem } from '../../types'
import { ensureDelegationDesk } from '../delegation-desk.service'
import { createDelegationIntake, type DelegationIntakeInput } from '../delegation-intake.service'
import { createSpaceItem } from '../spaces.service'

vi.mock('../spaces.service', () => ({
  createSpaceItem: vi.fn(),
}))

vi.mock('../delegation-desk.service', () => ({
  ensureDelegationDesk: vi.fn(),
}))

const sourceItems = [
  { id: 'task-2', title: 'Replace the old website' },
  { id: 'task-1', title: 'Review the webinar landing page' },
] as SpaceItem[]

const baseInput: DelegationIntakeInput = {
  spaces: [],
  sourceSpaceId: 'source-space',
  sourceSpaceTitle: 'Master Your Kraft',
  selectedItems: sourceItems,
  mode: 'review',
  note: 'Consolidate these before the team sees them.',
}

describe('createDelegationIntake', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(ensureDelegationDesk).mockResolvedValue({
      desk: {
        id: 'desk-new',
        title: 'Delegation Desk',
        schema: { delegation_desk: true },
      } as unknown as Space,
      createdDesk: true,
    })
    vi.mocked(createSpaceItem).mockResolvedValue({
      id: 'intake-1',
      title: 'Delegate 2 tasks — Replace the old website',
    } as SpaceItem)
  })

  it('uses an existing marked Delegation Desk and creates one work group for selected work', async () => {
    const desk = {
      id: 'desk-1',
      title: 'Delegation Desk',
      schema: { delegation_desk: true },
    } as unknown as Space
    vi.mocked(ensureDelegationDesk).mockResolvedValue({ desk, createdDesk: false })

    const result = await createDelegationIntake({ ...baseInput, spaces: [desk] })

    expect(ensureDelegationDesk).toHaveBeenCalledWith([desk])
    expect(createSpaceItem).toHaveBeenCalledWith(
      'desk-1',
      expect.objectContaining({
        status: 'inbox',
        priority: 'high',
        custom_data: expect.objectContaining({
          intake_type: 'work_group',
          delegation: expect.objectContaining({
            version: 1,
            mode: 'review',
            source_space_id: 'source-space',
            source_space_title: 'Master Your Kraft',
            source_item_ids: ['task-1', 'task-2'],
            source_items: [
              { id: 'task-1', title: 'Review the webinar landing page' },
              { id: 'task-2', title: 'Replace the old website' },
            ],
          }),
        }),
      }),
    )
    expect(result).toMatchObject({ deskId: 'desk-1', intakeItemId: 'intake-1', createdDesk: false })
  })

  it('captures one selected task as a work item instead of an opaque packet', async () => {
    const desk = {
      id: 'desk-1',
      title: 'Delegation Desk',
      schema: { delegation_desk: true },
    } as unknown as Space
    vi.mocked(ensureDelegationDesk).mockResolvedValue({ desk, createdDesk: false })

    await createDelegationIntake({
      ...baseInput,
      spaces: [desk],
      selectedItems: [sourceItems[0]!],
    })

    expect(createSpaceItem).toHaveBeenCalledWith(
      'desk-1',
      expect.objectContaining({
        title: 'Replace the old website',
        custom_data: expect.objectContaining({ intake_type: 'work_item' }),
      }),
    )
  })

  it('provisions a private automated Delegation Desk when one does not exist', async () => {
    const result = await createDelegationIntake(baseInput)

    expect(ensureDelegationDesk).toHaveBeenCalledWith([])
    expect(createSpaceItem).toHaveBeenCalledWith('desk-new', expect.any(Object))
    expect(result.createdDesk).toBe(true)
  })

  it('marks explicit urgent intake for same-run dispatch', async () => {
    await createDelegationIntake({ ...baseInput, mode: 'urgent' })

    expect(createSpaceItem).toHaveBeenCalledWith(
      'desk-new',
      expect.objectContaining({
        priority: 'urgent',
        custom_data: expect.objectContaining({
          delegation: expect.objectContaining({ mode: 'urgent' }),
        }),
      }),
    )
  })
})
