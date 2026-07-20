import { backendPost } from '@/lib/api/backend-client'

export async function importPageGraderClientBrain(input: {
  clientId: string
  campaignId?: string
  campaignName?: string
  campaignHint?: string
  spaceId?: string | null
  spaceTitle?: string | null
  dryRun?: boolean
  force?: boolean
}): Promise<{
  success: boolean
  campaign?: { action?: 'create' | 'reuse'; id: string; name?: string | null }
  space?: { action?: 'create' | 'reuse'; id: string; title?: string | null }
  brainImport?: {
    jobId?: string | null
    status?: string | null
    action?: string | null
    memoriesInserted?: number
    contentHash?: string | null
  }
}> {
  return backendPost('/api/integrations/page-grader/import-client-brain', {
    client_id: input.clientId,
    dryRun: input.dryRun ?? false,
    force: input.force ?? false,
    ...(input.campaignId ? { campaignId: input.campaignId } : {}),
    ...(input.campaignName ? { campaignName: input.campaignName } : {}),
    ...(input.campaignHint ? { campaignHint: input.campaignHint } : {}),
    ...(input.spaceId ? { spaceId: input.spaceId } : {}),
    ...(input.spaceTitle ? { spaceTitle: input.spaceTitle } : {}),
  })
}
