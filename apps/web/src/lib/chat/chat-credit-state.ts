type ChatCreditsExhaustedListener = (exhausted: boolean) => void

let chatCreditsExhausted = false
const chatCreditsExhaustedListeners = new Set<ChatCreditsExhaustedListener>()

export function getChatCreditsExhausted(): boolean {
  return chatCreditsExhausted
}

export function setChatCreditsExhausted(exhausted: boolean): void {
  if (chatCreditsExhausted === exhausted) return
  chatCreditsExhausted = exhausted
  for (const listener of chatCreditsExhaustedListeners) {
    listener(exhausted)
  }
}

export function subscribeChatCreditsExhausted(
  listener: ChatCreditsExhaustedListener,
): () => void {
  chatCreditsExhaustedListeners.add(listener)
  return () => {
    chatCreditsExhaustedListeners.delete(listener)
  }
}
