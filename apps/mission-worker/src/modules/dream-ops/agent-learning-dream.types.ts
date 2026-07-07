export type AgentLearningDreamGroup = {
  id: string
  source:
    | 'skill_recommendation_event'
    | 'agent_turn_feedback'
    | 'trace'
    | 'space_item_activity'
    | 'mission_log'
  text: string
  metadata?: Record<string, unknown>
}
