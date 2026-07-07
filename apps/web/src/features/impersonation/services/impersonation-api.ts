import { backendGet, backendPost } from '@/lib/api/backend-client'

export interface ImpersonationTarget {
  id: string
  email: string | null
  name: string | null
  role: string
}

export function fetchImpersonationTargets(): Promise<{ targets: ImpersonationTarget[] }> {
  return backendGet<{ targets: ImpersonationTarget[] }>('/api/admin/impersonation/targets')
}

export function startImpersonation(targetUserId: string): Promise<{ target: ImpersonationTarget }> {
  return backendPost<{ target: ImpersonationTarget }>('/api/admin/impersonation/start', {
    targetUserId,
  })
}

export function stopImpersonation(targetUserId: string): Promise<{ success: boolean }> {
  return backendPost<{ success: boolean }>('/api/admin/impersonation/stop', { targetUserId })
}
