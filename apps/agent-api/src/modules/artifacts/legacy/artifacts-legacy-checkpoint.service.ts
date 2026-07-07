import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentCheckpointSnapshot } from '../../shared/services/request-context.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import { ArtifactLegacyRepository } from '../repositories/artifact-legacy.repository'

export class ArtifactsLegacyCheckpointService {
  constructor(
    private readonly legacyRepository: ArtifactLegacyRepository,
    private readonly serviceClient: SupabaseClient,
    private readonly requestContext: RequestContextService,
    private readonly parseConversationId: (sessionKey: string) => string | null,
  ) {}

  async captureAgentCheckpointSnapshot(
    userId: string,
    orgId: string | null,
    agentKey: string,
  ): Promise<AgentCheckpointSnapshot> {
    const [definitionsResult, skillsResult] = await Promise.all([
      this.legacyRepository.findAgentDefinitionsForCheckpoint(this.serviceClient, {
        userId,
        orgId,
        agentKey,
      }),
      this.legacyRepository.findAgentSkillsForCheckpoint(this.serviceClient, {
        userId,
        orgId,
        agentKey,
      }),
    ])
    if (definitionsResult.error) throw definitionsResult.error
    if (skillsResult.error) throw skillsResult.error
    return {
      definitions: (definitionsResult.data ?? []).map((row) => ({
        file_name: String(row.file_name),
        content: String(row.content ?? ''),
      })),
      skills: (skillsResult.data ?? []).map((row) => ({
        skill_key: String(row.skill_key),
        name: String(row.name ?? ''),
        description: String(row.description ?? ''),
        markdown_content: String(row.markdown_content ?? ''),
        is_enabled: row.is_enabled !== false,
      })),
    }
  }

  recordAgentCheckpointMutation(
    sessionKey: string | undefined,
    agentKey: string,
    summary: unknown,
    preSnapshot: AgentCheckpointSnapshot | null,
  ): void {
    if (!sessionKey) return
    const conversationId = this.parseConversationId(sessionKey)
    if (!conversationId) return
    const cleanSummary =
      typeof summary === 'string' && summary.trim().length > 0
        ? summary.trim().slice(0, 120)
        : 'Updated agent identity'
    this.requestContext.recordAgentCheckpointMutation(
      conversationId,
      agentKey,
      cleanSummary,
      preSnapshot,
    )
  }
}
