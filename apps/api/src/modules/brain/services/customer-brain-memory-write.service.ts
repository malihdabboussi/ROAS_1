import { createHash } from 'node:crypto'
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { type RequestScope } from '@vibey/api-shared'
import { CustomerBrainRepository } from '../repositories/customer-brain.repository'
import { BrainEvidenceIngestionService } from './brain-evidence-ingestion.service'
import { BrainOpsHookService } from './brain-ops-hook.service'
import { CustomerBrainService } from './customer-brain.service'

@Injectable()
export class CustomerBrainMemoryWriteService {
  constructor(
    private readonly customerBrainRepository: CustomerBrainRepository,
    private readonly brainOpsHook: BrainOpsHookService,
    private readonly customerBrain: CustomerBrainService,
    private readonly evidenceIngestion: BrainEvidenceIngestionService,
  ) {}

  async addTextMemory(
    userId: string,
    scope: RequestScope,
    body: {
      brainId?: string
      title?: string | null
      content: string
      contactId?: string | null
      sourceType?: string | null
    },
  ) {
    this.assertCustomerBrainWriteAllowed(scope)
    const content = (body?.content ?? '').trim()
    if (!content) throw new BadRequestException('content is required')

    const brain = await this.resolveCustomerBrainForWrite(
      userId,
      scope.orgId ?? null,
      body.brainId ?? null,
    )

    const contactId = await this.validateContactBelongsToWorkspace(
      userId,
      scope.orgId ?? null,
      body.contactId ?? null,
    )

    const memoryId = await this.insertCustomerBrainMemory({
      brainId: brain.id,
      contactId,
      content,
      sourceType: body.sourceType?.trim() || 'manual',
      sourceTitle: body.title?.trim() || null,
      speaker: 'user',
      ownerId: userId,
      orgId: scope.orgId ?? null,
    })

    await this.brainOpsHook.onCustomerMemoriesSaved(brain.id, 1)

    return { success: true, memory_id: memoryId, brain_id: brain.id, contact_id: contactId }
  }

  async addLinkMemory(
    userId: string,
    scope: RequestScope,
    body: { brainId?: string; url: string; title?: string | null; contactId?: string | null },
  ) {
    this.assertCustomerBrainWriteAllowed(scope)
    const url = (body?.url ?? '').trim()
    if (!url) throw new BadRequestException('url is required')
    try {
      new URL(url)
    } catch {
      throw new BadRequestException('url is not a valid URL')
    }

    const brain = await this.resolveCustomerBrainForWrite(
      userId,
      scope.orgId ?? null,
      body.brainId ?? null,
    )

    const contactId = await this.validateContactBelongsToWorkspace(
      userId,
      scope.orgId ?? null,
      body.contactId ?? null,
    )

    const content = body.title?.trim() ? `${body.title.trim()} — ${url}` : url
    const memoryId = await this.insertCustomerBrainMemory({
      brainId: brain.id,
      contactId,
      content,
      sourceType: 'url',
      sourceTitle: body.title?.trim() || url,
      speaker: 'user',
      ownerId: userId,
      orgId: scope.orgId ?? null,
    })

    await this.brainOpsHook.onCustomerMemoriesSaved(brain.id, 1)

    return { success: true, memory_id: memoryId, brain_id: brain.id, contact_id: contactId }
  }

  private assertCustomerBrainWriteAllowed(scope: RequestScope) {
    if (!scope.orgId) return
    if (scope.orgRole !== 'owner' && scope.orgRole !== 'admin') {
      throw new ForbiddenException('Only owner or admin can train the Customer Brain')
    }
  }

  private async resolveCustomerBrainForWrite(
    userId: string,
    orgId: string | null,
    requestedBrainId: string | null,
  ): Promise<{ id: string }> {
    if (requestedBrainId) {
      const brain = await this.customerBrainRepository.findWritableBrain(requestedBrainId)
      if (!brain) throw new NotFoundException('Brain not found')
      if (brain.scope !== 'customer') {
        throw new BadRequestException('Target brain is not a customer brain')
      }
      const ownsBrain = brain.owner_id === userId
      const sharesOrg = orgId !== null && brain.org_id === orgId
      if (!ownsBrain && !sharesOrg) {
        throw new BadRequestException('Not authorized for this customer brain')
      }
      return { id: brain.id }
    }
    const brain = await this.customerBrain.getOrCreateCustomerBrain({ ownerId: userId, orgId })
    return { id: brain.id }
  }

  private async validateContactBelongsToWorkspace(
    userId: string,
    orgId: string | null,
    contactId: string | null,
  ): Promise<string | null> {
    if (!contactId) return null
    const contact = await this.customerBrainRepository.findContactInWorkspace({ contactId, orgId })
    if (!contact) {
      throw new BadRequestException('Contact not found in this workspace')
    }
    if (contact.user_id !== userId && orgId === null) {
      throw new BadRequestException('Contact not in this workspace')
    }
    return contact.id
  }

  private async insertCustomerBrainMemory(input: {
    brainId: string
    contactId: string | null
    content: string
    sourceType: string
    sourceTitle: string | null
    speaker: string
    ownerId: string
    orgId: string | null
  }): Promise<string> {
    const contentHash = createHash('sha256').update(input.content).digest('hex')
    const { data, error } = await this.customerBrainRepository.insertCustomerMemory({
      brain_id: input.brainId,
      contact_id: input.contactId,
      content: input.content,
      content_hash: contentHash,
      memory_type: 'fact',
      source_type: input.sourceType,
      source_title: input.sourceTitle,
      speaker: input.speaker,
      confidence: 1,
      significance: 0.5,
      tags: ['manual_entry', 'customer_brain'],
      agent_id: 'user',
    })
    if (error) {
      if (error.message?.includes('duplicate')) {
        const existing = await this.customerBrainRepository.findMemoryByContentHash(
          input.brainId,
          contentHash,
        )
        if (existing?.id) return existing.id
      }
      throw new BadRequestException(`Failed to write memory: ${error.message}`)
    }
    const memoryId = (data as { id: string }).id
    await this.evidenceIngestion.writeServiceEvidenceChunks({
      brainId: input.brainId,
      family: 'customer',
      orgId: input.orgId,
      ownerId: input.ownerId,
      sourceType: input.sourceType,
      sourceId: memoryId,
      sourceTitle: input.sourceTitle,
      ingestionPath: 'api',
      chunks: [input.content],
    })
    return memoryId
  }
}
