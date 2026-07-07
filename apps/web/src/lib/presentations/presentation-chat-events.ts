export const PRESENTATION_CHAT_REQUEST_OPEN_EVENT = 'vibey:presentation-chat-request-open'

export function requestPresentationChatOpen() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PRESENTATION_CHAT_REQUEST_OPEN_EVENT))
}
