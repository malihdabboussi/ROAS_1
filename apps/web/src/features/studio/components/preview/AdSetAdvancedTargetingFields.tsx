import { Switch } from '@/components/ui/forms/switch'
import type { AdSet } from '../../types'
import { SettingsDropdown } from './SettingsDropdown'
import { FieldStatus, SettingsField } from './ad-set-settings-panel-primitives'
import type { FieldState } from './useAdSetSettingsFieldSaves'

const OPTIMIZATION_OPTIONS = [
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views' },
  { value: 'LEAD_GENERATION', label: 'Lead Generation' },
  { value: 'CONVERSIONS', label: 'Conversions' },
  { value: 'REACH', label: 'Reach' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
]

const BILLING_OPTIONS = [
  { value: 'IMPRESSIONS', label: 'Impressions' },
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
]

export type AdSetAgeField = 'age_min' | 'age_max'

interface AdSetOptimizationBillingFieldsProps {
  appearance: 'studio' | 'spaces'
  data: AdSet
  fieldStates: Record<string, FieldState>
  controlAppearance: 'studio' | 'spaces'
  isPostLaunchLocked: boolean
  onSelectChange: (field: string, value: string) => void
}

interface AdSetAgeAdvantageFieldsProps {
  appearance: 'studio' | 'spaces'
  targeting: Record<string, unknown>
  advantagePlusOn: boolean
  fieldStates: Record<string, FieldState>
  narrow20InputClassName: string
  onAgeTargetingChange: (field: AdSetAgeField, value: number | undefined) => void
  onAdvantageAudienceChange: (checked: boolean) => void
}

export function AdSetOptimizationBillingFields({
  appearance,
  data,
  fieldStates,
  controlAppearance,
  isPostLaunchLocked,
  onSelectChange,
}: AdSetOptimizationBillingFieldsProps) {
  return (
    <div className="space-y-5">
      <SettingsField
        appearance={appearance}
        label="Optimization Goal"
        fieldState={fieldStates.optimization_goal}
      >
        <SettingsDropdown
          value={data.optimization_goal}
          options={OPTIMIZATION_OPTIONS}
          onChange={(value) => onSelectChange('optimization_goal', value)}
          disabled={isPostLaunchLocked}
          appearance={controlAppearance}
        />
      </SettingsField>
      <SettingsField
        appearance={appearance}
        label="Billing Event"
        fieldState={fieldStates.billing_event}
      >
        <SettingsDropdown
          value={data.billing_event}
          options={BILLING_OPTIONS}
          onChange={(value) => onSelectChange('billing_event', value)}
          disabled={isPostLaunchLocked}
          appearance={controlAppearance}
        />
      </SettingsField>
    </div>
  )
}

export function AdSetAgeAdvantageFields({
  appearance,
  targeting,
  advantagePlusOn,
  fieldStates,
  narrow20InputClassName,
  onAgeTargetingChange,
  onAdvantageAudienceChange,
}: AdSetAgeAdvantageFieldsProps) {
  return (
    <>
      <SettingsField
        appearance={appearance}
        label="Age Range"
        fieldState={fieldStates.targeting_age}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={18}
              max={advantagePlusOn ? 18 : 65}
              value={advantagePlusOn ? 18 : ((targeting.age_min as number) ?? '')}
              disabled={advantagePlusOn}
              onChange={(event) => {
                const value = event.target.value
                  ? parseInt(event.target.value, 10)
                  : undefined
                onAgeTargetingChange('age_min', value)
              }}
              className={`${narrow20InputClassName} disabled:opacity-50`}
              placeholder="18"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="number"
              min={18}
              max={65}
              value={advantagePlusOn ? 65 : ((targeting.age_max as number) ?? '')}
              disabled={advantagePlusOn}
              onChange={(event) => {
                const value = event.target.value
                  ? parseInt(event.target.value, 10)
                  : undefined
                onAgeTargetingChange('age_max', value)
              }}
              className={`${narrow20InputClassName} disabled:opacity-50`}
              placeholder="65"
            />
          </div>
          {advantagePlusOn && (
            <p className="typo-caption text-muted-foreground">
              Advantage+ is ON — age is a suggestion. Min can be 18-25, max is always 65.
            </p>
          )}
        </div>
      </SettingsField>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <label
              className="typo-caption text-foreground font-medium"
              title="Advantage+ Audience is Meta's algorithmic suggestions. We recommend keeping this on."
            >
              AI Recommended <span className="text-primary">(Recommended: ON)</span>
            </label>
            <p className="typo-caption text-muted-foreground">
              {advantagePlusOn
                ? 'AI expands beyond your targeting to find better audiences'
                : 'Enable to let AI find better-performing audiences'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fieldStates.targeting_advantage ? (
              <FieldStatus state={fieldStates.targeting_advantage} />
            ) : null}
            <Switch checked={advantagePlusOn} onCheckedChange={onAdvantageAudienceChange} />
          </div>
        </div>
      </div>
    </>
  )
}
