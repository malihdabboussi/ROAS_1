import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildFlowsConceptSpaceSchema,
  FLOWS_CONCEPT_SPACE_TITLE,
  isFlowsConceptSpaceSchema,
} from '../constants/flows-concept-space.constants'
import { SpaceAutomationReadRepository } from '../repositories/space-automation-read.repository'
import { SpaceFlowDefinitionsRepository } from '../repositories/space-flow-definitions.repository'
import { SpacesRepository } from '../repositories/spaces.repository'

type JsonRecord = Record<string, unknown>
type FlowInstallationRecord = JsonRecord & {
  flow_definitions?: JsonRecord | null
  space_automations?: JsonRecord | null
  spaces?: JsonRecord | null
}

@Injectable()
export class OrgAutomationFlowsService {
  constructor(
    private readonly readRepo: SpaceAutomationReadRepository,
    private readonly definitionsRepo: SpaceFlowDefinitionsRepository,
    private readonly spacesRepo: SpacesRepository,
  ) {}

  async ensureConceptSpace(
    supabase: SupabaseClient,
    orgId: string,
    userId: string,
  ): Promise<{ space_id: string; title: string; created: boolean }> {
    const existing = await this.findConceptSpace(supabase, orgId)
    if (existing) {
      return { space_id: String(existing.id), title: String(existing.title ?? FLOWS_CONCEPT_SPACE_TITLE), created: false }
    }

    const created = await this.spacesRepo.createSpace(
      supabase,
      userId,
      {
        title: FLOWS_CONCEPT_SPACE_TITLE,
        description: 'Sandbox Space for building and testing flows before assigning them elsewhere.',
        visibility: 'team',
        schema: buildFlowsConceptSpaceSchema(),
      },
      orgId,
    )

    return {
      space_id: String(created.id),
      title: String(created.title ?? FLOWS_CONCEPT_SPACE_TITLE),
      created: true,
    }
  }

