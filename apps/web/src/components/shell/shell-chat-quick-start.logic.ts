import type { ShellChatQuickStart } from './shell-empty-chat-prompts.config'

export function shellQuickStartMatchesComposer(
  quickStart: ShellChatQuickStart,
  composerValue: string,
): boolean {
  const value = composerValue.trimStart()
  return value.length > 0 && value.startsWith(quickStart.prompt.trimStart())
}

export function buildShellQuickStartSendContext(
  quickStart: ShellChatQuickStart | null,
  content: string,
): string | undefined {
  if (!quickStart || !shellQuickStartMatchesComposer(quickStart, content)) return undefined
  return quickStart.systemContext
}
