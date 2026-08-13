/** Fired by DraftVersionsCard's "use" action; chat panels put the text in their composer. */
export const DRAFT_CARD_USE_EVENT = 'chat:draft-card-use'

export interface DraftCardUseDetail {
  text: string
}
