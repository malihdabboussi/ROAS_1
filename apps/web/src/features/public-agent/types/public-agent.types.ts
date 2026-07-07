export interface PublicAgentInfo {
  agentKey: string
  name: string
  role: string
  imageUrl: string | null
  userId: string
  userSlug: string
}

export interface VisitorSession {
  visitorId: string
  conversationId: string | null
}
