export type FlowBuildSessionLink = {
  id: string
  space_id?: string | null
  conversation_id: string | null
  automation_id: string | null
  target_automation_id: string | null
  status: string
  plan_name: string | null
  plan_description?: string | null
  updated_at: string | null
}

export type FlowDraftBuildLink = {
  sessionId: string | null
  conversationId: string | null
  draftFlowId: string | null
}
