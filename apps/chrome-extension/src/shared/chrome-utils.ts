import type { ExtensionMessage } from './messages'

export function sendExtensionMessage<T>(message: ExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(response as T)
    })
  })
}

const CHAT_PORT_NAME = 'vibey-chat-stream'

export type ChatPortEvent = Record<string, unknown>

export function connectChatStream(handlers: {
  onEvent: (event: ChatPortEvent) => void
  onDone: () => void
  onError: (message: string) => void
}): {
  start: (p: { conversation_id: string; content: string; campaign_id?: string; model?: string }) => void
  abort: () => void
  disconnect: () => void
} {
  const port = chrome.runtime.connect({ name: CHAT_PORT_NAME })
  const onMessage = (msg: { action?: string; event?: ChatPortEvent; message?: string }) => {
    if (msg.action === 'event' && msg.event) handlers.onEvent(msg.event)
    if (msg.action === 'done') handlers.onDone()
    if (msg.action === 'error' && msg.message) handlers.onError(msg.message)
  }
  port.onMessage.addListener(onMessage)
  return {
    start: (p) => port.postMessage({ action: 'start', ...p }),
    abort: () => port.postMessage({ action: 'abort' }),
    disconnect: () => {
      port.onMessage.removeListener(onMessage)
      port.disconnect()
    },
  }
}
