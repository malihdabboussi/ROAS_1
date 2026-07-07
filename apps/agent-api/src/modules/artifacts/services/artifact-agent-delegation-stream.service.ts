import { ArtifactAgentDelegationGatewayClient } from '../integrations/artifact-agent-delegation-gateway.client'
import type { A2ATurn, StreamedDelegationResult } from './artifact-agent-delegation.types'

export class ArtifactAgentDelegationStreamService {
  constructor(private readonly gatewayClient = new ArtifactAgentDelegationGatewayClient()) {}

  async streamDelegation(params: {
    gatewayUrl: string
    gatewayToken: string
    delegationSessionKey: string
    gatewayAgentId: string
    body: Record<string, unknown>
    targetAgentKey: string
    targetName: string
    targetImage?: string
    delegationId: string
    onProgress?: (message: string) => void | Promise<void>
  }): Promise<StreamedDelegationResult> {
    const {
      gatewayUrl,
      gatewayToken,
      delegationSessionKey,
      gatewayAgentId,
      body,
      targetAgentKey,
      targetName,
      targetImage,
      delegationId,
      onProgress,
    } = params

    const reader = await this.gatewayClient.openResponsesStream({
      gatewayUrl,
      gatewayToken,
      delegationSessionKey,
      gatewayAgentId,
      body,
    })
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulatedText = ''
    let accumulatedReasoning = ''
    let pendingTextChunk = ''
    const toolTurns: A2ATurn[] = []
    let turnCounter = 2
    const activeToolLabels = new Map<string, { toolName: string; content: string }>()

    const flushPendingText = async () => {
      const text = pendingTextChunk.trim()
      if (!text) return
      pendingTextChunk = ''
      const msgTurn: A2ATurn = {
        from: targetAgentKey,
        fromName: targetName,
        fromImage: targetImage,
        content: text,
        turnIndex: turnCounter++,
        turnType: 'message',
        timestamp: Date.now(),
      }
      toolTurns.push(msgTurn)
      await onProgress?.(
        JSON.stringify({
          type: 'a2a_message',
          delegationId,
          ...msgTurn,
          isComplete: true,
        }),
      )
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('event: ') && !line.startsWith('data: ')) continue
          if (line.startsWith('event: ')) continue

          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue

          let evt: Record<string, unknown>
          try {
            evt = JSON.parse(data)
          } catch {
            continue
          }

          const evtType = evt.type as string
          if (!evtType) continue

          if (evtType === 'response.tool.start') {
            await flushPendingText()
            const rawName = (evt.name as string) ?? 'tool'
            const args = evt.args as Record<string, unknown> | undefined
            const action = typeof args?.action === 'string' ? args.action : undefined
            const label = typeof args?.label === 'string' ? args.label : undefined
            const toolName = action ?? rawName
            const content = label ?? toolName.replace(/_/g, ' ')
            const toolCallId = typeof evt.tool_call_id === 'string' ? evt.tool_call_id : undefined
            if (toolCallId) activeToolLabels.set(toolCallId, { toolName, content })
            const toolTurn: A2ATurn = {
              from: targetAgentKey,
              fromName: targetName,
              fromImage: targetImage,
              content,
              turnIndex: turnCounter++,
              turnType: 'tool_use',
              toolName,
              timestamp: Date.now(),
            }
            toolTurns.push(toolTurn)
            await onProgress?.(
              JSON.stringify({
                type: 'a2a_message',
                delegationId,
                ...toolTurn,
                isComplete: false,
              }),
            )
          }

          if (evtType === 'response.tool.done') {
            const rawName = (evt.name as string) ?? 'tool'
            const toolCallId = typeof evt.tool_call_id === 'string' ? evt.tool_call_id : undefined
            const cached = toolCallId ? activeToolLabels.get(toolCallId) : undefined
            if (toolCallId) activeToolLabels.delete(toolCallId)
            const toolName =
              cached?.toolName ??
              (typeof (evt as Record<string, unknown>).action === 'string'
                ? ((evt as Record<string, unknown>).action as string)
                : rawName)
            const content = cached?.content ?? toolName.replace(/_/g, ' ')
            const toolTurn: A2ATurn = {
              from: targetAgentKey,
              fromName: targetName,
              fromImage: targetImage,
              content,
              turnIndex: turnCounter++,
              turnType: 'tool_result',
              toolName,
              timestamp: Date.now(),
            }
            toolTurns.push(toolTurn)
            await onProgress?.(
              JSON.stringify({
                type: 'a2a_message',
                delegationId,
                ...toolTurn,
                isComplete: true,
              }),
            )

            const toolResult = evt.result as Record<string, unknown> | undefined
            if (toolResult) {
              const blocks = this.extractUiBlocksFromResult(toolResult)
              for (const block of blocks) {
                const uiTurn: A2ATurn = {
                  from: targetAgentKey,
                  fromName: targetName,
                  fromImage: targetImage,
                  content: (block.type as string) ?? 'preview',
                  turnIndex: turnCounter++,
                  turnType: 'ui_block',
                  toolName: (block.type as string) ?? 'preview',
                  blockData: block as Record<string, unknown>,
                  timestamp: Date.now(),
                }
                toolTurns.push(uiTurn)
                await onProgress?.(
                  JSON.stringify({
                    type: 'a2a_message',
                    delegationId,
                    ...uiTurn,
                    isComplete: true,
                  }),
                )
              }
            }
          }

          if (evtType === 'response.output_text.delta') {
            const delta = (evt.delta as string) ?? ''
            if (delta) {
              accumulatedText += delta
              pendingTextChunk += delta
            }
          }

          if (evtType === 'response.reasoning.delta') {
            const delta = (evt.delta as string) ?? ''
            if (delta) {
              accumulatedReasoning += delta
              await onProgress?.(
                JSON.stringify({
                  type: 'a2a_message',
                  delegationId,
                  from: targetAgentKey,
                  fromName: targetName,
                  fromImage: targetImage,
                  content: accumulatedReasoning,
                  turnIndex: 1,
                  turnType: 'thinking',
                  timestamp: Date.now(),
                  isComplete: false,
                }),
              )
            }
          }

          if (evtType === 'response.completed') {
            const respObj = evt.response as Record<string, unknown> | undefined
            if (respObj) {
              const extracted = this.extractOutputTextFromResponse(respObj)
              if (extracted) accumulatedText = extracted
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    pendingTextChunk = ''
    return { outputText: accumulatedText || 'No response.', toolTurns }
  }

  private extractUiBlocksFromResult(
    result: Record<string, unknown>,
  ): Array<Record<string, unknown>> {
    const isBlock = (b: unknown): b is Record<string, unknown> =>
      !!b &&
      typeof b === 'object' &&
      !Array.isArray(b) &&
      typeof (b as Record<string, unknown>).type === 'string'

    if (Array.isArray(result.ui_blocks)) {
      const blocks = (result.ui_blocks as unknown[]).filter(isBlock)
      if (blocks.length > 0) return blocks
    }
    if (Array.isArray(result.content)) {
      for (const item of result.content as Array<Record<string, unknown>>) {
        if (typeof item?.text !== 'string') continue
        try {
          const parsed = JSON.parse(item.text as string) as Record<string, unknown>
          if (Array.isArray(parsed?.ui_blocks)) {
            const blocks = (parsed.ui_blocks as unknown[]).filter(isBlock)
            if (blocks.length > 0) return blocks
          }
        } catch {
          continue
        }
      }
    }
    return []
  }

  private extractOutputText(result: Record<string, unknown>): string {
    if (typeof result.output_text === 'string') return result.output_text
    if (typeof result.output === 'string') return result.output

    if (Array.isArray(result.output)) {
      const textParts = (result.output as Array<Record<string, unknown>>)
        .filter((p) => p.type === 'message' && p.role === 'assistant')
        .flatMap((p) => {
          const content = p.content
          if (typeof content === 'string') return [content]
          if (Array.isArray(content)) {
            return (content as Array<Record<string, unknown>>)
              .filter((c) => c.type === 'output_text' || c.type === 'text')
              .map((c) => String(c.text ?? c.content ?? ''))
          }
          return []
        })
      if (textParts.length > 0) return textParts.join('\n')
    }

    if (typeof result.text === 'string') return result.text
    if (typeof result.content === 'string') return result.content

    return JSON.stringify(result)
  }

  private extractOutputTextFromResponse(response: Record<string, unknown>): string | null {
    if (typeof response.output_text === 'string') return response.output_text
    if (Array.isArray(response.output)) {
      return this.extractOutputText(response)
    }
    return null
  }
}
