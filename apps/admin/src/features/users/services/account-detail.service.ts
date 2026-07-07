import { adminGet } from '@/lib/api/admin-client'
import type {
  AdminAccountDashboard,
  AdminAccountRangeSlice,
} from '../types/account-detail.types'

export type AdminAccountRangeDays = 7 | 14 | 30 | 90

export async function fetchAdminUserDashboard(userId: string, days: AdminAccountRangeDays) {
  return adminGet<AdminAccountDashboard>(`users/${userId}/dashboard?days=${days}`)
}

export async function fetchAdminOrgDashboard(orgId: string, days: AdminAccountRangeDays) {
  return adminGet<AdminAccountDashboard>(`orgs/${orgId}/dashboard?days=${days}`)
}

export async function fetchAdminUserDashboardRange(userId: string, days: AdminAccountRangeDays) {
  return adminGet<AdminAccountRangeSlice>(
    `users/${userId}/dashboard?days=${days}&rangeOnly=true`,
  )
}

export async function fetchAdminOrgDashboardRange(orgId: string, days: AdminAccountRangeDays) {
  return adminGet<AdminAccountRangeSlice>(`orgs/${orgId}/dashboard?days=${days}&rangeOnly=true`)
}

export function mergeAccountDashboardRange(
  dashboard: AdminAccountDashboard,
  slice: AdminAccountRangeSlice,
): AdminAccountDashboard {
  if (dashboard.kind === 'org') {
    const memberUsage = slice.memberUsage ?? []
    const usageByUser = new Map(memberUsage.map((row) => [row.user_id, row.usage]))
    return {
      ...dashboard,
      range: slice.range,
      summary: slice.summary,
      dailyUsage: slice.dailyUsage,
      featureBreakdown: slice.featureBreakdown,
      modelBreakdown: slice.modelBreakdown,
      recentEvents: slice.recentEvents,
      flags: slice.flags,
      members: dashboard.members.map((member) => ({
        ...member,
        usage: usageByUser.get(member.user_id) ?? member.usage,
      })),
    }
  }

  return {
    ...dashboard,
    range: slice.range,
    summary: slice.summary,
    dailyUsage: slice.dailyUsage,
    featureBreakdown: slice.featureBreakdown,
    modelBreakdown: slice.modelBreakdown,
    recentEvents: slice.recentEvents,
    flags: slice.flags,
  }
}
