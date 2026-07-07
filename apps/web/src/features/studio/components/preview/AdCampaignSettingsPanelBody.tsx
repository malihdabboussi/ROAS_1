'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import type { AdCampaign } from '../../types'
import { AdCampaignMetaSourceBanner } from './AdCampaignMetaSourceBanner'
import { CampaignDateTimePopover } from './CampaignDateTimePopover'
import { SettingsDropdown } from './SettingsDropdown'
import type {
  AdCampaignFieldState,
  AdCampaignSettingsAppearance,
} from './ad-campaign-settings-panel.types'

const OBJECTIVE_OPTIONS = [
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_SALES', label: 'Sales' },
  { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
]

const BID_STRATEGY_OPTIONS = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Lowest Cost (no cap)' },
  { value: 'COST_CAP', label: 'Cost Cap' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Bid Cap' },
  { value: 'LOWEST_COST_WITH_MIN_ROAS', label: 'Minimum ROAS' },
]

const SPACES_INPUT_CLS =
  'border-border focus:border-primary h-spacing-9 px-spacing-3 body-3 text-foreground rounded-spacing-2 bg-background w-full border outline-none focus:ring-ring focus-visible:ring-ring ring-0'

interface AdCampaignSettingsPanelBodyProps {
  appearance: AdCampaignSettingsAppearance
  data: AdCampaign
  fieldStates: Record<string, AdCampaignFieldState>
  simpleMode: boolean
  dailyBudgetText: string
  lifetimeBudgetText: string
  isPostLaunchLocked: boolean
  onTextChange: (field: string, value: string) => void
  onSelectChange: (field: string, value: string) => void
  onBudgetChange: (field: 'daily_budget' | 'lifetime_budget', textValue: string) => void
  onToggleAdvanced: () => void
  onApplyTimelinePreset: (days: number) => void | Promise<void>
  onStartTimeChange: (value: string | null) => void
  onEndTimeChange: (value: string | null) => void
}

export function AdCampaignSettingsPanelBody({
  appearance,
  data,
  fieldStates,
  simpleMode,
  dailyBudgetText,
  lifetimeBudgetText,
  isPostLaunchLocked,
  onTextChange,
  onSelectChange,
  onBudgetChange,
  onToggleAdvanced,
  onApplyTimelinePreset,
  onStartTimeChange,
  onEndTimeChange,
}: AdCampaignSettingsPanelBodyProps) {
  const isSpaces = appearance === 'spaces'
  const inputCls = isSpaces ? SPACES_INPUT_CLS : 'input-glass body-3 w-full'
  const controlAppearance = isSpaces ? 'spaces' : 'studio'

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      {data.source === 'meta' ? (
        <AdCampaignMetaSourceBanner
          appearance={appearance}
          metaCampaignId={data.meta_campaign_id}
          metaAdAccountId={data.meta_ad_account_id}
        />
      ) : null}
      <div className={isSpaces ? 'space-y-spacing-4 p-spacing-4' : 'space-y-8 px-5 py-5'}>
        <SettingsSection appearance={appearance} title={isSpaces ? 'General' : undefined}>
          <SettingsField label="Name" fieldState={fieldStates.name} appearance={appearance}>
            <input
              type="text"
              value={data.name}
              onChange={(event) => onTextChange('name', event.target.value)}
              className={inputCls}
              placeholder="Campaign name"
            />
          </SettingsField>

          <SettingsField
            label="Campaign Objective"
            fieldState={fieldStates.objective}
            appearance={appearance}
          >
            <SettingsDropdown
              value={data.objective}
              options={OBJECTIVE_OPTIONS}
              onChange={(value) => onSelectChange('objective', value)}
              disabled={isPostLaunchLocked}
              appearance={controlAppearance}
            />
          </SettingsField>
        </SettingsSection>

        <SettingsSection appearance={appearance} title={isSpaces ? 'Schedule & budget' : undefined}>
          <SettingsField
            label="Schedule Type"
            fieldState={fieldStates.schedule_type}
            appearance={appearance}
          >
            <SettingsDropdown
              value={data.schedule_type ?? 'continuous'}
              options={[
                {
                  value: 'continuous',
                  label: 'Continuous',
                  description: 'Runs indefinitely with a daily budget',
                },
                {
                  value: 'one_time',
                  label: 'One-Time',
                  description: 'Runs for a specific date range with a lifetime budget',
                },
              ]}
              onChange={(value) => onSelectChange('schedule_type', value)}
              disabled={isPostLaunchLocked}
              appearance={controlAppearance}
            />
          </SettingsField>

          {(data.schedule_type ?? 'continuous') === 'one_time' ? (
            <>
              <div className="space-y-2">
                <p className="body-3 text-muted-foreground">Suggested timeline</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '1 week', days: 7 },
                    { label: '2 weeks', days: 14 },
                    { label: '1 month', days: 30 },
                  ].map(({ label, days }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => void onApplyTimelinePreset(days)}
                      className="rounded-spacing-2 bg-secondary hover:bg-secondary/80 body-3 text-foreground px-3 py-1.5 font-medium transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-5">
                <SettingsField
                  label="Start Date"
                  fieldState={fieldStates.start_time}
                  appearance={appearance}
                >
                  <CampaignDateTimePopover
                    value={data.start_time}
                    onChange={onStartTimeChange}
                    label="Start date and time"
                    disabled={isPostLaunchLocked}
                    placeholder="Select start date and time"
                  />
                </SettingsField>
                <SettingsField
                  label="End Date"
                  fieldState={fieldStates.end_time}
                  appearance={appearance}
                >
                  <CampaignDateTimePopover
                    value={data.end_time}
                    onChange={onEndTimeChange}
                    label="End date and time"
                    disabled={isPostLaunchLocked}
                    placeholder="Select end date and time"
                  />
                </SettingsField>
              </div>
            </>
          ) : null}

          {data.budget_type === 'CBO' ? (
            (data.schedule_type ?? 'continuous') === 'continuous' ? (
              <SettingsField
                label="Daily Budget ($)"
                fieldState={fieldStates.daily_budget}
                appearance={appearance}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={dailyBudgetText}
                  onChange={(event) => onBudgetChange('daily_budget', event.target.value)}
                  className={inputCls}
                  placeholder="e.g. 100.00"
                />
              </SettingsField>
            ) : (
              <SettingsField
                label="Lifetime Budget ($)"
                fieldState={fieldStates.lifetime_budget}
                appearance={appearance}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={lifetimeBudgetText}
                  onChange={(event) => onBudgetChange('lifetime_budget', event.target.value)}
                  className={inputCls}
                  placeholder="e.g. 1000.00"
                />
              </SettingsField>
            )
          ) : (
            <div className={isSpaces ? undefined : 'rounded-spacing-2 bg-secondary p-spacing-3'}>
              <p className="body-3 text-muted-foreground">
                Ad Set Budget (ABO) is enabled. Set budgets inside each ad set.
              </p>
            </div>
          )}
        </SettingsSection>

        {isSpaces ? (
          <AdvancedOptionsToggle open={!simpleMode} onToggle={onToggleAdvanced} />
        ) : (
          <button
            type="button"
            onClick={onToggleAdvanced}
            className="border-border bg-secondary/30 typo-caption hover:bg-secondary/50 flex items-center gap-2 rounded-full border px-4 py-2 font-medium transition-colors"
          >
            {simpleMode ? (
              <>
                See advanced options
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              '← Back to Simple Mode'
            )}
          </button>
        )}

        <AnimatePresence initial={false}>
          {!simpleMode ? (
            <motion.div
              key="advanced-campaign-fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className={isSpaces ? 'mt-spacing-2 overflow-hidden' : 'overflow-hidden'}
            >
              <SettingsSection appearance={appearance} title={isSpaces ? 'Advanced' : undefined}>
                <SettingsField
                  label="Budget Strategy"
                  fieldState={fieldStates.budget_type}
                  appearance={appearance}
                >
                  <SettingsDropdown
                    value={data.budget_type}
                    options={[
                      {
                        value: 'ABO',
                        label: 'Ad Set Budget (ABO)',
                        description: 'Set budget on each ad set individually',
                      },
                      {
                        value: 'CBO',
                        label: 'Campaign Budget (CBO)',
                        description: 'Meta distributes budget across ad sets automatically',
                      },
                    ]}
                    onChange={(value) => onSelectChange('budget_type', value)}
                    disabled={isPostLaunchLocked}
                    appearance={controlAppearance}
                  />
                </SettingsField>
                <SettingsField
                  label="Bid Strategy"
                  fieldState={fieldStates.bid_strategy}
                  appearance={appearance}
                >
                  <SettingsDropdown
                    value={data.bid_strategy ?? 'LOWEST_COST_WITHOUT_CAP'}
                    options={BID_STRATEGY_OPTIONS}
                    onChange={(value) => onSelectChange('bid_strategy', value)}
                    appearance={controlAppearance}
                  />
                </SettingsField>
              </SettingsSection>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

function AdvancedOptionsToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group/advanced-toggle gap-spacing-2 py-spacing-1 flex w-full items-center"
      aria-expanded={open}
    >
      <span className="body-3 text-muted-foreground group-hover/advanced-toggle:text-foreground flex shrink-0 items-center gap-1.5 font-medium transition-colors">
        {open ? (
          <>
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Simple mode
          </>
        ) : (
          <>
            See advanced options
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </>
        )}
      </span>
      <span className="border-border min-h-px min-w-0 flex-1 border-t" aria-hidden />
    </button>
  )
}

function SettingsSection({
  title,
  appearance,
  children,
}: {
  title?: string
  appearance: AdCampaignSettingsAppearance
  children: ReactNode
}) {
  if (appearance === 'studio') {
    return <div className="space-y-5">{children}</div>
  }
  return (
    <section className="space-y-spacing-3">
      {title ? <p className="body-4 text-muted-foreground font-medium">{title}</p> : null}
      <div className="space-y-spacing-3">{children}</div>
    </section>
  )
}

function SettingsField({
  label,
  fieldState,
  appearance = 'studio',
  children,
}: {
  label: string
  fieldState?: AdCampaignFieldState
  appearance?: AdCampaignSettingsAppearance
  children: ReactNode
}) {
  const isSpaces = appearance === 'spaces'
  return (
    <div className={isSpaces ? 'space-y-spacing-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between gap-2">
        <label
          className={
            isSpaces
              ? 'body-4 text-muted-foreground font-medium'
              : 'body-3 text-foreground font-medium'
          }
        >
          {label}
        </label>
        {fieldState ? <FieldStatus state={fieldState} /> : null}
      </div>
      {children}
    </div>
  )
}

function FieldStatus({ state }: { state: AdCampaignFieldState }) {
  if (state === 'saving') {
    return <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
  }
  if (state === 'saved') return <Check className="text-success h-3.5 w-3.5" />
  if (state === 'error') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  return null
}
