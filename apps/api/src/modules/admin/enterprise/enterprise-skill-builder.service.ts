import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissionsRepository } from '../../missions/repositories/missions.repository'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { AdminRepository } from '../repositories/admin.repository'
import { buildAdminSkillBuilderSessionKey } from './admin-skill-builder-session.util'

type ScopeRow = {
  id: string
  label: string
  kind: 'personal' | 'org'
  org_id: string | null
}

@Injectable()
export class EnterpriseSkillBuilderService {
  private readonly logger = new Logger(EnterpriseSkillBuilderService.name)

  constructor(
    private readonly repository: AdminRepository,
    private readonly missionsRepository: MissionsRepository,
    private readonly missionsAgentOperationsService: MissionsAgentOperationsService,
    private readonly missionAgentGatewayService: MissionAgentGatewayService,
    private readonly userAgentApi: UserAgentApiService,
  ) {}

  private serviceClient(): SupabaseClient {
    return this.repository.getServiceClient()
  }

  async searchUsers(query: string, limit = 50) {
    const supabase = this.serviceClient()
    const q = query.trim().toLowerCase()
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    })
    if (authError) throw new Error(`Failed to list users: ${authError.message}`)

    const users = (authData?.users ?? [])
      .filter((u) => {
        if (!q) return true
        const email = (u.email ?? '').toLowerCase()
        const id = u.id.toLowerCase()
        return email.includes(q) || id.includes(q)
      })
      .slice(0, limit)
      .map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at ?? null,
      }))

    const ids = users.map((u) => u.id)
    if (ids.length === 0) return { users: [] }

    const { data: profiles } = await this.repository
      .table(supabase, 'profiles')
      .select('id, display_name')
      .in('id', ids)

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name as string | null]))

    return {
      users: users.map((u) => ({
        ...u,
        display_name: nameById.get(u.id) ?? null,
      })),
    }
  }

  async listScopesForUser(userId: string): Promise<{ scopes: ScopeRow[] }> {
    const supabase = this.serviceClient()
    const scopes: ScopeRow[] = [
      { id: 'personal', label: 'Personal account', kind: 'personal', org_id: null },
    ]

    const { data: memberships } = await this.repository
      .table(supabase, 'org_members')
      .select('org_id, organizations(id, name, slug)')
      .eq('user_id', userId)
      .eq('status', 'active')

    for (const row of memberships ?? []) {
      const orgRaw = row.organizations as
        | { id: string; name: string | null; slug: string | null }
        | { id: string; name: string | null; slug: string | null }[]
        | null
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
      if (!org?.id) continue
      scopes.push({
        id: org.id,
        label: org.name?.trim() || org.slug?.trim() || org.id,
        kind: 'org',
        org_id: org.id,
      })
    }

    const { data: owned } = await this.repository
      .table(supabase, 'organizations')
      .select('id, name, slug')
      .eq('owner_id', userId)
      .is('deleted_at', null)

    for (const org of owned ?? []) {
      if (scopes.some((s) => s.org_id === org.id)) continue
      scopes.push({
        id: org.id,
        label: org.name?.trim() || org.slug?.trim() || org.id,
        kind: 'org',
        org_id: org.id,
      })
    }

    return { scopes }
  }

  async listAgents(userId: string, orgId: string | null) {
    const supabase = this.serviceClient()
    let q = this.repository
      .table(supabase, 'agents_registry')
      .select('agent_key, name, role, level, image_url, is_active')
      .order('name', { ascending: true })
    if (orgId) {
      q = q.eq('org_id', orgId).is('user_id', null)
    } else {
      q = q.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await q
    if (error) throw new Error(`Failed to list agents: ${error.message}`)
    return { agents: data ?? [] }
  }

  async listSkills(userId: string, orgId: string | null, agentKey: string) {
    const supabase = this.serviceClient()
    const skills = await this.missionsRepository.listAgentSkills(supabase, userId, agentKey, orgId)
    return { skills }
  }

  async upsertSkill(
    adminUserId: string,
    input: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      name: string
      description: string
      markdown_content: string
    },
  ) {
    const orgId = input.org_id ?? null
    const skill = await this.missionsAgentOperationsService.internalUpsertAgentSkill(
      input.acting_user_id,
      orgId,
      input.agent_key,
      input.skill_key,
      input.name,
      input.description,
      input.markdown_content,
    )
    await this.logAudit(adminUserId, {
      acting_user_id: input.acting_user_id,
      org_id: orgId,
      agent_key: input.agent_key,
      skill_key: input.skill_key,
      action: 'upsert_skill',
      payload_summary: { name: input.name },
    })
    return skill
  }

  async createSkill(
    adminUserId: string,
    input: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      name: string
      description: string
      markdown_content: string
      is_enabled?: boolean
    },
  ) {
    const supabase = this.serviceClient()
    const orgId = input.org_id ?? null
    const created = await this.missionsRepository.createAgentSkill(supabase, {
      user_id: input.acting_user_id,
      org_id: orgId,
      agent_key: input.agent_key,
      skill_key: input.skill_key,
      name: input.name,
      description: input.description,
      markdown_content: input.markdown_content,
      is_enabled: input.is_enabled ?? true,
    })
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(input.acting_user_id, input.agent_key, orgId)
      .catch(() => undefined)
    await this.logAudit(adminUserId, {
      acting_user_id: input.acting_user_id,
      org_id: orgId,
      agent_key: input.agent_key,
      skill_key: input.skill_key,
      action: 'create_skill',
      payload_summary: { name: input.name },
    })
    return created
  }

  async updateSkill(
    adminUserId: string,
    input: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_id: string
      updates: Partial<{
        skill_key: string
        name: string
        description: string
        markdown_content: string
        is_enabled: boolean
      }>
    },
  ) {
    const supabase = this.serviceClient()
    const orgId = input.org_id ?? null
    const updated = await this.missionsRepository.updateAgentSkill(
      supabase,
      input.acting_user_id,
      input.agent_key,
      input.skill_id,
      input.updates,
      orgId,
    )
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(input.acting_user_id, input.agent_key, orgId)
      .catch(() => undefined)
    await this.logAudit(adminUserId, {
      acting_user_id: input.acting_user_id,
      org_id: orgId,
      agent_key: input.agent_key,
      skill_key: input.updates.skill_key ?? null,
      action: 'update_skill',
      payload_summary: input.updates,
    })
    return updated
  }

  async deleteSkill(
    adminUserId: string,
    input: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_id: string
    },
  ) {
    const supabase = this.serviceClient()
    const orgId = input.org_id ?? null
    await this.missionsRepository.deleteAgentSkill(
      supabase,
      input.acting_user_id,
      input.agent_key,
      input.skill_id,
      orgId,
    )
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(input.acting_user_id, input.agent_key, orgId)
      .catch(() => undefined)
    await this.logAudit(adminUserId, {
      acting_user_id: input.acting_user_id,
      org_id: orgId,
      agent_key: input.agent_key,
      skill_key: null,
      action: 'delete_skill',
      payload_summary: { skill_id: input.skill_id },
    })
    return { ok: true }
  }

  async createSkillResource(
    adminUserId: string,
    input: {
      acting_user_id: string
      org_id?: string | null
      agent_key: string
      skill_key: string
      file_path: string
      content: string
    },
  ) {
    const supabase = this.serviceClient()
    const orgId = input.org_id ?? null
    const created = await this.missionsRepository.createAgentSkillResource(supabase, {
      user_id: input.acting_user_id,
      org_id: orgId,
      agent_key: input.agent_key,
      skill_key: input.skill_key,
      file_path: input.file_path,
      content: input.content,
    })
    await this.missionAgentGatewayService
      .triggerAgentSkillsSync(input.acting_user_id, input.agent_key, orgId)
      .catch(() => undefined)
    await this.logAudit(adminUserId, {
      acting_user_id: input.acting_user_id,
      org_id: orgId,
      agent_key: input.agent_key,
      skill_key: input.skill_key,
      action: 'create_skill_resource',
      payload_summary: { file_path: input.file_path },
    })
    return created
  }

  async createSession(
    adminUserId: string,
    input: {
      acting_user_id: string
      org_id?: string | null
      target_agent_key: string
    },
  ) {
    const supabase = this.serviceClient()
    const orgId = input.org_id ?? null
    const { agents } = await this.listAgents(input.acting_user_id, orgId)
    const target = agents.find((a) => a.agent_key === input.target_agent_key)
    if (!target) throw new BadRequestException('Target agent not found for scope')

    let actingUserEmail: string | null = null
    const { data: authUser } = await supabase.auth.admin.getUserById(input.acting_user_id)
    actingUserEmail = authUser?.user?.email ?? null

    let orgName: string | null = null
    if (orgId) {
      const { data: org } = await this.repository
        .table(supabase, 'organizations')
        .select('name, slug')
        .eq('id', orgId)
        .maybeSingle()
      orgName = org?.name?.trim() || org?.slug?.trim() || null
    }

    const { data, error } = await this.repository
      .table(supabase, 'admin_skill_builder_sessions')
      .insert({
        admin_user_id: adminUserId,
        acting_user_id: input.acting_user_id,
        org_id: orgId,
        target_agent_key: input.target_agent_key,
        target_agent_name: target.name ?? input.target_agent_key,
        acting_user_email: actingUserEmail,
        org_name: orgName,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create session: ${error.message}`)

    await this.repository.table(supabase, 'admin_skill_builder_messages').insert({
      session_id: data.id,
      role: 'system',
      content: `Skill builder session for agent "${target.name ?? input.target_agent_key}" (${input.target_agent_key}).`,
    })

    return data
  }

  async listSessions(adminUserId: string) {
    const supabase = this.serviceClient()
    const { data, error } = await this.repository
      .table(supabase, 'admin_skill_builder_sessions')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(`Failed to list sessions: ${error.message}`)
    return { sessions: data ?? [] }
  }

  async getSession(adminUserId: string, sessionId: string) {
    const supabase = this.serviceClient()
    const { data, error } = await this.repository
      .table(supabase, 'admin_skill_builder_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('admin_user_id', adminUserId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load session: ${error.message}`)
    if (!data) throw new NotFoundException('Session not found')
    return data
  }

  async listMessages(adminUserId: string, sessionId: string) {
    await this.getSession(adminUserId, sessionId)
    const supabase = this.serviceClient()
    const { data, error } = await this.repository
      .table(supabase, 'admin_skill_builder_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`Failed to list messages: ${error.message}`)
    return { messages: data ?? [] }
  }

  async streamChat(
    adminUserId: string,
    sessionId: string,
    content: string,
    send: (type: string, data: Record<string, unknown>) => Promise<void>,
    signal?: AbortSignal,
    documents?: Array<Record<string, unknown>>,
  ): Promise<void> {
    const session = await this.getSession(adminUserId, sessionId)
    const supabase = this.serviceClient()

    await this.repository.table(supabase, 'admin_skill_builder_messages').insert({
      session_id: sessionId,
      role: 'user',
      content,
      content_blocks:
        documents && documents.length > 0 ? [{ type: 'document_attachments', documents }] : null,
    })

    const { data: historyRows } = await this.repository
      .table(supabase, 'admin_skill_builder_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .neq('role', 'system')
      .order('created_at', { ascending: true })

    const history = (historyRows ?? []).map((row) => ({
      role: row.role as string,
      content: row.content as string,
    }))

    const sessionKey = buildAdminSkillBuilderSessionKey({
      userId: session.acting_user_id,
      sessionId,
      orgId: session.org_id,
      targetAgentKey: session.target_agent_key,
    })

    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) throw new Error('INTERNAL_API_TOKEN is not configured')

    const targetAgentName = session.target_agent_name ?? session.target_agent_key
    const systemContext = [
      'You are Vibey (CEO), operating in platform admin skill-builder mode.',
      `Your job: design and write agent skills for "${targetAgentName}" (agent_key: "${session.target_agent_key}").`,
      'Use the skill-creator workflow. Always pass agent_key in skill tool calls.',
      `Default agent_key for all skill actions: "${session.target_agent_key}".`,
      'The customer never sees this conversation — only the finished skills on their agent.',
      'List existing skills first, then create or update as needed. Add reference files when useful.',
    ].join('\n')

    let assistantContent = ''
    const contentBlocks: Array<Record<string, unknown>> = []

    const res = await this.userAgentApi.invoke(
      session.acting_user_id,
      '/api/internal/admin-skill-builder/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openclaw-internal': 'true',
        },
        body: JSON.stringify({
          session_id: sessionId,
          acting_user_id: session.acting_user_id,
          org_id: session.org_id,
          target_agent_key: session.target_agent_key,
          target_agent_name: targetAgentName,
          admin_user_id: adminUserId,
          content,
          documents: documents ?? [],
          history,
          session_key: sessionKey,
          system_context: systemContext,
        }),
        signal,
      },
      { timeoutMs: 600_000, logTag: `admin_skill_builder session=${sessionId}` },
    )

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      throw new Error(`Agent chat failed (${res.status}): ${text.slice(0, 300)}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>
          const type = String(parsed.type ?? '')
          if (type === 'content_delta' && typeof parsed.content === 'string') {
            assistantContent += parsed.content
          }
          if (type === 'ui_block' && parsed.block && typeof parsed.block === 'object') {
            contentBlocks.push(parsed.block as Record<string, unknown>)
          }
          await send(type, parsed)
        } catch {
          // skip malformed
        }
      }
    }

    await this.repository.table(supabase, 'admin_skill_builder_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: assistantContent,
      content_blocks: contentBlocks.length > 0 ? contentBlocks : null,
    })

    await this.repository
      .table(supabase, 'admin_skill_builder_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }

  async triggerSync(actingUserId: string, orgId: string | null, agentKey: string) {
    const ok = await this.missionAgentGatewayService.triggerAgentSkillsSync(
      actingUserId,
      agentKey,
      orgId,
    )
    return { synced: ok }
  }

  private async logAudit(
    adminUserId: string,
    input: {
      acting_user_id: string
      org_id: string | null
      agent_key: string
      skill_key: string | null
      action: string
      payload_summary: Record<string, unknown>
    },
  ) {
    const supabase = this.serviceClient()
    const { error } = await this.repository.table(supabase, 'admin_enterprise_audit_log').insert({
      admin_user_id: adminUserId,
      acting_user_id: input.acting_user_id,
      org_id: input.org_id,
      agent_key: input.agent_key,
      skill_key: input.skill_key,
      action: input.action,
      payload_summary: input.payload_summary,
    })
    if (error) this.logger.warn(`Audit log failed: ${error.message}`)
  }
}
