'use client'

import { useState, type ReactNode } from 'react'
import { Brain, Loader2, Play } from 'lucide-react'
import type { AdsResearchDepth, AdsResearchKickoffFields } from '../playbooks/ads-research'

const DEFAULT_PERIOD = 'last_30d'

export function AdsResearchRunLauncher({
  disabled,
  submitting,
  onSubmit,
}: {
  disabled: boolean
  submitting: boolean
  onSubmit: (fields: AdsResearchKickoffFields) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [depth, setDepth] = useState<AdsResearchDepth>('standard')
  const [reportingPeriod, setReportingPeriod] = useState(DEFAULT_PERIOD)
  const [selectedCampaigns, setSelectedCampaigns] = useState('')
  const [competitors, setCompetitors] = useState('')
  const [links, setLinks] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const submit = () => {
    onSubmit({
      prompt,
      depth,
      reporting_period: reportingPeriod,
      selected_campaigns: selectedCampaigns,
      competitors,
      links,
    })
  }

  return (
    <section className="card-glass p-spacing-4 gap-spacing-4 flex flex-col rounded-2xl border-0">
      <div className="gap-spacing-3 flex items-start">
        <div className="badge-glass badge-glass-orange p-spacing-2 rounded-spacing-2">
          <Brain className="icon-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="title-h6 text-foreground">Research ads with Blaze</h2>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Connect current Meta performance, competitive ads, Brain context, concepts, copy, and
            scripts in one mission.
          </p>
        </div>
      </div>

      <textarea
        className="input-glass body-2 text-foreground rounded-spacing-2 px-spacing-3 py-spacing-3 min-h-24 w-full resize-y"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="What do you want Blaze to research?"
        aria-label="Research instructions"
      />

      <div className="gap-spacing-3 flex flex-wrap items-center justify-between">
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <SegmentedButton
            label="Standard"
            selected={depth === 'standard'}
            onClick={() => setDepth('standard')}
          />
          <SegmentedButton
            label="Deep"
            selected={depth === 'deep'}
            onClick={() => setDepth('deep')}
          />
          <button
            type="button"
            className="body-3 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-1 transition-colors"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            {advancedOpen ? 'Hide details' : 'Research details'}
          </button>
        </div>
        <button
          type="button"
          className="button-glass-primary body-3 gap-spacing-2 rounded-spacing-2 px-spacing-4 py-spacing-2 inline-flex items-center font-semibold"
          disabled={disabled || submitting}
          onClick={submit}
        >
          {submitting ? <Loader2 className="icon-sm animate-spin" /> : <Play className="icon-sm" />}
          {submitting ? 'Starting…' : 'Run research'}
        </button>
      </div>

      {advancedOpen ? (
        <div className="gap-spacing-3 grid md:grid-cols-2">
          <Field label="Reporting period">
            <select
              className="input-glass body-3 text-foreground rounded-spacing-2 px-spacing-3 py-spacing-2 w-full"
              value={reportingPeriod}
              onChange={(event) => setReportingPeriod(event.target.value)}
            >
              <option value="last_7d">Last 7 days</option>
              <option value="last_30d">Last 30 days</option>
              <option value="last_90d">Last 90 days</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </Field>
          <Field label="Campaign names or IDs">
            <Input
              value={selectedCampaigns}
              onChange={setSelectedCampaigns}
              placeholder="All active campaigns"
            />
          </Field>
          <Field label="Competitors">
            <Input
              value={competitors}
              onChange={setCompetitors}
              placeholder="Names separated by commas"
            />
          </Field>
          <Field label="Reference links">
            <Input
              value={links}
              onChange={setLinks}
              placeholder="Ads, pages, briefs, or Drive links"
            />
          </Field>
        </div>
      ) : null}
    </section>
  )
}

function SegmentedButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={
        selected
          ? 'badge-glass badge-glass-green body-4 rounded-spacing-2 px-spacing-3 py-spacing-1'
          : 'button-glass-neutral body-4 rounded-spacing-2 px-spacing-3 py-spacing-1'
      }
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-spacing-1 block">
      <span className="body-4 text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      className="input-glass body-3 text-foreground rounded-spacing-2 px-spacing-3 py-spacing-2 w-full"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  )
}
