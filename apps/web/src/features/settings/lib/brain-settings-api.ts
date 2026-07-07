'use client'

import { backendGet, backendPatch } from '@/lib/api/backend-client'

export type CortexMaxToggleResponse =
  | { success: true; cortex_max: boolean; initial_sync_triggered: boolean }
  | { success: false; error?: string }

export type CustomerBrainStatusResponse = {
  success: boolean
  brain_id: string
  enabled: boolean
}

export type CustomerBrainEnabledResponse = {
  success: boolean
  brain_id: string | null
  enabled: boolean
}

export async function toggleCortexMax(
  brainId: string,
  enabled: boolean,
): Promise<CortexMaxToggleResponse> {
  return backendPatch<CortexMaxToggleResponse>(
    `/api/brain/${encodeURIComponent(brainId)}/cortex-max`,
    { enabled },
  )
}

export async function fetchCustomerBrainStatus(): Promise<CustomerBrainStatusResponse> {
  return backendGet<CustomerBrainStatusResponse>('/api/brain/customer/status')
}

export async function setCustomerBrainEnabled(
  enabled: boolean,
): Promise<CustomerBrainEnabledResponse> {
  return backendPatch<CustomerBrainEnabledResponse>('/api/brain/customer/enabled', { enabled })
}
