import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { CustomerBrainRepository } from '../repositories/customer-brain.repository'

export interface CustomerBrainResult {
  id: string
  owner_id: string
  org_id: string | null
  cortex_max: boolean
}

interface CustomerBrainAccessResult extends CustomerBrainResult {
  scope: string
}

@Injectable()
export class CustomerBrainService {
  constructor(private readonly customerBrainRepository: CustomerBrainRepository) {}

  async listEnabledCustomerBrainsForOwner(ownerId: string): Promise<CustomerBrainResult[]> {
    return (await this.customerBrainRepository.listEnabledForOwner(
      ownerId,
    )) as CustomerBrainResult[]
  }

  async listEnabledCustomerBrainsForRouting(
    ownerId: string,
    input: { orgId: string | null },
  ): Promise<CustomerBrainResult[]> {
    return (await this.customerBrainRepository.listEnabledForRouting(
      ownerId,
      input.orgId,
    )) as CustomerBrainResult[]
  }

  async getOrCreateCustomerBrain(input: {
    ownerId: string
    orgId?: string | null
  }): Promise<CustomerBrainResult> {
    const orgId = input.orgId ?? null
    const existing = await this.customerBrainRepository.findCustomerBrain({
      ownerId: input.ownerId,
      orgId,
    })
    if (existing) return existing as CustomerBrainResult

    return (await this.customerBrainRepository.createCustomerBrain({
      ownerId: input.ownerId,
      orgId,
    })) as CustomerBrainResult
  }

  async setCustomerBrainEnabled(input: {
    ownerId: string
    orgId?: string | null
    enabled: boolean
  }): Promise<CustomerBrainResult | null> {
    const brain = await this.getOrCreateCustomerBrain({
      ownerId: input.ownerId,
      orgId: input.orgId ?? null,
    })

    return (await this.customerBrainRepository.updateCustomerBrainEnabled(
      brain.id,
      input.enabled,
    )) as CustomerBrainResult
  }

  async getCustomerBrainView(input: {
    ownerId: string
    orgId?: string | null
    orgRole?: string | null
    brainId?: string | null
  }) {
    if (input.orgId && input.orgRole === 'viewer') {
      throw new ForbiddenException('Viewers cannot access Brain')
    }

    const brain = input.brainId?.trim()
      ? await this.resolveReadableCustomerBrain({
          ownerId: input.ownerId,
          orgId: input.orgId ?? null,
          brainId: input.brainId.trim(),
        })
      : await this.getOrCreateCustomerBrain({
          ownerId: input.ownerId,
          orgId: input.orgId ?? null,
        })

    const [units, sourceIdentities, unlinkedMemories, linkedContactCount, unlinkedSourceCount] =
      await Promise.all([
        this.customerBrainRepository.listCustomerBrainUnits(brain.id),
        this.customerBrainRepository.listCustomerSourceIdentities(brain.id),
        this.customerBrainRepository.listUnlinkedCustomerMemories(brain.id),
        this.customerBrainRepository.countCustomerMemoriesByResolution(brain.id, 'linked_contact'),
        this.customerBrainRepository.countCustomerMemoriesByResolution(brain.id, 'unlinked_source'),
      ])

    return {
      success: true,
      brain_id: brain.id,
      units,
      source_identities: sourceIdentities,
      unlinked_memories: unlinkedMemories,
      stats: {
        customer_units: units.length,
        source_identities: sourceIdentities.length,
        unlinked_memories: unlinkedSourceCount,
        linked_contact_memories: linkedContactCount,
      },
    }
  }

  private async resolveReadableCustomerBrain(input: {
    ownerId: string
    orgId: string | null
    brainId: string
  }): Promise<CustomerBrainAccessResult> {
    const brain = (await this.customerBrainRepository.findCustomerBrainById(
      input.brainId,
    )) as CustomerBrainAccessResult | null
    if (!brain || brain.scope !== 'customer') {
      throw new NotFoundException('Customer Brain not found')
    }
    if (input.orgId) {
      if (brain.org_id !== input.orgId) throw new ForbiddenException('Cannot access Customer Brain')
      return brain
    }
    if (brain.org_id !== null || brain.owner_id !== input.ownerId) {
      throw new ForbiddenException('Cannot access Customer Brain')
    }
    return brain
  }
}
