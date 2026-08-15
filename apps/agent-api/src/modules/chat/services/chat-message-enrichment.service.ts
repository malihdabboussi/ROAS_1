import { Injectable, type Logger } from '@nestjs/common'
import type { DocumentIntelligenceMetadata } from '@vibey/api-shared'
import { AgentRuntimeReadinessService } from '../../agent-sync/services/agent-runtime-readiness.service'
import { ChatDocumentContextService } from './chat-document-context.service'
import { ChatReferenceContextService } from './chat-reference-context.service'
import { ChatSlashCommandService, type ResolvedSlashCommand } from './chat-slash-command.service'
import { DocumentParserService } from './document-parser.service'

interface ChatEnrichmentDocument {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  dataUrl?: string
  fileUrl?: string
  mimeType?: string
  mediaAssetId?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

interface HighlightedArtifact {
  id: string
  type: string
  label: string
}

interface MessageReference {
  kind: 'artifact' | 'media' | 'mission' | 'conversation' | 'person' | 'campaign'
  id: string
  label: string
  type?: string
  campaign_id?: string
  brain_id?: string
}

type PlatformToolRunner = <T>(
  options: {
    name: string
    action: string
    labels: readonly string[]
    seed: string
    id: string
  },
  operation: () => Promise<T>,
) => Promise<T>

const DOCUMENT_CONTEXT_TOOL_NAME = 'document_context'
const DOCUMENT_CONTEXT_TOOL_ACTION = 'read_attachments'
const ARTIFACT_CONTEXT_TOOL_NAME = 'artifact_context'
const ARTIFACT_CONTEXT_TOOL_ACTION = 'link_selected_items'
const REFERENCE_CONTEXT_TOOL_NAME = 'reference_context'
const REFERENCE_CONTEXT_TOOL_ACTION = 'resolve_references'
const SKILL_CONTEXT_TOOL_NAME = 'skill_context'
const SKILL_CONTEXT_TOOL_ACTION = 'load_requested_skills'
const DOCUMENT_CONTEXT_TOOL_LABELS = [
  'Reading attached documents',
  'Reviewing your uploads',
  'Scanning document context',
  'Pulling details from attachments',
  'Checking attached files',
] as const
const RESEARCH_CONTEXT_TOOL_LABELS = [
  'Checking the attached posts',
  'Reading the attached post research',
  'Reviewing the attached posts',
  'Pulling the post research context',
  'Opening the attached posts',
] as const
const ARTIFACT_CONTEXT_TOOL_LABELS = [
  'Linking selected items',
  'Reviewing selected work',
  'Pulling context from selected items',
  'Connecting selected artifacts',
  'Checking selected campaign items',
] as const
const REFERENCE_CONTEXT_TOOL_LABELS = [
  'Reviewing referenced messages',
  'Following your references',
  'Pulling linked context',
  'Connecting referenced items',
  'Checking referenced work',
] as const
const SKILL_CONTEXT_TOOL_LABELS = [
  'Loading requested skills',
  'Preparing selected skills',
  'Reading skill instructions',
  'Opening requested workflows',
  'Adding skill context',
] as const

@Injectable()
export class ChatMessageEnrichmentService {
  constructor(
    private readonly runtimeReadiness: AgentRuntimeReadinessService,
    private readonly documentParser: DocumentParserService,
    private readonly chatDocumentContextService: ChatDocumentContextService,
    private readonly chatReferenceContextService: ChatReferenceContextService,
    private readonly chatSlashCommandService: ChatSlashCommandService,
  ) {}

