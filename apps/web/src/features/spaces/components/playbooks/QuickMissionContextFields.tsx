import { StartAdProductionPlaybookFields } from '../StartAdProductionPlaybookFields'
import type { IgOrganicVideoKickoffFields } from './ig-organic-video'
import type { MetaAdsAuditKickoffFields } from './meta-ads-audit'
import type { MetaAdsLaunchKickoffFields } from './meta-ads-launch'
import type { QuickMissionCatalogEntry } from './quick-missions-catalog'
import type { StaticAdProductionKickoffFields } from './static-ad-production'
import type { TaskCleanupKickoffFields, TaskCleanupWindow } from './task-cleanup'
import type { PlaybookKickoffFields } from './webinar-fulfillment'

const CLEANUP_WINDOWS: Array<{ value: TaskCleanupWindow; label: string }> = [
  { value: 'this_week', label: 'This week' },
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'today', label: 'Today' },
]

export function QuickMissionContextFields({
  selection,
  webinar,
  staticFields,
  videoFields,
  meta,
  audit,
  cleanup,
  setWebinar,
  setStaticFields,
  setVideoFields,
  setMeta,
  setAudit,
  setCleanup,
}: {
  selection: QuickMissionCatalogEntry['selection']
  webinar: PlaybookKickoffFields
  staticFields: StaticAdProductionKickoffFields
  videoFields: IgOrganicVideoKickoffFields
  meta: MetaAdsLaunchKickoffFields
  audit: MetaAdsAuditKickoffFields
  cleanup: TaskCleanupKickoffFields
  setWebinar: (fields: PlaybookKickoffFields) => void
  setStaticFields: (fields: StaticAdProductionKickoffFields) => void
  setVideoFields: (fields: IgOrganicVideoKickoffFields) => void
  setMeta: (fields: MetaAdsLaunchKickoffFields) => void
  setAudit: (fields: MetaAdsAuditKickoffFields) => void
  setCleanup: (fields: TaskCleanupKickoffFields) => void
}) {
  if (selection === 'static' || selection === 'video') {
    return (
      <StartAdProductionPlaybookFields
        selected={selection}
        staticFields={staticFields}
        videoFields={videoFields}
        onStaticChange={setStaticFields}
        onVideoChange={setVideoFields}
      />
    )
  }
  if (selection === 'strategy' || selection === 'webinar') {
    return (
      <>
        <Field
          label="Client / campaign context"
          value={webinar.client_context}
          onChange={(value) => setWebinar({ ...webinar, client_context: value })}
        />
        <Field
          label="Transcript URL (optional)"
          value={webinar.transcript_url}
          onChange={(value) => setWebinar({ ...webinar, transcript_url: value })}
        />
        <Field
          label="Notes (optional)"
          value={webinar.notes}
          onChange={(value) => setWebinar({ ...webinar, notes: value })}
        />
      </>
    )
  }
  if (selection === 'meta') {
    return (
      <>
        <Field
          label="Approved asset links"
          value={meta.asset_links}
          onChange={(value) => setMeta({ ...meta, asset_links: value })}
        />
        <Field
          label="Launch notes (optional)"
          value={meta.notes}
          onChange={(value) => setMeta({ ...meta, notes: value })}
        />
      </>
    )
  }
  if (selection === 'cleanup') {
    return (
      <>
        <div className="space-y-spacing-2">
          <span className="body-3 text-foreground font-medium">Call window</span>
          <div className="gap-spacing-2 flex flex-wrap">
            {CLEANUP_WINDOWS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  cleanup.window === option.value
                    ? 'button-glass-primary rounded-spacing-2 px-spacing-3 py-spacing-2'
                    : 'button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2'
                }
                onClick={() => setCleanup({ ...cleanup, window: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Client filter (optional)"
          value={cleanup.client_context}
          onChange={(value) => setCleanup({ ...cleanup, client_context: value })}
        />
        <Field
          label="Notes (optional)"
          value={cleanup.notes}
          onChange={(value) => setCleanup({ ...cleanup, notes: value })}
        />
      </>
    )
  }
  return (
    <>
      <Field
        label="Reporting period"
        value={audit.reporting_period}
        onChange={(value) => setAudit({ ...audit, reporting_period: value })}
      />
      <Field
        label="Audit notes (optional)"
        value={audit.notes}
        onChange={(value) => setAudit({ ...audit, notes: value })}
      />
    </>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-spacing-2 block">
      <span className="body-3 text-foreground font-medium">{label}</span>
      <textarea
        className="input-glass body-3 text-foreground h-spacing-16 w-full resize-y"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
