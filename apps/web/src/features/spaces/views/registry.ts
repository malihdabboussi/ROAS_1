import { isPaidAdsViewType } from '../lib/paid-ads-display-mode'
import type { ViewDef } from '../types/space-schema'
import { ARTIFACT_VIEW_TYPES, REPORTING_VIEW_TYPES } from '../types/space-schema'
import { AdsResearchToolbar } from './ads-research/AdsResearchToolbar'
import { ArtifactsToolbar } from './artifacts/ArtifactsToolbar'
import { PaidAdsToolbar } from './artifacts/PaidAdsToolbar'
import { CalendarToolbar } from './calendar/CalendarToolbar'
import { ChannelsToolbar } from './channels/ChannelsToolbar'
import { ContactsToolbar } from './contacts/ContactsToolbar'
import { DefaultToolbar } from './default/DefaultToolbar'
import { DocsToolbar } from './docs/DocsToolbar'
import { IgResearchToolbar } from './ig-research/IgResearchToolbar'
import { SpaceMediaToolbar } from './media/SpaceMediaToolbar'
import { MissionsToolbar } from './missions/MissionsToolbar'
import { ReportingToolbar } from './reporting/ReportingToolbar'
import type { SpaceToolbarComponent } from './types'

/**
 * Registry mapping a `ViewDef['type']` to its per-view toolbar component.
 *
 * Adding a new view type:
 *   1. Add the type literal to `space-schema.ts`.
 *   2. Create `views/<folder>/<View>Toolbar.tsx` exporting a `SpaceToolbarComponent`.
 *   3. Register it here.
 */
export function resolveToolbar(viewType: ViewDef['type'] | undefined): SpaceToolbarComponent {
  if (!viewType) return DefaultToolbar
  if (viewType === 'contacts') return ContactsToolbar
  if (viewType === 'docs') return DocsToolbar
  if (viewType === 'calendar') return CalendarToolbar
  if (viewType === 'missions') return MissionsToolbar
  if (
    viewType === 'instagram_research' ||
    viewType === 'tiktok_research' ||
    viewType === 'youtube_research' ||
    viewType === 'twitter_research' ||
    viewType === 'all_social_research'
  )
    return IgResearchToolbar
  if (viewType === 'ads_research') return AdsResearchToolbar
  if (viewType === 'channels' || viewType === 'channel') return ChannelsToolbar
  if (viewType === 'media') return SpaceMediaToolbar
  if (REPORTING_VIEW_TYPES.has(viewType)) return ReportingToolbar
  if (isPaidAdsViewType(viewType)) return PaidAdsToolbar
  if (viewType === 'all_artifacts') return ArtifactsToolbar
  if (ARTIFACT_VIEW_TYPES.has(viewType)) return ArtifactsToolbar
  return DefaultToolbar
}

export {
  ChannelsToolbar,
  ContactsToolbar,
  DefaultToolbar,
  DocsToolbar,
  CalendarToolbar,
  IgResearchToolbar,
  MissionsToolbar,
  ReportingToolbar,
  ArtifactsToolbar,
  SpaceMediaToolbar,
}
