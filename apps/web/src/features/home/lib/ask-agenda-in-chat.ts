import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import type { CalendarAgendaAccount } from '@/lib/services/calendar-api'

function buildAgendaKickoff(accounts: CalendarAgendaAccount[]): string {
  const lines = [
    'Help me with my calendar agenda.',
    '',
    'Connected calendar accounts:',
  ]
  if (accounts.length === 0) {
    lines.push('- (none listed yet — use whatever calendars I have connected)')
  } else {
    for (const account of accounts) {
      const defaultTag = account.isDefault ? ' — default for sending invites' : ''
      lines.push(`- ${account.label} (${account.provider})${defaultTag}`)
    }
  }
  lines.push(
    '',
    'If I ask you to create or send a calendar invite and more than one account is connected, confirm which account to use before creating — prefer the default unless I say otherwise.',
    '',
  )
  return lines.join('\n')
}

/** Open global chat with Vibey and seed an agenda / invite kickoff prompt. */
export function askAboutAgendaInChat(accounts: CalendarAgendaAccount[]): void {
  useGlobalChatStore.getState().seedComposer({
    content: buildAgendaKickoff(accounts),
    agentKey: 'vibey',
    railIntent: 'new',
    workContext: { surface: 'general' },
  })
}
