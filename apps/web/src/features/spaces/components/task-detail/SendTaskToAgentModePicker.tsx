'use client'

import { Bot, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type SendTaskToAgentMode = 'task' | 'mission'

interface SendTaskToAgentModePickerProps {
  value: SendTaskToAgentMode
  missionEnabled: boolean
  onChange: (mode: SendTaskToAgentMode) => void
}

const SEND_MODE_OPTIONS = [
  { id: 'task', label: 'Task', Icon: Bot },
  { id: 'mission', label: 'Mission', Icon: Rocket },
] as const

export function SendTaskToAgentModePicker({
  value,
  missionEnabled,
  onChange,
}: SendTaskToAgentModePickerProps) {
  return (
    <div className="px-spacing-4 sm:px-spacing-6 pb-2 pt-3">
      <span className="body-4 font-medium uppercase tracking-wider text-muted-foreground">
        Send as
      </span>
      <div className="gap-spacing-2 mt-spacing-2 flex">
        {SEND_MODE_OPTIONS.map(({ id, label, Icon }) => {
          const disabled = id === 'mission' && !missionEnabled
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (!disabled) onChange(id)
              }}
              disabled={disabled}
              title={disabled ? 'Missions require a campaign-linked space' : undefined}
              className={cn(
                'body-3 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-1-5 inline-flex items-center font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
                value === id
                  ? 'button-glass-accent text-foreground'
                  : 'button-glass-neutral text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="icon-xs" />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
