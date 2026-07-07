import { countJsonTokens, countTextTokens } from '@vibey/context-breakdown'
import type { ContentBlock, Message } from '../types'

const TOKEN_SIGNATURE_SEPARATOR = '\u001f'
const MESSAGE_SEPARATOR = '\u001e'
const MAX_MESSAGE_TOKEN_CACHE_ENTRIES = 1_000

type MessageTokenCacheEntry = {
  signature: string
  tokens: number
}

const messageTokenCache = new Map<string, MessageTokenCacheEntry>()

function stringifyTokenPart(value: unknown): string {
  if (value == null) return ''
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return ''
  }
}

function getMessageTokenCacheKey(message: Message): string | null {
  return typeof message.id === 'string' && message.id.length > 0 ? message.id : null
}

export function getMessageTokenSignature(message: Message): string {
  return [
    message.role,
    message.content ?? '',
    stringifyTokenPart(message.content_blocks),
    stringifyTokenPart(message.metadata),
  ].join(TOKEN_SIGNATURE_SEPARATOR)
}

export function getMessagesTokenSignature(messages: readonly Message[]): string {
  if (messages.length === 0) return 'empty'
  return messages
    .map((message) =>
      [
        message.id ?? '',
        message.conversation_id ?? '',
        message.created_at ?? '',
        getMessageTokenSignature(message),
      ].join(TOKEN_SIGNATURE_SEPARATOR),
    )
    .join(MESSAGE_SEPARATOR)
}

export function countContentBlockTokens(block: ContentBlock): number {
  let tokens = 0
  if (block.content) tokens += countTextTokens(block.content)
  if (block.metadata && Object.keys(block.metadata).length > 0) {
    tokens += countJsonTokens(block.metadata)
  }
  tokens += 4
  return tokens
}

export function countMessageTokens(message: Message): number {
  let tokens = 4
  if (message.content) tokens += countTextTokens(message.content)
  if (message.content_blocks) {
    for (const block of message.content_blocks) {
      tokens += countContentBlockTokens(block)
    }
  }
  if (message.metadata && Object.keys(message.metadata).length > 0) {
    tokens += countJsonTokens(message.metadata)
  }
  return tokens
}

function countCachedMessageTokens(message: Message): number {
  const cacheKey = getMessageTokenCacheKey(message)
  if (!cacheKey) return countMessageTokens(message)

  const signature = getMessageTokenSignature(message)
  const cached = messageTokenCache.get(cacheKey)
  if (cached?.signature === signature) return cached.tokens

  const tokens = countMessageTokens(message)
  if (messageTokenCache.size >= MAX_MESSAGE_TOKEN_CACHE_ENTRIES) {
    const oldestKey = messageTokenCache.keys().next().value
    if (oldestKey) messageTokenCache.delete(oldestKey)
  }
  messageTokenCache.set(cacheKey, { signature, tokens })
  return tokens
}

export function countMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, message) => sum + countCachedMessageTokens(message), 0)
}

export function resetContextTokenCounterCacheForTests() {
  messageTokenCache.clear()
}
