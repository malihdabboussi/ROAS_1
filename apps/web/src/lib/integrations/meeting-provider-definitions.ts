import { backendDelete, backendGet, backendPost } from '@/lib/api/backend-client'
import type { Integration } from './integrations.types'

/**
 * Note takers defined from Settings › Integrations › More integrations.
 * Mirrors the API contract in apps/api/src/modules/meetings/custom; the
 * Library renders a definition as an ordinary integration row.
 */

export const DEFINED_NOTE_TAKER_ID_PATTERN = /^nt_[a-z0-9_]{2,40}$/

export function isDefinedNoteTakerId(value: string): boolean {
  return DEFINED_NOTE_TAKER_ID_PATTERN.test(value.trim().toLowerCase())
}

export type NoteTakerListing = {
  id: string
  slug: string
  displayName: string
  description: string | null
  logoUrl: string | null
  requiresSecret: boolean
  signatureHeader: string | null
  isActive: boolean
}

export type NoteTakerSignatureInput =
  | { scheme: 'none' }
  | {
      scheme: 'hmac_sha256'
      header: string
      encoding: 'hex' | 'base64'
      prefix?: string
      keyEncoding: 'utf8' | 'base64'
    }

export type NoteTakerDefinitionInput = {
  displayName: string
  description?: string
  logoUrl?: string
  signature: NoteTakerSignatureInput
  event: { eventTypePath?: string; acceptValues?: string[]; deliveryIdPath?: string }
  fieldMap: {
    externalId: string
    title?: string
    startTime?: string
    endTime?: string
    hostEmail?: string
    sourceUrl?: string
    recordingUrl?: string
    summary?: string
    participants?: { path: string; email?: string; name?: string }
    transcript: { path: string; speaker?: string; text: string; timestamp?: string }
    actions?: { path: string; text: string; assigneeName?: string; assigneeEmail?: string }
  }
}

export type NoteTakerPreviewResult =
  | {
      ok: true
      slug: string
      result: {
        externalId: string
        title: string
        recordingStart: string | null
        recordingEnd: string | null
        hostEmail: string | null
        participantEmails: string[]
        transcriptTurns: number
        firstTurn: { speakerName: string; text: string } | null
        actions: string[]
        summaryPreview: string | null
        sourceUrl: string | null
      }
    }
  | { ok: false; slug: string; error: string }

const DEFINITIONS_PATH = '/api/integrations/meetings/definitions'

export async function listNoteTakerDefinitions(): Promise<NoteTakerListing[]> {
  const res = await backendGet<{ success: boolean; definitions?: NoteTakerListing[] }>(
    DEFINITIONS_PATH,
  )
  return res?.definitions ?? []
}

export async function createNoteTakerDefinition(
  input: NoteTakerDefinitionInput,
): Promise<{ slug: string; displayName: string }> {
  const res = await backendPost<{
    success: boolean
    definition: { slug: string; displayName: string }
  }>(DEFINITIONS_PATH, input)
  return res.definition
}

export async function previewNoteTakerDefinition(
  definition: NoteTakerDefinitionInput,
  samplePayload: Record<string, unknown>,
): Promise<NoteTakerPreviewResult> {
  return backendPost<NoteTakerPreviewResult>(`${DEFINITIONS_PATH}/preview`, {
    definition,
    samplePayload,
  })
}

export async function deactivateNoteTakerDefinition(slug: string): Promise<void> {
  await backendDelete(`${DEFINITIONS_PATH}/${encodeURIComponent(slug)}`)
}

/** Address to paste into the tool; the API prepares a pending row so it exists before Connect. */
export async function fetchMeetingWebhookAddress(slug: string): Promise<string> {
  const res = await backendGet<{ success: boolean; webhookUrl: string }>(
    `/api/integrations/meetings/${encodeURIComponent(slug)}/webhook-address`,
  )
  return res.webhookUrl
}

export async function connectDefinedNoteTaker(slug: string, secret?: string): Promise<void> {
  await backendPost(`/api/integrations/meetings/${encodeURIComponent(slug)}/connect`, {
    ...(secret ? { secret } : {}),
  })
}

export async function disconnectDefinedNoteTaker(slug: string): Promise<void> {
  await backendPost(`/api/integrations/meetings/${encodeURIComponent(slug)}/disconnect`, {})
}

/** A definition as the Library sees it: a Productivity row that connects with a pasted secret. */
export function definitionToIntegration(listing: NoteTakerListing): Integration {
  const secretLabel = listing.signatureHeader
    ? `Signing secret (sent in ${listing.signatureHeader})`
    : 'Signing secret'
  return {
    id: listing.slug,
    provider: listing.slug,
    name: listing.displayName,
    description:
      listing.description ??
      `Connect ${listing.displayName} so its meeting transcripts flow into your brain and Meetings.`,
    ...(listing.logoUrl ? { logo_url: listing.logoUrl } : {}),
    category: 'productivity',
    auth_type: 'api_key',
    connection_fields: listing.requiresSecret
      ? [
          {
            name: 'secret',
            label: secretLabel,
            placeholder: `Paste the secret ${listing.displayName} shows for the webhook`,
            required: true,
          },
        ]
      : [
          {
            name: 'secret',
            label: 'Signing secret (not used by this tool)',
            placeholder: 'Leave empty; this tool does not sign its deliveries',
            required: false,
          },
        ],
    is_active: listing.isActive,
  }
}
