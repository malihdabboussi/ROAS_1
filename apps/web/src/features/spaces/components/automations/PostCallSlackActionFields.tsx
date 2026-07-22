'use client'

import type { ReactNode } from 'react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import type { AutomationAction } from '../../types/space-schema'

type PostCallSlackAction = Extract<AutomationAction, { type: 'request_slack_follow_up_confirm' }>

const DELIVERY_OPTIONS: AutomationSolidOption[] = [
  { value: 'shadow', label: 'Shadow · process and review' },
  { value: 'active', label: 'Active · send internal follow-ups' },
]

export function AutomationFieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="gap-spacing-1 flex flex-col">
      <span className="body-4 text-muted-foreground font-medium">{label}</span>
      {children}
    </label>
  )
}

export function PostCallSlackActionFields({
  action,
  onChange,
}: {
  action: PostCallSlackAction
  onChange: (patch: Partial<PostCallSlackAction>) => void
}) {
  return (
    <div className="space-y-spacing-3">
      <AutomationFieldGroup label="Mode">
        <AutomationSolidSelect
          options={DELIVERY_OPTIONS}
          value={action.delivery_mode ?? 'shadow'}
          onChange={(delivery_mode) => onChange({ delivery_mode } as Partial<PostCallSlackAction>)}
          placeholder="Choose a mode"
        />
      </AutomationFieldGroup>
      <div className="body-3 text-muted-foreground rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 border">
        Shadow runs the complete post-call process and stores reviewable account-manager drafts in
        Team Conversations without sending. Active uses the same drafts and sends only to Internal
        people who are also Active. The client recap remains in the approval thread.
      </div>
      <AutomationFieldGroup label="Review Slack email">
        <input
          type="email"
          value={action.dm_email ?? ''}
          onChange={(event) => onChange({ dm_email: event.target.value })}
          placeholder="dylan@dylanvanas.com"
          className="body-3 h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground focus:ring-ring w-full border outline-none focus:ring-2"
        />
      </AutomationFieldGroup>
      <AutomationFieldGroup label="Approval reaction">
        <input
          value={action.confirm_reaction ?? ''}
          onChange={(event) => onChange({ confirm_reaction: event.target.value })}
          placeholder="white_check_mark"
          className="body-3 h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground focus:ring-ring w-full border outline-none focus:ring-2"
        />
      </AutomationFieldGroup>
    </div>
  )
}
