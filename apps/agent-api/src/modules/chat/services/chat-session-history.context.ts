const MAX_HISTORY_CHARS = 32_000
const MAX_ASSISTANT_PREVIEW = 2_500
const MAX_DOCUMENT_CHARS = 4_000
const MAX_USER_CHARS = 8_000

const HISTORY_PREAMBLE = [
  '[CONVERSATION_HISTORY]',
  'This chat was restored into a new session (fork or recovered transcript). The turns below ARE this conversation. Treat them as your own prior user and assistant messages. Named documents and outputs are already in this thread. Follow-ups like "all this", "the plan", or "that deck" refer to this history. Do not say you lack context when the relevant work is below.',
  '',
].join('\n')

export function buildConversationHistoryContext(
  dbMessages: Record<string, unknown>[],
): string {
  const conversationMsgs = dbMessages.filter((m) => m.role === 'user' || m.role === 'assistant')
  if (conversationMsgs.length === 0) return ''

  const prior =
    conversationMsgs.at(-1)?.role === 'user' ? conversationMsgs.slice(0, -1) : conversationMsgs
  if (prior.length === 0) return ''

  const headerChars = HISTORY_PREAMBLE.length
  const selected: string[] = []
  let used = headerChars

  for (let i = prior.length - 1; i >= 0; i--) {
    let entry = formatHistoryEntry(prior[i]!)
    if (!entry) continue
    const extra = entry.length + 2
    if (used + extra > MAX_HISTORY_CHARS) {
      const room = MAX_HISTORY_CHARS - used - 2
      if (room < 80) break
      entry = `${entry.slice(0, room)}...`
    }
    selected.push(entry)
    used += entry.length + 2
  }

  if (selected.length === 0) return ''
  return HISTORY_PREAMBLE + selected.reverse().join('\n\n')
}

function formatHistoryEntry(msg: Record<string, unknown>): string {
  const role = msg.role === 'user' ? 'User' : 'Assistant'
  const body = messageBody(msg)
  const attachments = formatAttachments(msg)
  const tools = formatCompletedTools(msg)
  const artifacts = formatNamedArtifacts(msg)
  const extras = [attachments, artifacts, tools].filter(Boolean).join('')
  if (!body && !extras) return ''

  if (role === 'User') {
    const preview =
      body.length > MAX_USER_CHARS ? `${body.slice(0, MAX_USER_CHARS)}...` : body
    return `**${role}:** ${preview}${extras}`
  }

  const preview =
    body.length > MAX_ASSISTANT_PREVIEW
      ? `${body.slice(0, MAX_ASSISTANT_PREVIEW)}...`
      : body
  return `**${role}:** ${preview}${extras}`
}

function messageBody(msg: Record<string, unknown>): string {
  const content = typeof msg.content === 'string' ? msg.content.trim() : ''
  if (content) return content
  const blocks = Array.isArray(msg.content_blocks) ? msg.content_blocks : []
  return blocks
    .filter(
      (block): block is Record<string, unknown> =>
        Boolean(block) && typeof block === 'object' && !Array.isArray(block),
    )
    .filter((block) => block.type === 'text')
    .map((block) => (typeof block.content === 'string' ? block.content.trim() : ''))
    .filter(Boolean)
    .join('\n')
}

function formatAttachments(msg: Record<string, unknown>): string {
  const meta = asRecord(msg.metadata)
  const documents = asObjectRows(meta?.documents)
  if (documents.length === 0) return ''

  const lines = documents.map((doc) => {
    const filename =
      (typeof doc.filename === 'string' && doc.filename.trim()) || 'Attached file'
    const excerpt = documentExcerpt(doc)
    if (!excerpt) return `\n  Attached: ${filename}`
    return `\n  Attached: ${filename}\n  """\n  ${excerpt}\n  """`
  })
  return lines.join('')
}

function documentExcerpt(doc: Record<string, unknown>): string {
  const text = typeof doc.text === 'string' ? doc.text.trim() : ''
  const preview = typeof doc.preview === 'string' ? doc.preview.trim() : ''
  const source = text || preview
  if (!source) return ''
  return source.length > MAX_DOCUMENT_CHARS
    ? `${source.slice(0, MAX_DOCUMENT_CHARS)}...`
    : source
}

function formatNamedArtifacts(msg: Record<string, unknown>): string {
  const meta = asRecord(msg.metadata)
  const labels = [
    ...asObjectRows(meta?.highlighted_artifacts).map((row) => stringField(row, 'label')),
    ...asObjectRows(meta?.message_references).map((row) => stringField(row, 'label')),
    ...asObjectRows(meta?.content_blocks_ordered)
      .filter(
        (row) =>
          row.type === 'artifact_preview' || row.type === 'pdf_file' || row.type === 'docx_file',
      )
      .map((row) => stringField(row, 'name') ?? stringField(row, 'label')),
  ].filter((label): label is string => Boolean(label))
  if (labels.length === 0) return ''
  return `\n  In this thread: ${[...new Set(labels)].slice(0, 8).join('; ')}`
}

function formatCompletedTools(msg: Record<string, unknown>): string {
  const meta = asRecord(msg.metadata)
  const toolSteps = asObjectRows(meta?.tool_steps)
  const toolLabels = toolSteps
    .filter((step) => step.status === 'completed' && typeof step.label === 'string')
    .map((step) => String(step.label))
    .slice(0, 5)
  if (toolLabels.length === 0) return ''
  return `\n  Tools used: ${toolLabels.join('; ')}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asObjectRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
  )
}

function stringField(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