  async buildEnrichedMessage(input: {
    content: string
    conversationId: string
    resolvedCampaignId?: string
    userId: string
    orgId?: string
    resolvedAgentId: string
    runtime: { agentKey: string; gatewayAgentId: string }
    documents?: ChatEnrichmentDocument[]
    highlightedArtifacts?: HighlightedArtifact[]
    messageReferences?: MessageReference[]
    runPlatformTool: PlatformToolRunner
    logger: Pick<Logger, 'warn' | 'log'>
  }): Promise<{
    latestUserContent: string
    combinedDocumentContext: string
    highlightedArtifactsContext: string
    messageReferencesContext: string
    slashCommandContext: string
    resolvedSlashCommands: ResolvedSlashCommand[]
  }> {
    let latestUserContent = input.content
    let combinedDocumentContext = ''
    let highlightedArtifactsContext = ''
    let messageReferencesContext = ''
    let slashCommandContext = ''
    let resolvedSlashCommands: ResolvedSlashCommand[] = []

    if (input.documents && input.documents.length > 0) {
      await input.runPlatformTool(
        {
          name: DOCUMENT_CONTEXT_TOOL_NAME,
          action: DOCUMENT_CONTEXT_TOOL_ACTION,
          labels: DOCUMENT_CONTEXT_TOOL_LABELS,
          seed: `${input.conversationId}:documents:${input.documents.length}:${input.content}`,
          id: `platform-document-context-${input.conversationId}`,
        },
        async () => {
          await this.hydrateDocuments(input)

          const textDocuments = input.documents!.filter((doc) => doc.type === 'text')
          const videoDocuments = input.documents!.filter(
            (doc) => doc.type === 'video' && !!doc.fileUrl,
          )
          const audioDocuments = input.documents!.filter(
            (doc) => doc.type === 'audio' && !!doc.fileUrl,
          )
          const imageDocuments = input.documents!.filter(
            (doc) => doc.type === 'image' && (!!doc.fileUrl || !!doc.mediaAssetId),
          )
          const docContext = this.chatDocumentContextService.buildDocumentContext(textDocuments)
          const imageContext = this.chatDocumentContextService.buildImageContext(imageDocuments)
          const videoContext = this.chatDocumentContextService.buildVideoContext(videoDocuments)
          const audioContext = this.chatDocumentContextService.buildAudioContext(audioDocuments)
          const combinedContext = [docContext, imageContext, videoContext, audioContext]
            .filter(Boolean)
            .join('')
          combinedDocumentContext = combinedContext
          if (combinedContext) {
            latestUserContent += combinedContext
          }

          this.chatDocumentContextService
            .saveUploadedDocuments(
              input.conversationId,
              input.resolvedCampaignId,
              input.documents!,
              input.logger,
            )
            .catch((err) => input.logger.warn(`Failed to save uploaded documents: ${err}`))
        },
      )
    }

    if (input.highlightedArtifacts && input.highlightedArtifacts.length > 0) {
      const allResearchItems = input.highlightedArtifacts.every((a) => a.type.endsWith('-research'))
      await input.runPlatformTool(
        {
          name: ARTIFACT_CONTEXT_TOOL_NAME,
          action: ARTIFACT_CONTEXT_TOOL_ACTION,
          labels: allResearchItems ? RESEARCH_CONTEXT_TOOL_LABELS : ARTIFACT_CONTEXT_TOOL_LABELS,
          seed: `${input.conversationId}:artifacts:${input.highlightedArtifacts.length}:${input.content}`,
          id: `platform-artifact-context-${input.conversationId}`,
        },
        async () => {
          const artifactCtx =
            await this.chatReferenceContextService.buildHighlightedArtifactsContext(
              input.highlightedArtifacts!,
              input.logger,
            )
          if (artifactCtx) {
            highlightedArtifactsContext = artifactCtx
            latestUserContent += artifactCtx
          }
        },
      )
    }

    if (input.messageReferences && input.messageReferences.length > 0) {
      await input.runPlatformTool(
        {
          name: REFERENCE_CONTEXT_TOOL_NAME,
          action: REFERENCE_CONTEXT_TOOL_ACTION,
          labels: REFERENCE_CONTEXT_TOOL_LABELS,
          seed: `${input.conversationId}:references:${input.messageReferences.length}:${input.content}`,
          id: `platform-reference-context-${input.conversationId}`,
        },
        async () => {
          const refCtx = await this.chatReferenceContextService.buildMessageReferencesContext(
            input.messageReferences!,
            input.userId,
            input.orgId,
          )
          if (refCtx) {
            messageReferencesContext = refCtx
            latestUserContent += refCtx
          }
        },
      )
    }

    const slashTokens = this.chatSlashCommandService.parseSlashTokens(input.content)
    if (slashTokens.length > 0) {
      await input.runPlatformTool(
        {
          name: SKILL_CONTEXT_TOOL_NAME,
          action: SKILL_CONTEXT_TOOL_ACTION,
          labels: SKILL_CONTEXT_TOOL_LABELS,
          seed: `${input.conversationId}:skills:${slashTokens.join(',')}:${input.content}`,
          id: `platform-skill-context-${input.conversationId}`,
        },
        async () => {
          resolvedSlashCommands = await this.chatSlashCommandService
            .resolveSlashCommands(input.userId, input.resolvedAgentId, slashTokens, input.orgId)
            .catch((err) => {
              input.logger.warn(`Slash command resolution failed: ${err}`)
              return [] as ResolvedSlashCommand[]
            })
          if (resolvedSlashCommands.length > 0) {
            const requiredSkillFiles = resolvedSlashCommands.flatMap(
              (command) => command.requiredSkillFiles ?? [],
            )
            if (requiredSkillFiles.length > 0) {
              await this.runtimeReadiness.ensureRuntimeReady({
                userId: input.userId,
                orgId: input.orgId ?? null,
                agentKey: input.runtime.agentKey,
                gatewayAgentId: input.runtime.gatewayAgentId,
                requiredSkillFiles,
              })
            }
            const slashContext =
              this.chatSlashCommandService.buildSlashCommandContext(resolvedSlashCommands)
            slashCommandContext = slashContext
            const resolvedKeys = resolvedSlashCommands.map((c) => c.key)
            const cleanedContent = this.chatSlashCommandService.stripResolvedSlashTokens(
              latestUserContent,
              resolvedKeys,
            )
            latestUserContent = slashContext + '\n\n' + cleanedContent
          }
        },
      )
    }

    return {
      latestUserContent,
      combinedDocumentContext,
      highlightedArtifactsContext,
      messageReferencesContext,
      slashCommandContext,
      resolvedSlashCommands,
    }
  }

