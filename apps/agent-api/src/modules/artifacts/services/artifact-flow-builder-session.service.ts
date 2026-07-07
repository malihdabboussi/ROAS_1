import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  FlowBuildPlan,
  FlowClarificationQuestion,
} from '@vibey/api-shared/types/flow-builder'
import { ArtifactFlowBuilderRepository } from '../repositories/artifact-flow-builder.repository'
import { parseConversationIdFromSessionKey } from './artifact-action.registry'
import { normalizePlanStatus, planFromSession } from './artifact-flow-builder-plan.util'
import { objectValue, stringValue, type JsonRecord } from './artifact-flow-builder-values'

@Injectable()
export class ArtifactFlowBuilderSessionService {
  constructor(
    private readonly repository: ArtifactFlowBuilderRepository = new ArtifactFlowBuilderRepository(),
  ) {}

  resolveUserId(target: Record<string, any>, sessionKey?: string): string {
    const userId =
      typeof target.resolveUserId === 'function'
        ? String(target.resolveUserId(sessionKey) ?? '')
        : ''
    if (!userId) throw new Error('Unable to resolve user for flow builder action')
    return userId
  }

  conversationIdFromSessionKey(sessionKey?: string): string | null {
    return parseConversationIdFromSessionKey(sessionKey)
  }

  async ensureConversationLinked(
    supabase: SupabaseClient,
    spaceId: string,
    sessionId: string,
    sessionKey?: string,
  ) {
    const conversationId = this.conversationIdFromSessionKey(sessionKey)
    if (!conversationId) return
    const { error } = await this.repository.updateBuildSession(supabase, {
      spaceId,
      sessionId,
      updates: {
        conversation_id: conversationId,
        updated_at: new Date().toISOString(),
      },
    })
    if (error) throw new Error(error.message)
  }

