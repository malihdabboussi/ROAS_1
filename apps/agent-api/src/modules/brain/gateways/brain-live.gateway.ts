import { Logger } from '@nestjs/common'
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway } from '@nestjs/websockets'
import WebSocket from 'ws'
import { BrainLiveService, type LiveSession } from '../services/brain-live.service'

const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

interface GeminiServerMessage {
  setupComplete?: Record<string, unknown>
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> }
    inputTranscription?: { text: string }
    outputTranscription?: { text: string }
    interrupted?: boolean
    turnComplete?: boolean
  }
  toolCall?: {
    functionCalls: Array<{
      id: string
      name: string
      args?: Record<string, unknown>
    }>
  }
}

interface TranscriptAccumulator {
  inputChunks: string[]
  outputChunks: string[]
  lastSavedInputMessageId: string | null
  toolSteps: Array<{ name: string; label: string }>
  orderedBlocks: Array<Record<string, unknown>>
  suppressNextAssistantSave: boolean
}

@WebSocketGateway({ path: '/api/brain/live-ws' })
export class BrainLiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BrainLiveGateway.name)
  private readonly clientToGemini = new Map<WebSocket, WebSocket>()
  private readonly clientToSession = new Map<WebSocket, string>()
  private readonly clientTranscripts = new Map<WebSocket, TranscriptAccumulator>()
  private readonly clientProgressTimers = new Map<WebSocket, ReturnType<typeof setInterval>>()
  private readonly clientUsageBillingTimers = new Map<WebSocket, ReturnType<typeof setInterval>>()
  private readonly clientUsageLastChargedAt = new Map<WebSocket, number>()

  constructor(private readonly brainLiveService: BrainLiveService) {}

  async handleConnection(client: WebSocket, ...args: any[]): Promise<void> {
    const req = args[0] as { url?: string; headers?: Record<string, string> } | undefined
    const url = new URL(req?.url ?? '/', 'http://localhost')
    const sessionId = url.searchParams.get('session')
    const userId = url.searchParams.get('userId')

    if (!sessionId || !userId) {
      this.logger.warn('brain_live_ws rejected: missing session or userId')
      client.close(4001, 'Missing session or userId')
      return
    }

    const session = this.brainLiveService.validateSession(sessionId, userId)
    if (!session) {
      this.logger.warn(`brain_live_ws rejected: invalid session ${sessionId}`)
      client.close(4002, 'Invalid or expired session')
      return
    }

    this.clientToSession.set(client, sessionId)
    this.clientTranscripts.set(client, {
      inputChunks: [],
      outputChunks: [],
      lastSavedInputMessageId: null,
      toolSteps: [],
      orderedBlocks: [],
      suppressNextAssistantSave: false,
    })

    const apiKey = this.brainLiveService.getGeminiApiKey()
    if (!apiKey) {
      this.sendJson(client, { type: 'error', message: 'Gemini API key not configured' })
      client.close(4003, 'Server configuration error')
      return
    }

    const geminiWsUrl = `${GEMINI_WS_URL}?key=${apiKey}`

    await this.brainLiveService.setupRequestContext(session)

    const systemInstruction = await this.brainLiveService.buildSystemInstruction(session)
    const voiceName = await this.brainLiveService.resolveVoiceForSession(session)
    const tools = this.brainLiveService.buildToolsForSession(session)
    const liveModel = this.brainLiveService.getGeminiLiveModel()

    this.logger.log(
      `brain_live system_instruction_built session=${sessionId} voice=${voiceName} scope=${session.scope.type} model=${liveModel} chars=${systemInstruction.length}`,
    )

    try {
      const gemini = new WebSocket(geminiWsUrl)

      gemini.on('open', () => {
        this.logger.log(`brain_live gemini_connected session=${sessionId}`)

        const setupMessage = {
          setup: {
            model: liveModel,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
            },
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            tools,
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',
                endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                prefixPaddingMs: 200,
                silenceDurationMs: 500,
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }

        gemini.send(JSON.stringify(setupMessage))
      })

      gemini.on('message', async (raw: WebSocket.RawData) => {
        if (client.readyState !== WebSocket.OPEN) return

        try {
          const msg: GeminiServerMessage = JSON.parse(raw.toString())

          if (msg.setupComplete) {
            this.brainLiveService.markConnected(sessionId)
            this.startUsageBillingTimer(client, session)
            await this.flushUsageBilling(client, session, 'start', 1, true)
            this.sendJson(client, { type: 'ready' })
            return
          }

          if (msg.serverContent) {
            const sc = msg.serverContent

            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const audioBytes = Buffer.from(part.inlineData.data, 'base64')
                  client.send(audioBytes)
                }
              }
            }

            if (sc.inputTranscription?.text) {
              const acc = this.clientTranscripts.get(client)
              if (acc) acc.inputChunks.push(sc.inputTranscription.text)
              this.sendJson(client, {
                type: 'inputTranscript',
                text: sc.inputTranscription.text,
              })
            }

            if (sc.outputTranscription?.text) {
              const acc = this.clientTranscripts.get(client)
              if (acc) acc.outputChunks.push(sc.outputTranscription.text)
              this.sendJson(client, {
                type: 'outputTranscript',
                text: sc.outputTranscription.text,
              })
            }

            if (sc.interrupted) {
              this.sendJson(client, { type: 'interrupted' })
              const acc = this.clientTranscripts.get(client)
              if (acc) acc.outputChunks = []
            }

            if (sc.turnComplete) {
              await this.flushTranscripts(client, session)
              this.sendJson(client, { type: 'turnComplete' })
            }
          }

          if (msg.toolCall) {
            await this.handleToolCall(client, gemini, session, msg.toolCall)
          }
        } catch (err) {
          this.logger.error(
            `brain_live gemini_message_parse_error session=${sessionId} err=${err instanceof Error ? err.message : String(err)}`,
          )
        }
      })

      gemini.on('error', (err) => {
        this.logger.error(`brain_live gemini_ws_error session=${sessionId} err=${err.message}`)
        this.sendJson(client, { type: 'error', message: 'Gemini connection error' })
        client.close(4004, 'Gemini error')
      })

      gemini.on('close', (code, reason) => {
        this.logger.log(
          `brain_live gemini_closed session=${sessionId} code=${code} reason=${reason.toString()}`,
        )
        if (client.readyState === WebSocket.OPEN) {
          this.sendJson(client, { type: 'sessionEnded' })
          client.close(1000, 'Gemini session ended')
        }
      })

      this.clientToGemini.set(client, gemini)

      client.on('message', async (data: WebSocket.RawData, isBinary: boolean) => {
        if (isBinary) {
          if (gemini.readyState !== WebSocket.OPEN) return
          const buf = Buffer.isBuffer(data)
            ? data
            : Array.isArray(data)
              ? Buffer.concat(data)
              : Buffer.from(new Uint8Array(data))
          const base64Audio = buf.toString('base64')
          gemini.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  data: base64Audio,
                  mimeType: 'audio/pcm;rate=16000',
                },
              },
            }),
          )
          return
        }

        try {
          const text = Buffer.isBuffer(data)
            ? data.toString('utf-8')
            : Array.isArray(data)
              ? Buffer.concat(data).toString('utf-8')
              : typeof data === 'string'
                ? data
                : ''
          const parsed = JSON.parse(text)
          if (
            parsed.type === 'saveVoiceTasks' &&
            session.conversationId &&
            Array.isArray(parsed.tasks) &&
            parsed.tasks.length > 0
          ) {
            await this.brainLiveService.saveVoiceTasksSummary(
              session.conversationId,
              session.userId,
              parsed.tasks,
              session.scope.agentId ?? undefined,
            )
          } else if (
            parsed.type === 'approveTask' &&
            typeof parsed.delegationId === 'string' &&
            typeof parsed.message === 'string'
          ) {
            await this.brainLiveService.queueMessage(
              parsed.delegationId,
              parsed.message,
              (eventType, eventData) => {
                const delegationId = parsed.delegationId as string
                if (eventType === 'ui_block') {
                  this.sendJson(client, {
                    type: 'uiBlock',
                    block: eventData.block,
                    delegation_id: delegationId,
                  })
                } else if (eventType === 'content_delta') {
                  this.sendJson(client, {
                    type: 'contentDelta',
                    content: eventData.content,
                    delegation_id: delegationId,
                  })
                }
              },
            )
          }
        } catch {}
      })
    } catch (err) {
      this.logger.error(
        `brain_live gemini_connect_failed session=${sessionId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      this.sendJson(client, { type: 'error', message: 'Failed to connect to Gemini' })
      client.close(4005, 'Gemini connection failed')
    }
  }

  async handleDisconnect(client: WebSocket): Promise<void> {
    const sessionId = this.clientToSession.get(client)
    const gemini = this.clientToGemini.get(client)

    const progressTimer = this.clientProgressTimers.get(client)
    if (progressTimer) {
      clearInterval(progressTimer)
      this.clientProgressTimers.delete(client)
    }
    this.stopUsageBillingTimer(client)

    if (gemini && gemini.readyState === WebSocket.OPEN) {
      gemini.close()
    }

    this.clientToGemini.delete(client)
    this.clientToSession.delete(client)
    this.clientTranscripts.delete(client)

    if (sessionId) {
      const session = this.brainLiveService.removeSession(sessionId)
      if (session) this.brainLiveService.clearRequestContext(session)
      if (session?.connectedAt) {
        const lastChargedAt = this.clientUsageLastChargedAt.get(client) ?? session.connectedAt
        const durationSeconds = Math.max(0, (Date.now() - lastChargedAt) / 1000)
        this.logger.log(
          `brain_live session_ended session=${sessionId} duration=${durationSeconds.toFixed(1)}s`,
        )
        try {
          await this.brainLiveService.trackSessionUsage(
            session.userId,
            durationSeconds,
            session.orgId,
          )
        } finally {
          this.clientUsageLastChargedAt.delete(client)
        }
      }
    }
  }

  private async handleToolCall(
    client: WebSocket,
    gemini: WebSocket,
    session: LiveSession,
    toolCall: GeminiServerMessage['toolCall'],
  ): Promise<void> {
    if (!toolCall) return

    const acc = this.clientTranscripts.get(client)
    if (acc && acc.inputChunks.length > 0 && session.conversationId) {
      const userText = acc.inputChunks.join(' ').trim()
      if (userText) {
        const savedMsg = await this.brainLiveService.saveTranscriptMessage(
          session.conversationId,
          session.userId,
          'user',
          userText,
        )
        if (savedMsg) {
          this.sendJson(client, { type: 'messageSaved', message: savedMsg })
        }
        acc.inputChunks = []
      }
    }

    const functionResponses: Array<{
      id: string
      name: string
      response: Record<string, unknown>
    }> = []

    for (const fc of toolCall.functionCalls) {
      if (fc.name === 'delegate_work') {
        const task = String(fc.args?.task ?? '')
        this.sendJson(client, {
          type: 'statusUpdate',
          phase: 'executing',
          message: 'Working on it...',
        })

        const delegationId = await this.brainLiveService.startDelegation(
          session,
          task,
          (eventType, eventData) => {
            const did = delegationId
            switch (eventType) {
              case 'tool_start':
                this.sendJson(client, {
                  type: 'toolCallStart',
                  action: eventData.name,
                  label: eventData.label,
                  name: eventData.name,
                  delegation_id: did,
                })
                break
              case 'tool_update':
                this.sendJson(client, {
                  type: 'toolUpdate',
                  name: eventData.name,
                  detail: eventData.detail,
                  tool_call_id: eventData.tool_call_id,
                  delegation_id: did,
                })
                break
              case 'tool_end':
                this.sendJson(client, {
                  type: 'toolCallEnd',
                  action: eventData.name,
                  name: eventData.name,
                  label: eventData.label,
                  success: eventData.status === 'completed',
                  delegation_id: did,
                })
                break
              case 'generation_start':
                this.sendJson(client, {
                  type: 'generationStart',
                  label: eventData.label,
                  delegation_id: did,
                })
                break
              case 'generation_end':
                this.sendJson(client, {
                  type: 'generationEnd',
                  label: eventData.label,
                  status: eventData.status,
                  delegation_id: did,
                })
                break
              case 'ui_block':
                this.sendJson(client, {
                  type: 'uiBlock',
                  block: eventData.block,
                  delegation_id: did,
                })
                break
              case 'status':
                this.sendJson(client, {
                  type: 'statusUpdate',
                  phase: eventData.phase,
                  message: eventData.message,
                  delegation_id: did,
                })
                break
              case 'content_delta':
                this.sendJson(client, {
                  type: 'contentDelta',
                  content: eventData.content,
                  delegation_id: did,
                })
                break
              case 'thinking_delta':
                this.sendJson(client, {
                  type: 'thinkingDelta',
                  delta: eventData.delta,
                  text: eventData.text,
                  delegation_id: did,
                })
                break
              case 'delegation_complete': {
                this.sendJson(client, {
                  type: 'delegationComplete',
                  delegation_id: eventData.delegation_id,
                  status: eventData.status,
                })
                const ds = this.brainLiveService.getDelegationState(String(eventData.delegation_id))
                if (ds) {
                  const geminiWs = this.clientToGemini.get(client)
                  if (geminiWs?.readyState === WebSocket.OPEN) {
                    const toolLabels = ds.toolSteps.map((s) => s.label).join(', ')
                    geminiWs.send(
                      JSON.stringify({
                        realtimeInput: {
                          text: `[SYSTEM: Task completed] Steps: ${toolLabels || 'none'}. Full response from backend:\n${ds.content || 'Done.'}`,
                        },
                      }),
                    )
                  }
                }
                break
              }
            }
          },
        )

        this.sendJson(client, {
          type: 'delegationStarted',
          delegation_id: delegationId,
          task: task.slice(0, 200),
        })

        this.ensureProgressTimer(client)

        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: {
            result: JSON.stringify({
              success: true,
              delegation_id: delegationId,
              message:
                'Task delegated. You will receive system progress updates — narrate them to the user.',
            }),
          },
        })
      } else if (fc.name === 'check_delegation') {
        const did = fc.args?.delegation_id ? String(fc.args.delegation_id) : undefined
        const waitSeconds = Number(fc.args?.wait_seconds ?? 10)
        const snapshot = await this.brainLiveService.checkDelegation(did, waitSeconds)
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: JSON.stringify(snapshot) },
        })
      } else if (fc.name === 'queue_message') {
        const did = fc.args?.delegation_id ? String(fc.args.delegation_id) : undefined
        const msg = String(fc.args?.message ?? '')
        this.sendJson(client, {
          type: 'statusUpdate',
          phase: 'executing',
          message: 'Sending follow-up to running task...',
        })
        const result = await this.brainLiveService.queueMessage(
          did,
          msg,
          (eventType, eventData) => {
            const delegationId = did ?? (eventData.delegation_id as string) ?? ''
            switch (eventType) {
              case 'tool_start':
                this.sendJson(client, {
                  type: 'toolCallStart',
                  action: eventData.name,
                  label: eventData.label,
                  name: eventData.name,
                  delegation_id: delegationId,
                })
                break
              case 'tool_update':
                this.sendJson(client, {
                  type: 'toolUpdate',
                  name: eventData.name,
                  detail: eventData.detail,
                  tool_call_id: eventData.tool_call_id,
                  delegation_id: delegationId,
                })
                break
              case 'tool_end':
                this.sendJson(client, {
                  type: 'toolCallEnd',
                  action: eventData.name,
                  name: eventData.name,
                  label: eventData.label,
                  success: eventData.status === 'completed',
                  delegation_id: delegationId,
                })
                break
              case 'generation_start':
                this.sendJson(client, {
                  type: 'generationStart',
                  label: eventData.label,
                  delegation_id: delegationId,
                })
                break
              case 'generation_end':
                this.sendJson(client, {
                  type: 'generationEnd',
                  label: eventData.label,
                  status: eventData.status,
                  delegation_id: delegationId,
                })
                break
              case 'ui_block':
                this.sendJson(client, {
                  type: 'uiBlock',
                  block: eventData.block,
                  delegation_id: delegationId,
                })
                break
              case 'content_delta':
                this.sendJson(client, {
                  type: 'contentDelta',
                  content: eventData.content,
                  delegation_id: delegationId,
                })
                break
              case 'thinking_delta':
                this.sendJson(client, {
                  type: 'thinkingDelta',
                  delta: eventData.delta,
                  text: eventData.text,
                  delegation_id: delegationId,
                })
                break
              case 'queue_message_done':
                this.sendJson(client, {
                  type: 'statusUpdate',
                  phase: 'idle',
                  message: 'Follow-up processed.',
                  delegation_id: delegationId,
                })
                break
            }
          },
        )
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: JSON.stringify(result) },
        })
      } else if (fc.name === 'read_file') {
        const agentKey = session.scope.agentId ?? 'vibey'
        this.sendJson(client, {
          type: 'toolCallStart',
          action: 'read_file',
          label: 'Reading file...',
          name: fc.name,
        })
        const result = this.brainLiveService.executeReadFile(
          agentKey,
          String(fc.args?.file_path ?? ''),
        )
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: JSON.stringify(result) },
        })
        this.sendJson(client, {
          type: 'toolCallEnd',
          action: 'read_file',
          name: fc.name,
          label: 'Reading file...',
          success: !!(result as Record<string, unknown>).success,
        })
        this.forwardUiBlocksFromResult(client, result)
      } else if (fc.name === 'read_document') {
        this.sendJson(client, {
          type: 'toolCallStart',
          action: 'read_document',
          label: 'Reading document...',
          name: fc.name,
        })
        const result = await this.brainLiveService.executeReadDocument(
          session,
          (fc.args as Record<string, unknown>) ?? {},
        )
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: JSON.stringify(result) },
        })
        this.sendJson(client, {
          type: 'toolCallEnd',
          action: 'read_document',
          name: fc.name,
          label: 'Reading document...',
          success: !!(result as Record<string, unknown>).success,
        })
        this.forwardUiBlocksFromResult(client, result)
      } else if (this.brainLiveService.isKnownBrainAction(fc.name)) {
        this.sendJson(client, {
          type: 'toolCallStart',
          action: fc.name,
          label: fc.name,
          name: fc.name,
        })
        const result = await this.brainLiveService.executeBrainAction(
          session.userId,
          session.orgId,
          session.scope,
          fc.name,
          fc.args ?? {},
          session.id,
        )
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: JSON.stringify(result) },
        })
        this.sendJson(client, {
          type: 'toolCallEnd',
          action: fc.name,
          name: fc.name,
          label: fc.name,
          success: !!(result as Record<string, unknown>).success,
        })
        this.forwardUiBlocksFromResult(client, result)
      } else {
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: {
            result: JSON.stringify({ success: false, error: `Unknown tool: ${fc.name}` }),
          },
        })
      }
    }

    const toolResponsePayload = { toolResponse: { functionResponses } }
    try {
      gemini.send(JSON.stringify(toolResponsePayload))
    } catch (sendErr) {
      this.logger.error(
        `brain_live tool_response_send_failed err=${sendErr instanceof Error ? sendErr.message : String(sendErr)}`,
      )
    }
  }

  private async flushTranscripts(client: WebSocket, session: LiveSession): Promise<void> {
    if (!session.conversationId) return
    const acc = this.clientTranscripts.get(client)
    if (!acc) return

    if (acc.inputChunks.length > 0) {
      const userText = acc.inputChunks.join(' ').trim()
      if (userText) {
        const savedMsg = await this.brainLiveService.saveTranscriptMessage(
          session.conversationId,
          session.userId,
          'user',
          userText,
        )
        if (savedMsg) {
          this.sendJson(client, { type: 'messageSaved', message: savedMsg })
        }
      }
      acc.inputChunks = []
    }

    if (acc.outputChunks.length > 0) {
      const agentText = acc.outputChunks.join('').trim()
      if (agentText) {
        if (!acc.suppressNextAssistantSave) {
          const meta: Record<string, unknown> = { agent_id: session.scope.agentId ?? undefined }
          if (acc.toolSteps.length > 0) {
            meta.tool_steps = acc.toolSteps.map((t) => ({ label: t.label }))
          }
          if (acc.orderedBlocks.length > 0) {
            meta.content_blocks_ordered = structuredClone(acc.orderedBlocks)
          }
          const savedMsg = await this.brainLiveService.saveTranscriptMessage(
            session.conversationId,
            session.userId,
            'assistant',
            agentText,
            meta,
          )
          if (savedMsg) {
            this.sendJson(client, { type: 'messageSaved', message: savedMsg })
          }
        }
      }
      acc.outputChunks = []
      acc.toolSteps = []
      acc.orderedBlocks = []
      acc.suppressNextAssistantSave = false
    } else if (acc.suppressNextAssistantSave) {
      // Avoid suppressing a later real assistant turn when no narration text was produced.
      acc.suppressNextAssistantSave = false
    }
  }

  private forwardUiBlocksFromResult(client: WebSocket, result: unknown): void {
    if (!result || typeof result !== 'object') return
    const r = result as Record<string, unknown>
    if (!Array.isArray(r.ui_blocks)) return
    for (const block of r.ui_blocks as Array<Record<string, unknown>>) {
      this.sendJson(client, { type: 'uiBlock', block })
    }
  }

  private ensureProgressTimer(client: WebSocket): void {
    if (this.clientProgressTimers.has(client)) return

    const timer = setInterval(() => {
      const geminiWs = this.clientToGemini.get(client)
      if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) {
        clearInterval(timer)
        this.clientProgressTimers.delete(client)
        return
      }

      const allDelegations = [...this.brainLiveService.getAllActiveDelegations()]
      const running = allDelegations.filter((d) => d.status === 'running')

      if (running.length === 0) {
        clearInterval(timer)
        this.clientProgressTimers.delete(client)
        return
      }

      const taskSummaries = running.map((d) => {
        const completed = d.toolSteps.filter((s) => s.status === 'completed').map((s) => s.label)
        const current = d.currentTool
        const elapsed = Math.round((Date.now() - d.startedAt) / 1000)
        const parts: string[] = []
        if (completed.length > 0) parts.push(`done: ${completed.join(', ')}`)
        if (current) parts.push(`now: ${current}`)
        parts.push(`${elapsed}s`)
        return parts.join(', ')
      })

      const msg =
        running.length === 1
          ? `[SYSTEM: Progress update] ${taskSummaries[0]}`
          : `[SYSTEM: Progress update] ${running.length} tasks active. ${taskSummaries.map((s, i) => `Task ${i + 1}: ${s}`).join('. ')}`

      const acc = this.clientTranscripts.get(client)
      if (acc) acc.suppressNextAssistantSave = true
      geminiWs.send(JSON.stringify({ realtimeInput: { text: msg } }))
    }, 30_000)

    this.clientProgressTimers.set(client, timer)
  }

  private startUsageBillingTimer(client: WebSocket, session: LiveSession): void {
    this.clientUsageLastChargedAt.set(client, Date.now())
    if (this.clientUsageBillingTimers.has(client)) return

    const timer = setInterval(() => {
      void this.flushUsageBilling(client, session, 'interval')
    }, 30_000)

    this.clientUsageBillingTimers.set(client, timer)
  }

  private stopUsageBillingTimer(client: WebSocket): void {
    const usageTimer = this.clientUsageBillingTimers.get(client)
    if (!usageTimer) return
    clearInterval(usageTimer)
    this.clientUsageBillingTimers.delete(client)
  }

  private async flushUsageBilling(
    client: WebSocket,
    session: LiveSession,
    reason: 'start' | 'interval',
    minimumSeconds = 0,
    throwOnFailure = false,
  ): Promise<void> {
    const lastChargedAt = this.clientUsageLastChargedAt.get(client)
    if (!lastChargedAt) return

    const now = Date.now()
    const durationSeconds = Math.max(minimumSeconds, (now - lastChargedAt) / 1000)
    if (durationSeconds <= 0) return

    try {
      await this.brainLiveService.trackSessionUsage(
        session.userId,
        durationSeconds,
        session.orgId,
      )
      this.clientUsageLastChargedAt.set(client, now)
    } catch (err) {
      this.logger.error(
        `brain_live usage_billing_failed session=${session.id} reason=${reason} duration=${durationSeconds.toFixed(1)}s err=${err instanceof Error ? err.message : String(err)}`,
      )
      const gemini = this.clientToGemini.get(client)
      if (gemini?.readyState === WebSocket.OPEN) gemini.close()
      this.sendJson(client, { type: 'error', message: 'Voice billing failed' })
      if (client.readyState === WebSocket.OPEN) client.close(1011, 'Voice billing failed')
      if (throwOnFailure) throw err
    }
  }

  private sendJson(client: WebSocket, data: Record<string, unknown>): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  }
}
