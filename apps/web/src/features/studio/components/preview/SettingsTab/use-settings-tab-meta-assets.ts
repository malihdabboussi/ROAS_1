import { useEffect, useMemo, useRef, useState } from 'react'
import type { AdCampaign } from '../../../types'
import {
  fetchMetaAdAccounts,
  fetchMetaInstagramAccountsForPage,
  fetchMetaPages,
  fetchMetaPixels,
  getMetaConnectionStatus,
} from '../../../services/artifact-preview.service'
import type { SettingsSection } from './settings-tab.types'

type MetaAccountOption = { id: string; name: string }
type MetaInstagramAccount = { id: string; username?: string }

interface UseSettingsTabMetaAssetsOptions {
  activeSection: SettingsSection
  campaignConfig: Record<string, unknown>
}

export function useSettingsTabMetaAssets({
  activeSection,
  campaignConfig,
}: UseSettingsTabMetaAssetsOptions) {
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([])
  const adCampaignsRef = useRef(adCampaigns)
  adCampaignsRef.current = adCampaigns
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null)
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAccountOption[]>([])
  const metaAdAccountsRef = useRef(metaAdAccounts)
  metaAdAccountsRef.current = metaAdAccounts
  const [metaPages, setMetaPages] = useState<MetaAccountOption[]>([])
  const metaPagesRef = useRef(metaPages)
  metaPagesRef.current = metaPages
  const [metaInstagramAccountsByCampaign, setMetaInstagramAccountsByCampaign] = useState<
    Record<string, MetaInstagramAccount[]>
  >({})
  const [metaPixelsByAccount, setMetaPixelsByAccount] = useState<Record<string, MetaAccountOption[]>>(
    {},
  )
  const [_metaLoading, setMetaLoading] = useState(false)
  const [adsSaving, setAdsSaving] = useState<Record<string, boolean>>({})
  const [createPixelForAccountId, setCreatePixelForAccountId] = useState<string | null>(null)
  const [createPixelForCampaignId, setCreatePixelForCampaignId] = useState<string | null>(null)
  const campaignConfigRef = useRef(campaignConfig)
  campaignConfigRef.current = campaignConfig
  const metaFetchedRef = useRef(false)
  const metaAdsFetchedRef = useRef(false)

  useEffect(() => {
    const onRelevantSection =
      activeSection === 'ads' || activeSection === 'funnel' || activeSection === 'presentation'
    if (!onRelevantSection && metaConnected !== true) return
    const needsBase = !metaFetchedRef.current
    const needsAds =
      !metaAdsFetchedRef.current && (activeSection === 'ads' || adCampaignsRef.current.length > 0)
    if (!needsBase && !needsAds) return

    let cancelled = false
    setMetaLoading(true)
    ;(async () => {
      try {
        if (metaConnected === null) {
          const status = await getMetaConnectionStatus()
          if (cancelled) return
          setMetaConnected(status.connected)
          if (!status.connected) return
        } else if (!metaConnected) {
          return
        }

        const parallel: Promise<void>[] = []

        if (needsBase) {
          parallel.push(
            (async () => {
              const existing = metaAdAccountsRef.current
              const accounts = existing.length > 0 ? existing : await fetchMetaAdAccounts()
              if (cancelled) return
              if (existing.length === 0) setMetaAdAccounts(accounts)
              const accountIds = [...new Set(accounts.map((account) => account.id).filter(Boolean))]
              const pixelEntries = await Promise.all(
                accountIds.map(async (id) => {
                  try {
                    return [id, await fetchMetaPixels(id)] as const
                  } catch {
                    return [id, []] as const
                  }
                }),
              )
              if (cancelled) return
              setMetaPixelsByAccount(Object.fromEntries(pixelEntries))
              metaFetchedRef.current = true
            })(),
          )
        }

        if (needsAds) {
          parallel.push(
            (async () => {
              const existing = metaPagesRef.current
              const pages = existing.length > 0 ? existing : await fetchMetaPages()
              if (cancelled) return
              if (existing.length === 0) setMetaPages(pages)
            })(),
          )
          parallel.push(
            (async () => {
              const currentAdCampaigns = adCampaignsRef.current
              const pageIds = new Set<string>()
              currentAdCampaigns.forEach((campaign) => {
                if (campaign.meta_page_id) pageIds.add(campaign.meta_page_id)
              })
              const profiles = (campaignConfigRef.current.meta_asset_profiles ?? []) as Array<{
                id: string
                page_id: string | null
              }>
              profiles.forEach((profile) => {
                if (profile.page_id) pageIds.add(profile.page_id)
              })

              const igByPageId = new Map<string, MetaInstagramAccount[]>()
              await Promise.all(
                Array.from(pageIds).map(async (pageId) => {
                  try {
                    igByPageId.set(pageId, await fetchMetaInstagramAccountsForPage(pageId))
                  } catch {
                    igByPageId.set(pageId, [])
                  }
                }),
              )
              if (cancelled) return

              const igMap: Record<string, MetaInstagramAccount[]> = {}
              currentAdCampaigns.forEach((campaign) => {
                igMap[campaign.id] = campaign.meta_page_id
                  ? (igByPageId.get(campaign.meta_page_id) ?? [])
                  : []
              })
              profiles.forEach((profile) => {
                igMap[`profile-${profile.id}`] = profile.page_id
                  ? (igByPageId.get(profile.page_id) ?? [])
                  : []
              })
              setMetaInstagramAccountsByCampaign(igMap)
              metaAdsFetchedRef.current = true
            })(),
          )
        }

        await Promise.all(parallel)
      } catch {
        if (!cancelled) setMetaConnected(false)
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeSection, metaConnected])

  useEffect(() => {
    if (!metaConnected) return
    const profiles = (campaignConfig.meta_asset_profiles ?? []) as Array<{
      id: string
      page_id: string | null
    }>
    const missing = profiles.filter(
      (profile) =>
        profile.page_id &&
        !Object.prototype.hasOwnProperty.call(
          metaInstagramAccountsByCampaign,
          `profile-${profile.id}`,
        ),
    )
    if (missing.length === 0) return
    let cancelled = false
    ;(async () => {
      const updates: Record<string, MetaInstagramAccount[]> = {}
      await Promise.all(
        missing.map(async (profile) => {
          try {
            updates[`profile-${profile.id}`] = await fetchMetaInstagramAccountsForPage(
              profile.page_id!,
            )
          } catch {
            updates[`profile-${profile.id}`] = []
          }
        }),
      )
      if (!cancelled) setMetaInstagramAccountsByCampaign((prev) => ({ ...prev, ...updates }))
    })()
    return () => {
      cancelled = true
    }
  }, [metaConnected, campaignConfig, metaInstagramAccountsByCampaign])

  const allMetaPixelOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const pixels of Object.values(metaPixelsByAccount)) {
      for (const pixel of pixels) {
        byId.set(pixel.id, pixel.name || pixel.id)
      }
    }
    return Array.from(byId.entries()).map(([value, label]) => ({ value, label }))
  }, [metaPixelsByAccount])

  return {
    adCampaigns,
    adCampaignsRef,
    setAdCampaigns,
    metaConnected,
    setMetaConnected,
    metaAdAccounts,
    setMetaAdAccounts,
    metaPages,
    setMetaPages,
    metaInstagramAccountsByCampaign,
    setMetaInstagramAccountsByCampaign,
    metaPixelsByAccount,
    setMetaPixelsByAccount,
    adsSaving,
    setAdsSaving,
    createPixelForAccountId,
    setCreatePixelForAccountId,
    createPixelForCampaignId,
    setCreatePixelForCampaignId,
    allMetaPixelOptions,
  }
}
