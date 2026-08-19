'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  ExternalLink,
  Info,
  Loader2,
  Plus,
  Rocket,
  Settings,
  X,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useWorkspaceSettingsModal } from '@/features/settings'
import { STUDIO_INLINE_ERRORS } from '../../config/studio-inline-errors.config'
import {
  createMetaPixel,
  fetchCampaignAdCampaigns,
  fetchMetaAdAccounts,
  fetchMetaPages,
  fetchMetaPixels,
  getMetaConnectionStatus,
} from '../../services/artifact-preview.service'
import { SettingsDropdown } from './SettingsDropdown'

const META_BILLING_HELP_URL = 'https://www.facebook.com/business/help/433689489354194'
const META_CREATE_PAGE_URL = 'https://www.facebook.com/pages/creation'
const META_EVENTS_MANAGER_URL = 'https://business.facebook.com/events_manager2/list/pixel'
const META_ADD_AD_ACCOUNT_URL = 'https://www.facebook.com/business/help/407323696966570'

const META_INTEGRATIONS_REVIEW_INFO =
  'Before launching ads, make sure your Meta setup is ready: connection, ad account, page, and billing. If you have funnels, we’ll add your pixel to their pages automatically.'

interface ReviewItem {
  id: string
  label: string
  status: 'pending' | 'checking' | 'passed' | 'failed' | 'manual'
  error?: string
  recommended?: boolean
  actionLabel?: string
}

export interface MetaIntegrationsReviewModalAdCampaignOption {
  id: string
  name: string
}

export interface MetaIntegrationsReviewModalProps {
  open: boolean
  onClose: () => void
  onContinueToPublish: (id?: string) => void
  /** Platform campaign id; when set, we check for multiple ad accounts and show a warning if used. */
  platformCampaignId?: string | null
  /** When set, show a campaign picker before running the review. */
  adCampaignOptions?: MetaIntegrationsReviewModalAdCampaignOption[]
  /** When true, defer running review until the user picks a campaign and taps launch. */
  launchBeforeReview?: boolean
  /** Pre-select an ad campaign id (only used with launchBeforeReview + adCampaignOptions). */
  initialAdCampaignId?: string | null
}

