'use client'

import type { LlmModelOption } from '@/features/studio/services/chat.service'
import { backendGet, backendPatch } from '@/lib/api/backend-client'

export interface WorkspaceLlmModel extends LlmModelOption {
  enabled: boolean
  isDefault: boolean
}

export interface WorkspaceModelPreferences {
  enabled_model_ids: string[]
  models: WorkspaceLlmModel[]
}

export async function fetchWorkspaceModelPreferences(): Promise<WorkspaceModelPreferences> {
  return backendGet<WorkspaceModelPreferences>('/api/models/workspace')
}

export async function updateWorkspaceModelPreferences(
  enabledModelIds: string[],
): Promise<WorkspaceModelPreferences> {
  return backendPatch<WorkspaceModelPreferences>('/api/models/workspace', {
    enabled_model_ids: enabledModelIds,
  })
}