  private async hydrateDocuments(input: {
    documents?: ChatEnrichmentDocument[]
    userId: string
    orgId?: string
    conversationId: string
    resolvedCampaignId?: string
    logger: Pick<Logger, 'warn'>
  }): Promise<void> {
    for (const doc of input.documents ?? []) {
      if (doc.type === 'text' && doc.mediaAssetId) {
        try {
          const cached = await this.chatDocumentContextService.loadUploadedDocumentCache(
            doc.mediaAssetId,
            input.userId,
            input.orgId ?? null,
          )
          if (cached) {
            if (cached.documentIntelligence) {
              doc.documentIntelligence = cached.documentIntelligence
            }
            if (cached.pageCount && !doc.pageCount) doc.pageCount = cached.pageCount
            if (cached.sizeBytes && !doc.sizeBytes) doc.sizeBytes = cached.sizeBytes
            if (cached.mimeType && !doc.mimeType) doc.mimeType = cached.mimeType
            if (cached.fileUrl && !doc.fileUrl) doc.fileUrl = cached.fileUrl
            if (
              cached.textLayer &&
              this.chatDocumentContextService.isCachedDocumentTextUsable(
                cached.textLayer,
                cached.documentIntelligence,
                doc,
              )
            ) {
              doc.text = cached.textLayer
            }
          }
        } catch (err) {
          input.logger.warn(`Failed to load cached document text for ${doc.mediaAssetId}: ${err}`)
        }
      }

      const cacheResolvedToNativeFile =
        doc.documentIntelligence?.status === 'ready' &&
        doc.documentIntelligence.strategy === 'native_file'
      if (doc.type === 'text' && !doc.text?.trim() && doc.fileUrl && !cacheResolvedToNativeFile) {
        try {
          const res = await fetch(doc.fileUrl)
          if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer())
            const [parsed] = await this.documentParser.parse(
              buffer,
              doc.filename,
              doc.mimeType ?? 'application/octet-stream',
              {
                userId: input.userId,
                orgId: input.orgId ?? undefined,
                conversationId: input.conversationId,
                campaignId: input.resolvedCampaignId ?? undefined,
                feature: 'chat',
                action: 'document_ocr',
              },
            )
            if (parsed?.text?.trim()) {
              doc.text = parsed.text
            }
            if (parsed?.documentIntelligence) {
              doc.documentIntelligence = parsed.documentIntelligence
            }
            if (parsed?.preview && !doc.preview) doc.preview = parsed.preview
            if (parsed?.sizeBytes && !doc.sizeBytes) doc.sizeBytes = parsed.sizeBytes
            if (parsed?.pageCount && !doc.pageCount) doc.pageCount = parsed.pageCount
            if (parsed?.mediaAssetId && !doc.mediaAssetId) doc.mediaAssetId = parsed.mediaAssetId
            if (doc.mediaAssetId && (parsed?.text?.trim() || parsed?.documentIntelligence)) {
              this.chatDocumentContextService
                .cacheUploadedDocumentText(
                  doc.mediaAssetId,
                  parsed.text ?? '',
                  parsed.pageCount,
                  parsed.documentIntelligence,
                )
                .catch((err) =>
                  input.logger.warn(
                    `Failed to cache parsed text for ${doc.mediaAssetId}: ${String(err)}`,
                  ),
                )
            }
          }
        } catch (err) {
          input.logger.warn(`Failed to extract text from ${doc.filename}: ${err}`)
        }
      }
    }
  }
}
