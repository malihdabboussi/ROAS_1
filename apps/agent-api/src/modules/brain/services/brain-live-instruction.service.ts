import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { BrainLiveRepository } from '../repositories/brain-live.repository'
import type { LiveSession, LiveSessionScope } from './brain-live.types'
import { MemoriesService } from './memories.service'

export class BrainLiveInstructionService {
  private readonly agentPersonaCache = new Map<string, string>()
  private atlasPersonaCache: string | null = null

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseClient,
    private readonly memoriesService: MemoriesService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly liveRepository: BrainLiveRepository,
    private readonly logger: Logger,
  ) {}

  async buildAtlasSystemInstruction(scope: LiveSessionScope, userId: string): Promise<string> {
    const parts: string[] = []

    const persona = this.loadAtlasPersona()
    if (persona) parts.push(persona)

    let scopeContext: string
    if (scope.type === 'company') {
      const name = scope.label ?? 'Company Cortex'
      scopeContext = `You are managing "${name}" — the organization's shared operating intelligence (beliefs, standards, protocols, tensions, moves, anti-patterns, and decisions). All saves and searches target this Company Cortex. Focus on how the organization operates, not personal user preferences.`
    } else if (scope.type === 'customer' && scope.label) {
      scopeContext = `You are managing "${scope.label}" — customer intelligence built from real interactions. All saves and searches target this customer brain. Focus on what real customers say, need, and object to.`
    } else if (scope.type === 'agent' && scope.label) {
      scopeContext = `You are currently managing the brain of agent "${scope.label}". All saves and searches target this agent's knowledge base.`
    } else {
      scopeContext = `You are managing the user's personal brain. All saves and searches target their personal knowledge base.`
    }
    parts.push(`\n## CURRENT SESSION CONTEXT\n${scopeContext}`)

    parts.push(this.buildVoiceModeRules())

    const brainContext = await this.buildBrainContext(userId, scope)
    if (brainContext) parts.push(brainContext)

    return parts.join('\n\n')
  }

  async buildSystemInstruction(session: LiveSession): Promise<string> {
    const { scope, userId } = session
    if (scope.type === 'agent' && scope.agentId) {
      const gatewayAgentId = this.agentRuntime.resolveGatewayAgentId(
        scope.agentId,
        session.orgId,
        userId,
      )
      await this.runtimeReadiness.ensureRuntimeReady({
        userId,
        orgId: session.orgId,
        agentKey: scope.agentId,
        gatewayAgentId,
      })
      return this.buildAgentSystemInstruction(session)
    }
    const atlasGatewayAgentId = this.agentRuntime.resolveGatewayAgentId(
      'atlas',
      session.orgId,
      userId,
    )
    await this.runtimeReadiness.ensureRuntimeReady({
      userId,
      orgId: session.orgId,
      agentKey: 'atlas',
      gatewayAgentId: atlasGatewayAgentId,
    })
    return this.buildAtlasSystemInstruction(scope, userId)
  }

  resolveAgentWorkspaceDir(
    agentKey: string,
    orgId?: string | null,
    userId?: string | null,
  ): string | null {
    const agentsDir = this.config.get<string>('AGENTS_BASE_DIR')
    const searchPaths = [
      agentsDir && orgId ? join(agentsDir, 'orgs', orgId, agentKey) : null,
      agentsDir && !orgId && process.env.AGENT_RUNTIME_MODE === 'shared' && userId
        ? join(agentsDir, 'users', userId, agentKey)
        : null,
      agentsDir ? join(agentsDir, agentKey) : null,
      join(process.cwd(), 'docker', 'agents', agentKey),
      `/app/agents/${agentKey}`,
    ].filter(Boolean) as string[]

    for (const p of searchPaths) {
      if (existsSync(join(p, 'IDENTITY.md')) || existsSync(join(p, 'ROLE.md'))) {
        return p
      }
    }
    return null
  }

  async buildBrainContext(userId: string, scope: LiveSessionScope): Promise<string | null> {
    try {
      const brainId = await this.resolveScopeBrainId(scope, userId)
      if (!brainId) return null

      const [recentMemories, memCount, snapCount, companyLines] = await Promise.all([
        this.memoriesService.listMemories(this.supabase, userId, { limit: 10 }, brainId),
        this.liveRepository.countMemoryRowsByType(this.supabase, brainId).then((r) => r.count),
        this.liveRepository.countSnapshots(this.supabase, brainId),
        scope.type === 'company' ? this.buildCompanyCortexContext(brainId) : Promise.resolve([]),
      ])

      const label =
        scope.label ??
        (scope.type === 'user'
          ? 'Personal Brain'
          : scope.type === 'company'
            ? 'Company Cortex'
            : 'this brain')
      const parts: string[] = [`## BRAIN CONTEXT — "${label}" (current state)`]
      parts.push(`Brain stats: ${memCount} memories, ${snapCount} snapshots.`)

      if (companyLines.length > 0) {
        parts.push(...companyLines)
      }

      if (recentMemories?.length) {
        parts.push('Recent memories:')
        for (const m of recentMemories.slice(0, 8)) {
          const mem = m as Record<string, unknown>
          parts.push(`- [${mem.memory_type}] ${String(mem.content ?? '').slice(0, 120)}`)
        }
      }

      return parts.length > 1 ? parts.join('\n') : null
    } catch (err) {
      this.logger.warn(
        `brain_context_build_failed userId=${userId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  private async resolveScopeBrainId(scope: LiveSessionScope, userId: string): Promise<string> {
    if (scope.brainId) return scope.brainId

    if (scope.type === 'agent' && scope.agentId) {
      const brainId = await this.liveRepository.findAgentBrainId(this.supabase, {
        userId,
        agentId: scope.agentId,
      })
      if (brainId) return brainId
      this.logger.warn(
        `resolve_scope_brain_miss scope=agent agentId=${scope.agentId} userId=${userId} — no agent brain row found, falling back to default`,
      )
    }

    return this.liveRepository.findDefaultUserBrainId(this.supabase, userId)
  }

  private async buildAgentSystemInstruction(session: LiveSession): Promise<string> {
    const { scope, userId } = session
    const agentKey = scope.agentId!
    const parts: string[] = []

    const readFile = (name: string) => {
      const baseDir = this.resolveAgentWorkspaceDir(agentKey, session.orgId, userId)
      if (!baseDir) return ''
      const fp = join(baseDir, name)
      return existsSync(fp) ? readFileSync(fp, 'utf-8').trim() : ''
    }

    const identity = readFile('IDENTITY.md')
    if (identity) parts.push(identity)

    const channelGuidance = this.loadChannelInstructions('voice')
    if (channelGuidance) parts.push(channelGuidance)

    parts.push(
      [
        '<voice_delegation why="You are Vibey\'s voice. The user is in a live audio conversation with you — they hear your voice, not text. A separate Vibey backend handles the heavy lifting (creating assets, running tools, researching). Your job is to be the strategist they are talking to: delegate work, keep them informed, present results.">',
        '',
        'When the user asks you to build, create, update, or do anything that requires backend work:',
        '1. Call `delegate_work` with a detailed task description — include context from the conversation so the backend has everything it needs.',
        '2. Briefly acknowledge: "On it" / "Let me handle that" / "Working on your funnel now." One sentence, then move on.',
        '',
        '</voice_delegation>',
        '',
        '<progress_narration why="The user cannot see backend work happening. You are their only signal that something is running. When you go silent, they assume the system froze. Every 10 seconds the system sends you a progress snapshot — use it to keep the user in the loop, the way a human colleague would if they were working on something in front of you.">',
        '',
        'You will receive text messages tagged [SYSTEM: Progress update] while the backend works. Each contains what steps completed and what is currently running.',
        '',
        'When you receive one: translate it into natural speech. Not a robotic readout — speak like a strategist giving a quick status.',
        '',
        'Example progress update → your response:',
        '  Update: "2 steps done (Fetching campaigns, Creating avatar). Currently: Generating image."',
        '  You say: "Got your campaigns loaded and the avatar is set up. Generating the hero image now — almost there."',
        '',
        "When you receive [SYSTEM: Task completed]: summarize the result in terms of what it means for the user's campaign, then ask what they want next.",
        '',
        'Example completion → your response:',
        '  Update: "Task completed. Tools: create_avatar, generate_image. Result: Avatar created for founder-coach persona."',
        '  You say: "Your founder-coach avatar is ready — you can see it in the preview panel. Want to build the opt-in funnel next, or tweak the avatar first?"',
        '',
        '</progress_narration>',
        '',
        '<grounding why="The user trusts what you say. If you tell them the avatar is done but the backend is still generating, they will look at the preview panel and see nothing — trust breaks instantly. Only confirm what the system updates confirm.">',
        '',
        'State what you know from system updates and tool responses. If you have not received an update yet, say "still working on it" rather than guessing. Present results, not process — the user does not need to know how many API calls ran, they need to know their funnel page is live.',
        '',
        '</grounding>',
        '',
        '<conversation why="Voice is intimate. Long silences feel broken. Short, confident updates feel premium. The goal is a conversation that flows like talking to a sharp colleague, not waiting on hold.">',
        '',
        'After completing a task, ask what the user wants next. For simple questions, greetings, or chat — respond directly without tools. Keep it concise: 1-3 sentences per turn unless they ask for detail.',
        '',
        '</conversation>',
      ].join('\n'),
    )

    const commStyle = await this.loadAgentCommunicationStyle(agentKey, userId, session.orgId)
    if (commStyle) {
      parts.push(`<communication_style>\n${commStyle}\n</communication_style>`)
    }

    const userProfile = await this.buildUserProfileSummary(userId, session.orgId).catch(() => '')
    if (userProfile) parts.push(userProfile)

    if (session.conversationId) {
      const history = await this.buildConversationHistoryContext(session.conversationId)
      if (history) parts.push(history)
    }

    return parts.join('\n\n')
  }

  private async loadAgentCommunicationStyle(
    agentKey: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const config = await this.liveRepository.findAgentConfig(this.supabase, {
      agentKey,
      userId,
      orgId,
    })
    const style = config?.communication_style
    return typeof style === 'string' && style.trim() ? style.trim() : null
  }

  private loadChannelInstructions(channel: string): string {
    const cacheKey = `channel:${channel}`
    const cached = this.agentPersonaCache.get(cacheKey)
    if (cached) return cached

    const filename = `${channel.toUpperCase()}.md`
    const agentsDir = this.config.get<string>('AGENTS_BASE_DIR')
    const candidates = [
      agentsDir ? join(agentsDir, 'vibey', 'channels', filename) : null,
      join(process.cwd(), 'docker', 'agents', 'vibey', 'channels', filename),
    ].filter(Boolean) as string[]

    for (const fp of candidates) {
      if (existsSync(fp)) {
        const content = readFileSync(fp, 'utf-8').trim()
        if (content) {
          this.agentPersonaCache.set(cacheKey, content)
          return content
        }
      }
    }
    return `CHANNEL=${channel}`
  }

  private async buildUserProfileSummary(userId: string, orgId?: string | null): Promise<string> {
    const lines: string[] = []

    if (orgId) {
      const org = await this.liveRepository.findActiveOrganizationProfile(this.supabase, orgId)
      if (org) {
        lines.push('ORG_PROFILE:')
        if (org.name) lines.push(`- Organization: ${org.name}`)
        if (org.slug) lines.push(`- Slug: ${org.slug}`)
        if (org.account_type) lines.push(`- Account Type: ${org.account_type}`)
      }
    }

    const { data, error } = await this.liveRepository.findUserProfile(this.supabase, userId)
    if (!error && data) {
      lines.push(orgId ? 'CURRENT_USER:' : 'USER_PROFILE:')
      if (data.full_name) lines.push(`- Name: ${data.full_name}`)
      if (data.email) lines.push(`- Email: ${data.email}`)
      if (!orgId) {
        if (data.company_name) lines.push(`- Company: ${data.company_name}`)
        if (data.industry) lines.push(`- Industry: ${data.industry}`)
        if (data.website) lines.push(`- Website: ${data.website}`)
        if (data.plan) lines.push(`- Plan: ${data.plan}`)
        const onboarding = data.onboarding_data as Record<string, unknown> | null
        if (onboarding && Object.keys(onboarding).length > 0) {
          lines.push('- Onboarding:')
          for (const [key, value] of Object.entries(onboarding)) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            const display =
              typeof value === 'string'
                ? value
                : Array.isArray(value)
                  ? value.join(', ')
                  : JSON.stringify(value)
            lines.push(`  - ${label}: ${display}`)
          }
        }
        const prefs = data.preferences as Record<string, unknown> | null
        if (prefs && Object.keys(prefs).length > 0) {
          lines.push('- Preferences:')
          for (const [key, value] of Object.entries(prefs)) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            const display =
              typeof value === 'string'
                ? value
                : Array.isArray(value)
                  ? value.join(', ')
                  : JSON.stringify(value)
            lines.push(`  - ${label}: ${display}`)
          }
        }
      }
    }

    return lines.length > 0 ? lines.join('\n') : ''
  }

  private async buildConversationHistoryContext(conversationId: string): Promise<string> {
    try {
      const { data: dbMessages, error } = await this.liveRepository.listConversationHistoryMessages(
        this.supabase,
        conversationId,
      )
      if (error || !dbMessages?.length) return ''

      const MAX_HISTORY_CHARS = 20_000
      const MAX_ASSISTANT_PREVIEW = 300
      const lines: string[] = [
        '[CONVERSATION_HISTORY]',
        'The following is a summary of earlier conversation turns. Use this to maintain continuity with the ongoing conversation.',
        '',
      ]
      let totalChars = lines.join('\n').length

      const conversationMsgs = dbMessages.filter(
        (m: Record<string, unknown>) => m.role === 'user' || m.role === 'assistant',
      )
      const entries: string[] = []

      for (const msg of conversationMsgs) {
        const role = String((msg as Record<string, unknown>).role ?? '')
        const content = String((msg as Record<string, unknown>).content ?? '')
        const roleLabel = role === 'user' ? 'User' : 'Assistant'
        let entry: string

        if (role === 'user') {
          entry = `**${roleLabel}:** ${content}`
        } else {
          const preview =
            content.length > MAX_ASSISTANT_PREVIEW
              ? content.slice(0, MAX_ASSISTANT_PREVIEW) + '...'
              : content
          const meta = (msg as Record<string, unknown>).metadata as Record<string, unknown> | null
          const toolSteps = Array.isArray(meta?.tool_steps)
            ? (meta.tool_steps as Array<{ label?: string; name?: string; status?: string }>)
            : []
          const toolLabels = toolSteps
            .filter((s) => s.status === 'completed' && s.label)
            .map((s) => s.label)
            .slice(0, 5)
          const toolLine = toolLabels.length > 0 ? `\n  Tools used: ${toolLabels.join('; ')}` : ''
          entry = `**${roleLabel}:** ${preview}${toolLine}`
        }

        if (totalChars + entry.length + 1 > MAX_HISTORY_CHARS) break
        entries.push(entry)
        totalChars += entry.length + 1
      }

      if (entries.length === 0) return ''
      return lines.join('\n') + entries.join('\n\n')
    } catch (err) {
      this.logger.warn(
        `conversation_history_build_failed conv=${conversationId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      return ''
    }
  }

  private loadAtlasPersona(): string | null {
    if (this.atlasPersonaCache) return this.atlasPersonaCache

    const agentsDir = this.config.get<string>('AGENTS_BASE_DIR')
    const searchPaths = [
      agentsDir ? join(agentsDir, 'atlas') : null,
      join(process.cwd(), 'docker', 'agents', 'atlas'),
      '/app/agents/atlas',
    ].filter(Boolean) as string[]

    let baseDir: string | null = null
    for (const p of searchPaths) {
      if (existsSync(join(p, 'IDENTITY.md'))) {
        baseDir = p
        break
      }
    }
    if (!baseDir) {
      this.logger.warn('atlas_workspace_not_found — falling back to inline prompt')
      return null
    }

    const readFile = (name: string) => {
      const fp = join(baseDir!, name)
      return existsSync(fp) ? readFileSync(fp, 'utf-8').trim() : ''
    }

    const sections = [
      readFile('AGENTS.md'),
      readFile('SOUL.md'),
      readFile('IDENTITY.md'),
      readFile('ROLE.md'),
      readFile('TOOLS.md'),
      readFile('skills/brain-operations/SKILL.md'),
      readFile('skills/brain-operations/references/brain-layers-and-tools.md'),
      readFile('skills/knowledge-extraction/SKILL.md'),
      readFile('skills/knowledge-intake/SKILL.md'),
      readFile('skills/knowledge-curation/SKILL.md'),
    ].filter(Boolean)

    this.atlasPersonaCache = sections.join('\n\n---\n\n')
    this.logger.log(
      `atlas_persona_loaded sections=${sections.length} chars=${this.atlasPersonaCache.length}`,
    )
    return this.atlasPersonaCache
  }

  private buildVoiceModeRules(): string {
    return [
      `## VOICE MODE RULES`,
      `You are in a real-time voice conversation. Adapt your behavior:`,
      `- Keep responses SHORT and conversational — 1-3 sentences max unless asked for detail.`,
      `- Speak naturally, as if talking to a friend. No bullet points, no markdown.`,
      `- After saving a memory, briefly confirm: "Got it, saved." Don't read back the whole thing.`,
      `- After searching, summarize the top results conversationally. Don't list raw data.`,
      `- Never mention tool names, function calls, or technical internals.`,
      `- If the user is just chatting, respond naturally without calling tools.`,
      `- You can ask clarifying questions before saving if intent is unclear.`,
    ].join('\n')
  }

  private async buildCompanyCortexContext(brainId: string): Promise<string[]> {
    const [objects, signals] = await Promise.all([
      this.liveRepository.listCompanyCortexObjects(this.supabase, brainId),
      this.liveRepository.listCompanyCortexSignals(this.supabase, brainId),
    ])

    const lines: string[] = []

    if (objects.length > 0) {
      lines.push(`Company Cortex objects (${objects.length} shown):`)
      for (const row of objects) {
        const title = String(row.title ?? row.object_type ?? 'object')
        const truth = String(row.truth ?? '').slice(0, 160)
        lines.push(`- [${row.object_type}] ${title}: ${truth}`)
      }
    }

    if (signals.length > 0) {
      lines.push(`Pending/active signals (${signals.length} shown):`)
      for (const row of signals) {
        lines.push(
          `- [${row.signal_type}] ${String(row.truth ?? '').slice(0, 120)} (${row.status})`,
        )
      }
    }

    return lines
  }
}
