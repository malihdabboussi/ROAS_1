import type { MouseEvent, ReactNode } from 'react'
import { FolderGit2 } from 'lucide-react'
import { WorkRequestChatResumeCard } from '@/components/chat/WorkRequestChatResumeCard'
import { dispatchFlowClarificationAnswer } from '@/features/flows/lib/flow-clarification-ui'
import { missionDeliverableFromContentBlock } from '@/lib/missions'
import { extractMarkdownFromDocumentContent } from '../../lib/document-content-markdown'
import { fetchDocument } from '../../services/artifact-preview.service'
import { patchMessageMetadata } from '../../services/chat.service'
import type { MessageContentBlock } from '../../types'
import { downloadMarkdown } from '../../utils/artifact-export'
import { AgentConversationThread } from '../chat/AgentConversationThread'
import { AgentHireSuggestionCard } from '../chat/AgentHireSuggestionCard'
import { AgentIntegrationConfirmCard } from '../chat/AgentIntegrationConfirmCard'
import { ArtifactInlinePreviewCard } from '../chat/artifact-inline-preview-card'
import { ChatPlanCard } from '../chat/ChatPlanCard'
import { ClarificationCard } from '../chat/ClarificationCard'
import { DeleteConfirmCard } from '../chat/DeleteConfirmCard'
import { DeleteStatusCard } from '../chat/DeleteStatusCard'
import { DocumentCard } from '../chat/DocumentCard'
import { EmailSendConfirmCard } from '../chat/EmailSendConfirmCard'
import { EmailSendStatusCard } from '../chat/EmailSendStatusCard'
import { InlineAgentAccessRequest } from '../chat/InlineAgentAccessRequest'
import type { ContentBlockRenderContext } from './message-bubble.types'

