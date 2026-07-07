import { Logger } from '@nestjs/common'

const logger = new Logger('ContactResolution')

const RESOLVE_TIMEOUT_MS = 5_000

export interface ResolveContactInput {
  userId: string
  orgId: string | null
  email: string
  firstName?: string | null
  lastName?: string | null
  campaignId?: string | null
  agentKey?: string | null
  channel?: string
}

/**
 * Resolves/creates a contact through apps/api's internal contact endpoint
 * (single ingestion path via ContactIdentifierService). Best-effort: returns
 * null on any failure so conversation creation is never blocked.
 */
export async function resolveContactViaInternalApi(
  input: ResolveContactInput,
): Promise<string | null> {
  const mainApiUrl = process.env.MAIN_API_URL || 'http://localhost:3001'
  const internalToken = process.env.INTERNAL_API_TOKEN || ''
  if (!internalToken) {
    logger.warn('INTERNAL_API_TOKEN not configured; skipping contact resolution')
    return null
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS)
  try {
    const res = await fetch(`${mainApiUrl}/api/internal/contacts/resolve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${internalToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: input.userId,
        org_id: input.orgId,
        email: input.email,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        channel: input.channel ?? 'widget',
        campaign_id: input.campaignId ?? null,
        agent_key: input.agentKey ?? null,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      logger.warn(`Contact resolution failed with status ${res.status}`)
      return null
    }
    const body = (await res.json()) as { contact_id?: string | null }
    return body.contact_id ?? null
  } catch (error) {
    logger.warn(`Contact resolution failed: ${(error as Error).message}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}
