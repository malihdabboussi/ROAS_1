export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment' as const
export const CLIENT_LIFECYCLE_PLAYBOOK_ID = 'client-lifecycle' as const
export const CLIENT_STRATEGY_PLAYBOOK_ID = 'client-strategy' as const
export const STATIC_AD_PRODUCTION_PLAYBOOK_ID = 'static-ad-production' as const
export const IG_ORGANIC_VIDEO_PLAYBOOK_ID = 'ig-organic-video-ad' as const
export const META_ADS_LAUNCH_PLAYBOOK_ID = 'meta-ads-launch' as const
export const META_ADS_AUDIT_PLAYBOOK_ID = 'meta-ads-audit' as const
export const TASK_CLEANUP_PLAYBOOK_ID = 'task-cleanup' as const

export type QuickMissionPlaybookId =
  | typeof CLIENT_LIFECYCLE_PLAYBOOK_ID
  | typeof WEBINAR_FULFILLMENT_PLAYBOOK_ID
  | typeof CLIENT_STRATEGY_PLAYBOOK_ID
  | typeof STATIC_AD_PRODUCTION_PLAYBOOK_ID
  | typeof IG_ORGANIC_VIDEO_PLAYBOOK_ID
  | typeof META_ADS_LAUNCH_PLAYBOOK_ID
  | typeof META_ADS_AUDIT_PLAYBOOK_ID
  | typeof TASK_CLEANUP_PLAYBOOK_ID

export interface QuickMissionCatalogEntry {
  id: QuickMissionPlaybookId
  key: string
  name: string
  description: string
  selection:
    | 'lifecycle'
    | 'strategy'
    | 'webinar'
    | 'static'
    | 'video'
    | 'meta'
    | 'audit'
    | 'cleanup'
}

/** Central Quick Missions catalog — also drives `/` slash playbook entries. */
export const QUICK_MISSION_PLAYBOOKS: readonly QuickMissionCatalogEntry[] = [
  {
    id: CLIENT_LIFECYCLE_PLAYBOOK_ID,
    key: 'client-lifecycle',
    name: 'Client Lifecycle',
    description: 'Onboarding through strategy, production, launch, and optimization',
    selection: 'lifecycle',
  },
  {
    id: TASK_CLEANUP_PLAYBOOK_ID,
    key: 'task-cleanup',
    name: 'Task Cleanup',
    description: 'Audit this week of calls and open tasks, then approve what to file',
    selection: 'cleanup',
  },
  {
    id: CLIENT_STRATEGY_PLAYBOOK_ID,
    key: 'client-strategy',
    name: 'Client Strategy',
    description: 'Campaign-aligned strategy before a client call',
    selection: 'strategy',
  },
  {
    id: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
    key: 'webinar-fulfillment',
    name: 'Webinar Fulfillment',
    description: 'Strategy through production for a client webinar',
    selection: 'webinar',
  },
  {
    id: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
    key: 'static-ad-production',
    name: 'Static Ad Production',
    description: 'Production-ready static image ads',
    selection: 'static',
  },
  {
    id: IG_ORGANIC_VIDEO_PLAYBOOK_ID,
    key: 'ig-organic-video',
    name: 'IG Organic Video',
    description: 'Story footage and stickers for organic video',
    selection: 'video',
  },
  {
    id: META_ADS_LAUNCH_PLAYBOOK_ID,
    key: 'meta-ads-launch',
    name: 'Meta Ads Launch',
    description: 'Approved assets to a paused Meta ads build',
    selection: 'meta',
  },
  {
    id: META_ADS_AUDIT_PLAYBOOK_ID,
    key: 'meta-ads-audit',
    name: 'Meta Ads Audit',
    description: 'Live Meta data to gated optimization actions',
    selection: 'audit',
  },
] as const

export function findQuickMissionByKey(key: string): QuickMissionCatalogEntry | undefined {
  const normalized = key.trim().toLowerCase()
  return QUICK_MISSION_PLAYBOOKS.find(
    (entry) => entry.key === normalized || entry.id === normalized,
  )
}
