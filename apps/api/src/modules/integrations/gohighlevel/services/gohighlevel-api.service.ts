import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { VaultService } from '../../../vault/services/vault.service'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { GoHighLevelIntegration } from '../integrations/gohighlevel.integration'
import type { GhlContact, GhlUserIntegration } from '../types/gohighlevel.types'

const PROVIDER = 'gohighlevel'
const LABEL_PIT = 'pit'

@Injectable()
export class GoHighLevelApiService {
  constructor(
    private readonly ghl: GoHighLevelIntegration,
    private readonly vault: VaultService,
    private readonly connections: IntegrationConnectionsRepository,
  ) {}

  async connect(userId: string, pitRaw: string, locationIdRaw: string) {
    const pit = normalizePit(pitRaw)
    const locationId = normalizeLocationId(locationIdRaw)
    if (!pit) throw new BadRequestException('Private Integration Token is required')
    if (!locationId) throw new BadRequestException('Location ID is required')

    const location = await this.ghl.getLocation(pit, locationId)

    await this.vault.storeSecret(userId, PROVIDER, LABEL_PIT, pit, 'api_key', {
      locationId: location.id,
    })

    const now = new Date().toISOString()
    await this.connections.upsertConnection(
      PROVIDER,
      userId,
      {
        user_id: userId,
        integration_id: PROVIDER,
        provider: PROVIDER,
        status: 'connected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        connected_at: now,
        error_message: null,
        metadata: {
          auth_type: 'pit',
          locationId: location.id,
          companyId: location.companyId ?? null,
          locationName: location.name ?? null,
        },
        connection_label: location.name ?? location.id,
        updated_at: now,
      },
      null,
      'personal',
      'Failed to save GoHighLevel connection',
    )

    return { connected: true, locationId: location.id, locationName: location.name ?? null }
  }

  async disconnect(userId: string): Promise<void> {
    await this.vault.deleteSecret(userId, PROVIDER, LABEL_PIT)
    await this.connections.markPersonalDisconnected(PROVIDER, userId)
  }

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{
    connected: boolean
    status: string | null
    locationId: string | null
    connectedAt: string | null
  }> {
    const hasPit = await this.vault.hasSecret(userId, PROVIDER, LABEL_PIT)
    if (!hasPit) return { connected: false, status: null, locationId: null, connectedAt: null }

    const data = await this.connections.getStatus(supabase, PROVIDER, userId, null)
    if (!data) return { connected: false, status: null, locationId: null, connectedAt: null }
    const metadata = (data.metadata as Record<string, unknown> | null) ?? null
    const status = (data.status as string | undefined) ?? null
    return {
      connected: status === 'connected',
      status,
      locationId: (metadata?.locationId as string | undefined) ?? null,
      connectedAt: (data.connected_at as string | null) ?? null,
    }
  }

  async listLocationContactsForImport(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ contacts: GhlContact[] }> {
    const { pit, locationId } = await this.getPitAndLocation(supabase, userId)
    const all: GhlContact[] = []
    let startAfterId: string | undefined
    const maxPages = 80

    for (let page = 0; page < maxPages; page++) {
      const { contacts, nextStartAfterId } = await this.ghl.listContactsPage(pit, locationId, {
        limit: 100,
        startAfterId,
      })
      all.push(...contacts)
      if (contacts.length === 0 || !nextStartAfterId) break
      startAfterId = nextStartAfterId
    }

    return { contacts: all }
  }

  async upsertLeadContactInGhl(
    supabase: SupabaseClient,
    userId: string,
    input: {
      leadId: string
      email: string
      firstName?: string
      lastName?: string
      name?: string
      phone?: string
    },
  ): Promise<{ ghlContactId: string; contact: GhlContact }> {
    const { pit, locationId } = await this.getPitAndLocation(supabase, userId)
    const existing = await this.ghl.findContactByEmail(pit, locationId, input.email)
    const contact = existing
      ? await this.ghl.updateContact(pit, locationId, existing.id, {
          firstName: input.firstName,
          lastName: input.lastName,
          name: input.name,
          phone: input.phone,
        })
      : await this.ghl.createContact(pit, locationId, {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          name: input.name,
          phone: input.phone,
        })

    if (!contact?.id) throw new Error('GHL upsert contact failed: missing contact id')

    await this.connections.updateLeadGhlContactId(
      supabase,
      input.leadId,
      contact.id,
      'Failed to update lead with ghl_contact_id',
    )

    return { ghlContactId: contact.id, contact }
  }

  private async getPitAndLocation(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ pit: string; locationId: string }> {
    const pit = await this.vault.getSecret(userId, PROVIDER, LABEL_PIT)
    if (!pit) throw new BadRequestException('GoHighLevel is not connected')
    const integration = await this.connections.getConnectedIntegration<GhlUserIntegration>(
      supabase,
      PROVIDER,
      userId,
      null,
      'GoHighLevel is not connected',
    )
    const metadata = (integration.metadata as Record<string, unknown> | null) ?? null
    const locationId = (metadata?.locationId as string | undefined) ?? null
    if (!locationId) throw new BadRequestException('Missing GHL locationId. Reconnect GoHighLevel.')
    return { pit, locationId }
  }
}

export function normalizePit(raw: string): string {
  return raw.trim().replace(/^Bearer\s+/i, '')
}

export function normalizeLocationId(raw: string): string {
  const trimmed = raw.trim()
  const fromUrl = trimmed.match(/\/location\/([a-zA-Z0-9]+)/i)
  return fromUrl?.[1] ?? trimmed
}
