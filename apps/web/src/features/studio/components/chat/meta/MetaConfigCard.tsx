'use client'

import { useState } from 'react'
import { DollarSign, Globe, Settings, Target } from 'lucide-react'

const OBJECTIVES = [
  { id: 'OUTCOME_TRAFFIC', label: 'Traffic', description: 'Drive people to your website' },
  { id: 'OUTCOME_LEADS', label: 'Leads', description: 'Generate leads for your business' },
  { id: 'OUTCOME_SALES', label: 'Sales', description: 'Drive conversions and purchases' },
  {
    id: 'OUTCOME_AWARENESS',
    label: 'Awareness',
    description: 'Reach people likely to remember your ad',
  },
  {
    id: 'OUTCOME_ENGAGEMENT',
    label: 'Engagement',
    description: 'Get more likes, comments, and shares',
  },
]

interface MetaConfigCardProps {
  adId: string
  defaults?: {
    objective?: string
    daily_budget?: number
    countries?: string[]
    pixel_id?: string
    custom_event_type?: string
  }
  onConfigure?: (config: {
    objective: string
    dailyBudget: number
    countries: string[]
    pixelId?: string
    customEventType?: string
  }) => void
}

export function MetaConfigCard({ adId: _adId, defaults, onConfigure }: MetaConfigCardProps) {
  const initialDailyBudget =
    typeof defaults?.daily_budget === 'number'
      ? Math.max(
          1,
          Math.round(
            defaults.daily_budget >= 100 ? defaults.daily_budget / 100 : defaults.daily_budget,
          ),
        )
      : 5
  const [objective, setObjective] = useState(defaults?.objective || 'OUTCOME_TRAFFIC')
  const [dailyBudget, setDailyBudget] = useState(initialDailyBudget)
  const [countries, setCountries] = useState(defaults?.countries?.join(', ') || 'US')

  const handleConfirm = () => {
    const normalizedBudget = Number.isFinite(dailyBudget) ? dailyBudget : 5
    onConfigure?.({
      objective,
      dailyBudget: Math.max(100, Math.round(normalizedBudget * 100)),
      countries: countries
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
      pixelId: defaults?.pixel_id,
      customEventType: defaults?.custom_event_type,
    })
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div className="gap-spacing-2 flex items-center">
        <Settings className="icon-sm text-primary" />
        <h3 className="body-1 text-foreground font-medium">Campaign Settings</h3>
      </div>
      <p className="body-3 text-muted-foreground mt-spacing-1">
        Configure your Meta campaign before publishing.
      </p>

      {/* Objective */}
      <div className="mt-spacing-3">
        <label className="body-3 text-muted-foreground mb-spacing-2 flex items-center gap-1.5 font-medium">
          <Target className="icon-sm" />
          Campaign Objective
        </label>
        <div className="space-y-spacing-1">
          {OBJECTIVES.map((obj) => {
            const isSelected = objective === obj.id
            return (
              <button
                key={obj.id}
                onClick={() => setObjective(obj.id)}
                className={`px-spacing-3 py-spacing-2 rounded-spacing-2 body-3 flex w-full items-center justify-between text-left transition-all ${
                  isSelected
                    ? 'bg-primary/10 text-foreground border-primary/20 border'
                    : 'hover:bg-hover-subtle text-muted-foreground border border-transparent'
                }`}
              >
                <div>
                  <div className="font-medium">{obj.label}</div>
                  <div className="typo-caption text-muted-foreground">{obj.description}</div>
                </div>
                {isSelected && <div className="bg-primary h-2 w-2 flex-shrink-0 rounded-full" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Budget */}
      <div className="mt-spacing-3">
        <label className="body-3 text-muted-foreground mb-spacing-2 flex items-center gap-1.5 font-medium">
          <DollarSign className="icon-sm" />
          Daily Budget (USD)
        </label>
        <input
          type="number"
          min={1}
          value={dailyBudget}
          onChange={(e) => setDailyBudget(Number(e.target.value || 0))}
          className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg text-foreground w-full border [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      {/* Targeting */}
      <div className="mt-spacing-3">
        <label className="body-3 text-muted-foreground mb-spacing-2 flex items-center gap-1.5 font-medium">
          <Globe className="icon-sm" />
          Target Countries (comma-separated)
        </label>
        <input
          type="text"
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
          placeholder="US, CA, GB"
          className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
        />
      </div>

      <button
        onClick={handleConfirm}
        className="button-glass-accent mt-spacing-4 rounded-lg px-4 py-2 text-sm font-medium"
      >
        <span className="relative z-10">Next: Review & Publish</span>
      </button>
    </div>
  )
}
