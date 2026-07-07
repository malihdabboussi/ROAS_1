import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateCampaign } from '@/features/studio/services/campaign.service'
import { CAMPAIGN_TOAST_ERRORS } from '../_config/campaign-toast-errors.config'
import type { CampaignContext, CampaignResources } from '../_lib/types'

export type CampaignSaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

export function useCampaignAutosave(
  campaignId: string,
  context: CampaignContext,
  resources: CampaignResources,
  enabled: boolean,
) {
  const [saveStatus, setSaveStatus] = useState<CampaignSaveStatus>('idle')
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const performSave = useCallback(
    async (ctx: CampaignContext, res: CampaignResources) => {
      setSaveStatus('saving')
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await updateCampaign(campaignId, { context: ctx, resources: res })
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
          return
        } catch (err) {
          if (attempt === 2) {
            setSaveStatus('failed')
            toast.error(
              err instanceof Error ? err.message : CAMPAIGN_TOAST_ERRORS.SAVE_FAILED.userMessage,
            )
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          }
        }
      }
    },
    [campaignId],
  )

  useEffect(() => {
    if (!enabled) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void performSave(context, resources)
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [context, resources, enabled, performSave])

  return {
    saveStatus,
    performSave,
    setSaveStatus,
  }
}
