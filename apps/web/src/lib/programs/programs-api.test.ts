import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendPatch } from '@/lib/api/backend-client'
import { updateProgramUserState } from './programs-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendPatchMock = vi.mocked(backendPatch)

describe('programs API user state', () => {
  beforeEach(() => backendPatchMock.mockReset())

  it('updates the signed-in user favorite state through the Program user-state route', async () => {
    backendPatchMock.mockResolvedValue({
      program_id: 'program personal',
      is_favorite: false,
      updated_at: '2026-08-11T00:00:00.000Z',
    })

    await expect(updateProgramUserState('program personal', false)).resolves.toEqual(
      expect.objectContaining({ is_favorite: false }),
    )
    expect(backendPatchMock).toHaveBeenCalledWith(
      '/api/programs/program%20personal/user-state',
      { is_favorite: false },
    )
  })
})
