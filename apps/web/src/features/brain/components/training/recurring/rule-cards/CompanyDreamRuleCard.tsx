'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Info } from 'lucide-react'
import { toast } from 'sonner'
import { TimePicker } from '@/components/datetime/TimePicker'
import { TimezoneSelect } from '@/components/datetime/TimezoneSelect'
import Switch from '@/components/ui/forms/switch'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import {
  updateCompanyCortexSettings,
  type CompanyCortexSchedule,
  type CompanyCortexSettings,
  type RecurringTrainingRule,
} from '../../../../services/recurring-rules.service'

const DEFAULT_LOCAL_TIME = '02:00'
const DEFAULT_TIMEZONE = 'UTC'

const SCHEDULE_OPTIONS: AutomationSolidOption[] = [
  { value: 'manual_only', label: 'Manual only' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
]

function normalizeLocalTimeValue(value: string | null | undefined): string {
  const raw = (value || DEFAULT_LOCAL_TIME).trim()
  const match = raw.match(/^(\d{2}):(\d{2})/)
  if (!match) return DEFAULT_LOCAL_TIME
  return `${match[1]}:${match[2]}`
}

const COMPANY_DREAM_INFO =
  "A dream run batches the day's conversations, channel threads, task activity, and deliverables. Atlas proposes signals before anything becomes durable company truth."

export function CompanyDreamTitleInfo() {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    const el = triggerRef.current
    const card = cardRef.current
    if (!el || !card) return
    const r = el.getBoundingClientRect()
    const c = card.getBoundingClientRect()
    const gap = 8
    const padding = 8
    let top = r.bottom + gap
    let left = r.left + r.width / 2 - c.width / 2
    left = Math.max(padding, Math.min(left, window.innerWidth - c.width - padding))
    top = Math.max(padding, Math.min(top, window.innerHeight - c.height - padding))
    setPos({ top, left })
  }, [])

  useEffect(() => {
    if (!visible) return
    reposition()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [visible, reposition])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-muted-foreground hover:text-foreground inline-flex shrink-0 transition-colors"
        aria-label="Explain Company Cortex daily dreams"
      >
        <Info className="icon-xs" />
      </button>
      {visible && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={cardRef}
              className="dropdown-menu-solid px-spacing-3 py-spacing-2 pointer-events-none fixed z-[9999] max-w-[300px]"
              style={{ top: pos.top, left: pos.left }}
            >
              <p className="body-3 text-foreground font-semibold">Company daily dream</p>
              <p className="body-4 text-muted-foreground mt-spacing-1">{COMPANY_DREAM_INFO}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export function CompanyDreamEnableSwitch({
  rule,
  onRefresh,
}: {
  rule: Extract<RecurringTrainingRule, { kind: 'company_dream' }>
  onRefresh: () => Promise<void>
}) {
  const [enabled, setEnabled] = useState(rule.settings.enabled)
  const [saving, setSaving] = useState(false)

  const toggle = async (next: boolean) => {
    const previous = enabled
    setSaving(true)
    setEnabled(next)
    try {
      const res = await updateCompanyCortexSettings({ enabled: next })
      setEnabled(res.enabled)
      await onRefresh()
      toast.success(res.enabled ? 'Company dreams are on.' : 'Company dreams are paused.')
    } catch (err) {
      setEnabled(previous)
      toast.error(err instanceof Error ? err.message : 'Could not update Company Cortex.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Switch
      checked={enabled}
      disabled={saving}
      onCheckedChange={toggle}
      aria-label="Toggle company daily dream"
    />
  )
}

export function CompanyDreamRuleCard({
  rule,
  onRefresh,
}: {
  rule: Extract<RecurringTrainingRule, { kind: 'company_dream' }>
  onRefresh: () => Promise<void>
}) {
  const [settings, setSettings] = useState<CompanyCortexSettings>(() => ({
    ...rule.settings,
    local_time: normalizeLocalTimeValue(rule.settings.local_time),
  }))
  const [saving, setSaving] = useState(false)

  const patchSettings = async (patch: {
    enabled?: boolean
    schedule?: CompanyCortexSchedule
    localTime?: string
    timezone?: string
    lookbackHours?: number
    minActivityThreshold?: number
  }) => {
    const previous = settings
    setSaving(true)
    setSettings({
      ...settings,
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.schedule !== undefined ? { schedule: patch.schedule } : {}),
      ...(patch.localTime !== undefined
        ? { local_time: normalizeLocalTimeValue(patch.localTime) }
        : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.lookbackHours !== undefined ? { lookback_hours: patch.lookbackHours } : {}),
      ...(patch.minActivityThreshold !== undefined
        ? { min_activity_threshold: patch.minActivityThreshold }
        : {}),
    })
    try {
      const res = await updateCompanyCortexSettings({
        ...patch,
        localTime: normalizeLocalTimeValue(patch.localTime ?? settings.local_time),
      })
      setSettings({
        ...res.settings,
        local_time: normalizeLocalTimeValue(res.settings.local_time),
      })
      await onRefresh()
      toast.success(res.enabled ? 'Company dreams are on.' : 'Company dreams are paused.')
    } catch (err) {
      setSettings(previous)
      toast.error(err instanceof Error ? err.message : 'Could not update Company Cortex.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-spacing-3 pb-spacing-3 pt-spacing-2">
      <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-spacing-2">
          <span className="body-2 text-foreground font-medium">Schedule</span>
          <AutomationSolidSelect
            value={settings.schedule}
            options={SCHEDULE_OPTIONS}
            onChange={(schedule) => patchSettings({ schedule: schedule as CompanyCortexSchedule })}
            placeholder="Select schedule"
            disabled={saving}
            ariaLabel="Schedule"
          />
        </div>

        <div className="space-y-spacing-2">
          <span className="body-2 text-foreground font-medium">Local time</span>
          <div className="[&>button]:input-glass [&>button]:rounded-spacing-2 [&>button]:h-spacing-10 [&>button]:px-spacing-3 [&>button]:w-full [&>button]:justify-between">
            <TimePicker
              value={settings.local_time}
              onChange={(next) => {
                if (!next) return
                patchSettings({ localTime: next })
              }}
              step={60}
              hideClear
              disabled={saving}
              placeholder="Select time"
              customTrigger={
                <>
                  <span className="body-3 text-foreground truncate">{settings.local_time}</span>
                  <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
                </>
              }
            />
          </div>
        </div>

        <div className="space-y-spacing-2">
          <span className="body-2 text-foreground font-medium">Timezone</span>
          <TimezoneSelect
            value={settings.timezone || DEFAULT_TIMEZONE}
            disabled={saving}
            onChange={(timezone) => patchSettings({ timezone: timezone || DEFAULT_TIMEZONE })}
          />
        </div>

        <label className="space-y-spacing-2 block">
          <span className="body-2 text-foreground font-medium">Lookback hours</span>
          <input
            type="number"
            min={1}
            max={168}
            value={settings.lookback_hours}
            disabled={saving}
            onChange={(event) =>
              setSettings({ ...settings, lookback_hours: Number(event.target.value) })
            }
            onBlur={(event) =>
              patchSettings({ lookbackHours: Math.max(1, Number(event.target.value) || 24) })
            }
            className="h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full border outline-none [-moz-appearance:textfield] focus:ring-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
      </div>
    </div>
  )
}
