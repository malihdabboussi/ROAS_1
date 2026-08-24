import type { PageGraderClientScopeEntry } from './page-grader-api.helpers'

export type MappedClientRow = {
  userId: string
  orgId: string | null
  clientId: string
  entry: PageGraderClientScopeEntry
  webhookSecret: string | null
}
