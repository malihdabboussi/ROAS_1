'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Settings2 } from 'lucide-react'
import { SettingsDropdown } from '@/components/ui/forms/SettingsDropdown'
import { PAID_ADS_META_MESSAGES } from '@/features/spaces/config/paid-ads-messages.config'
import {
  getMappedPageGraderMetaContext,
  type PageGraderMetaContext,
} from '@/features/spaces/services/page-grader-send.service'
import {
  getPaidAdsMetaConnectionStatus,
  type PaidAdsMetaConnectionStatus,
} from '@/lib/artifacts/paid-ads-api'
import { fetchCampaign, updateCampaign } from '@/lib/campaigns/campaign-api'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'

type MetaAssetProfile = {
  id: string
  label: string
  ad_account_id: string | null
  page_id: string | null
  instagram_user_id: string | null
  pixel_id: string | null
}

type SetupState = {
  connection: PaidAdsMetaConnectionStatus
  config: Record<string, unknown>
  pageGrader: PageGraderMetaContext | null
}

function pageGraderAccountName(context: PageGraderMetaContext | null): string | null {
  if (!context?.recommended_ad_account_id) return null
  const account = context.accounts.find(
    (item) => String(item.id ?? '') === context.recommended_ad_account_id,
  )
  const name = account?.name
  return typeof name === 'string' && name.trim() ? name : context.recommended_ad_account_id
}

function nextConfig(
  config: Record<string, unknown>,
  field: 'meta_ad_account_id' | 'meta_page_id',
  value: string,
): Record<string, unknown> {
  const defaults = (config.meta_defaults ?? {}) as Record<string, unknown>
  const profiles = Array.isArray(config.meta_asset_profiles)
    ? (config.meta_asset_profiles as MetaAssetProfile[])
    : []
  const fallback: MetaAssetProfile = {
    id: 'default',
    label: 'Default',
    ad_account_id:
      typeof defaults.meta_ad_account_id === 'string' ? defaults.meta_ad_account_id : null,
    page_id: typeof defaults.meta_page_id === 'string' ? defaults.meta_page_id : null,
    instagram_user_id: null,
    pixel_id: null,
  }
  const profile = profiles[0] ?? fallback
  const profileField = field === 'meta_ad_account_id' ? 'ad_account_id' : 'page_id'
  const updatedProfile = { ...profile, [profileField]: value || null }

  return {
    ...config,
    meta_defaults: { ...defaults, [field]: value || null },
    meta_asset_profiles: [updatedProfile, ...profiles.slice(1)],
  }
}

