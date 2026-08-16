import { BadRequestException, Injectable } from '@nestjs/common'
import {
  PageGraderBrainSyncService,
  type MappedClientRow,
} from '../../integrations/page-grader/services/page-grader-brain-sync.service'
import {
  WorkRequestRepository,
  type WorkRequestDraftRow,
} from '../repositories/work-request.repository'
import {
  asRecord,
  schemaData,
  stringValue,
  type WorkRequestScopeOption,
  type WorkRequestSpaceOption,
} from './work-request-review-security'

@Injectable()
export class WorkRequestScopeService {
  constructor(
    private readonly repository: WorkRequestRepository,
    private readonly pageGraderSync: PageGraderBrainSyncService,
  ) {}

  async resolveSignedMapping(
    signature: string,
    clientId: string,
    clientName?: string,
  ): Promise<MappedClientRow> {
    const mappings = await this.pageGraderSync.authorizeWebhookClient(
      signature,
      clientId,
      clientName,
    )
    const mapped = mappings.filter((row) => row.entry.campaign_id)
    if (mapped.length !== 1) {
      throw new BadRequestException('Page Grader client must have one canonical ROAS mapping')
    }
    return mapped[0] as MappedClientRow
  }

  async resolveIntakeScope(
    signature: string,
    clientId: string,
    clientName?: string,
    externalCampaignId?: string,
  ) {
    const mapping = await this.resolveSignedMapping(signature, clientId, clientName)
    const [campaigns, spaces] = await Promise.all([
      this.repository.listCampaignOptions([mapping.entry.campaign_id]),
      this.repository.listSpaceOptions([mapping.entry.campaign_id]),
    ])
    const campaign = campaigns.find((row) => String(row.id) === mapping.entry.campaign_id)
    if (!campaign) throw new BadRequestException('Canonical ROAS client workspace was not found')
    const ownerOrgId = stringValue(campaign.org_id) || null
    const generalSpace =
      spaces.find(
        (space) =>
          String(space.id) === String(mapping.entry.space_id ?? '') &&
          this.isScopedRow(space, mapping.userId, ownerOrgId) &&
          schemaData(space).space_role === 'general' &&
          schemaData(space).page_grader_client_id === clientId,
      ) ?? null
    const campaignSpace = externalCampaignId
      ? (spaces.find(
          (space) =>
            this.isScopedRow(space, mapping.userId, ownerOrgId) &&
            schemaData(space).space_role === 'client_campaign' &&
            schemaData(space).page_grader_campaign_id === externalCampaignId,
        ) ?? null)
      : null
    return { mapping, ownerOrgId, generalSpace, campaignSpace }
  }

  async loadScopedOptions(draft: WorkRequestDraftRow) {
    const connectionRows = await this.repository.listConnectionScopeRows(draft.owner_user_id)
    const connectionOrgId = stringValue(asRecord(draft.routing).connection_org_id) || null
    const matchingRows = connectionRows.filter((row) => (row.org_id ?? null) === connectionOrgId)
    const mapped = new Map<
      string,
      { externalClientId: string; name: string; generalSpaceId: string | null }
    >()
    for (const row of matchingRows) {
      const scopeMap = asRecord(asRecord(row.metadata).client_scope_map)
      for (const [externalClientId, raw] of Object.entries(scopeMap)) {
        const entry = asRecord(raw)
        const campaignId = stringValue(entry.campaign_id)
        if (!campaignId) continue
        mapped.set(campaignId, {
          externalClientId,
          name: stringValue(entry.campaign_name) || 'Client workspace',
          generalSpaceId: stringValue(entry.space_id) || null,
        })
      }
    }
    const campaignIds = [...mapped.keys()]
    const [campaignRows, spaceRows] = await Promise.all([
      this.repository.listCampaignOptions(campaignIds),
      this.repository.listSpaceOptions(campaignIds),
    ])
    const clients: WorkRequestScopeOption[] = campaignRows.flatMap((row) => {
      const id = String(row.id)
      const mapping = mapped.get(id)
      if (!mapping || !this.isScopedRow(row, draft.owner_user_id, draft.owner_org_id)) return []
      return [
        {
          id,
          name: String(row.name || mapping.name),
          externalClientId: mapping.externalClientId,
          generalSpaceId: mapping.generalSpaceId,
        },
      ]
    })
    const clientIds = new Set(clients.map((option) => option.id))
    const spaces: WorkRequestSpaceOption[] = spaceRows.flatMap((row) => {
      const campaignId = String(row.campaign_id)
      const schema = schemaData(row)
      if (
        !clientIds.has(campaignId) ||
        !this.isScopedRow(row, draft.owner_user_id, draft.owner_org_id) ||
        schema.space_role !== 'client_campaign' ||
        !schema.page_grader_campaign_id
      ) {
        return []
      }
      return [
        {
          id: String(row.id),
          name: String(row.title),
          clientWorkspaceId: campaignId,
          externalCampaignId: schema.page_grader_campaign_id,
        },
      ]
    })
    return { clients, spaces }
  }

  isScopedRow(row: Record<string, unknown>, ownerUserId: string, ownerOrgId: string | null) {
    return ownerOrgId
      ? String(row.org_id ?? '') === ownerOrgId
      : String(row.user_id ?? '') === ownerUserId && row.org_id == null
  }
}
