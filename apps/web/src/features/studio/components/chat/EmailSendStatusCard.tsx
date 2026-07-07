'use client'

import { AlertCircle, Calendar, CheckCircle } from 'lucide-react'
import type { MessageContentBlock } from '../../types'

type EmailSendStatusBlock = Extract<MessageContentBlock, { type: 'email_send_status' }>

interface EmailSendStatusCardProps {
  block: EmailSendStatusBlock
}

const PROVIDER_LOGOS: Record<string, string> = {
  active_campaign: '/Integrations/ActiveCampaign.png',
  mailchimp: '/Integrations/Mailchimp.png',
  gohighlevel: '/Integrations/GHL.png',
  kit: '/Integrations/Kit.png',
}

export function EmailSendStatusCard({ block }: EmailSendStatusCardProps) {
  const logo = PROVIDER_LOGOS[block.provider]
  const isError = block.status === 'error'
  const isScheduled = block.status === 'scheduled'

  const StatusIcon = isError ? AlertCircle : isScheduled ? Calendar : CheckCircle
  const statusColor = isError ? 'text-destructive' : 'text-green-500'
  const badgeClass = isError
    ? 'badge-glass badge-glass-red'
    : isScheduled
      ? 'badge-glass badge-glass-orange'
      : 'badge-glass badge-glass-green'

  const statusText = isError ? 'Error' : isScheduled ? 'Scheduled' : 'Sent'

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-4 my-spacing-2 border">
      <div className="gap-spacing-3 flex items-center">
        <div className="border-current/20 bg-current/10 flex h-8 w-8 items-center justify-center rounded-full border">
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="gap-spacing-2 flex items-center">
            {logo && (
              <img src={logo} alt={block.provider_name} className="h-5 w-5 object-contain" />
            )}
            <h3 className="body-1 text-foreground font-medium">
              {block.send_type === 'broadcast'
                ? block.subject || 'Email'
                : block.sequence_name || 'Sequence'}
            </h3>
            <span className={`${badgeClass} typo-caption font-medium`}>{statusText}</span>
          </div>

          <p className="body-3 text-muted-foreground mt-spacing-1">
            {block.send_type === 'broadcast' ? (
              <>
                {isScheduled && block.schedule_date
                  ? `Scheduled for ${new Date(block.schedule_date).toLocaleString()} via ${block.provider_name}`
                  : `${statusText} via ${block.provider_name}`}
              </>
            ) : (
              <>
                {block.total_emails} email{(block.total_emails ?? 0) !== 1 ? 's' : ''}{' '}
                {isScheduled ? 'scheduled' : statusText.toLowerCase()}{' '}
                {block.total_days ? `over ${block.total_days} days ` : ''}
                via {block.provider_name}
              </>
            )}
          </p>

          {isError && block.error_message && (
            <p className="body-3 text-destructive mt-spacing-1">{block.error_message}</p>
          )}
        </div>
      </div>
    </div>
  )
}
