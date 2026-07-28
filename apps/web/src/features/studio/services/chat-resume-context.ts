import type { Message, SendMessageParams } from '../types'

type ResumeMessageContext = Pick<
  SendMessageParams,
  | 'content'
  | 'documents'
  | 'highlighted_artifacts'
  | 'message_references'
  | 'ui_selected_artifact'
  | 'system_context'
>

const RESUME_SYSTEM_CONTEXT = [
  'This is a user-triggered Resume of an interrupted assistant turn.',
  'Continue the same unfinished task from the exact visible user request and partial assistant output included in the hidden resume message.',
  'The written user request is authoritative; attachments are supporting evidence unless the user explicitly asked to work on the attachment itself.',
  'Do not restart completed work, switch to an unrelated task, or claim completion before the original request is actually finished.',
].join(' ')

function metadataArray<T>(metadata: Record<string, unknown>, key: string): T[] | undefined {
  const value = metadata[key]
  return Array.isArray(value) ? (value as T[]) : undefined
}

export function buildChatResumeContext(messages: Message[]): ResumeMessageContext | null {
  let userIndex = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index]
    if (
      candidate?.role === 'user' &&
      candidate.metadata?.hidden !== true &&
      candidate.content?.trim()
    ) {
      userIndex = index
      break
    }
  }
  if (userIndex < 0) return null

  const userMessage = messages[userIndex]!
  const partialAssistant = messages
    .slice(userIndex + 1)
    .reverse()
    .find((candidate) => candidate.role === 'assistant' && candidate.content?.trim())
  const content = [
    'Continue the interrupted response from exactly where it stopped. Do not repeat work already shown.',
    '',
    'AUTHORITATIVE USER REQUEST:',
    userMessage.content!.trim(),
    ...(partialAssistant
      ? ['', 'PARTIAL ASSISTANT OUTPUT ALREADY SHOWN:', partialAssistant.content!.trim()]
      : []),
    '',
    'Finish the remaining work and verify the original request is fully handled.',
  ].join('\n')
  const metadata = userMessage.metadata ?? {}
  const uiSelectedArtifact =
    metadata.ui_selected_artifact &&
    typeof metadata.ui_selected_artifact === 'object' &&
    !Array.isArray(metadata.ui_selected_artifact)
      ? (metadata.ui_selected_artifact as NonNullable<SendMessageParams['ui_selected_artifact']>)
      : undefined

  return {
    content,
    documents: metadataArray(metadata, 'documents'),
    highlighted_artifacts: metadataArray(metadata, 'highlighted_artifacts'),
    message_references: metadataArray(metadata, 'message_references'),
    ...(uiSelectedArtifact ? { ui_selected_artifact: uiSelectedArtifact } : {}),
    system_context: RESUME_SYSTEM_CONTEXT,
  }
}
