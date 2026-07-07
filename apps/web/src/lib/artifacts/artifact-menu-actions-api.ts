import { backendDelete, backendPatch } from '@/lib/api/backend-client'
import type { Ad, Avatar, EmailArtifact, Presentation, Sequence } from './artifact-types'
import { invalidatePresentationPreviewCache } from './artifact-preview-api'

export async function updateSequence(sequenceId: string, name?: string): Promise<Sequence> {
  return backendPatch<Sequence>(`/api/sequences/${sequenceId}`, { name })
}

export async function deleteSequence(
  sequenceId: string,
  deleteMode: 'keep_unsent' | 'remove_unsent',
): Promise<void> {
  return backendDelete(`/api/sequences/${sequenceId}?delete_mode=${deleteMode}`)
}

export async function updatePresentation(
  presentationId: string,
  data: { name?: string; hide_branding?: boolean; metadata?: Record<string, unknown> },
): Promise<Presentation> {
  const presentation = await backendPatch<Presentation>(
    `/api/presentations/${presentationId}`,
    data,
  )
  invalidatePresentationPreviewCache(presentationId)
  return presentation
}

export async function deletePresentation(presentationId: string): Promise<void> {
  await backendDelete(`/api/presentations/${presentationId}`)
  invalidatePresentationPreviewCache(presentationId)
}

export async function updateAvatar(
  avatarId: string,
  patch: { name?: string; persona_data?: Record<string, unknown> },
): Promise<Avatar> {
  return backendPatch<Avatar>(`/api/avatars/${avatarId}`, patch)
}

export async function deleteAvatar(avatarId: string): Promise<void> {
  return backendDelete(`/api/avatars/${avatarId}`)
}

export async function updateAd(adId: string, patch: { headline?: string }): Promise<Ad> {
  return backendPatch<Ad>(`/api/ads/${adId}`, patch)
}

export async function deleteAd(adId: string): Promise<void> {
  return backendDelete(`/api/ads/${adId}`)
}

export async function updateEmailArtifact(
  emailId: string,
  patch: { subject?: string; body?: string },
): Promise<EmailArtifact> {
  return backendPatch<EmailArtifact>(`/api/emails/${emailId}`, patch)
}

export async function deleteEmailArtifact(emailId: string): Promise<void> {
  return backendDelete(`/api/emails/${emailId}`)
}
