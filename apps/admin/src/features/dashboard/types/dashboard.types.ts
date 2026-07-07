export type AdminBillingScope = 'all' | 'personal' | 'organization'

export interface DashboardStats {
  scope: AdminBillingScope
  users: {
    totalUsers: number
    newUsersLast24h: number
    newUsersLast7Days: number
    activeUsersLast7Days: number
    userTrend7d: Array<{ date: string; count: number }>
    userTrend30d: Array<{ date: string; count: number }>
  }
  organizations: {
    totalOrganizations: number
    totalOrgMembers: number
    newOrganizationsLast24h: number
    newOrganizationsLast7Days: number
    newOrgMembersLast7Days: number
    orgTrend7d: Array<{ date: string; count: number }>
    orgTrend30d: Array<{ date: string; count: number }>
  }
  revenue: {
    paidUsers: number
    mrr: number
    arr: number
    addonMrr: number
    addonCount: number
    creditPackRevenue: number
    totalRevenue: number
    usersOver20: number
    revenueTrend7d: Array<{ date: string; revenue: number }>
    revenueTrend30d: Array<{ date: string; revenue: number }>
  }
  costs: {
    totalCost30d: number
    totalRequests30d: number
    totalTokens30d: number
    costTrend7d: Array<{ date: string; totalCost: number }>
    costTrend30d: Array<{ date: string; totalCost: number }>
  }
  errors: {
    totalErrorGroups: number
    openErrors: number
    criticalErrors: number
    recentErrors: number
    errorTrend7d: Array<{ date: string; count: number }>
    errorTrend30d: Array<{ date: string; count: number }>
  }
}

export interface MachineStats {
  live: {
    total: number
    running: number
    suspended: number
    failed: number
    alwaysOn: number
  }
  fly?: {
    total: number
    started: number
    stopped: number
    suspended: number
    destroyed: number
    unknown: number
  }
  drift?: {
    startedProfileDrift: number
    startedPoolDrift: number
    startedOrphanDrift: number
    dbRunningNotStarted: number
    dbRunningMissingFly: number
  }
  costs: {
    estimatedMonthlyCost: number
    estimatedDailyCost: number
    avgRunningMachines24h: number
    avgRunningMachines7d: number
    avgActiveHoursPerMachine7d: number
  }
  trends: {
    running7d: Array<{ date: string; avg: number }>
    cost7d: Array<{ date: string; cost: number }>
    running30d: Array<{ date: string; avg: number }>
    cost30d: Array<{ date: string; cost: number }>
  }
}
