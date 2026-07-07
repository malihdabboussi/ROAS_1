import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  charsToTokensFast,
  countJsonTokens,
  countTextTokens,
  type ContextBreakdown,
  type ContextCategoryEntry,
  type ContextCategorySlice,
} from '@vibey/context-breakdown'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import type {
  OpenClawInputMessage,
  OpenClawSkillCatalog,
  SystemPromptReport,
} from './openclaw-proxy.service'

@Injectable()
export class ChatContextAccountingService {
  constructor(private readonly conversations: ConversationsRepository) {}

  buildEstimatedContextBreakdown(params: {
    instructions?: string
    inputMessages: OpenClawInputMessage[]
    contextWindowTokens?: number
    modelId?: string
    skillCatalog?: OpenClawSkillCatalog
    extraSlices?: ContextCategorySlice[]
  }): ContextBreakdown | undefined {
    const {
      instructions,
      inputMessages,
      contextWindowTokens,
      modelId,
      skillCatalog,
      extraSlices,
    } = params
    if (!contextWindowTokens || contextWindowTokens <= 0) return undefined

    const slices: ContextCategorySlice[] = []
    const systemTokens = countTextTokens(instructions ?? '')
    this.mergeSlice(slices, {
      id: 'system',
      label: 'System',
      tokens: systemTokens,
      entries: [{ id: 'turn_instructions', label: 'Initial prompt', tokens: systemTokens }],
    })

    if (skillCatalog?.entries.length) {
      this.mergeSlice(slices, {
        id: 'skills',
        label: 'Skills',
        tokens: countJsonTokens(skillCatalog.entries),
        entries: skillCatalog.entries.map((skill) => ({
          id: skill.skill_key,
          label: skill.name,
          tokens: countTextTokens([skill.name, skill.description].filter(Boolean).join('\n')),
        })),
      })
    }

    if (extraSlices) {
      for (const extraSlice of extraSlices.filter((slice) => slice.tokens > 0)) {
        this.mergeSlice(slices, extraSlice)
      }
    }

    const inputMessageTokens = inputMessages.reduce(
      (sum, message) => sum + this.countOpenClawInputMessageTokens(message),
      0,
    )
    const measuredPromptTokens = (extraSlices ?? [])
      .filter((slice) => slice.id !== 'tools')
      .reduce((sum, slice) => sum + Math.max(0, slice.tokens), 0)
    this.mergeSlice(slices, {
      id: 'conversation',
      label: 'Conversation',
      tokens: Math.max(0, inputMessageTokens - measuredPromptTokens),
    })

    const totalTokens = slices.reduce((sum, slice) => sum + Math.max(0, slice.tokens), 0)
    if (totalTokens <= 0) return undefined

    return {
      version: 1,
      source: 'estimate',
      generatedAt: Date.now(),
      modelId,
      contextWindow: contextWindowTokens,
      totalTokens,
      slices,
    }
  }

