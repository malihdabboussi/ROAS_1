import type { AdSet } from '../../types'
import { SettingsField, SettingsSection } from './ad-set-settings-panel-primitives'
import type { FieldState } from './useAdSetSettingsFieldSaves'

interface AdSetGeneralBudgetFieldsProps {
  appearance: 'studio' | 'spaces'
  data: AdSet
  fieldStates: Record<string, FieldState>
  inputClassName: string
  campaignBudgetType: 'CBO' | 'ABO' | null
  scheduleType: 'continuous' | 'one_time'
  dailyBudgetText: string
  lifetimeBudgetText: string
  onTextChange: (field: string, value: string) => void
  onBudgetChange: (field: 'daily_budget' | 'lifetime_budget', value: string) => void
}

export function AdSetGeneralBudgetFields({
  appearance,
  data,
  fieldStates,
  inputClassName,
  campaignBudgetType,
  scheduleType,
  dailyBudgetText,
  lifetimeBudgetText,
  onTextChange,
  onBudgetChange,
}: AdSetGeneralBudgetFieldsProps) {
  const isSpaces = appearance === 'spaces'

  return (
    <>
      <SettingsSection appearance={appearance} title={isSpaces ? 'General' : undefined}>
        <SettingsField appearance={appearance} label="Name" fieldState={fieldStates.name}>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onTextChange('name', e.target.value)}
            className={inputClassName}
            placeholder="Ad set name"
          />
        </SettingsField>
      </SettingsSection>

      {campaignBudgetType === 'ABO' && (
        <SettingsSection appearance={appearance} title={isSpaces ? 'Budget' : undefined}>
          {scheduleType === 'continuous' ? (
            <SettingsField
              appearance={appearance}
              label="Daily Budget ($)"
              fieldState={fieldStates.daily_budget}
            >
              <input
                type="text"
                inputMode="decimal"
                value={dailyBudgetText}
                onChange={(e) => onBudgetChange('daily_budget', e.target.value)}
                className={inputClassName}
                placeholder="e.g. 100.00"
              />
            </SettingsField>
          ) : (
            <SettingsField
              appearance={appearance}
              label="Lifetime Budget ($)"
              fieldState={fieldStates.lifetime_budget}
            >
              <input
                type="text"
                inputMode="decimal"
                value={lifetimeBudgetText}
                onChange={(e) => onBudgetChange('lifetime_budget', e.target.value)}
                className={inputClassName}
                placeholder="e.g. 1000.00"
              />
            </SettingsField>
          )}
        </SettingsSection>
      )}
    </>
  )
}
