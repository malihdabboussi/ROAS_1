import type { Dispatch, SetStateAction } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { FieldStatus } from './ad-set-settings-panel-primitives'
import type { FieldState } from './useAdSetSettingsFieldSaves'

export type AdSetPlacementOption = {
  value: string
  label: string
  platform: string
}

type AdSetPlacementGroup = {
  id: string
  label: string
  description: string
  placements: AdSetPlacementOption[]
}

const PLACEMENT_GROUPS: AdSetPlacementGroup[] = [
  {
    id: 'feeds',
    label: 'Feeds',
    description: 'Get high visibility for your business with ads in feeds',
    placements: [
      { value: 'feed', label: 'Facebook Feed', platform: 'facebook' },
      { value: 'profile_feed', label: 'Facebook Profile Feed', platform: 'facebook' },
      { value: 'feed', label: 'Instagram Feed', platform: 'instagram' },
      { value: 'marketplace', label: 'Facebook Marketplace', platform: 'facebook' },
      { value: 'right_hand_column', label: 'Facebook Right Column', platform: 'facebook' },
      { value: 'explore', label: 'Instagram Explore', platform: 'instagram' },
      { value: 'explore_home', label: 'Instagram Explore Home', platform: 'instagram' },
      { value: 'business_explore', label: 'Facebook Business Explore', platform: 'facebook' },
      { value: 'video_feeds', label: 'Facebook Video Feeds', platform: 'facebook' },
    ],
  },
  {
    id: 'stories_reels',
    label: 'Stories, Status, Reels',
    description: 'Tell a rich, visual story with immersive, fullscreen vertical ads',
    placements: [
      { value: 'story', label: 'Instagram Stories', platform: 'instagram' },
      { value: 'story', label: 'Facebook Stories', platform: 'facebook' },
      { value: 'reels', label: 'Instagram Reels', platform: 'instagram' },
      { value: 'reels', label: 'Facebook Reels', platform: 'facebook' },
      { value: 'profile_reels', label: 'Instagram Profile Reels', platform: 'instagram' },
    ],
  },
  {
    id: 'instream',
    label: 'In-stream ads for reels',
    description: 'Reach people before, during or after they watch a reel',
    placements: [
      { value: 'instream_video', label: 'Facebook In-Stream Video', platform: 'facebook' },
    ],
  },
  {
    id: 'search',
    label: 'Search results',
    description: 'Get visibility for your business as people search',
    placements: [
      { value: 'search', label: 'Facebook Search Results', platform: 'facebook' },
      { value: 'ig_search', label: 'Instagram Search Results', platform: 'instagram' },
    ],
  },
  {
    id: 'apps_sites',
    label: 'Apps and sites',
    description: 'Expand your reach with ads in external apps and websites',
    placements: [
      { value: 'audience_network', label: 'Audience Network', platform: 'audience_network' },
    ],
  },
]

interface AdSetPlacementsFieldProps {
  fieldState?: FieldState
  manualPlacements: boolean
  expandedGroups: Set<string>
  setExpandedGroups: Dispatch<SetStateAction<Set<string>>>
  isPlacementActive: (value: string, platform: string) => boolean
  onManualPlacementsChange: (manualPlacements: boolean) => void
  onToggleGroup: (placements: AdSetPlacementOption[]) => void
  onTogglePlacement: (value: string, platform: string) => void
}

export function AdSetPlacementsField({
  fieldState,
  manualPlacements,
  expandedGroups,
  setExpandedGroups,
  isPlacementActive,
  onManualPlacementsChange,
  onToggleGroup,
  onTogglePlacement,
}: AdSetPlacementsFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="typo-caption text-foreground font-medium">
            Advantage+ Placements
          </label>
          <p className="typo-caption text-muted-foreground">
            Meta chooses the best placements automatically
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fieldState ? <FieldStatus state={fieldState} /> : null}
          <Switch
            checked={!manualPlacements}
            onCheckedChange={(checked) => onManualPlacementsChange(!checked)}
          />
        </div>
      </div>

      {manualPlacements && (
        <div className="space-y-2">
          {PLACEMENT_GROUPS.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            const activeCount = group.placements.filter((placement) =>
              isPlacementActive(placement.value, placement.platform),
            ).length
            const allActive = activeCount === group.placements.length
            const someActive = activeCount > 0 && !allActive

            return (
              <div key={group.id} className="overflow-hidden">
                <div className="flex items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedGroups((prev) => {
                        const next = new Set(prev)
                        if (next.has(group.id)) next.delete(group.id)
                        else next.add(group.id)
                        return next
                      })
                    }
                    className="text-muted-foreground hover:text-foreground -ml-0.5 p-0.5"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <span className="body-3 text-foreground font-medium">{group.label}</span>
                    {!isExpanded && (
                      <span className="typo-caption text-muted-foreground ml-2">
                        {activeCount}/{group.placements.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleGroup(group.placements)}
                    className={`h-4.5 w-4.5 flex items-center justify-center rounded border transition-colors ${
                      allActive
                        ? 'border-primary bg-primary'
                        : someActive
                          ? 'border-primary bg-primary/30'
                          : 'border-border hover:border-foreground/40'
                    }`}
                  >
                    {(allActive || someActive) && (
                      <Check
                        className={`h-3 w-3 ${allActive ? 'text-primary-foreground' : 'text-primary'}`}
                      />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div>
                    <p className="typo-caption text-muted-foreground pb-1 pl-6">
                      {group.description}
                    </p>
                    <div className="space-y-0.5 pb-1 pl-5">
                      {group.placements.map((placement, idx) => {
                        const active = isPlacementActive(placement.value, placement.platform)
                        return (
                          <button
                            key={`${placement.platform}-${placement.value}-${idx}`}
                            type="button"
                            onClick={() =>
                              onTogglePlacement(placement.value, placement.platform)
                            }
                            className="hover:bg-hover-subtle flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left transition-colors"
                          >
                            <span className="body-3 text-foreground/80">
                              {placement.label}
                            </span>
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                active
                                  ? 'border-primary bg-primary'
                                  : 'border-border hover:border-foreground/40'
                              }`}
                            >
                              {active && (
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
