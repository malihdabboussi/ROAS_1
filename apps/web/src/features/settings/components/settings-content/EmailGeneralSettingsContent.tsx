'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import Switch from '@/components/ui/forms/switch'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { backendGet, backendPut } from '@/lib/api/backend-client'
import {
  SETTINGS_TOAST_ERRORS,
  SETTINGS_TOAST_SUCCESS,
} from '../../config/settings-toast-errors.config'
import { TimezoneSelect } from '@/components/datetime/TimezoneSelect'
import { SettingsSelect } from '../SettingsSelect'

const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const TIME_OPTIONS = [
  { value: '00:00', label: '12am' },
  { value: '01:00', label: '1am' },
  { value: '02:00', label: '2am' },
  { value: '03:00', label: '3am' },
  { value: '04:00', label: '4am' },
  { value: '05:00', label: '5am' },
  { value: '06:00', label: '6am' },
  { value: '07:00', label: '7am' },
  { value: '08:00', label: '8am' },
  { value: '09:00', label: '9am' },
  { value: '10:00', label: '10am' },
  { value: '11:00', label: '11am' },
  { value: '12:00', label: '12pm' },
  { value: '13:00', label: '1pm' },
  { value: '14:00', label: '2pm' },
  { value: '15:00', label: '3pm' },
  { value: '16:00', label: '4pm' },
  { value: '17:00', label: '5pm' },
  { value: '18:00', label: '6pm' },
  { value: '19:00', label: '7pm' },
  { value: '20:00', label: '8pm' },
  { value: '21:00', label: '9pm' },
  { value: '22:00', label: '10pm' },
  { value: '23:00', label: '11pm' },
]

type EmailProvider = 'sendgrid' | 'ghl'

interface EmailSettings {
  id?: string
  user_id?: string
  sending_days: string[]
  sending_time_from: string
  sending_time_until: string
  timezone: string
  hide_branding: boolean
  pause_on_reply: boolean
  stop_keywords_enabled: boolean
  stop_keywords: string[]
  email_provider: EmailProvider
}

type GhlStatusResponse = {
  success: boolean
  connected: boolean
}

const DEFAULT_SETTINGS: EmailSettings = {
  sending_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  sending_time_from: '09:00',
  sending_time_until: '17:00',
  timezone: 'America/New_York',
  hide_branding: false,
  pause_on_reply: false,
  stop_keywords_enabled: false,
  stop_keywords: [],
  email_provider: 'sendgrid',
}

