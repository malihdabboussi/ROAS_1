import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Space } from '../../types'
import { ensureDelegationDesk, findDelegationDesk } from '../delegation-desk.service'
import { instantiateSpaceTemplate } from '../space-templates.service'

vi.mock('../space-templates.service', () => ({
  instantiateSpaceTemplate: vi.fn(),
}))

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
})
