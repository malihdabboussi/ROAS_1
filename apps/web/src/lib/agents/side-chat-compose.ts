export const TEAM_HR_CHAT_COMPOSE_EVENT = 'team-hr-chat:compose'

export type TeamHrChatComposeDetail = {
  text: string
  newConversation?: boolean
  submit?: boolean
}

export function dispatchTeamHrChatCompose(detail: TeamHrChatComposeDetail) {
  window.dispatchEvent(new CustomEvent(TEAM_HR_CHAT_COMPOSE_EVENT, { detail }))
}