  async getUserClient(
    target: Record<string, any>,
    userId: string,
    sessionKey?: string,
  ): Promise<SupabaseClient> {
    return (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
  }

  getActiveFlowBuild(target: Record<string, any>, sessionKey?: string) {
    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    if (!conversationId || typeof target.requestContext?.getActiveFlowBuild !== 'function') {
      return null
    }
    return target.requestContext.getActiveFlowBuild(conversationId) as {
      sessionId?: string | null
      spaceId?: string | null
      mode?: 'create' | 'update'
      targetAutomationId?: string | null
    } | null
  }

  setActiveFlowBuild(
    target: Record<string, any>,
    sessionKey: string | undefined,
    input: {
      sessionId: string
      spaceId: string
      targetAutomationId?: string | null
    },
  ) {
    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    if (!conversationId || typeof target.requestContext?.setActiveFlowBuild !== 'function') return
    target.requestContext.setActiveFlowBuild(conversationId, {
      sessionId: input.sessionId,
      spaceId: input.spaceId,
      mode: input.targetAutomationId ? 'update' : 'create',
      targetAutomationId: input.targetAutomationId ?? null,
    })
  }

  async getSpace(supabase: SupabaseClient, spaceId: string): Promise<JsonRecord> {
    const { data, error } = await this.repository.findSpace(supabase, spaceId)
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Space not found')
    return data as JsonRecord
  }

  async persistSessionPlan(
    supabase: SupabaseClient,
    spaceId: string,
    sessionId: string,
    plan: FlowBuildPlan,
    extra: JsonRecord = {},
  ): Promise<JsonRecord> {
    const { data, error } = await this.repository.updateBuildSession(supabase, {
      spaceId,
      sessionId,
      updates: {
        ...extra,
        status: plan.status,
        plan,
        trace_events: plan.trace_events,
        clarification_questions: [],
        validation_errors: plan.validation_errors,
        updated_at: new Date().toISOString(),
      },
    })
    if (error) throw new Error(error.message)
    return data as JsonRecord
  }

  async createClarificationRows(
    supabase: SupabaseClient,
    input: {
      sessionId: string
      spaceId: string
      orgId: string | null
      userId: string
      questions: FlowClarificationQuestion[]
    },
  ) {
    if (input.questions.length === 0) return
    const { error } = await this.repository.createClarificationRows(
      supabase,
      input.questions.map((question) => ({
        session_id: input.sessionId,
        org_id: input.orgId,
        space_id: input.spaceId,
        created_by: input.userId,
        question,
        status: 'open',
      })),
    )
    if (error) throw new Error(error.message)
  }

  async getLatestSessionRow(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<JsonRecord | null> {
    const { data, error } = await this.repository.findLatestBuildSession(supabase, spaceId)
    if (error) throw new Error(error.message)
    return (data ?? null) as JsonRecord | null
  }

  async getFlowRow(
    supabase: SupabaseClient,
    spaceId: string,
    automationId: string,
  ): Promise<JsonRecord | null> {
    const { data, error } = await this.repository.findFlow(supabase, { spaceId, automationId })
    if (error) throw new Error(error.message)
    return (data ?? null) as JsonRecord | null
  }

  isPlaceholderSession(row: JsonRecord | null): boolean {
    if (!row) return false
    const plan = objectValue(row.plan) as unknown as FlowBuildPlan
    const hasTrigger = !!plan.trigger
    const hasActions = Array.isArray(plan.actions) && plan.actions.length > 0
    return !hasTrigger && !hasActions && !plan.automation_id
  }

  async getReusablePlaceholderSession(
    target: Record<string, any>,
    supabase: SupabaseClient,
    spaceId: string,
    sessionKey?: string,
  ): Promise<JsonRecord | null> {
    const activeBuild = this.getActiveFlowBuild(target, sessionKey)
    if (activeBuild?.spaceId === spaceId && activeBuild.sessionId) {
      const { data, error } = await this.repository.findBuildSession(supabase, {
        spaceId,
        sessionId: activeBuild.sessionId,
      })
      if (error) throw new Error(error.message)
      const activeRow = (data ?? null) as JsonRecord | null
      if (this.isPlaceholderSession(activeRow)) return activeRow
    }
    const latest = await this.getLatestSessionRow(supabase, spaceId)
    return this.isPlaceholderSession(latest) ? latest : null
  }

  async resolveFlowBuildSession(
    target: Record<string, any>,
    supabase: SupabaseClient,
    spaceId: string,
    sessionKey?: string,
  ): Promise<JsonRecord | null> {
    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    const activeBuild = this.getActiveFlowBuild(target, sessionKey)
    if (activeBuild?.spaceId === spaceId && activeBuild.sessionId) {
      const { data, error } = await this.repository.findBuildSession(supabase, {
        spaceId,
        sessionId: activeBuild.sessionId,
      })
      if (error) throw new Error(error.message)
      if (data) return data as JsonRecord
    }
    if (conversationId) {
      const { data, error } = await this.repository.findLatestBuildSessionForConversation(supabase, {
        spaceId,
        conversationId,
      })
      if (error) throw new Error(error.message)
      if (data) {
        this.setActiveFlowBuild(target, sessionKey, {
          sessionId: String((data as JsonRecord).id),
          spaceId,
          targetAutomationId: (objectValue((data as JsonRecord).plan) as { target_automation_id?: string | null })
            ?.target_automation_id,
        })
        return data as JsonRecord
      }
    }
    return this.getLatestSessionRow(supabase, spaceId)
  }

  async loadSession(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.resolveUserId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const activeBuild = this.getActiveFlowBuild(target, sessionKey)
    const spaceId = stringValue(data.space_id) ?? stringValue(activeBuild?.spaceId)
    if (!spaceId) return { success: false as const, error: 'space_id is required' }
    let sessionId =
      stringValue(data.session_id) ??
      (activeBuild?.spaceId === spaceId ? stringValue(activeBuild.sessionId) : null)
    if (!sessionId) {
      const latest = await this.getLatestSessionRow(supabase, spaceId)
      sessionId = stringValue(latest?.id)
    }
    if (!sessionId) {
      return {
        success: false as const,
        error: 'Start a Flow build from the Flows panel before continuing.',
      }
    }
    const { data: row, error } = await this.repository.findBuildSession(supabase, {
      spaceId,
      sessionId,
    })
    if (error) return { success: false as const, error: error.message }
    if (!row) return { success: false as const, error: 'Flow plan not found' }
    const plan = this.planFromSession(row as JsonRecord)
    this.setActiveFlowBuild(target, sessionKey, {
      sessionId: String((row as JsonRecord).id),
      spaceId,
      targetAutomationId: plan?.target_automation_id,
    })
    await this.ensureConversationLinked(supabase, spaceId, String((row as JsonRecord).id), sessionKey)
    return {
      success: true as const,
      supabase,
      session: row as JsonRecord,
      plan,
    }
  }

  async loadPlan(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const sessionResult = await this.loadSession(target, data, sessionKey)
    if (!sessionResult.success) return sessionResult
    if (!sessionResult.plan) {
      return { success: false as const, error: 'Flow build session has no plan yet' }
    }
    return {
      success: true as const,
      supabase: sessionResult.supabase,
      session: sessionResult.session,
      plan: sessionResult.plan,
    }
  }

  async loadBlueprint(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.resolveUserId(target, sessionKey)
    const blueprintId = stringValue(data.blueprint_id)
    if (!blueprintId) return { success: false as const, error: 'blueprint_id is required' }
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const { data: row, error } = await this.repository.findBlueprint(supabase, blueprintId)
    if (error) return { success: false as const, error: error.message }
    if (!row) return { success: false as const, error: 'Flow action blueprint not found' }
    return { success: true as const, blueprint: row as JsonRecord }
  }

  planFromSession(session: JsonRecord): FlowBuildPlan | null {
    return planFromSession(session)
  }

  normalizePlanStatus(value: unknown) {
    return normalizePlanStatus(value)
  }
}
