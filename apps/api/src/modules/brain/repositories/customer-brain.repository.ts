import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

const CUSTOMER_BRAIN_SELECT = 'id, owner_id, org_id, cortex_max'
const CUSTOMER_BRAIN_ACCESS_SELECT = 'id, owner_id, org_id, scope, cortex_max'

@Injectable()
export class CustomerBrainRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async listEnabledForOwner(ownerId: string) {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .select(CUSTOMER_BRAIN_SELECT)
      .eq('owner_id', ownerId)
      .eq('scope', 'customer')
      .eq('cortex_max', true)
    if (error) throw new Error(`Failed to list customer brains: ${error.message}`)
    return data ?? []
  }

  async listEnabledForRouting(ownerId: string, orgId: string | null) {
    let query = this.serviceClient.client
      .from('ns_brains')
      .select(CUSTOMER_BRAIN_SELECT)
      .eq('owner_id', ownerId)
      .eq('scope', 'customer')
      .eq('cortex_max', true)
    query = orgId === null ? query.is('org_id', null) : query.eq('org_id', orgId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list customer brains for routing: ${error.message}`)
    return data ?? []
  }

  async findCustomerBrain(input: { ownerId: string; orgId: string | null }) {
    let query = this.serviceClient.client
      .from('ns_brains')
      .select(CUSTOMER_BRAIN_SELECT)
      .eq('scope', 'customer')
    query =
      input.orgId === null
        ? query.is('org_id', null).eq('owner_id', input.ownerId)
        : query.eq('org_id', input.orgId)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to resolve customer brain: ${error.message}`)
    return data ?? null
  }

  async findCustomerBrainById(brainId: string) {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .select(CUSTOMER_BRAIN_ACCESS_SELECT)
      .eq('id', brainId)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve customer brain: ${error.message}`)
    return data ?? null
  }

  async createCustomerBrain(input: { ownerId: string; orgId: string | null }) {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .insert({
        owner_id: input.ownerId,
        org_id: input.orgId,
        created_by: input.ownerId,
        name: 'Customer Brain',
        description: 'Customer intelligence layer',
        is_default: false,
        color: '#38bdf8',
        icon: 'users',
        scope: 'customer',
        cortex_max: true,
      })
      .select(CUSTOMER_BRAIN_SELECT)
      .single()
    if (error) throw new Error(`Failed to create customer brain: ${error.message}`)
    return data
  }

  async updateCustomerBrainEnabled(brainId: string, enabled: boolean) {
    const { data, error } = await this.serviceClient.client
      .from('ns_brains')
      .update({ cortex_max: enabled })
      .eq('id', brainId)
      .select(CUSTOMER_BRAIN_SELECT)
      .single()
    if (error) throw new Error(`Failed to update customer brain: ${error.message}`)
    return data
  }

  async findWritableBrain(brainId: string) {
    const { data } = await this.serviceClient.client
      .from('ns_brains')
      .select('id, owner_id, org_id, scope')
      .eq('id', brainId)
      .maybeSingle()
    return data ?? null
  }

  async findContactInWorkspace(input: { contactId: string; orgId: string | null }) {
    let query = this.serviceClient.client
      .from('contacts')
      .select('id, user_id, org_id')
      .eq('id', input.contactId)
    query = input.orgId === null ? query.is('org_id', null) : query.eq('org_id', input.orgId)
    const { data } = await query.maybeSingle()
    return data ?? null
  }

  async insertCustomerMemory(record: Record<string, unknown>) {
    return this.serviceClient.client.from('ns_memories').insert(record).select('id').single()
  }

  async findMemoryByContentHash(brainId: string, contentHash: string) {
    const { data } = await this.serviceClient.client
      .from('ns_memories')
      .select('id')
      .eq('brain_id', brainId)
      .eq('content_hash', contentHash)
      .maybeSingle()
    return data ?? null
  }

  async listCustomerBrainUnits(brainId: string) {
    const { data, error } = await this.serviceClient.client
      .from('customer_brain_units')
      .select('*')
      .eq('brain_id', brainId)
      .order('memory_count', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(`Failed to list customer brain units: ${error.message}`)
    return data ?? []
  }

  async listCustomerSourceIdentities(brainId: string) {
    const { data, error } = await this.serviceClient.client
      .from('customer_source_identities')
      .select(
        'id, brain_id, customer_entity_id, contact_id, source_type, source_id, identity_kind, source_label, confidence, metadata, first_seen_at, last_seen_at, created_at, updated_at',
      )
      .eq('brain_id', brainId)
      .order('last_seen_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(`Failed to list customer source identities: ${error.message}`)
    return data ?? []
  }

  async listUnlinkedCustomerMemories(brainId: string) {
    const { data, error } = await this.serviceClient.client
      .from('customer_memory_identity_view')
      .select('*')
      .eq('brain_id', brainId)
      .in('customer_resolution_status', ['unlinked_source', 'unresolved'])
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw new Error(`Failed to list unlinked customer memories: ${error.message}`)
    return data ?? []
  }

  async countCustomerMemoriesByResolution(brainId: string, resolution: string) {
    const { count, error } = await this.serviceClient.client
      .from('ns_memories')
      .select('id', { count: 'exact', head: true })
      .eq('brain_id', brainId)
      .eq('customer_resolution_status', resolution)
    if (error) throw new Error(`Failed to count customer memories: ${error.message}`)
    return count ?? 0
  }
}
