import { Injectable, Logger } from '@nestjs/common'
import type { DocumentIntelligenceMetadata } from '@vibey/api-shared'
import { DocumentParserService } from '../../chat/services/document-parser.service'
import {
  OpenClawProxyService,
  type OpenClawInputContentPart,
  type OpenClawInputMessage,
} from '../../chat/services/openclaw-proxy.service'
import { buildUploadedDocumentContext } from '../../chat/utils/uploaded-document-context'
import { AgentRuntimeService } from '../../shared/services/agent-runtime.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import { AdminSkillBuilderContextService } from './admin-skill-builder-context.service'

type ChatHistoryRow = { role: string; content: string }

type SkillBuilderDocument = {
  filename: string
  type: 'text' | 'image' | 'video'
  text?: string
  fileUrl?: string
  dataUrl?: string
  mimeType?: string
  mediaAssetId?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

@Injectable()
export class AdminSkillBuilderChatService {
  private readonly logger = new Logger(AdminSkillBuilderChatService.name)

  constructor(
    private readonly openClaw: OpenClawProxyService,
    private readonly agentRuntime: AgentRuntimeService,
    private readonly requestContext: RequestContextService,
    private readonly adminContext: AdminSkillBuilderContextService,
    private readonly documentParser: DocumentParserService,
  ) {}

  async streamChat(input: {
    session_id: string
    acting_user_id: string
    org_id?: string | null
    target_agent_key: string
    target_agent_name?: string
    admin_user_id: string
    content: string
    documents?: SkillBuilderDocument[]
    history: ChatHistoryRow[]
    session_key: string
    system_context?: string
    send: (type: string, data: Record<string, unknown>) => Promise<void>
    signal?: AbortSignal
  }): Promise<void> {
    const sessionId = input.session_id
    const orgId = input.org_id ?? null
    const userId = input.acting_user_id
    const documents = input.documents ?? []

    this.adminContext.set(sessionId, {
      adminUserId: input.admin_user_id,
      actingUserId: userId,
      orgId,
      targetAgentKey: input.target_agent_key,
    })

    const gatewayAgentId = this.agentRuntime.resolveGatewayAgentId('vibey', orgId, userId)
    this.requestContext.set(
      sessionId,
      userId,
      null,
      '',
      null,
      'auto',
      orgId,
      'studio',
      null,
      null,
      'unknown',
      crypto.randomUUID(),
    )

    const instructions = [
      input.system_context ?? '',
      'You have the skill-creator skill. Use vibey_backend skill actions to list, create, and update skills.',
      `Always set agent_key to "${input.target_agent_key}" in every skill-related action.`,
    ]
      .filter(Boolean)
      .join('\n\n')

    const inputArray: OpenClawInputMessage[] = []
    const prior = input.history.filter((row) => row.role === 'user' || row.role === 'assistant')
    const last = prior[prior.length - 1]
    const historyWithoutLatest =
      last?.role === 'user' && last.content === input.content ? prior.slice(0, -1) : prior

    for (const row of historyWithoutLatest) {
      inputArray.push({
        type: 'message',
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.content,
      })
    }

    let latestUserContent = input.content
    if (documents.length > 0) {
      for (const doc of documents) {
        if (doc.type === 'text' && !doc.text?.trim() && doc.fileUrl) {
          try {
            const res = await fetch(doc.fileUrl)
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer())
              const [parsed] = await this.documentParser.parse(
                buffer,
                doc.filename,
                doc.mimeType ?? 'application/octet-stream',
                {
                  userId,
                  orgId: orgId ?? undefined,
                  conversationId: sessionId,
                  feature: 'admin_skill_builder',
                  action: 'document_ocr',
                },
              )
              if (parsed?.text?.trim()) doc.text = parsed.text
              if (parsed?.documentIntelligence) {
                doc.documentIntelligence = parsed.documentIntelligence
              }
            }
          } catch (err) {
            this.logger.warn(`Failed to extract text from ${doc.filename}: ${err}`)
          }
        }
      }
      const textDocuments = documents.filter((doc) => doc.type === 'text')
      const videoDocuments = documents.filter((doc) => doc.type === 'video' && !!doc.fileUrl)
      const docContext = this.buildDocumentContext(textDocuments)
      const videoContext = this.buildVideoContext(videoDocuments)
      const combined = [docContext, videoContext].filter(Boolean).join('')
      if (combined) latestUserContent += combined
    }

    const imageParts: OpenClawInputContentPart[] = documents
      .filter((doc) => doc.type === 'image' && (doc.fileUrl || doc.dataUrl))
      .map((doc) => ({
        type: 'input_image' as const,
        source: { type: 'url' as const, url: (doc.fileUrl ?? doc.dataUrl) as string },
      }))

    if (imageParts.length > 0) {
      inputArray.push({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: latestUserContent }, ...imageParts],
      })
    } else {
      inputArray.push({
        type: 'message',
        role: 'user',
        content: latestUserContent,
      })
    }

    await input.send('message_start', {
      message_id: sessionId,
      conversation_id: sessionId,
    })

    try {
      const result = await this.openClaw.streamCompletion({
        input: inputArray,
        instructions,
        send: input.send,
        model: undefined,
        agentId: gatewayAgentId,
        sessionKey: input.session_key,
        conversationId: sessionId,
        userId,
        signal: input.signal,
        channel: 'studio',
        identitySuffix: '-CEO',
        disabledNativeActions: [],
      })

      await input.send('done', {
        message_id: sessionId,
        content: result.content,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Admin skill builder chat failed'
      this.logger.error(message)
      await input.send('error', { message })
      throw err
    } finally {
      this.adminContext.clear(sessionId)
      this.requestContext.clear(sessionId)
    }
  }

  private buildDocumentContext(documents: SkillBuilderDocument[]): string {
    return buildUploadedDocumentContext(documents)
  }

  private buildVideoContext(documents: SkillBuilderDocument[]): string {
    if (documents.length === 0) return ''
    const parts = ['\n\n---\n**USER-UPLOADED VIDEOS**\n']
    for (const doc of documents) {
      if (doc.type !== 'video' || !doc.fileUrl) continue
      parts.push(`\n### ${doc.filename}\n- url: ${doc.fileUrl}\n`)
    }
    return parts.join('')
  }
}
