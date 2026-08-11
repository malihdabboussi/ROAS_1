import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Space } from '../../types'
import {
  captureDelegationThought,
  ensureDelegationDesk,
  findDelegationDesk,
} from '../delegation-desk.service'
import { instantiateSpaceTemplate } from '../space-templates.service'
import { createSpaceItem } from '../spaces.service'

vi.mock('../space-templates.service', () => ({
  instantiateSpaceTemplate: vi.fn(),
}))
vi.mock('../spaces.service', () => ({ createSpaceItem: vi.fn() }))

describe('Delegation Desk service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reuses the organization Delegation Desk when it already exists', async () => {
    const desk = {
      id: 'desk-1',
      title: 'Delegation Desk',
      schema: { delegation_desk: true },
    } as unknown as Space

    expect(findDelegationDesk([desk])).toBe(desk)
    await expect(ensureDelegationDesk([desk])).resolves.toEqual({
      desk,
      createdDesk: false,
    })
    expect(instantiateSpaceTemplate).not.toHaveBeenCalled()
  })

  it('creates the complete private Delegation Desk once when none exists', async () => {
    const desk = {
      id: 'desk-new',
      title: 'Delegation Desk',
      schema: { delegation_desk: true },
    } as unknown as Space
    vi.mocked(instantiateSpaceTemplate).mockResolvedValue(desk)

    await expect(ensureDelegationDesk([])).resolves.toEqual({
      desk,
      createdDesk: true,
    })
    expect(instantiateSpaceTemplate).toHaveBeenCalledWith('delegation-desk', {
      visibility: 'private',
      include_tasks: true,
      include_docs: true,
      include_channel: false,
      include_automations: true,
    })
  })

  it('captures a trimmed manual thought as unassigned holding-tank intake', async () => {
    const item = { id: 'item-1', title: 'Follow up with the launch team' }
    vi.mocked(createSpaceItem).mockResolvedValue(item as never)

    await expect(
      captureDelegationThought('desk-1', '  Follow up with the launch team  '),
    ).resolves.toBe(item)
    expect(createSpaceItem).toHaveBeenCalledWith('desk-1', {
      title: 'Follow up with the launch team',
      description: 'Follow up with the launch team',
      status: 'inbox',
      priority: null,
      custom_data: {
        intake_type: 'work_item',
        dispatch_mode: 'review',
        delegation: expect.objectContaining({ version: 1, mode: 'review', source: 'manual' }),
      },
    })
  })

  it('rejects an empty manual thought', async () => {
    await expect(captureDelegationThought('desk-1', '   ')).rejects.toThrow(
      'Add something to the Delegation Desk.',
    )
    expect(createSpaceItem).not.toHaveBeenCalled()
  })
})
