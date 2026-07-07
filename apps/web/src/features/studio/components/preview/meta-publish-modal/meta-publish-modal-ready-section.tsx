import { Rocket } from 'lucide-react'
import { SettingsDropdown } from '../SettingsDropdown'
import type { MetaPublishSummary } from './meta-publish-modal.types'
import { formatBudget } from './meta-publish-modal.utils'

export function MetaPublishModalReadySection({
  summary,
  adCampaignId,
  adAccounts,
  pages,
  igAccounts,
  pixels,
  selectedAccountId,
  setSelectedAccountId,
  selectedPageId,
  setSelectedPageId,
  selectedInstagramUserId,
  setSelectedInstagramUserId,
  selectedPixelId,
  setSelectedPixelId,
  onPublish,
}: {
  summary: MetaPublishSummary
  adCampaignId?: string
  adAccounts: Array<{ id: string; name: string }>
  pages: Array<{ id: string; name: string }>
  igAccounts: Array<{ id: string; username?: string }>
  pixels: Array<{ id: string; name: string }>
  selectedAccountId: string
  setSelectedAccountId: (v: string) => void
  selectedPageId: string
  setSelectedPageId: (v: string) => void
  selectedInstagramUserId: string
  setSelectedInstagramUserId: (v: string) => void
  selectedPixelId: string
  setSelectedPixelId: (v: string) => void
  onPublish: () => void
}) {
  return (
    <div className="mt-spacing-4 space-y-spacing-4">
      <div className="border-border border-t" />

      <div className="space-y-spacing-2">
        <p className="typo-caption text-foreground font-medium uppercase">Summary</p>
        <div className="rounded-spacing-2 bg-secondary p-spacing-3 space-y-spacing-2">
          {summary.campaignName && (
            <div className="gap-spacing-3 flex items-start justify-between">
              <span className="typo-caption text-muted-foreground shrink-0 pt-0.5">Campaign</span>
              <span className="body-3 text-foreground text-right font-medium">
                {summary.campaignName}
              </span>
            </div>
          )}
          {typeof summary.totalAdSets === 'number' && typeof summary.totalAds === 'number' && (
            <>
              <div className="flex justify-between">
                <span className="typo-caption text-muted-foreground">Ad Sets</span>
                <span className="body-3 text-foreground font-medium">{summary.totalAdSets}</span>
              </div>
              <div className="flex justify-between">
                <span className="typo-caption text-muted-foreground">Ads</span>
                <span className="body-3 text-foreground font-medium">{summary.totalAds}</span>
              </div>
            </>
          )}
          {summary.objective && (
            <div className="flex justify-between">
              <span className="typo-caption text-muted-foreground">Objective</span>
              <span className="badge-glass badge-glass-blue typo-caption font-medium">
                {summary.objective.replace('OUTCOME_', '').replace(/_/g, ' ')}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="typo-caption text-muted-foreground">Budget</span>
            <span className="body-3 text-foreground font-medium">
              {summary.dailyBudget
                ? formatBudget(summary.dailyBudget)
                : summary.lifetimeBudget
                  ? `$${(summary.lifetimeBudget / 100).toFixed(2)} lifetime`
                  : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="typo-caption text-muted-foreground">Countries</span>
            <span className="body-3 text-foreground font-medium">
              {summary.countries.join(', ') || 'None'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="typo-caption text-muted-foreground">Initial Status</span>
            <span className="badge-glass badge-glass-orange typo-caption font-medium">Paused</span>
          </div>
        </div>
      </div>

      <div className="space-y-spacing-3">
        <div className="space-y-spacing-2">
          <label className="typo-caption text-foreground font-medium">Ad Account</label>
          <SettingsDropdown
            value={selectedAccountId}
            options={adAccounts.map((a) => ({ value: a.id, label: a.name }))}
            onChange={(v) => setSelectedAccountId(v)}
            searchable
          />
        </div>
        <div className="space-y-spacing-2">
          <label className="typo-caption text-foreground font-medium">Facebook Page</label>
          <SettingsDropdown
            value={selectedPageId}
            options={pages.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => setSelectedPageId(v)}
            searchable
          />
        </div>
        <div className="space-y-spacing-2">
          <label className="typo-caption text-foreground font-medium">Instagram Account</label>
          <SettingsDropdown
            value={selectedInstagramUserId}
            options={igAccounts.map((a) => ({
              value: a.id,
              label: a.username ? `@${a.username}` : a.id,
            }))}
            onChange={(v) => setSelectedInstagramUserId(v)}
            searchable
          />
        </div>
        <div className="space-y-spacing-2">
          <label className="typo-caption text-foreground font-medium">Meta Pixel</label>
          <SettingsDropdown
            value={selectedPixelId}
            options={pixels.map((pixel) => ({
              value: pixel.id,
              label: pixel.name || pixel.id,
            }))}
            onChange={(v) => setSelectedPixelId(v)}
            searchable
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void onPublish()}
        disabled={!selectedAccountId || !selectedPageId || !selectedInstagramUserId}
        className="button-glass-accent gap-spacing-2 rounded-spacing-2 px-spacing-4 py-spacing-3 body-2 flex w-full items-center justify-center font-semibold disabled:opacity-50"
      >
        <Rocket className="h-4 w-4" />
        {adCampaignId ? 'Push Campaign to Meta' : 'Push Ad to Meta'}
      </button>
    </div>
  )
}
