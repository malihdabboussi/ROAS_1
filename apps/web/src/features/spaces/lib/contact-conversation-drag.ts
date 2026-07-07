/** Drag payload for dropping a contact conversation into the agent chat (artifact drop protocol). */
export function buildContactConversationChatDragPayload(conversation: {
  id: string
  title: string | null
}): { id: string; type: 'contact-conversation'; label: string } {
  return {
    id: conversation.id,
    type: 'contact-conversation',
    label: conversation.title?.trim() || 'Customer conversation',
  }
}