  buildContextBreakdown(params: {
    systemPromptReport?: SystemPromptReport
    lastCallInputTokens?: number
    contextWindowTokens?: number
    modelId?: string
    extraSlices?: ContextCategorySlice[]
  }): ContextBreakdown | undefined {
    const { systemPromptReport, lastCallInputTokens, contextWindowTokens, modelId, extraSlices } =
      params
    if (!contextWindowTokens || contextWindowTokens <= 0) return undefined
    if (!lastCallInputTokens || lastCallInputTokens <= 0) return undefined

    const slices: ContextCategorySlice[] = []
    if (systemPromptReport) {
      const workspaceTokens = charsToTokensFast(
        systemPromptReport.injectedWorkspaceFiles.reduce(
          (sum, file) => sum + Math.max(0, file.injectedChars),
          0,
        ),
      )
      const systemTextChars = Math.max(
        0,
        systemPromptReport.systemPrompt.nonProjectContextChars -
          systemPromptReport.skills.promptChars -
          systemPromptReport.tools.listChars,
      )
      const systemPromptTokens = charsToTokensFast(systemTextChars)
      const systemEntries: ContextCategoryEntry[] = [
        {
          id: 'openclaw_system_prompt',
          label: 'OpenClaw system prompt',
          tokens: systemPromptTokens,
        },
      ]
      if (workspaceTokens > 0) {
        systemEntries.push({
          id: 'injected_workspace_files',
          label: 'Injected workspace files',
          tokens: workspaceTokens,
        })
      }
      slices.push({
        id: 'system',
        label: 'System',
        tokens: systemPromptTokens + workspaceTokens,
        entries: systemEntries,
      })

      const toolsEntries = systemPromptReport.tools.entries.map((tool) => ({
        id: tool.name,
        label: tool.name,
        tokens: charsToTokensFast(tool.summaryChars + tool.schemaChars),
      }))
      slices.push({
        id: 'tools',
        label: 'Tools',
        tokens: charsToTokensFast(
          systemPromptReport.tools.listChars + systemPromptReport.tools.schemaChars,
        ),
        entries: toolsEntries,
      })

      slices.push({
        id: 'skills',
        label: 'Skills',
        tokens: charsToTokensFast(systemPromptReport.skills.promptChars),
        entries: systemPromptReport.skills.entries.map((skill) => ({
          id: skill.name,
          label: skill.name,
          tokens: charsToTokensFast(skill.blockChars),
        })),
      })
    }

    if (extraSlices) {
      for (const extraSlice of extraSlices.filter((slice) => slice.tokens > 0)) {
        this.mergeSlice(slices, extraSlice)
      }
    }

    const knownTokens = slices.reduce((sum, slice) => sum + Math.max(0, slice.tokens), 0)
    slices.push({
      id: 'conversation',
      label: 'Conversation',
      tokens: Math.max(0, lastCallInputTokens - knownTokens),
    })

    return {
      version: 1,
      source: 'run',
      generatedAt: Date.now(),
      modelId,
      contextWindow: contextWindowTokens,
      totalTokens: lastCallInputTokens,
      slices,
    }
  }

  buildMeasuredSlice(
    id: ContextCategorySlice['id'],
    label: string,
    entries: ContextCategoryEntry[],
  ): ContextCategorySlice | null {
    const measuredEntries = entries.filter((entry) => entry.tokens > 0)
    const tokens = measuredEntries.reduce((sum, entry) => sum + entry.tokens, 0)
    if (tokens <= 0) return null
    return { id, label, tokens, entries: measuredEntries }
  }

  countTextEntry(id: string, label: string, text: string): ContextCategoryEntry {
    return { id, label, tokens: countTextTokens(text) }
  }

  private mergeSlice(slices: ContextCategorySlice[], next: ContextCategorySlice): void {
    if (next.tokens <= 0) return
    const existing = slices.find((slice) => slice.id === next.id)
    if (existing) {
      existing.tokens += next.tokens
      existing.entries = [...(existing.entries ?? []), ...(next.entries ?? [])]
      return
    }
    slices.push(next)
  }

  private countOpenClawInputMessageTokens(message: OpenClawInputMessage): number {
    let tokens = countTextTokens([message.type, message.role].filter(Boolean).join('\n'))
    if (typeof message.content === 'string') {
      tokens += countTextTokens(message.content)
    } else {
      tokens += countJsonTokens(message.content)
    }
    return tokens + 4
  }

  async getContextBaseline(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<ContextBreakdown | null> {
    const conversation = await this.conversations.findById(supabase, conversationId)
    const metadata = conversation?.metadata as Record<string, unknown> | undefined
    const breakdown = metadata?.context_breakdown
    if (
      breakdown &&
      typeof breakdown === 'object' &&
      (breakdown as ContextBreakdown).version === 1
    ) {
      return breakdown as ContextBreakdown
    }
    return null
  }
}
