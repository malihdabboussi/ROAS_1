import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ACTIONS,
  ensurePlatformToolsRuntimeGuidance,
  PLATFORM_TOOLS_DEFAULT_MD,
} from '@vibey/agent-policy'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentSyncRepository } from '../repositories/agent-sync.repository'
import type {
  AgentInstructionAuditFinding,
  AgentInstructionAuditInput,
} from './agent-instruction-audit.service'
import {
  AgentInstructionAuditService,
  evaluateInstructionContent,
  evaluateToolsContent,
} from './agent-instruction-audit.service'
import { generateScopedVibeyApiSkill } from './vibey-api-skill-generator'

type RepairableSkillRow = {
  id: string
  agent_key: string
  user_id: string | null
  org_id: string | null
  source: string | null
  is_enabled: boolean
}

type RepairableDefinitionRow = {
  id: string
  agent_key: string
  file_name: string
  user_id: string | null
  org_id: string | null
  source: string | null
  content: string | null
}

export type AgentInstructionRepairResult = {
  repaired: Array<{
    id: string
    agentKey: string
    userId: string | null
    orgId: string | null
    before: AgentInstructionAuditFinding
    after: AgentInstructionAuditFinding
  }>
  skipped: Array<{
    id: string
    agentKey: string
    userId: string | null
    orgId: string | null
    reason: string
  }>
}

@Injectable()
export class AgentInstructionRepairService {
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly auditService: AgentInstructionAuditService,
    private readonly repository: AgentSyncRepository = new AgentSyncRepository(),
  ) {
    this.supabase = svc.client
  }

  private buildCanonicalVibeyApiSkill(): string {
    return generateScopedVibeyApiSkill(new Set(ACTIONS), 'management').skillMd
  }

  async repairPlatformVibeyApiSkills(
    input: AgentInstructionAuditInput = {},
  ): Promise<AgentInstructionRepairResult> {
    const rows = (await this.repository.listRepairableVibeyApiSkillRows(
      this.supabase,
      input,
    )) as RepairableSkillRow[]
    const dbFindings = await this.auditService.auditDbVibeyApiSkills(input)
    const findingByAgent = new Map(
      dbFindings.map((finding) => [
        `${finding.agentKey}:${finding.userId ?? ''}:${finding.orgId ?? ''}`,
        finding,
      ]),
    )
    const canonicalSkill = this.buildCanonicalVibeyApiSkill()
    const repaired: AgentInstructionRepairResult['repaired'] = []
    const skipped: AgentInstructionRepairResult['skipped'] = []

    for (const row of rows) {
      const key = `${row.agent_key}:${row.user_id ?? ''}:${row.org_id ?? ''}`
      const before =
        findingByAgent.get(key) ??
        evaluateInstructionContent({
          content: '',
          agentKey: row.agent_key,
          userId: row.user_id,
          orgId: row.org_id,
          sourceKind: 'db_agent_skill',
        })

      if (before.status === 'ok') {
        skipped.push({
          id: row.id,
          agentKey: row.agent_key,
          userId: row.user_id,
          orgId: row.org_id,
          reason: 'already_ok',
        })
        continue
      }

      const isPlatformOwned =
        row.source === 'system' && row.user_id === null && row.org_id === null && row.is_enabled
      if (!isPlatformOwned) {
        skipped.push({
          id: row.id,
          agentKey: row.agent_key,
          userId: row.user_id,
          orgId: row.org_id,
          reason: 'not_platform_owned_system_row',
        })
        continue
      }

      await this.repository.updatePlatformVibeyApiSkill(this.supabase, row.id, {
        markdown_content: canonicalSkill,
        description:
          'Generated Vibey backend action contracts, platform protocols, and action reference index.',
        updated_at: new Date().toISOString(),
      })

      repaired.push({
        id: row.id,
        agentKey: row.agent_key,
        userId: row.user_id,
        orgId: row.org_id,
        before,
        after: evaluateInstructionContent({
          content: canonicalSkill,
          agentKey: row.agent_key,
          userId: row.user_id,
          orgId: row.org_id,
          sourceKind: 'db_agent_skill',
        }),
      })
    }

    return { repaired, skipped }
  }

  async repairPlatformToolsDefinitions(
    input: AgentInstructionAuditInput = {},
  ): Promise<AgentInstructionRepairResult> {
    const rows = (await this.repository.listRepairableToolsDefinitionRows(
      this.supabase,
      input,
    )) as RepairableDefinitionRow[]
    const repaired: AgentInstructionRepairResult['repaired'] = []
    const skipped: AgentInstructionRepairResult['skipped'] = []

    for (const row of rows) {
      const before = evaluateToolsContent({
        content: row.content,
        agentKey: row.agent_key,
        userId: row.user_id,
        orgId: row.org_id,
        source: row.source,
        sourceKind: 'db_agent_tools',
      })

      if (before.status === 'ok') {
        skipped.push({
          id: row.id,
          agentKey: row.agent_key,
          userId: row.user_id,
          orgId: row.org_id,
          reason: 'already_ok',
        })
        continue
      }

      if (before.autoRepairAllowed !== true) {
        skipped.push({
          id: row.id,
          agentKey: row.agent_key,
          userId: row.user_id,
          orgId: row.org_id,
          reason: before.repairPolicyReason ?? 'auto_repair_not_allowed',
        })
        continue
      }

      const nextContent = row.content?.trim()
        ? ensurePlatformToolsRuntimeGuidance(row.content)
        : PLATFORM_TOOLS_DEFAULT_MD

      await this.repository.updateToolsDefinition(
        this.supabase,
        { id: row.id, source: row.source },
        {
          content: nextContent,
          updated_at: new Date().toISOString(),
        },
      )

      repaired.push({
        id: row.id,
        agentKey: row.agent_key,
        userId: row.user_id,
        orgId: row.org_id,
        before,
        after: evaluateToolsContent({
          content: nextContent,
          agentKey: row.agent_key,
          userId: row.user_id,
          orgId: row.org_id,
          source: row.source,
          sourceKind: 'db_agent_tools',
        }),
      })
    }

    return { repaired, skipped }
  }
}
