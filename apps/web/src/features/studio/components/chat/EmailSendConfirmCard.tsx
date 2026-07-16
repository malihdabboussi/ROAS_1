'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Send,
} from 'lucide-react'
import { useWorkspaceSettingsModal } from '@/features/settings'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import type { MessageContentBlock } from '../../types'

const ACTIVECAMPAIGN_SENDER_HELP_URL =
  'https://help.activecampaign.com/hc/en-us/articles/115000090974-How-to-set-up-your-email-sending-addresses-in-ActiveCampaign'

type EmailSendConfirmBlock = Extract<MessageContentBlock, { type: 'email_send_confirm' }>

interface EmailSendConfirmCardProps {
  block: EmailSendConfirmBlock
  onSent?: (payload: {
    send_type: 'broadcast' | 'sequence'
    provider: string
    provider_name: string
    subject?: string
    sequence_name?: string
    total_emails?: number
    total_days?: number
    schedule_date?: string
  }) => void
}

interface Sender {
  id: string
  name: string
  email: string
}

interface DropdownOption {
  id: string
  label: string
}

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
}: {
  options: DropdownOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedLabel = options.find((o) => o.id === value)?.label || placeholder

  return (
    <div className="relative" ref={ref} data-dropdown>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-glass h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 flex w-full items-center justify-between"
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{selectedLabel}</span>
        <ChevronDown
          className={`icon-sm text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="mt-spacing-1 absolute left-0 top-full z-50 w-full">
          <div className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 max-h-48 overflow-y-auto">
            <div className="space-y-spacing-0">
              {options.map((option) => {
                const isSelected = option.id === value
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => {
                      onChange(option.id)
                      setIsOpen(false)
                    }}
                  >
                    {isSelected ? (
                      <Check className="icon-sm text-primary" />
                    ) : (
                      <div className="icon-sm" />
                    )}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SenderEmptyState({
  provider,
  providerSettingsUrl,
  onOpenWorkspaceEmail,
}: {
  provider: string
  providerSettingsUrl: string | null
  onOpenWorkspaceEmail: () => void
}) {
  const activeCampaignHref = providerSettingsUrl || ACTIVECAMPAIGN_SENDER_HELP_URL

  if (provider === 'active_campaign') {
    return (
      <div className="space-y-spacing-2">
        <p className="body-3 text-muted-foreground">
          No send-from options loaded from ActiveCampaign (we list account users that have an
          email). Add users in ActiveCampaign or fix sending addresses, then switch provider and
          back to refresh.
        </p>
        <a
          href={activeCampaignHref}
          target="_blank"
          rel="noopener noreferrer"
          className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 inline-flex font-medium"
        >
          {providerSettingsUrl
            ? 'Open ActiveCampaign Advanced settings'
            : 'ActiveCampaign help: sending addresses'}
        </a>
      </div>
    )
  }

  if (provider === 'gohighlevel') {
    return (
      <div className="space-y-spacing-2">
        <p className="body-3 text-muted-foreground">
          {providerSettingsUrl
            ? 'Configure the sending domain and SMTP for this location in GoHighLevel. You can also pick ROAS’s native email provider in Workspace Settings → Email.'
            : 'Confirm your GoHighLevel connection and email defaults in Workspace Settings → Email.'}
        </p>
        <div className="gap-spacing-2 flex flex-wrap">
          {providerSettingsUrl ? (
            <a
              href={providerSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 inline-flex font-medium"
            >
              Open GoHighLevel SMTP settings
            </a>
          ) : null}
          <button
            type="button"
            onClick={onOpenWorkspaceEmail}
            className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
          >
            Open Email settings
          </button>
        </div>
      </div>
    )
  }

  if (provider === 'vibey') {
    return (
      <div className="space-y-spacing-2">
        <p className="body-3 text-muted-foreground">
          No verified sender identity yet. Add and verify a sender in Workspace Settings → Email.
        </p>
        <button
          type="button"
          onClick={onOpenWorkspaceEmail}
          className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
        >
          Open Email settings
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-spacing-2">
      <p className="body-3 text-muted-foreground">
        No senders available for this provider. Check Workspace Settings → Email or your
        integration.
      </p>
      <button
        type="button"
        onClick={onOpenWorkspaceEmail}
        className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
      >
        Open Email settings
      </button>
    </div>
  )
}

export function EmailSendConfirmCard({ block, onSent }: EmailSendConfirmCardProps) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [provider, setProvider] = useState(
    block.provider || block.available_providers?.[0]?.id || '',
  )
  const [listId, setListId] = useState('')
  const [segmentId, setSegmentId] = useState('')
  const [selectedSenderId, setSelectedSenderId] = useState('')
  const [senders, setSenders] = useState<Sender[]>([])
  const [providerSettingsUrl, setProviderSettingsUrl] = useState<string | null>(null)
  const [loadingSenders, setLoadingSenders] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(block.schedule_date || '')
  const [scheduleMode, setScheduleMode] = useState<'now' | 'scheduled'>('now')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [lists, setLists] = useState<Array<{ id: string; name: string }>>(
    block.available_lists || [],
  )
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>(
    block.available_segments || [],
  )
  const [loadingAudiences, setLoadingAudiences] = useState(false)
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)

  const providerName = block.available_providers?.find((p) => p.id === provider)?.name || provider
  const selectedSender = senders.find((s) => s.id === selectedSenderId)
  const fromEmail = selectedSender?.email || ''
  const fromName = selectedSender?.name || ''

  const fetchSenders = useCallback(async (p: string) => {
    if (!p) return
    setLoadingSenders(true)
    try {
      const res = await backendGet<{
        success: boolean
        senders: Sender[]
        provider_settings_url?: string | null
      }>(`/api/email-campaigns/provider-senders?provider=${encodeURIComponent(p)}`)
      setProviderSettingsUrl(res?.provider_settings_url ?? null)
      if (res?.success && res.senders?.length) {
        setSenders(res.senders)
        setSelectedSenderId(res.senders[0]?.id ?? '')
      } else {
        setSenders([])
        setSelectedSenderId('')
      }
    } catch {
      setSenders([])
      setSelectedSenderId('')
      setProviderSettingsUrl(null)
    } finally {
      setLoadingSenders(false)
    }
  }, [])

  const fetchAudiences = useCallback(async (p: string) => {
    if (!p) return
    setLoadingAudiences(true)
    try {
      const res = await backendGet<{
        success: boolean
        lists: Array<{ id: string; name: string }>
        segments: Array<{ id: string; name: string }>
      }>(`/api/email-campaigns/provider-audiences?provider=${encodeURIComponent(p)}`)
      if (res?.success) {
        setLists(res.lists || [])
        setSegments(res.segments || [])
      }
    } catch {
      setLists([])
      setSegments([])
    } finally {
      setLoadingAudiences(false)
    }
  }, [])

  useEffect(() => {
    if (provider) {
      fetchSenders(provider)
      if (!block.available_lists?.length) fetchAudiences(provider)
    }
  }, [provider, block.available_lists, fetchAudiences, fetchSenders])

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider)
    setListId('')
    setSegmentId('')
    setSelectedSenderId('')
    setSenders([])
    setProviderSettingsUrl(null)
    fetchAudiences(newProvider)
    fetchSenders(newProvider)
  }

  const handleSend = async () => {
    if (!provider) return
    setSending(true)
    setError(null)

    try {
      const payload =
        block.send_type === 'broadcast'
          ? {
              send_type: 'broadcast' as const,
              sequence_email_id: block.sequence_email_id!,
              provider,
              list_id: listId || undefined,
              segment_id: segmentId || undefined,
              from_email: fromEmail,
              from_name: fromName,
              schedule_date: scheduleMode === 'scheduled' ? scheduleDate : undefined,
            }
          : {
              send_type: 'sequence' as const,
              sequence_id: block.sequence_id!,
              provider,
              list_id: listId || undefined,
              segment_id: segmentId || undefined,
              from_email: fromEmail,
              from_name: fromName,
              start_date: scheduleMode === 'scheduled' ? scheduleDate : undefined,
            }

      const res = await backendPost<{
        success: boolean
        total_emails?: number
        total_days?: number
        error?: string
      }>('/api/email-campaigns/send', payload)

      if (!res?.success) throw new Error(res?.error || 'Send failed')

      setSuccess(true)
      onSent?.({
        send_type: block.send_type ?? 'broadcast',
        provider,
        provider_name: providerName,
        subject: block.subject,
        sequence_name: block.sequence_name,
        total_emails: res.total_emails || block.emails?.length,
        total_days: res.total_days,
        schedule_date: scheduleMode === 'scheduled' ? scheduleDate : undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (success) {
    if (onSent) {
      return null
    }
    return (
      <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
        <div className="gap-spacing-2 flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10">
            <Send className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <h3 className="body-1 text-foreground font-medium">
              {block.send_type === 'broadcast' ? 'Email Sent' : 'Sequence Scheduled'}
            </h3>
            <p className="body-3 text-muted-foreground">
              {block.send_type === 'broadcast'
                ? `"${block.subject}" sent via ${providerName}`
                : `${block.emails?.length} emails scheduled via ${providerName}`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !sending) {
    return (
      <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
        <div className="gap-spacing-2 flex items-center">
          <AlertCircle className="icon-sm text-destructive" />
          <h3 className="body-1 text-destructive font-medium">Send Failed</h3>
        </div>
        <p className="body-3 text-muted-foreground mt-spacing-1">{error}</p>
        <button
          onClick={() => {
            setError(null)
            handleSend()
          }}
          className="button-glass-accent mt-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div>
        <h3 className="body-1 text-foreground font-medium">
          {block.send_type === 'broadcast' ? 'Ready to Send' : 'Ready to Schedule Sequence'}
        </h3>
      </div>
      <p className="body-3 text-muted-foreground mt-spacing-1">
        {block.send_type === 'broadcast'
          ? 'Review your email before sending.'
          : `Review ${block.emails?.length} emails before scheduling.`}
      </p>

      <div className="container-glass-nested mt-spacing-3 rounded-spacing-2 p-spacing-3 space-y-spacing-3">
        {block.send_type === 'broadcast' && block.subject && (
          <div className="flex justify-between">
            <span className="body-3 text-muted-foreground">Subject</span>
            <span className="body-3 text-foreground font-medium">{block.subject}</span>
          </div>
        )}

        {block.send_type === 'sequence' && block.sequence_name && (
          <div className="flex justify-between">
            <span className="body-3 text-muted-foreground">Sequence</span>
            <span className="body-3 text-foreground font-medium">{block.sequence_name}</span>
          </div>
        )}

        {/* Provider selector */}
        <div>
          <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
            Email Provider
          </label>
          <CustomDropdown
            options={(block.available_providers ?? [])
              .filter((p) => block.send_type === 'broadcast' || p.supports_sequences)
              .map((p) => ({ id: p.id, label: p.name }))}
            value={provider}
            onChange={handleProviderChange}
          />
        </div>

        {/* Audience selector */}
        {loadingAudiences ? (
          <div className="body-3 text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading audiences...
          </div>
        ) : (
          <div className="gap-spacing-2 flex">
            {lists.length > 0 && (
              <div className="flex-1">
                <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
                  List
                </label>
                <CustomDropdown
                  options={[
                    { id: '', label: 'None' },
                    ...lists.map((l) => ({ id: l.id, label: l.name })),
                  ]}
                  value={listId}
                  onChange={setListId}
                  placeholder="None"
                />
              </div>
            )}
            {segments.length > 0 && (
              <div className="flex-1">
                <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
                  Segment
                </label>
                <CustomDropdown
                  options={[
                    { id: '', label: 'None' },
                    ...segments.map((s) => ({ id: s.id, label: s.name })),
                  ]}
                  value={segmentId}
                  onChange={setSegmentId}
                  placeholder="None"
                />
              </div>
            )}
          </div>
        )}

        {/* Sender selector */}
        <div>
          <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
            Send From
          </label>
          {loadingSenders ? (
            <div className="body-3 text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading senders...
            </div>
          ) : senders.length > 0 ? (
            <div className="space-y-spacing-2">
              <CustomDropdown
                options={senders.map((s) => ({ id: s.id, label: `${s.name} <${s.email}>` }))}
                value={selectedSenderId}
                onChange={setSelectedSenderId}
              />
              {provider === 'gohighlevel' && providerSettingsUrl ? (
                <a
                  href={providerSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="body-3 text-primary inline-flex hover:underline"
                >
                  Open GoHighLevel SMTP settings
                </a>
              ) : null}
            </div>
          ) : (
            <SenderEmptyState
              provider={provider}
              providerSettingsUrl={providerSettingsUrl}
              onOpenWorkspaceEmail={() => openWorkspaceSettings('email')}
            />
          )}
        </div>

        {/* Schedule */}
        <div>
          <label className="body-3 text-muted-foreground mb-spacing-1 block font-medium">
            {block.send_type === 'broadcast' ? 'Schedule' : 'Start Date'}
          </label>
          <div className="gap-spacing-2 flex flex-wrap items-center">
            <button
              type="button"
              onClick={() => setScheduleMode('now')}
              className={`chip-glass-blue rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium transition-opacity ${
                scheduleMode === 'now' ? 'opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
            >
              {block.send_type === 'broadcast' ? 'Send Now' : 'Start Now'}
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('scheduled')}
              className={`chip-glass-blue gap-spacing-1 rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 flex items-center font-medium transition-opacity ${
                scheduleMode === 'scheduled' ? 'opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
            >
              <Calendar className="h-3 w-3 flex-shrink-0" /> Schedule
            </button>
          </div>
          {scheduleMode === 'scheduled' && (
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="input-glass h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 mt-spacing-2 w-full"
            />
          )}
        </div>

        {/* Sequence overview */}
        {block.send_type === 'sequence' && block.emails && (
          <div>
            <label className="body-3 text-muted-foreground mb-spacing-2 block font-medium">
              Emails in Sequence ({block.emails.length})
            </label>
            <div className="space-y-spacing-1">
              {block.emails.map((email) => (
                <div key={email.id} className="border-border rounded-spacing-2 border">
                  <button
                    onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                    className="gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left"
                  >
                    {expandedEmail === email.id ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    )}
                    <span className="text-foreground flex-1 font-medium">
                      Email {email.order_index + 1}: &ldquo;{email.subject}&rdquo;
                    </span>
                    <span className="text-muted-foreground typo-caption">
                      {email.delay_hours === 0
                        ? 'Immediately'
                        : email.delay_hours < 24
                          ? `After ${email.delay_hours}h`
                          : `After ${Math.round(email.delay_hours / 24)}d`}
                    </span>
                  </button>
                  {expandedEmail === email.id && email.html_preview && (
                    <div className="border-border px-spacing-3 py-spacing-2 border-t">
                      <iframe
                        srcDoc={email.html_preview}
                        sandbox=""
                        className="h-48 w-full rounded border-0 bg-white"
                        title={`Preview: ${email.subject}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-spacing-4">
        <button
          onClick={handleSend}
          disabled={sending || !provider || !selectedSenderId}
          className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-2 flex w-full items-center justify-center gap-2 font-medium disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending
            ? 'Sending...'
            : block.send_type === 'broadcast'
              ? 'Approve & Send'
              : 'Approve & Schedule Sequence'}
        </button>
      </div>
    </div>
  )
}
