import { backendGet } from '@/lib/api/backend-client'

export interface OrgHumanSpendingRow {
  userId: string
  credits: number
  costUsd: number
  computedCost: number
  eventCount: number
  lastActiveAt: string | null
}

export interface OrgHumanSpendingResponse {
  success: boolean
  humans: OrgHumanSpendingRow[]
}

export function getOrgHumanSpending(
  orgId: string,
  startDate: string,
  endDate: string,
  campaignIds?: string[],
): Promise<OrgHumanSpendingResponse> {
  const params = new URLSearchParams({ startDate, endDate })
  if (campaignIds && campaignIds.length > 0) {
    params.set('campaignIds', campaignIds.join(','))
  }
  return backendGet<OrgHumanSpendingResponse>(
    `/api/org/${orgId}/billing/human-spending?${params.toString()}`,
  )
}
