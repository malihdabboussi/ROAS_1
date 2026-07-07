import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendPatch } from '@/lib/api/backend-client'
import {
  deleteAd,
  deleteAvatar,
  deleteEmailArtifact,
  deletePresentation,
  deleteSequence,
  updateAd,
  updateAvatar,
  updateEmailArtifact,
  updatePresentation,
  updateSequence,
} from './artifact-menu-actions-api'
import { invalidatePresentationPreviewCache } from './artifact-preview-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendPatch: vi.fn(),
}))

vi.mock('./artifact-preview-api', () => ({
  invalidatePresentationPreviewCache: vi.fn(),
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendPatchMock = vi.mocked(backendPatch)
const invalidatePresentationPreviewCacheMock = vi.mocked(invalidatePresentationPreviewCache)

describe('artifact menu action APIs', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendPatchMock.mockReset()
    invalidatePresentationPreviewCacheMock.mockReset()
  })

  it('updates and deletes sequences through backend artifact endpoints', async () => {
    backendPatchMock.mockResolvedValue({ id: 'sequence-1', name: 'New sequence' })
    backendDeleteMock.mockResolvedValue(undefined)

    await expect(updateSequence('sequence-1', 'New sequence')).resolves.toEqual({
      id: 'sequence-1',
      name: 'New sequence',
    })
    await deleteSequence('sequence-1', 'keep_unsent')

    expect(backendPatchMock).toHaveBeenCalledWith('/api/sequences/sequence-1', {
      name: 'New sequence',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith(
      '/api/sequences/sequence-1?delete_mode=keep_unsent',
    )
  })

  it('updates and deletes presentations while invalidating preview cache', async () => {
    backendPatchMock.mockResolvedValue({ id: 'presentation-1', name: 'Deck' })
    backendDeleteMock.mockResolvedValue(undefined)

    await expect(updatePresentation('presentation-1', { name: 'Deck' })).resolves.toEqual({
      id: 'presentation-1',
      name: 'Deck',
    })
    await deletePresentation('presentation-1')

    expect(backendPatchMock).toHaveBeenCalledWith('/api/presentations/presentation-1', {
      name: 'Deck',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/presentations/presentation-1')
    expect(invalidatePresentationPreviewCacheMock).toHaveBeenCalledTimes(2)
    expect(invalidatePresentationPreviewCacheMock).toHaveBeenCalledWith('presentation-1')
  })

  it('updates and deletes avatars through backend avatar endpoints', async () => {
    backendPatchMock.mockResolvedValue({ id: 'avatar-1', name: 'Buyer' })
    backendDeleteMock.mockResolvedValue(undefined)

    await expect(updateAvatar('avatar-1', { name: 'Buyer' })).resolves.toEqual({
      id: 'avatar-1',
      name: 'Buyer',
    })
    await deleteAvatar('avatar-1')

    expect(backendPatchMock).toHaveBeenCalledWith('/api/avatars/avatar-1', { name: 'Buyer' })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/avatars/avatar-1')
  })

  it('updates and deletes ads through backend ad endpoints', async () => {
    backendPatchMock.mockResolvedValue({ id: 'ad-1', headline: 'Launch' })
    backendDeleteMock.mockResolvedValue(undefined)

    await expect(updateAd('ad-1', { headline: 'Launch' })).resolves.toEqual({
      id: 'ad-1',
      headline: 'Launch',
    })
    await deleteAd('ad-1')

    expect(backendPatchMock).toHaveBeenCalledWith('/api/ads/ad-1', { headline: 'Launch' })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/ads/ad-1')
  })

  it('updates and deletes emails through backend email endpoints', async () => {
    backendPatchMock.mockResolvedValue({ id: 'email-1', subject: 'Launch email' })
    backendDeleteMock.mockResolvedValue(undefined)

    await expect(updateEmailArtifact('email-1', { subject: 'Launch email' })).resolves.toEqual({
      id: 'email-1',
      subject: 'Launch email',
    })
    await deleteEmailArtifact('email-1')

    expect(backendPatchMock).toHaveBeenCalledWith('/api/emails/email-1', {
      subject: 'Launch email',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith('/api/emails/email-1')
  })
})