export function MetaIntegrationsReviewModal({
  open,
  onClose,
  onContinueToPublish,
  platformCampaignId,
  adCampaignOptions,
  launchBeforeReview = false,
  initialAdCampaignId = null,
}: MetaIntegrationsReviewModalProps) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [multiAccountWarning, setMultiAccountWarning] = useState(false)
  const [creatingPixel, setCreatingPixel] = useState(false)
  const [selectedAdCampaignId, setSelectedAdCampaignId] = useState<string | null>(null)
  const [reviewLaunched, setReviewLaunched] = useState(false)
  const useCampaignPicker = launchBeforeReview && adCampaignOptions !== undefined
  const [items, setItems] = useState<ReviewItem[]>([
    { id: 'meta_connection', label: 'Meta account connected', status: 'pending' },
    { id: 'ad_accounts', label: 'Ad account available', status: 'pending' },
    { id: 'fb_pages', label: 'Facebook page linked', status: 'pending' },
    {
      id: 'pixel',
      label: 'Meta Pixel (optional)',
      status: 'pending',
      recommended: true,
    },
    {
      id: 'billing',
      label: 'Payment method on ad account',
      status: 'manual',
      actionLabel: 'Add in Meta',
    },
  ])

  const setItem = useCallback((id: string, update: Partial<ReviewItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...update } : i)))
  }, [])

  const runReview = useCallback(async () => {
    setItems((prev) =>
      prev.map((i) => (i.id !== 'billing' ? { ...i, status: 'pending' as const } : i)),
    )

    setItem('meta_connection', { status: 'checking' })
    let connected = false
    try {
      const status = await getMetaConnectionStatus()
      connected = status.connected
      setItem(
        'meta_connection',
        connected
          ? { status: 'passed' }
          : { status: 'failed', error: STUDIO_INLINE_ERRORS.META_PUBLISH_CONNECT_META },
      )
    } catch {
      setItem('meta_connection', {
        status: 'failed',
        error: STUDIO_INLINE_ERRORS.META_CONNECTION_CHECK,
      })
    }
    if (!connected) {
      setItem('ad_accounts', { status: 'failed', error: STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED })
      setItem('fb_pages', { status: 'failed', error: STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED })
      setItem('pixel', { status: 'failed', error: STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED })
      return
    }

    setItem('ad_accounts', { status: 'checking' })
    let accounts: Array<{ id: string; name: string }> = []
    try {
      accounts = await fetchMetaAdAccounts()
      setItem(
        'ad_accounts',
        accounts.length > 0
          ? { status: 'passed' }
          : { status: 'failed', error: STUDIO_INLINE_ERRORS.META_PUBLISH_NO_AD_ACCOUNTS },
      )
    } catch {
      setItem('ad_accounts', { status: 'failed', error: STUDIO_INLINE_ERRORS.LOAD_AD_ACCOUNTS })
    }

    setItem('fb_pages', { status: 'checking' })
    try {
      const pages = await fetchMetaPages()
      setItem(
        'fb_pages',
        pages.length > 0
          ? { status: 'passed' }
          : { status: 'failed', error: STUDIO_INLINE_ERRORS.META_PUBLISH_NO_FB_PAGES },
      )
    } catch {
      setItem('fb_pages', { status: 'failed', error: STUDIO_INLINE_ERRORS.LOAD_FB_PAGES })
    }

    const firstAccountId = accounts[0]?.id
    if (firstAccountId) {
      setItem('pixel', { status: 'checking' })
      try {
        const pixels = await fetchMetaPixels(firstAccountId)
        setItem('pixel', { status: 'passed', recommended: true })
        if (pixels.length === 0) {
          setItem('pixel', {
            status: 'passed',
            error: 'No pixel yet — optional for tracking.',
            recommended: true,
          })
        }
      } catch {
        setItem('pixel', { status: 'passed', error: 'Could not load pixels.', recommended: true })
      }
    } else {
      setItem('pixel', { status: 'failed', error: STUDIO_INLINE_ERRORS.META_PUBLISH_SKIPPED })
    }
  }, [setItem])

  useEffect(() => {
    if (!open) return
    if (useCampaignPicker) {
      setReviewLaunched(false)
      setItems((prev) =>
        prev.map((i) =>
          i.id !== 'billing' ? { ...i, status: 'pending' as const, error: undefined } : i,
        ),
      )
      const firstId =
        initialAdCampaignId &&
        adCampaignOptions?.some(
          (o: MetaIntegrationsReviewModalAdCampaignOption) => o.id === initialAdCampaignId,
        )
          ? initialAdCampaignId
          : (adCampaignOptions?.[0]?.id ?? null)
      setSelectedAdCampaignId(firstId)
      return
    }
    void runReview()
  }, [open, runReview, useCampaignPicker, initialAdCampaignId, adCampaignOptions])

  const handleLaunchReview = useCallback(() => {
    if (!selectedAdCampaignId) return
    setReviewLaunched(true)
    void runReview()
  }, [runReview, selectedAdCampaignId])

  useEffect(() => {
    if (!open || !platformCampaignId) {
      setMultiAccountWarning(false)
      return
    }
    let cancelled = false
    fetchCampaignAdCampaigns(platformCampaignId)
      .then((adCampaigns) => {
        if (cancelled) return
        const accountIds = new Set(
          adCampaigns.map((ac) => ac.meta_ad_account_id).filter(Boolean) as string[],
        )
        setMultiAccountWarning(accountIds.size > 1)
      })
      .catch(() => {
        if (!cancelled) setMultiAccountWarning(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, platformCampaignId])

  const handleCreatePixel = useCallback(async () => {
    const accounts = await fetchMetaAdAccounts().catch(() => [])
    const accountId = accounts[0]?.id
    if (!accountId) return
    setCreatingPixel(true)
    try {
      await createMetaPixel(accountId, {
        name: `ROAS Pixel ${new Date().toISOString().slice(0, 10)}`,
      })
      await runReview()
    } finally {
      setCreatingPixel(false)
    }
  }, [runReview])

  const handleFixInSettings = useCallback(() => {
    onClose()
    openWorkspaceSettings('integrations')
  }, [onClose, openWorkspaceSettings])

  const handleContinue = useCallback(() => {
    const id = useCampaignPicker ? selectedAdCampaignId : undefined
    onClose()
    onContinueToPublish(id ?? undefined)
  }, [onClose, onContinueToPublish, useCampaignPicker, selectedAdCampaignId])

  const requiredFailed = items.some(
    (i) => i.id !== 'pixel' && i.id !== 'billing' && i.status === 'failed',
  )

  const reviewInProgress = items.some(
    (i) => i.id !== 'billing' && (i.status === 'pending' || i.status === 'checking'),
  )
  const reviewStarted = !useCampaignPicker || reviewLaunched
  const showFooterActions = reviewStarted && !reviewInProgress

  if (!open) return null

  return (
    <div className="px-spacing-4 fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="surface-card border-subtle rounded-spacing-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden border">
        <div className="px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between">
          <div className="gap-spacing-2 flex min-w-0 items-center">
            <h2 className="title-h5 text-foreground uppercase">META INTEGRATIONS REVIEW</h2>
            <Tooltip label={META_INTEGRATIONS_REVIEW_INFO} wide side="bottom">
              <button
                type="button"
                className="btn-icon-bare text-muted-foreground hover:text-foreground shrink-0"
                aria-label="About Meta integrations review"
              >
                <Info className="icon-sm" aria-hidden />
              </button>
            </Tooltip>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-bare">
            <X className="icon-sm" />
          </button>
        </div>

        <div className="px-spacing-6 py-spacing-4 pb-spacing-6 min-h-0 flex-1 overflow-y-auto">
          {useCampaignPicker ? (
            <div className="mb-spacing-4 space-y-spacing-2">
              {!reviewLaunched ? (
                <p className="body-3 text-muted-foreground">
                  Choose a campaign and tap launch to run integration checks.
                </p>
              ) : null}
              <div className="gap-spacing-2 flex items-stretch">
                {adCampaignOptions && adCampaignOptions.length > 0 ? (
                  <div className="min-w-0 flex-1">
                    <SettingsDropdown
                      appearance="spaces"
                      value={selectedAdCampaignId ?? ''}
                      placeholder="Select ad campaign"
                      options={adCampaignOptions.map(
                        (opt: MetaIntegrationsReviewModalAdCampaignOption) => ({
                          value: opt.id,
                          label: opt.name,
                        }),
                      )}
                      onChange={(id) => setSelectedAdCampaignId(id || null)}
                      disabled={reviewLaunched}
                      searchable={adCampaignOptions.length > 6}
                    />
                  </div>
                ) : (
                  <p className="body-3 text-muted-foreground rounded-spacing-2 px-spacing-3 flex min-h-[36px] flex-1 items-center border border-dashed border-[var(--color-border)]">
                    No ad campaigns yet. Use New Campaign in the sidebar.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!selectedAdCampaignId || reviewLaunched}
                  onClick={handleLaunchReview}
                  className="chip-glass-green h-spacing-9 rounded-spacing-2 px-spacing-3 flex shrink-0 items-center justify-center transition-opacity disabled:pointer-events-none disabled:opacity-40"
                  aria-label="Run Meta integration checks"
                >
                  <Rocket className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          {multiAccountWarning && (
            <div className="rounded-spacing-2 p-spacing-3 mb-spacing-4 bg-amber-500/15">
              <p className="body-3 font-medium text-amber-400">
                Multiple ad accounts in this campaign
              </p>
              <p className="typo-caption text-muted-foreground mt-1">
                Running the same offer from multiple ad accounts can mean you bid against yourself
                and raise costs. Prefer one ad account per campaign.
              </p>
            </div>
          )}

          <div className="space-y-spacing-2">
            {(!useCampaignPicker || reviewLaunched) &&
              items.map((item) => (
                <div key={item.id} className="gap-spacing-2 flex items-start">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    {item.status === 'pending' && (
                      <div className="border-border h-3 w-3 rounded-full border" />
                    )}
                    {item.status === 'checking' && (
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    )}
                    {item.status === 'passed' && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
                        <Check className="h-3 w-3 text-green-400" />
                      </div>
                    )}
                    {item.status === 'failed' && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
                        <AlertCircle className="text-destructive h-3 w-3" />
                      </div>
                    )}
                    {item.status === 'manual' && (
                      <div className="bg-secondary flex h-5 w-5 items-center justify-center rounded-full">
                        <span className="typo-caption text-muted-foreground">?</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`body-3 ${
                        item.status === 'passed'
                          ? 'text-foreground'
                          : item.status === 'failed'
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                      {item.recommended && (
                        <span className="typo-caption text-muted-foreground ml-1">
                          (recommended)
                        </span>
                      )}
                    </p>
                    {item.error && (
                      <p className="typo-caption text-muted-foreground mt-0.5">{item.error}</p>
                    )}
                    {item.id === 'billing' && (
                      <a
                        href={META_BILLING_HELP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="typo-caption text-primary mt-1 inline-flex items-center gap-1 hover:underline"
                      >
                        Add payment method in Meta Business Suite
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {item.id === 'ad_accounts' && item.status === 'failed' && (
                      <a
                        href={META_ADD_AD_ACCOUNT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="typo-caption text-primary mt-1 inline-flex items-center gap-1 hover:underline"
                      >
                        Add or create ad account in Meta Business Manager
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {item.id === 'fb_pages' && item.status === 'failed' && (
                      <a
                        href={META_CREATE_PAGE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="typo-caption text-primary mt-1 inline-flex items-center gap-1 hover:underline"
                      >
                        Create a Page in Meta
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {item.id === 'pixel' &&
                      items.find((i) => i.id === 'ad_accounts')?.status === 'passed' && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCreatePixel()}
                            disabled={creatingPixel}
                            className="button-glass-neutral rounded-spacing-2 px-spacing-2 py-spacing-1 typo-caption gap-1 font-medium"
                          >
                            {creatingPixel ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            Create pixel
                          </button>
                          <a
                            href={META_EVENTS_MANAGER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="typo-caption text-primary inline-flex items-center gap-1 hover:underline"
                          >
                            Or set up in Meta Events Manager
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                  </div>
                </div>
              ))}
          </div>

          {requiredFailed && (!useCampaignPicker || reviewLaunched) && (
            <p className="body-3 text-muted-foreground mt-spacing-4">
              Connect Meta and set up your ad account and page in Settings → Integrations, then try
              again.
            </p>
          )}

          {showFooterActions ? (
            <div className="mt-spacing-4 gap-spacing-2 flex flex-col">
              {requiredFailed ? (
                <button
                  type="button"
                  onClick={handleFixInSettings}
                  className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center justify-center font-medium transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 shrink-0" />
                  Open Settings → Integrations
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="button-glass-accent body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center justify-center font-semibold"
                >
                  Continue to publish
                </button>
              )}
              {!requiredFailed ? (
                <button
                  type="button"
                  onClick={handleFixInSettings}
                  className="body-3 text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 w-full font-medium transition-colors"
                >
                  Open Settings → Integrations
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
