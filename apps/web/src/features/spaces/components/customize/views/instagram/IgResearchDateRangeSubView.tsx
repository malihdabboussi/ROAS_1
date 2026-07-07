'use client'

import type { SocialPlatform, ViewDef } from '../../../../types/space-schema'
import { ViewDateRangeSubView } from '../../../reporting/shared/view-date-range-subview'
import { getSocialConfig, patchSocialConfig } from './instagram-customize.helpers'

export function IgResearchDateRangeSubView({
  activeView,
  platform = 'instagram',
  onViewPatch,
  onBack,
  onClose,
}: {
  activeView: ViewDef
  platform?: SocialPlatform
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const ic = getSocialConfig(activeView, platform)
  return (
    <ViewDateRangeSubView
      value={{
        time_range: ic.time_range,
        custom_start: ic.custom_start,
        custom_end: ic.custom_end,
      }}
      onPatch={(patch) => patchSocialConfig(onViewPatch, ic, patch, platform, activeView)}
      onBack={onBack}
      onClose={onClose}
    />
  )
}
