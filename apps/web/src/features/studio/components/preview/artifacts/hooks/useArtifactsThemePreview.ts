'use client'

import { useCallback, useEffect, useState } from 'react'
import { buildThemePreviewCss } from '@/lib/artifacts'
import { fetchCampaign } from '@/lib/campaigns'
import { getTheme } from '@/lib/themes'

export function useArtifactsThemePreview(campaignId: string) {
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null)
  const [themePreviewCss, setThemePreviewCss] = useState('')

  const loadThemePreviewCss = useCallback(async () => {
    if (!campaignId) {
      setActiveThemeId(null)
      setThemePreviewCss('')
      return
    }
    try {
      const campaign = await fetchCampaign(campaignId)
      const config = (campaign?.config ?? {}) as Record<string, unknown>
      const agentSettings = (config.agent_settings ?? {}) as Record<string, unknown>
      const themeId =
        typeof agentSettings.theme_id === 'string' && agentSettings.theme_id.trim()
          ? agentSettings.theme_id
          : null
      setActiveThemeId(themeId)
      if (!themeId) {
        setThemePreviewCss('')
        return
      }
      const theme = await getTheme(themeId)
      setThemePreviewCss(buildThemePreviewCss(theme))
    } catch (themeErr) {
      console.error('Failed to load active theme preview CSS:', themeErr)
      setActiveThemeId(null)
      setThemePreviewCss('')
    }
  }, [campaignId])

  useEffect(() => {
    void loadThemePreviewCss()
  }, [loadThemePreviewCss])

  useEffect(() => {
    const handler = () => {
      void loadThemePreviewCss()
    }
    window.addEventListener('campaign-config-updated', handler)
    return () => window.removeEventListener('campaign-config-updated', handler)
  }, [loadThemePreviewCss])

  return {
    activeThemeId,
    themePreviewCss,
  }
}