export function PaidAdsMetaSetupBar({
  campaignId,
  spaceId,
}: {
  campaignId: string
  spaceId: string | null
}) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [setup, setSetup] = useState<SetupState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const loadGeneration = useRef(0)

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current
    try {
      const [connection, campaign, pageGrader] = await Promise.all([
        getPaidAdsMetaConnectionStatus(),
        fetchCampaign(campaignId),
        getMappedPageGraderMetaContext({ campaignId, spaceId }).catch(() => null),
      ])
      if (generation !== loadGeneration.current) return
      setSetup({ connection, config: campaign.config ?? {}, pageGrader })
      setError(null)
    } catch {
      if (generation !== loadGeneration.current) return
      setError(PAID_ADS_META_MESSAGES.LOAD_FAILED)
    }
  }, [campaignId, spaceId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [load])

  const defaults = (setup?.config.meta_defaults ?? {}) as Record<string, unknown>
  const accountId =
    typeof defaults.meta_ad_account_id === 'string' ? defaults.meta_ad_account_id : ''
  const pageId = typeof defaults.meta_page_id === 'string' ? defaults.meta_page_id : ''
  const accountOptions = useMemo(() => {
    const recommendedId = setup?.pageGrader?.recommended_ad_account_id
    return (setup?.connection.adAccounts ?? [])
      .map((item) => ({
        value: item.id,
        label: item.name,
        ...(item.id === recommendedId ? { description: 'Recommended by PageGrader' } : {}),
      }))
      .sort(
        (left, right) =>
          Number(right.value === recommendedId) - Number(left.value === recommendedId),
      )
  }, [setup?.connection.adAccounts, setup?.pageGrader?.recommended_ad_account_id])
  const pageOptions = useMemo(
    () => (setup?.connection.pages ?? []).map((item) => ({ value: item.id, label: item.name })),
    [setup?.connection.pages],
  )

  const saveMapping = useCallback(
    async (field: 'meta_ad_account_id' | 'meta_page_id', value: string) => {
      if (!setup) return
      const config = nextConfig(setup.config, field, value)
      setSetup({ ...setup, config })
      setSaving(true)
      setError(null)
      try {
        await updateCampaign(campaignId, { config })
      } catch {
        setSetup(setup)
        setError(PAID_ADS_META_MESSAGES.SAVE_FAILED)
      } finally {
        setSaving(false)
      }
    },
    [campaignId, setup],
  )

  const openMetaSettings = () =>
    openWorkspaceSettings('integrations', { integrationsFocusIntegrationId: 'meta' })

  if (!setup && !error) {
    return (
      <div className="border-border bg-secondary px-spacing-4 py-spacing-2 flex shrink-0 items-center border-b">
        <Loader2 className="icon-sm text-muted-foreground animate-spin" aria-hidden />
        <span className="body-3 text-muted-foreground ml-spacing-2">Checking Meta setup…</span>
      </div>
    )
  }

  if (!setup) {
    return (
      <div className="border-border bg-secondary gap-spacing-3 px-spacing-4 py-spacing-2 flex shrink-0 items-center border-b">
        <AlertCircle className="icon-sm text-destructive" aria-hidden />
        <span className="body-3 text-muted-foreground flex-1">{error}</span>
        <button
          type="button"
          className="button-glass-neutral body-3 px-spacing-3 py-spacing-1"
          onClick={() => void load()}
        >
          Try again
        </button>
      </div>
    )
  }

  if (!setup.connection.connected) {
    const recommendation = pageGraderAccountName(setup.pageGrader)
    return (
      <div className="border-border bg-secondary gap-spacing-3 px-spacing-4 py-spacing-2 flex shrink-0 flex-wrap items-center border-b">
        <span className="badge-glass badge-glass-orange body-4">Draft mode</span>
        <p className="body-3 text-muted-foreground min-w-0 flex-1">
          {recommendation
            ? `PageGrader found ${recommendation}. Connect Meta to sync and publish from this workspace.`
            : 'Meta is not connected. Connect it to sync and publish from this workspace.'}
        </p>
        <button
          type="button"
          className="button-glass-accent body-3 px-spacing-3 py-spacing-1"
          onClick={openMetaSettings}
        >
          Connect Meta
        </button>
      </div>
    )
  }

  const mounted = Boolean(accountId && pageId)
  return (
    <div className="border-border bg-secondary gap-spacing-3 px-spacing-4 py-spacing-2 flex shrink-0 flex-wrap items-center border-b">
      <span
        className={`badge-glass body-4 ${mounted ? 'badge-glass-green' : 'badge-glass-orange'}`}
      >
        {mounted ? 'Meta mounted' : 'Finish Meta setup'}
      </span>
      <div className="min-w-48 flex-1">
        <SettingsDropdown
          appearance="spaces"
          compact
          searchable
          value={accountId}
          options={accountOptions}
          placeholder="Choose Meta ad account"
          disabled={saving}
          onChange={(value) => void saveMapping('meta_ad_account_id', value)}
        />
      </div>
      <div className="min-w-48 flex-1">
        <SettingsDropdown
          appearance="spaces"
          compact
          searchable
          value={pageId}
          options={pageOptions}
          placeholder="Choose Facebook Page"
          disabled={saving}
          onChange={(value) => void saveMapping('meta_page_id', value)}
        />
      </div>
      {saving ? (
        <Loader2
          className="icon-sm text-muted-foreground animate-spin"
          aria-label="Saving Meta mapping"
        />
      ) : null}
      <button
        type="button"
        className="button-glass-neutral body-3 gap-spacing-1 px-spacing-3 py-spacing-1 flex items-center"
        onClick={openMetaSettings}
      >
        {mounted ? (
          <CheckCircle2 className="icon-sm text-primary" aria-hidden />
        ) : (
          <Settings2 className="icon-sm" aria-hidden />
        )}
        Manage Meta
      </button>
      {error ? <p className="body-4 text-destructive basis-full">{error}</p> : null}
    </div>
  )
}
