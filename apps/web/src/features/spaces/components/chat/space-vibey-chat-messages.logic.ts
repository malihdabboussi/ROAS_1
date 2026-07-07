import { messageHasTaskMutation } from './space-vibey-chat-panel.logic'

interface SpaceChatMessageLike {
  id: string
  role?: string
  metadata?: Record<string, unknown> | null
}

export type SpaceChatVoiceRunStatus = 'running' | 'completed' | 'failed'

export interface SpaceChatVoiceRunTask {
  delegationId: string
  messageId: string
  task: string
  status: SpaceChatVoiceRunStatus
}

interface SpaceChatVoiceDelegationMessageLike extends SpaceChatMessageLike {
  content?: string | null
}

export interface SpaceChatTurnData<T extends SpaceChatMessageLike> {
  leadingMessages: T[]
  turns: Array<{
    user: T
    responses: T[]
  }>
}

export function filterVoiceDelegationMessages<T extends SpaceChatMessageLike>(
  messages: T[],
): T[] {
  return messages.filter((message) => message.metadata?.delegation_task === true)
}

export function filterVisibleSpaceChatMessages<T extends SpaceChatMessageLike>(
  allMessages: T[],
): T[] {
  if (allMessages.length === 0) return allMessages
  const visible = allMessages.filter((message) => {
    if (message.metadata?.hidden) return false
    if (message.metadata?.delegation_task) return false
    return true
  })
  return visible.length === allMessages.length ? allMessages : visible
}

export function collectVisibleUndoMessageIds<T extends SpaceChatMessageLike>(
  messages: T[],
): Set<string> {
  const ids = messages.filter(messageHasTaskMutation).map((message) => message.id)
  return new Set(ids.slice(-5))
}

export function buildSpaceChatTurnData<T extends SpaceChatMessageLike>(
  displayMessages: T[],
): SpaceChatTurnData<T> {
  const leadingMessages: T[] = []
  const turns: SpaceChatTurnData<T>['turns'] = []
  let currentTurn: SpaceChatTurnData<T>['turns'][number] | null = null

  for (const message of displayMessages) {
    if (message.role === 'user') {
      const isVoice = message.metadata?.source === 'voice_live'
      if (isVoice && currentTurn) {
        currentTurn.responses.push(message)
      } else {
        if (currentTurn) turns.push(currentTurn)
        currentTurn = { user: message, responses: [] }
      }
    } else if (currentTurn) {
      currentTurn.responses.push(message)
    } else {
      leadingMessages.push(message)
    }
  }
  if (currentTurn) turns.push(currentTurn)
  return { leadingMessages, turns }
}

function isSpaceChatVoiceRunStatus(value: unknown): value is SpaceChatVoiceRunStatus {
  return value === 'running' || value === 'failed' || value === 'completed'
}

export function buildSpaceVoiceRunTasks(
  voiceDelegationMessages: SpaceChatVoiceDelegationMessageLike[],
  liveTasks: SpaceChatVoiceRunTask[],
): SpaceChatVoiceRunTask[] {
  const liveTasksById = new Map(liveTasks.map((task) => [task.delegationId, task]))
  const tasksFromMessages = voiceDelegationMessages.map((message) => {
    const delegationId =
      typeof message.metadata?.delegation_id === 'string'
        ? message.metadata.delegation_id
        : message.id
    const rawStatus = message.metadata?.voice_task_status
    const status: SpaceChatVoiceRunStatus = isSpaceChatVoiceRunStatus(rawStatus)
      ? rawStatus
      : 'completed'
    const label =
      typeof message.metadata?.voice_task_label === 'string'
        ? message.metadata.voice_task_label
        : (message.content ?? 'Agent task')
    return {
      delegationId,
      messageId: message.id,
      task: label,
      status,
    }
  })

  const taskIdsFromMessages = new Set(tasksFromMessages.map((task) => task.delegationId))
  return [
    ...tasksFromMessages.map((task) => liveTasksById.get(task.delegationId) ?? task),
    ...liveTasks.filter((task) => !taskIdsFromMessages.has(task.delegationId)),
  ]
}

export function findLastEditableUserMessageId(
  messages: SpaceChatMessageLike[],
  isStreaming: boolean,
): string | null {
  if (isStreaming) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') return messages[i]!.id
  }
  return null
}
