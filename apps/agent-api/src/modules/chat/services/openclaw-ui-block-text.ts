import { integrationDisplayLabel } from '../../shared/ui-block-extractor'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Convert a UI block to plain text for text-only channels (Telegram/Slack).
 * Returns null if the block type has no meaningful text representation.
 */
export function convertUiBlockToText(block: Record<string, unknown>): string | null {
  const type = typeof block.type === 'string' ? block.type : ''

  switch (type) {
    case 'clarification': {
      const title = typeof block.title === 'string' ? block.title : 'Quick question'
      const intro = typeof block.introMessage === 'string' ? block.introMessage : ''
      const questions = Array.isArray(block.questions) ? block.questions : []
      const lines = [`*${title}*`]
      if (intro) lines.push(intro)
      lines.push('')
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i] as Record<string, unknown>
        const text = typeof q?.text === 'string' ? q.text : `Question ${i + 1}`
        const options = Array.isArray(q?.options) ? q.options : []
        lines.push(`${i + 1}. *${text}*`)
        for (const opt of options) {
          const label =
            typeof (opt as Record<string, unknown>)?.label === 'string'
              ? ((opt as Record<string, unknown>).label as string)
              : String(opt)
          lines.push(`   - ${label}`)
        }
      }
      lines.push('')
      lines.push('Reply with your answers (e.g. "1. option A  2. option B").')
      return lines.join('\n')
    }

    case 'integration_connect': {
      const provider = typeof block.provider === 'string' ? block.provider : 'the required service'
      const providerLabel = integrationDisplayLabel(provider)
      const problem =
        typeof block.problem === 'string' && block.problem.trim().length > 0
          ? block.problem.trim()
          : `${providerLabel} is not connected yet.`
      return `*${providerLabel}* needs attention. ${problem}\n\nFix it here: <https://app.roas.io/settings|Open integrations>\n\nOnce fixed, come back and we'll pick up where we left off.`
    }

    case 'meta_ad_accounts': {
      const accounts = Array.isArray(block.adAccounts) ? block.adAccounts : []
      const pages = Array.isArray(block.pages) ? block.pages : []
      const lines: string[] = []
      if (accounts.length > 0) {
        lines.push('*Ad Accounts:*')
        for (let i = 0; i < accounts.length; i++) {
          const a = accounts[i] as Record<string, unknown>
          const name = typeof a?.name === 'string' ? a.name : `Account ${i + 1}`
          const id = typeof a?.id === 'string' ? a.id : ''
          const currency = typeof a?.currency === 'string' ? ` (${a.currency})` : ''
          lines.push(`${i + 1}. ${name}${currency}${id ? ` — ID: \`${id}\`` : ''}`)
        }
      }
      if (pages.length > 0) {
        if (lines.length > 0) lines.push('')
        lines.push('*Pages:*')
        for (let i = 0; i < pages.length; i++) {
          const p = pages[i] as Record<string, unknown>
          const name = typeof p?.name === 'string' ? p.name : `Page ${i + 1}`
          const id = typeof p?.id === 'string' ? p.id : ''
          lines.push(`${i + 1}. ${name}${id ? ` — ID: \`${id}\`` : ''}`)
        }
      }
      if (lines.length === 0) return 'No Meta ad accounts or pages found.'
      lines.push('')
      lines.push('Reply with the number of the account and page you want to use.')
      return lines.join('\n')
    }

    case 'meta_config': {
      const lines: string[] = ['*Meta Campaign Configuration*']
      const fields: Array<[string, string]> = [
        ['adAccount', 'Ad Account'],
        ['page', 'Page'],
        ['objective', 'Objective'],
        ['budget', 'Budget'],
        ['targeting', 'Targeting'],
      ]
      for (const [key, label] of fields) {
        const val = block[key]
        if (typeof val === 'string' && val) lines.push(`*${label}:* ${val}`)
        else if (isRecord(val) && typeof val.name === 'string')
          lines.push(`*${label}:* ${val.name}`)
      }
      lines.push('')
      lines.push('Reply *yes* to confirm and publish, or tell me what to change.')
      return lines.join('\n')
    }

    case 'meta_publish_confirm': {
      return 'Everything is configured. Reply *yes* to publish your ad to Meta, or tell me what to change.'
    }

    case 'meta_status': {
      const adStatus = typeof block.status === 'string' ? block.status : 'unknown'
      const adId = typeof block.metaAdId === 'string' ? block.metaAdId : ''
      const campaignId = typeof block.campaignId === 'string' ? block.campaignId : ''
      const lines = [`*Ad Status:* ${adStatus}`]
      if (adId) lines.push(`*Ad ID:* \`${adId}\``)
      if (campaignId) lines.push(`*Campaign ID:* \`${campaignId}\``)
      return lines.join('\n')
    }

    case 'browser_screenshot': {
      const pageUrl = typeof block.pageUrl === 'string' ? block.pageUrl : ''
      return pageUrl ? `Browser screenshot: ${pageUrl}` : 'Browser screenshot captured.'
    }

    case 'artifact_preview': {
      const artifactType = typeof block.artifactType === 'string' ? block.artifactType : 'artifact'
      const name =
        typeof block.name === 'string' && block.name.trim() ? block.name.trim() : 'Artifact'
      const artifactId = typeof block.artifactId === 'string' ? block.artifactId : ''
      return artifactId
        ? `*${name}* created (${artifactType}, ID: \`${artifactId}\`).`
        : `*${name}* created (${artifactType}).`
    }

    case 'document_card': {
      const title =
        typeof block.title === 'string' && block.title.trim() ? block.title.trim() : 'Document'
      const documentId = typeof block.documentId === 'string' ? block.documentId : ''
      return documentId
        ? `*${title}* created (document ID: \`${documentId}\`).`
        : `*${title}* created.`
    }

    case 'media_asset': {
      const title =
        typeof block.title === 'string' && block.title.trim() ? block.title.trim() : 'Media'
      const url = typeof block.url === 'string' ? block.url.trim() : ''
      const kind = typeof block.kind === 'string' ? block.kind : 'media'
      return url ? `*${title}* created (${kind}): ${url}` : `*${title}* created (${kind}).`
    }

    case 'pdf_file':
    case 'docx_file': {
      const label =
        typeof block.label === 'string' && block.label.trim() ? block.label.trim() : 'File'
      const url = typeof block.url === 'string' ? block.url.trim() : ''
      return url ? `*${label}* created: ${url}` : `*${label}* created.`
    }

    case 'email_send_confirm': {
      const sendType = typeof block.send_type === 'string' ? block.send_type : 'broadcast'
      const subject = typeof block.subject === 'string' ? block.subject : ''
      const seqName = typeof block.sequence_name === 'string' ? block.sequence_name : ''
      const emails = Array.isArray(block.emails) ? block.emails : []
      const providers = Array.isArray(block.available_providers) ? block.available_providers : []
      const lines: string[] = []

      if (sendType === 'broadcast') {
        lines.push('*Email Campaign Ready to Send*')
        if (subject) lines.push(`*Subject:* ${subject}`)
      } else {
        lines.push(`*Email Sequence Ready: ${seqName || 'Untitled'}*`)
        lines.push(`*Emails:* ${emails.length}`)
        for (const e of emails) {
          const em = e as Record<string, unknown>
          const idx = typeof em.order_index === 'number' ? em.order_index + 1 : '?'
          const subj = typeof em.subject === 'string' ? em.subject : 'Untitled'
          const delay = typeof em.delay_hours === 'number' ? em.delay_hours : 0
          const timing =
            delay === 0
              ? 'Immediately'
              : delay < 24
                ? `After ${delay}h`
                : `After ${Math.round(delay / 24)}d`
          lines.push(`  ${idx}. "${subj}" — ${timing}`)
        }
      }

      if (providers.length > 0) {
        const names = providers
          .map((p) =>
            typeof (p as Record<string, unknown>).name === 'string'
              ? (p as Record<string, unknown>).name
              : '',
          )
          .filter(Boolean)
        lines.push(`*Available providers:* ${names.join(', ')}`)
      }

      lines.push('')
      lines.push(
        'Review the details and approve to send. Open the Vibey web app for full preview and configuration.',
      )
      return lines.join('\n')
    }

    case 'email_send_status': {
      const sendType = typeof block.send_type === 'string' ? block.send_type : 'broadcast'
      const status = typeof block.status === 'string' ? block.status : 'unknown'
      const providerName = typeof block.provider_name === 'string' ? block.provider_name : ''
      const subject = typeof block.subject === 'string' ? block.subject : ''
      const seqName = typeof block.sequence_name === 'string' ? block.sequence_name : ''
      const totalEmails = typeof block.total_emails === 'number' ? block.total_emails : 0

      if (sendType === 'broadcast') {
        return `*Email ${status}:* "${subject}" via ${providerName}`
      }
      return `*Sequence ${status}:* "${seqName}" — ${totalEmails} emails via ${providerName}`
    }

    case 'chat_plan': {
      const title = typeof block.title === 'string' ? block.title : 'Plan'
      const items = Array.isArray(block.items) ? block.items : []
      const statusIcon: Record<string, string> = {
        pending: '○',
        in_progress: '◉',
        completed: '✓',
        failed: '✗',
        skipped: '–',
      }
      const lines = [`*${title}*`]
      for (const raw of items) {
        const item = raw as Record<string, unknown>
        const s = typeof item.status === 'string' ? item.status : 'pending'
        const icon = statusIcon[s] ?? '○'
        const itemTitle = typeof item.title === 'string' ? item.title : 'Item'
        const note = typeof item.note === 'string' ? ` — ${item.note}` : ''
        lines.push(`${icon} ${itemTitle}${note}`)
      }
      const completed = items.filter(
        (i) => (i as Record<string, unknown>).status === 'completed',
      ).length
      lines.push(`\nProgress: ${completed}/${items.length}`)
      return lines.join('\n')
    }

    default:
      return null
  }
}
