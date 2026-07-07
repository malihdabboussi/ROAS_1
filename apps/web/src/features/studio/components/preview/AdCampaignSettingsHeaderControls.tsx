import type { ReactNode } from 'react'
import { Loader2, Rocket } from 'lucide-react'

interface AdCampaignSettingsHeaderControlsProps {
  isPublished: boolean
  canRepublish: boolean
  metaEffectiveStatus?: string | null
  settingMetaStatus: boolean
  headerTrailing?: ReactNode
  onOpenPublish: () => void
  onSetMetaStatus: (status: 'ACTIVE' | 'PAUSED') => void | Promise<void>
}

export function AdCampaignSettingsHeaderControls({
  isPublished,
  canRepublish,
  metaEffectiveStatus,
  settingMetaStatus,
  headerTrailing,
  onOpenPublish,
  onSetMetaStatus,
}: AdCampaignSettingsHeaderControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {(!isPublished || canRepublish) && (
        <button
          type="button"
          onClick={onOpenPublish}
          className="chip-glass-green flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
        >
          <Rocket className="h-3 w-3" />
          {canRepublish ? 'Republish' : 'Publish'}
        </button>
      )}
      {isPublished ? (
        <div className="flex items-center gap-1.5">
          {metaEffectiveStatus === 'ACTIVE' ? (
            <>
              <button
                type="button"
                disabled={settingMetaStatus}
                onClick={() => void onSetMetaStatus('PAUSED')}
                className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-60"
              >
                {settingMetaStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Pause'}
              </button>
              <span className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Running
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={settingMetaStatus}
                onClick={() => void onSetMetaStatus('ACTIVE')}
                className="flex items-center gap-1 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-60"
              >
                {settingMetaStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Activate'}
              </button>
              <span className="flex items-center gap-1 rounded-lg bg-warning/10 px-2.5 py-1.5 text-xs font-semibold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                Paused
              </span>
            </>
          )}
        </div>
      ) : null}
      {headerTrailing}
    </div>
  )
}
