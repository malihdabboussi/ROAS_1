'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { backendGet } from '@/lib/api/backend-client'

interface MetaStatusCardProps {
  metaAdId: string
  status: string
  campaignId?: string
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; badge: string; label: string }> = {
  ACTIVE: { icon: CheckCircle2, badge: 'badge-glass badge-glass-green', label: 'Active' },
  PAUSED: { icon: Clock, badge: 'badge-glass badge-glass-warning-bg', label: 'Paused' },
  PENDING_REVIEW: { icon: Clock, badge: 'badge-glass badge-glass-orange', label: 'Pending Review' },
  DISAPPROVED: { icon: AlertCircle, badge: 'badge-glass badge-glass-red', label: 'Disapproved' },
  WITH_ISSUES: { icon: AlertCircle, badge: 'badge-glass badge-glass-orange', label: 'Has Issues' },
}

export function MetaStatusCard({
  metaAdId,
  status: initialStatus,
  campaignId,
}: MetaStatusCardProps) {
  const [status, setStatus] = useState(initialStatus)
  const [refreshing, setRefreshing] = useState(false)

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG['PAUSED']!
  const Icon = config!.icon

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await backendGet<{
        success: boolean
        effective_status?: string
      }>(`/api/integrations/meta/ad-status?meta_ad_id=${metaAdId}`)
      if (res?.effective_status) {
        setStatus(res.effective_status)
      }
    } catch {}
    setRefreshing(false)
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div className="gap-spacing-3 flex items-center justify-between">
        <div className="gap-spacing-2 flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10">
            <Icon className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="body-2 text-foreground font-medium">Meta Ad Status</h3>
            <span className={`${config!.badge} typo-caption font-medium`}>{config!.label}</span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-icon-glass"
          title="Refresh status"
        >
          {refreshing ? (
            <Loader2 className="icon-sm animate-spin" />
          ) : (
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </button>
      </div>
      <div className="mt-spacing-2">
        <a
          href={`https://adsmanager.facebook.com/adsmanager/manage/ads?act=${campaignId || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="body-3 text-primary gap-spacing-1 inline-flex items-center hover:underline"
        >
          View in Meta Ads Manager
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
