export function showConversationMessageInChat(messageId: string): boolean {
  const target = Array.from(document.querySelectorAll<HTMLElement>('[data-message-id]')).find(
    (element) => element.dataset.messageId === messageId,
  )
  if (!target) return false
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return true
}
