import { Bot, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ChatInputPlusMenuAgentPickerConfig } from './chat-input-plus-menu-agent.types'

export function ChatInputPlusMenuAgentPanel({
  picker,
  onCloseMenu,
}: {
  picker: ChatInputPlusMenuAgentPickerConfig
  onCloseMenu: () => void
}) {
  return (
    <>
      <p className="body-4 text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
        Choose an agent
      </p>
      {picker.agents.map((agent) => {
        const selected = picker.selectedAgentKey === agent.key
        return (
          <button
            key={agent.key}
            type="button"
            onClick={() => {
              picker.onSelect(agent.key)
              onCloseMenu()
            }}
            className={cn(
              'hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors',
              selected && 'bg-primary/10',
            )}
          >
            <span className="bg-secondary h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center overflow-hidden">
              {agent.avatarUrl ? (
                <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Bot className="icon-sm text-muted-foreground" aria-hidden />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="body-3 text-foreground block truncate font-medium">{agent.name}</span>
              {agent.roleLabel ? (
                <span className="body-4 text-muted-foreground block truncate">
                  {agent.roleLabel}
                </span>
              ) : null}
            </span>
            {selected ? <Check className="icon-sm text-foreground shrink-0" aria-hidden /> : null}
          </button>
        )
      })}
    </>
  )
}