  private async findConceptSpace(supabase: SupabaseClient, orgId: string) {
    const { data, error } = await supabase
      .from('spaces')
      .select('id, title, schema')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })

    if (error) throw new BadRequestException(error.message)

    const rows = data ?? []
    return (
      rows.find((row) => isFlowsConceptSpaceSchema(row.schema)) ??
      rows.find((row) => String(row.title ?? '') === FLOWS_CONCEPT_SPACE_TITLE) ??
      null
    )
  }

  async listOrgFlows(
    supabase: SupabaseClient,
    orgId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ) {
    const rows = (await this.definitionsRepo.listInstallationsForOrg(
      supabase,
      orgId,
      filters,
    )) as FlowInstallationRecord[]
    const campaignIds = [
      ...new Set(
        rows
          .map((row) => {
            const space = row.spaces as JsonRecord | null
            return typeof space?.campaign_id === 'string' ? space.campaign_id : null
          })
          .filter((id): id is string => !!id),
      ),
    ]

    const campaignNames = await this.loadCampaignNames(supabase, campaignIds)

    return this.groupDefinitionCards(rows, campaignNames)
  }

  async listPersonalFlows(
    supabase: SupabaseClient,
    userId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ) {
    const rows = (await this.definitionsRepo.listInstallationsForPersonalUser(
      supabase,
      userId,
      filters,
    )) as FlowInstallationRecord[]
    const campaignIds = [
      ...new Set(
        rows
          .map((row) => {
            const space = row.spaces as JsonRecord | null
            return typeof space?.campaign_id === 'string' ? space.campaign_id : null
          })
          .filter((id): id is string => !!id),
      ),
    ]

    const campaignNames = await this.loadCampaignNames(supabase, campaignIds)

    return this.groupDefinitionCards(rows, campaignNames)
  }

  async listOrgRuns(
    supabase: SupabaseClient,
    orgId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ) {
    const rows = await this.readRepo.listRunsForOrg(supabase, orgId, filters)
    return rows.map((row) => {
      const { spaces: _spaces, ...run } = row as JsonRecord & { spaces?: JsonRecord }
      return run
    })
  }

  async listPersonalRuns(
    supabase: SupabaseClient,
    userId: string,
    filters: { campaignId?: string | null; spaceId?: string | null },
  ) {
    const rows = await this.readRepo.listRunsForPersonalUser(supabase, userId, filters)
    return rows.map((row) => {
      const { spaces: _spaces, ...run } = row as JsonRecord & { spaces?: JsonRecord }
      return run
    })
  }

  private async loadCampaignNames(supabase: SupabaseClient, campaignIds: string[]) {
    if (campaignIds.length === 0) return new Map<string, string>()
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name')
      .in('id', campaignIds)
    if (error) throw new BadRequestException(error.message)
    return new Map(
      (data ?? []).map((row) => [String(row.id), String(row.name ?? 'Untitled campaign')]),
    )
  }

  private groupDefinitionCards(rows: FlowInstallationRecord[], campaignNames: Map<string, string>) {
    const groups = new Map<
      string,
      {
        definition: JsonRecord
        installations: JsonRecord[]
      }
    >()

    for (const row of rows) {
      const definition = (row.flow_definitions ?? {}) as JsonRecord
      const definitionId =
        this.stringValue(definition.id) ?? this.stringValue(row.flow_definition_id)
      if (!definitionId) continue
      const installation = this.mapInstallation(row, definition, campaignNames)
      const group = groups.get(definitionId) ?? { definition, installations: [] }
      group.installations.push(installation)
      groups.set(definitionId, group)
    }

    return Array.from(groups.values()).map(({ definition, installations }) => {
      const primary = installations[0] ?? {}
      const definitionId = this.stringValue(definition.id)
      const scopedSpace = this.singleSharedString(installations, 'space_id')
      const scopedCampaign = this.singleSharedString(installations, 'campaign_id')
      const healthyCount = installations.filter((row) => row.validation_status === 'healthy').length
      const needsSetupCount = installations.filter((row) =>
        ['invalid', 'needs_setup'].includes(String(row.validation_status ?? '')),
      ).length
      const unknownCount = installations.filter((row) => row.validation_status === 'unknown').length

      return {
        ...primary,
        id: this.stringValue(primary.automation_id) ?? this.stringValue(primary.id),
        flow_definition_id: definitionId,
        name:
          this.stringValue(definition.name) ?? this.stringValue(primary.name) ?? 'Untitled flow',
        description:
          this.stringValue(definition.description) ?? this.stringValue(primary.description) ?? null,
        trigger:
          (primary.trigger &&
          typeof (primary.trigger as JsonRecord).type === 'string' &&
          (primary.trigger as JsonRecord).type !== 'choose_action'
            ? primary.trigger
            : null) ??
          (definition.trigger as JsonRecord | undefined) ??
          primary.trigger ??
          {},
        actions: (() => {
          const fromAutomation = Array.isArray(primary.actions) ? primary.actions : []
          if (fromAutomation.length > 0) return fromAutomation
          return Array.isArray(definition.actions) ? definition.actions : []
        })(),
        enabled: installations.some((row) => row.enabled === true),
        is_draft:
          definition.status === 'draft' || installations.every((row) => row.is_draft === true),
        space_id: scopedSpace,
        space_title: scopedSpace ? this.stringValue(primary.space_title) : null,
        campaign_id: scopedCampaign,
        campaign_name: scopedCampaign ? this.stringValue(primary.campaign_name) : null,
        installation_count: installations.length,
        healthy_installation_count: healthyCount,
        needs_setup_installation_count: needsSetupCount,
        unknown_installation_count: unknownCount,
        installations,
      }
    })
  }

  private mapInstallation(
    row: FlowInstallationRecord,
    definition: JsonRecord,
    campaignNames: Map<string, string>,
  ) {
    const automation = (row.space_automations ?? {}) as JsonRecord
    const space = (row.spaces ?? {}) as JsonRecord
    const campaignId = this.stringValue(space.campaign_id)
    const automationId = this.stringValue(row.automation_id) ?? this.stringValue(automation.id)

    return {
      ...automation,
      id: automationId ?? this.stringValue(row.id),
      automation_id: automationId,
      flow_definition_id: this.stringValue(definition.id),
      flow_installation_id: this.stringValue(row.id),
      flow_version_id: this.stringValue(row.version_id),
      name:
        this.stringValue(automation.name) ?? this.stringValue(definition.name) ?? 'Untitled flow',
      description:
        this.stringValue(automation.description) ??
        this.stringValue(definition.description) ??
        null,
      enabled: typeof automation.enabled === 'boolean' ? automation.enabled : row.enabled === true,
      is_draft:
        typeof automation.is_draft === 'boolean'
          ? automation.is_draft
          : definition.status === 'draft',
      trigger: (automation.trigger as JsonRecord | undefined) ?? definition.trigger ?? {},
      actions: Array.isArray(automation.actions) ? automation.actions : (definition.actions ?? []),
      space_id: this.stringValue(space.id) ?? this.stringValue(row.space_id),
      space_title: this.stringValue(space.title) ?? 'Untitled space',
      campaign_id: campaignId,
      campaign_name: campaignId ? (campaignNames.get(campaignId) ?? null) : null,
      validation_status: this.stringValue(row.validation_status) ?? 'unknown',
      validation_errors: Array.isArray(row.validation_errors) ? row.validation_errors : [],
      created_at: this.stringValue(automation.created_at) ?? this.stringValue(row.created_at),
      updated_at: this.stringValue(automation.updated_at) ?? this.stringValue(row.updated_at),
    }
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  private singleSharedString(rows: JsonRecord[], key: string): string | null {
    const values = new Set(
      rows.map((row) => this.stringValue(row[key])).filter((value): value is string => !!value),
    )
    return values.size === 1 ? [...values][0] : null
  }
}
