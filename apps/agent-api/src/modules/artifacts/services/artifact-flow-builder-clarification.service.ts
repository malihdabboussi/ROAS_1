import { Injectable } from '@nestjs/common'
import type { FlowClarificationQuestion } from '@vibey/api-shared/types/flow-builder'
import { ArtifactFlowBuilderRepository } from '../repositories/artifact-flow-builder.repository'
import { planFromSession } from './artifact-flow-builder-plan.util'
import { ArtifactFlowBuilderSessionService } from './artifact-flow-builder-session.service'
import {
  objectArrayValue,
  objectValue,
  stringArrayValue,
  stringValue,
  type JsonRecord,
} from './artifact-flow-builder-values'

@Injectable()
export class ArtifactFlowBuilderClarificationService {
  constructor(
    private readonly repository: ArtifactFlowBuilderRepository = new ArtifactFlowBuilderRepository(),
    private readonly sessionService: ArtifactFlowBuilderSessionService = new ArtifactFlowBuilderSessionService(
      repository,
    ),
  ) {}

  async createClarification(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const userId = this.sessionService.resolveUserId(target, sessionKey)
    const activeBuild = this.sessionService.getActiveFlowBuild(target, sessionKey)
    const spaceId = stringValue(data.space_id) ?? stringValue(activeBuild?.spaceId)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    const questions = this.normalizeClarificationQuestions(data.questions)
    if (questions.length === 0) {
      return { success: false, error: 'questions must contain at least one clarification' }
    }
    const supabase = await this.sessionService.getUserClient(target, userId, sessionKey)
    const space = await this.sessionService.getSpace(supabase, spaceId)
    let session = await this.sessionService.resolveFlowBuildSession(
      target,
      supabase,
      spaceId,
      sessionKey,
    )
    if (!session) {
      const conversationId = this.sessionService.conversationIdFromSessionKey(sessionKey)
      const { data: created, error } = await this.repository.createBuildSession(supabase, {
        org_id: space.org_id ?? null,
        space_id: spaceId,
        created_by: userId,
        conversation_id: conversationId,
        status: 'clarifying',
        intent: stringValue(data.intent) ?? stringValue(data.title) ?? 'Flow clarification',
        plan: {},
        trace_events: [],
        clarification_questions: [],
        validation_errors: [],
      })
      if (error) return { success: false, error: error.message }
      session = created as JsonRecord
    }
    const sessionId = String(session.id)
    await this.sessionService.createClarificationRows(supabase, {
      sessionId,
      spaceId,
      orgId: stringValue(space.org_id),
      userId,
      questions,
    })
    const renderMode = questions.length <= 3 ? 'chat' : 'tab'
    const traceEvents = [
      ...(Array.isArray(session.trace_events) ? (session.trace_events as JsonRecord[]) : []),
      {
        type: 'clarification_required',
        message: 'Loop created pre-plan clarification questions.',
        at: new Date().toISOString(),
        data: { question_count: questions.length, render_mode: renderMode },
      },
    ]
    const { data: updated, error } = await this.repository.updateBuildSession(supabase, {
      spaceId,
      sessionId,
      updates: {
        status: 'clarifying',
        trace_events: traceEvents,
        clarification_questions: [],
        updated_at: new Date().toISOString(),
      },
    })
    if (error) return { success: false, error: error.message }
    await this.sessionService.ensureConversationLinked(supabase, spaceId, sessionId, sessionKey)
    this.sessionService.setActiveFlowBuild(target, sessionKey, {
      sessionId,
      spaceId,
      targetAutomationId: stringValue(objectValue(session.plan).target_automation_id),
    })
    return {
      success: true,
      session: updated,
      render_mode: renderMode,
      clarification: {
        title: stringValue(data.title) ?? 'Quick question',
        introMessage: stringValue(data.intro_message) ?? stringValue(data.introMessage),
        questions,
      },
    }
  }

  async answerClarification(target: Record<string, any>, data: JsonRecord, sessionKey?: string) {
    const sessionResult = await this.sessionService.loadSession(target, data, sessionKey)
    if (!sessionResult.success) return sessionResult
    const sessionId = String(sessionResult.session.id)
    const spaceId = String(sessionResult.session.space_id)
    const supabase = sessionResult.supabase
    const answers = objectValue(data.answers)
    const plan = planFromSession(sessionResult.session)
    const traceEvents = [
      ...(plan?.trace_events ??
        (Array.isArray(sessionResult.session.trace_events)
          ? sessionResult.session.trace_events
          : [])),
      {
        type: 'clarification_answered',
        message: 'User answered Loop clarification questions.',
        at: new Date().toISOString(),
        data: { answered_question_ids: Object.keys(answers) },
      },
    ]
    const { error } = await this.repository.updateClarificationAnswers(supabase, {
      sessionId,
      updates: { answer: answers, status: 'answered', updated_at: new Date().toISOString() },
    })
    if (error) return { success: false, error: error.message }
    const { data: session, error: sessionError } = await this.repository.updateBuildSession(
      supabase,
      {
        spaceId,
        sessionId,
        updates: {
          status: 'planning',
          trace_events: traceEvents,
          updated_at: new Date().toISOString(),
        },
      },
    )
    if (sessionError) return { success: false, error: sessionError.message }
    this.sessionService.setActiveFlowBuild(target, sessionKey, {
      sessionId,
      spaceId,
      targetAutomationId: plan?.target_automation_id,
    })
    return { success: true, session, plan, answers }
  }

  private normalizeClarificationQuestions(value: unknown): FlowClarificationQuestion[] {
    return objectArrayValue(value)
      .map((question, index) => {
        const id = stringValue(question.id) ?? `flow-question-${index + 1}`
        const text =
          stringValue(question.text) ??
          stringValue(question.question) ??
          stringValue(question.label) ??
          'What should Loop use here?'
        const options = objectArrayValue(question.options ?? question.choices)
          .map((option, optionIndex) => {
            const label =
              stringValue(option.label) ??
              stringValue(option.text) ??
              stringValue(option.value) ??
              `Option ${optionIndex + 1}`
            return {
              id: stringValue(option.id) ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
              label,
              ...(stringValue(option.description)
                ? { description: stringValue(option.description)! }
                : {}),
            }
          })
          .filter((option) => option.id && option.label)
        const fallbackAnswers = stringArrayValue(question.suggested_answers)
        const normalizedOptions =
          options.length > 0
            ? options
            : fallbackAnswers.map((answer) => ({ id: answer, label: answer }))
        const questionType: FlowClarificationQuestion['type'] =
          question.type === 'multiple_choice' ? 'multiple_choice' : 'single_choice'
        return {
          id,
          text,
          type: questionType,
          options: normalizedOptions,
          required: question.required !== false,
          ...(Object.keys(objectValue(question.target)).length
            ? { target: objectValue(question.target) as FlowClarificationQuestion['target'] }
            : {}),
          ...(stringValue(question.label) ? { label: stringValue(question.label)! } : {}),
          ...(stringValue(question.question) ? { question: stringValue(question.question)! } : {}),
          ...(fallbackAnswers.length ? { suggested_answers: fallbackAnswers } : {}),
        }
      })
      .filter((question) => question.options.length > 0)
  }
}