export function messageContentBlockPartB(
  block: MessageContentBlock,
  ctx: ContentBlockRenderContext,
): ReactNode {
  const {
    message,
    contentBlocksOrdered,
    latestPlanBlockIds,
    replaceUiBlock,
    setOrderedBlocks,
    sendOrApprove,
    channelSource,
    deliverableBlockSource,
    onOpenDeliverablePreview,
  } = ctx

  const deliverableSource = channelSource ?? deliverableBlockSource
  const channelPreview =
    deliverableSource && onOpenDeliverablePreview
      ? (b: MessageContentBlock) => {
          const d = missionDeliverableFromContentBlock(b, deliverableSource)
          if (d) onOpenDeliverablePreview(d)
        }
      : null

  if (block.type === 'email_send_confirm') {
    if (block.status === 'sent') return null
    return (
      <EmailSendConfirmCard
        key={block.id}
        block={block}
        onSent={(payload) => {
          const statusBlock: MessageContentBlock = {
            type: 'email_send_status',
            id: `email-status-${Date.now()}`,
            send_type: payload.send_type,
            subject: payload.subject,
            sequence_name: payload.sequence_name,
            total_emails: payload.total_emails,
            total_days: payload.total_days,
            provider: payload.provider,
            provider_name: payload.provider_name,
            status: payload.schedule_date ? 'scheduled' : 'sent',
            schedule_date: payload.schedule_date,
          }
          const updatedConfirm: MessageContentBlock = { ...block, status: 'sent' }
          const nextBlocks = [
            ...contentBlocksOrdered.map((b) => (b.id === block.id ? updatedConfirm : b)),
            statusBlock,
          ]
          setOrderedBlocks(
            message.conversation_id,
            message.id,
            nextBlocks as Array<Record<string, unknown>>,
          )
          void patchMessageMetadata(message.conversation_id, message.id, {
            content_blocks_ordered: nextBlocks,
          })
        }}
      />
    )
  }

  if (block.type === 'email_send_status') {
    return <EmailSendStatusCard key={block.id} block={block} />
  }

  if (block.type === 'delete_confirm') {
    if (block.status !== 'pending') return null
    return (
      <DeleteConfirmCard
        key={block.id}
        block={block}
        agentMessageId={message.id}
        onResolved={(payload) => {
          const statusBlock: MessageContentBlock = {
            type: 'delete_status',
            id: `delete-status-${Date.now()}`,
            delete_action: block.delete_action,
            entity_type: payload.entity_type,
            entity_id: payload.entity_id,
            entity_name: payload.entity_name,
            status:
              payload.status === 'success'
                ? 'success'
                : payload.status === 'cancelled'
                  ? 'cancelled'
                  : 'failed',
            error: payload.error,
          }
          const updatedConfirm: MessageContentBlock = {
            ...block,
            status:
              payload.status === 'success'
                ? 'approved'
                : payload.status === 'cancelled'
                  ? 'cancelled'
                  : 'error',
            error: payload.error,
          }
          const nextBlocks = [
            ...contentBlocksOrdered.map((b) => (b.id === block.id ? updatedConfirm : b)),
            statusBlock,
          ]
          setOrderedBlocks(
            message.conversation_id,
            message.id,
            nextBlocks as Array<Record<string, unknown>>,
          )
          void patchMessageMetadata(message.conversation_id, message.id, {
            content_blocks_ordered: nextBlocks,
          })
        }}
      />
    )
  }

  if (block.type === 'delete_status') {
    return <DeleteStatusCard key={block.id} block={block} />
  }

  if (block.type === 'clarification') {
    return (
      <ClarificationCard
        key={block.id}
        title={block.title}
        introMessage={block.introMessage}
        questions={block.questions}
        status={block.status}
        answers={block.answers}
        onSubmit={(answers) => {
          const lines: string[] = []
          for (const q of block.questions) {
            const answer = answers[q.id]
            if (!answer) continue
            let label: string
            if (Array.isArray(answer)) {
              label = answer.map((id) => q.options.find((o) => o.id === id)?.label || id).join(', ')
            } else if (answer.startsWith('__custom__:')) {
              label = answer.replace('__custom__:', '')
            } else {
              label = q.options.find((o) => o.id === answer)?.label || answer
            }
            lines.push(`${q.text}: ${label}`)
          }
          const updatedBlock = { ...block, status: 'submitted' as const, answers }
          replaceUiBlock(block.id, updatedBlock)
          if (block.source === 'flow') {
            dispatchFlowClarificationAnswer({ answers, questions: block.questions })
            return
          }
          sendOrApprove(lines.join('\n'))
        }}
        onSkip={() => {
          const updatedBlock = { ...block, status: 'skipped' as const }
          replaceUiBlock(block.id, updatedBlock)
          sendOrApprove('Skipped — proceed with your best judgment.')
        }}
      />
    )
  }

  if (block.type === 'work_request') {
    return (
      <WorkRequestChatResumeCard
        key={block.id}
        title={block.title}
        reviewUrl={block.reviewUrl}
        status={block.status}
        summary={block.summary}
      />
    )
  }

  if (block.type === 'chat_plan') {
    return (
      <ChatPlanCard
        key={block.id}
        planId={block.plan_id}
        title={block.title}
        summary={block.summary}
        items={block.items}
        planStatus={block.plan_status}
        version={block.version}
        isHistorical={!latestPlanBlockIds.has(block.id)}
      />
    )
  }

  if (block.type === 'project_preview') {
    const body = (
      <div className="surface-card border-border rounded-xl border p-3">
        <div className="flex items-center gap-2">
          <FolderGit2 className="text-primary h-4 w-4" />
          <span className="body-3 text-foreground font-medium">{block.name}</span>
        </div>
        <p className="typo-caption text-muted-foreground mt-1">
          Project ready. ID: {block.project_id}
          {Array.isArray(block.files) ? ` • ${block.files.length} files` : ''}
        </p>
      </div>
    )
    if (channelPreview) {
      return (
        <button
          key={block.id}
          type="button"
          onClick={() => channelPreview(block)}
          className="hover:bg-hover-subtle w-full max-w-[400px] cursor-pointer rounded-xl text-left transition-colors"
        >
          {body}
        </button>
      )
    }
    return <div key={block.id}>{body}</div>
  }

  if (block.type === 'agent_conversation') {
    return (
      <AgentConversationThread
        key={block.id}
        delegationId={block.delegationId}
        callerAgent={block.callerAgent}
        callerAgentName={block.callerAgentName}
        callerAgentImage={block.callerAgentImage}
        callerAgentRole={block.callerAgentRole}
        targetAgent={block.targetAgent}
        targetAgentName={block.targetAgentName}
        targetAgentImage={block.targetAgentImage}
        targetAgentRole={block.targetAgentRole}
        delegationType={block.delegationType}
        initialPrompt={block.initialPrompt}
        turns={block.turns ?? []}
        status={block.status}
        participants={block.participants}
        deliverables={block.deliverables}
        summary={block.summary}
      />
    )
  }

  if (block.type === 'agent_integration_confirm') {
    return (
      <AgentIntegrationConfirmCard
        key={block.id}
        status={block.status}
        onConfirm={() => {
          replaceUiBlock(block.id, { ...block, status: 'approved' })
          sendOrApprove('I allow this integration. Please proceed.')
        }}
        onCancel={() => {
          replaceUiBlock(block.id, { ...block, status: 'cancelled' })
          sendOrApprove('Skip integration for now.')
        }}
      />
    )
  }

  if (block.type === 'agent_access_request') {
    return (
      <InlineAgentAccessRequest
        key={block.id}
        block={block}
        onResolved={(nextBlock) => replaceUiBlock(block.id, nextBlock)}
      />
    )
  }

  if (block.type === 'agent_hire_suggestion') {
    return (
      <AgentHireSuggestionCard
        key={block.id}
        delegationId={block.delegationId}
        campaignId={block.campaignId}
        suggestions={block.suggestions}
        originalAction={block.originalAction}
        originalPrompt={block.originalPrompt}
        status={block.status}
      />
    )
  }

  if (block.type === 'artifact_preview') {
    return (
      <ArtifactInlinePreviewCard
        key={block.id}
        artifactType={block.artifactType}
        artifactId={block.artifactId}
        name={block.name}
        subtitle={block.subtitle}
        career={block.career}
        age={block.age}
        backgroundProfile={block.backgroundProfile}
        bodyPreview={block.bodyPreview}
        emailSubject={block.emailSubject}
        funnelPageId={block.funnelPageId}
        spaceId={block.spaceId}
        imageUrl={block.imageUrl}
        videoUrl={block.videoUrl}
        status={block.status}
        openPreviewOverride={channelPreview ? () => channelPreview(block) : undefined}
      />
    )
  }

  if (block.type === 'document_card') {
    const documentId = block.documentId?.trim() ?? ''
    const handleDocumentDownload = (_e: MouseEvent<HTMLButtonElement>) => {
      if (!documentId) return
      void (async () => {
        const doc = await fetchDocument(documentId)
        const title = doc.title?.trim() || block.title
        const pdfUrl =
          doc.document_type === 'pdf' &&
          typeof doc.content.file_url === 'string' &&
          doc.content.file_url.trim()
            ? doc.content.file_url.trim()
            : ''
        if (pdfUrl) {
          window.open(pdfUrl, '_blank', 'noopener,noreferrer')
          return
        }
        const md = extractMarkdownFromDocumentContent(doc.content) || block.snippet.trim()
        if (!md.trim()) {
          throw new Error('Document has no downloadable markdown body')
        }
        downloadMarkdown(md.trim(), title, block.title)
      })()
    }

    return (
      <DocumentCard
        key={block.id}
        title={block.title}
        documentId={documentId}
        spaceId={block.spaceId}
        spaceItemId={block.spaceItemId}
        snippet={block.snippet}
        onOpenOverride={channelPreview ? () => channelPreview(block) : undefined}
        onDownloadClick={documentId ? handleDocumentDownload : undefined}
      />
    )
  }

  if (block.type === 'browser_screenshot') {
    return null
  }

  return null
}