export default function EmailGeneralSettingsContent() {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [ghlConnected, setGhlConnected] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await backendGet<{
          id?: string
          user_id?: string
          sending_days?: string[]
          sending_time_from?: string
          sending_time_until?: string
          sending_timezone?: string
          hide_branding?: boolean
          pause_on_reply?: boolean
          stop_keywords_enabled?: boolean
          stop_keywords?: string[]
          email_provider?: EmailProvider
        } | null>('/api/settings/email')
        if (data) {
          setSettings({
            id: data.id,
            user_id: data.user_id,
            sending_days: data.sending_days || DEFAULT_SETTINGS.sending_days,
            sending_time_from:
              data.sending_time_from?.slice(0, 5) || DEFAULT_SETTINGS.sending_time_from,
            sending_time_until:
              data.sending_time_until?.slice(0, 5) || DEFAULT_SETTINGS.sending_time_until,
            timezone: data.sending_timezone || DEFAULT_SETTINGS.timezone,
            hide_branding: data.hide_branding || false,
            pause_on_reply: data.pause_on_reply || false,
            stop_keywords_enabled: data.stop_keywords_enabled || false,
            stop_keywords: (data.stop_keywords as string[]) || [],
            email_provider: (data.email_provider as EmailProvider) || 'sendgrid',
          })
        }
      } catch {
        /* Settings may not exist yet */
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadGhlStatus = async () => {
      try {
        const status = await backendGet<GhlStatusResponse>('/api/integrations/lhg/status')
        setGhlConnected(!!status?.connected)
      } catch {
        setGhlConnected(false)
      }
    }
    loadGhlStatus()
  }, [])

  const toggleDay = (day: string) => {
    setSettings((prev) => ({
      ...prev,
      sending_days: prev.sending_days.includes(day)
        ? prev.sending_days.filter((d) => d !== day)
        : [...prev.sending_days, day],
    }))
    setHasChanges(true)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const payload = {
        sending_days: settings.sending_days,
        sending_time_from: settings.sending_time_from,
        sending_time_until: settings.sending_time_until,
        sending_timezone: settings.timezone,
        hide_branding: settings.hide_branding,
        pause_on_reply: settings.pause_on_reply,
        stop_keywords_enabled: settings.stop_keywords_enabled,
        stop_keywords: settings.stop_keywords,
        email_provider: settings.email_provider,
      }
      const data = await backendPut<{ id?: string; user_id?: string }>(
        '/api/settings/email',
        payload,
      )
      if (data?.id) setSettings((prev) => ({ ...prev, id: data.id, user_id: data.user_id }))
      setHasChanges(false)
      toast.success(SETTINGS_TOAST_SUCCESS.EMAIL_SETTINGS_SAVED.userMessage)
    } catch {
      toast.error(SETTINGS_TOAST_ERRORS.EMAIL_SETTINGS_SAVE_FAILED.userMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleKeywordAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault()
      const kw = keywordInput.trim().toLowerCase()
      if (!settings.stop_keywords.includes(kw)) {
        setSettings((prev) => ({ ...prev, stop_keywords: [...prev.stop_keywords, kw] }))
        setHasChanges(true)
      }
      setKeywordInput('')
    }
  }

  const handleEmailProviderChange = async (newProvider: EmailProvider) => {
    if (newProvider === 'ghl' && !ghlConnected) {
      toast.error(SETTINGS_TOAST_ERRORS.GHL_REQUIRED.userMessage)
      return
    }
    const oldProvider = settings.email_provider
    setSettings((prev) => ({ ...prev, email_provider: newProvider }))
    try {
      const data = await backendPut<{ id?: string; user_id?: string }>('/api/settings/email', {
        email_provider: newProvider,
      })
      if (data?.id) setSettings((prev) => ({ ...prev, id: data.id, user_id: data.user_id }))
      toast.success(
        newProvider === 'ghl'
          ? SETTINGS_TOAST_SUCCESS.EMAIL_PROVIDER_GHL.userMessage
          : SETTINGS_TOAST_SUCCESS.EMAIL_PROVIDER_VIBEY.userMessage,
      )
    } catch {
      setSettings((prev) => ({ ...prev, email_provider: oldProvider }))
      toast.error(SETTINGS_TOAST_ERRORS.EMAIL_PROVIDER_UPDATE_FAILED.userMessage)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb size="sm" state="processing" />
      </div>
    )
  }

  return (
    <>
      {/* Sending Schedule */}
      <div className="section-card p-spacing-4 sm:p-spacing-6">
        <div className="space-y-spacing-4 sm:space-y-spacing-6">
          <div>
            <h2 className="title-h6 text-foreground">Default Sending Schedule</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Set when you'd like your sequence emails to be sent by default.
            </p>
          </div>

          <div className="border-border rounded-spacing-3 border">
            {/* Days Row */}
            <div className="border-border rounded-t-spacing-3 flex flex-col overflow-hidden border-b md:flex-row md:items-center">
              <div className="px-spacing-3 md:px-spacing-4 py-spacing-3 border-border gap-spacing-2 flex w-full shrink-0 items-center border-b md:w-24 md:border-b-0 md:border-r">
                <svg
                  className="icon-sm text-muted-foreground shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="body-3 text-foreground font-medium">Day</span>
              </div>
              <div className="px-spacing-3 md:px-spacing-6 py-spacing-3 flex-1">
                <div className="gap-spacing-3 md:gap-spacing-6 flex flex-wrap items-center md:flex-nowrap">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = settings.sending_days.includes(day.value)
                    return (
                      <button
                        key={day.value}
                        onClick={() => toggleDay(day.value)}
                        className="gap-spacing-2 group flex shrink-0 items-center"
                      >
                        <div
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${isSelected ? 'step-circle-completed' : 'step-circle-default'}`}
                        >
                          {isSelected && (
                            <svg
                              viewBox="0 0 20 20"
                              className="tint-green relative z-30 h-2.5 w-2.5"
                              fill="currentColor"
                              style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))' }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="body-3 text-foreground whitespace-nowrap">
                          {day.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Time Row */}
            <div className="relative flex flex-col md:flex-row md:items-center">
              <div className="px-spacing-3 md:px-spacing-4 py-spacing-3 border-border gap-spacing-2 flex w-full shrink-0 items-center border-b md:w-24 md:border-b-0 md:border-r">
                <svg
                  className="icon-sm text-muted-foreground shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="body-3 text-foreground font-medium">Time</span>
              </div>
              <div className="gap-spacing-3 md:gap-spacing-4 px-spacing-3 md:px-spacing-6 py-spacing-3 flex flex-1 flex-col md:flex-row md:items-center">
                {/* From */}
                <div className="gap-spacing-2 flex items-center">
                  <span className="body-3 text-muted-foreground shrink-0">From</span>
                  <SettingsSelect
                    value={settings.sending_time_from}
                    options={TIME_OPTIONS}
                    onChange={(v) => {
                      setSettings((p) => ({ ...p, sending_time_from: v }))
                      setHasChanges(true)
                    }}
                    wrapperClassName="relative w-full md:w-auto md:min-w-[100px]"
                    triggerClassName="gap-spacing-1 h-spacing-10 px-spacing-3 input-glass rounded-spacing-2 flex w-full items-center justify-between transition-colors md:w-auto md:min-w-[100px]"
                    menuMinWidth={100}
                  />
                </div>

                {/* Until */}
                <div className="gap-spacing-2 flex items-center">
                  <span className="body-3 text-muted-foreground shrink-0">until</span>
                  <SettingsSelect
                    value={settings.sending_time_until}
                    options={TIME_OPTIONS}
                    onChange={(v) => {
                      setSettings((p) => ({ ...p, sending_time_until: v }))
                      setHasChanges(true)
                    }}
                    wrapperClassName="relative w-full md:w-auto md:min-w-[100px]"
                    triggerClassName="gap-spacing-1 h-spacing-10 px-spacing-3 input-glass rounded-spacing-2 flex w-full items-center justify-between transition-colors md:w-auto md:min-w-[100px]"
                    menuMinWidth={100}
                  />
                </div>

                {/* Timezone */}
                <TimezoneSelect
                  value={settings.timezone}
                  onChange={(tz) => {
                    setSettings((p) => ({ ...p, timezone: tz }))
                    setHasChanges(true)
                  }}
                  wrapperClassName="relative w-full md:max-w-md md:flex-1"
                />
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="button-glass-accent px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email Branding */}
      <div className="section-card p-spacing-4 sm:p-spacing-6 mt-spacing-6">
        <div className="space-y-spacing-4">
          <div>
            <h2 className="title-h6 text-foreground">Email Branding</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Control Vibey branding in your email footers
            </p>
          </div>
          <div className="surface-card border-border rounded-spacing-2 p-spacing-3 border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="body-2 font-medium">Hide "Powered by Vibey"</div>
                <div className="typo-caption text-muted-foreground mt-spacing-1">
                  Remove Vibey branding from your email footers
                </div>
              </div>
              <Switch
                checked={settings.hide_branding}
                onCheckedChange={() => {
                  setSettings((p) => ({ ...p, hide_branding: !p.hide_branding }))
                  setHasChanges(true)
                }}
                className="ml-spacing-3"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email Provider */}
      <div className="section-card p-spacing-4 sm:p-spacing-6 mt-spacing-6">
        <div className="space-y-spacing-4">
          <div>
            <h2 className="title-h6 text-foreground">Default Email Provider</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Choose which service sends your emails. Individual sequences can override this
              setting.
            </p>
          </div>
          <div className="space-y-spacing-2">
            {/* Vibey (SendGrid) */}
            <button
              type="button"
              onClick={() => handleEmailProviderChange('sendgrid')}
              className={`surface-card rounded-spacing-2 p-spacing-3 w-full border text-left transition-all ${settings.email_provider === 'sendgrid' ? 'border-primary ring-primary/20 ring-1' : 'border-border hover:border-muted-foreground/30'}`}
            >
              <div className="gap-spacing-3 flex items-center">
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${settings.email_provider === 'sendgrid' ? 'step-circle-completed' : 'step-circle-default'}`}
                >
                  {settings.email_provider === 'sendgrid' && (
                    <Check className="h-2.5 w-2.5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="body-2 text-foreground font-medium">
                    Send via Vibey (SendGrid)
                  </div>
                  <div className="typo-caption text-muted-foreground mt-spacing-1">
                    Use Vibey's built-in email service with advanced deliverability
                  </div>
                </div>
              </div>
            </button>
            {/* GoHighLevel */}
            <button
              type="button"
              onClick={() => handleEmailProviderChange('ghl')}
              disabled={!ghlConnected}
              className={`surface-card rounded-spacing-2 p-spacing-3 w-full border text-left transition-all ${
                settings.email_provider === 'ghl'
                  ? 'border-primary ring-primary/20 ring-1'
                  : ghlConnected
                    ? 'border-border hover:border-muted-foreground/30'
                    : 'border-border cursor-not-allowed opacity-60'
              }`}
            >
              <div className="gap-spacing-3 flex items-center">
                <div
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                    settings.email_provider === 'ghl'
                      ? 'step-circle-completed'
                      : 'step-circle-default'
                  }`}
                >
                  {settings.email_provider === 'ghl' && (
                    <Check className="h-2.5 w-2.5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="body-2 text-foreground font-medium">Send via GoHighLevel</div>
                  <div className="typo-caption text-muted-foreground mt-spacing-1">
                    {ghlConnected
                      ? 'Connected and ready to send via GoHighLevel'
                      : 'Connect GoHighLevel in Integrations to enable this option'}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Reply Detection */}
      <div className="section-card p-spacing-4 sm:p-spacing-6 mt-spacing-6">
        <div className="space-y-spacing-4">
          <div>
            <h2 className="title-h6 text-foreground">Reply Detection</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Control how sequences respond when leads reply to your emails
            </p>
          </div>
          <div className="surface-card border-border rounded-spacing-2 p-spacing-3 border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="body-2 font-medium">Auto-pause on Reply</div>
                <div className="typo-caption text-muted-foreground mt-spacing-1">
                  Automatically pause the sequence when a lead replies to any email
                </div>
              </div>
              <Switch
                checked={settings.pause_on_reply}
                onCheckedChange={() => {
                  setSettings((p) => ({ ...p, pause_on_reply: !p.pause_on_reply }))
                  setHasChanges(true)
                }}
                className="ml-spacing-3"
              />
            </div>
          </div>
          <div className="surface-card border-border rounded-spacing-2 p-spacing-3 border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="body-2 font-medium">Keyword Detection</div>
                <div className="typo-caption text-muted-foreground mt-spacing-1">
                  Stop sequences when specific keywords are detected in replies
                </div>
              </div>
              <Switch
                checked={settings.stop_keywords_enabled}
                onCheckedChange={() => {
                  setSettings((p) => ({ ...p, stop_keywords_enabled: !p.stop_keywords_enabled }))
                  setHasChanges(true)
                }}
                className="ml-spacing-3"
              />
            </div>
            {settings.stop_keywords_enabled && (
              <div className="mt-spacing-3 pt-spacing-3 border-border border-t">
                <label className="body-3 text-muted-foreground mb-spacing-2 block">
                  Stop Keywords
                </label>
                <input
                  type="text"
                  className="input-glass mb-spacing-2 w-full"
                  placeholder="Add keyword and press Enter..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordAdd}
                />
                {settings.stop_keywords.length > 0 && (
                  <div className="gap-spacing-2 mt-spacing-2 flex flex-wrap">
                    {settings.stop_keywords.map((kw) => (
                      <div
                        key={kw}
                        className="gap-spacing-1 px-spacing-2 py-spacing-1 bg-muted rounded-spacing-1 flex items-center text-sm"
                      >
                        <span className="text-foreground">{kw}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSettings((p) => ({
                              ...p,
                              stop_keywords: p.stop_keywords.filter((k) => k !== kw),
                            }))
                            setHasChanges(true)
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="typo-caption text-muted-foreground mt-spacing-1">
                  Common keywords: unsubscribe, remove, stop, cancel, not interested
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
