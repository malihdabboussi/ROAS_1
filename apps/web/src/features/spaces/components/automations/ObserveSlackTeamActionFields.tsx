'use client'

import type { ReactNode } from 'react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import type { AutomationAction } from '../../types/space-schema'

export type ObserveSlackTeamAction = Extract<AutomationAction, { type: 'observe_slack_team' }>

const SLACK_TEAM_LOOP_KIND_OPTIONS: AutomationSolidOption[] = [
  { value: 'all', label: 'All proactive signals' },
  { value: 'brain_compounding', label: 'Person Brain compounding' },
  { value: 'workflow_discovery', label: 'Workflow discovery' },
  { value: 'unanswered_questions', label: 'Unanswered questions' },
  { value: 'client_risk', label: 'Stalled commitments & client risk' },
]

const SLACK_TEAM_DELIVERY_OPTIONS: AutomationSolidOption[] = [
  { value: 'shadow', label: 'Shadow · review proposals' },
  { value: 'active', label: 'Active · perform approved behavior' },
]

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="gap-spacing-1 flex flex-col">
      <span className="body-4 text-muted-foreground font-medium">{label}</span>
      {children}
    </label>
  )
}

export function ObserveSlackTeamActionFields({
  action,
  onChange,
}: {
  action: ObserveSlackTeamAction
  onChange: (patch: Partial<ObserveSlackTeamAction>) => void
}) {
  return (
    <div className="space-y-spacing-3">
      <FieldGroup label="Detect">
        <AutomationSolidSelect
          options={SLACK_TEAM_LOOP_KIND_OPTIONS}
          value={action.loop_kind}
          onChange={(loop_kind) => onChange({ loop_kind } as Partial<ObserveSlackTeamAction>)}
          placeholder="Choose a loop"
        />
      </FieldGroup>
      <FieldGroup label="Mode">
        <AutomationSolidSelect
          options={SLACK_TEAM_DELIVERY_OPTIONS}
          value={action.delivery_mode}
          onChange={(delivery_mode) =>
            onChange({ delivery_mode } as Partial<ObserveSlackTeamAction>)
          }
          placeholder="Choose a mode"
        />
      </FieldGroup>
      <div className="body-3 text-muted-foreground rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 border">
        Disabling the loop is Off. Shadow observes and creates reviewable proposals. Active may
        perform only the selected behavior within the limits below.
      </div>
      <FieldGroup label="Slack channel IDs">
        <textarea
          value={(action.channel_ids ?? []).join('\n')}
          onChange={(event) =>
            onChange({
              channel_ids: event.target.value
                .split(/[\n,]/)
                .map((value) => value.trim())
                .filter(Boolean),
            } as Partial<ObserveSlackTeamAction>)
          }
          placeholder="One Slack channel ID per line. Leave empty for every channel Pixel can see."
          className="body-3 h-spacing-20 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 text-foreground placeholder:text-muted-foreground w-full resize-none border outline-none"
        />
      </FieldGroup>
      <FieldGroup label="People record IDs">
        <textarea
          value={(action.person_ids ?? []).join('\n')}
          onChange={(event) =>
            onChange({
              person_ids: event.target.value
                .split(/[\n,]/)
                .map((value) => value.trim())
                .filter(Boolean),
            } as Partial<ObserveSlackTeamAction>)
          }
          placeholder="One Manage People record ID per line. Leave empty for everyone except Ignored."
          className="body-3 h-spacing-20 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 text-foreground placeholder:text-muted-foreground w-full resize-none border outline-none"
        />
      </FieldGroup>
      <div className="gap-spacing-3 grid grid-cols-2">
        <FieldGroup label="Look back (minutes)">
          <input
            type="number"
            min={5}
            max={1440}
            value={action.lookback_minutes ?? 60}
            onChange={(event) =>
              onChange({
                lookback_minutes: Number(event.target.value || 60),
              } as Partial<ObserveSlackTeamAction>)
            }
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
          />
        </FieldGroup>
        <FieldGroup label="Daily action limit">
          <input
            type="number"
            min={1}
            max={100}
            value={action.daily_limit ?? 10}
            onChange={(event) =>
              onChange({
                daily_limit: Number(event.target.value || 10),
              } as Partial<ObserveSlackTeamAction>)
            }
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
          />
        </FieldGroup>
      </div>
      <div className="rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 flex items-center justify-between border">
        <span className="body-3 text-foreground font-medium">Quiet hours</span>
        <input
          type="checkbox"
          checked={Boolean(action.quiet_hours)}
          onChange={(event) =>
            onChange({
              quiet_hours: event.target.checked
                ? { start: '22:00', end: '07:00', timezone: 'America/Los_Angeles' }
                : undefined,
            } as Partial<ObserveSlackTeamAction>)
          }
        />
      </div>
      {action.quiet_hours ? (
        <div className="gap-spacing-3 grid grid-cols-3">
          <FieldGroup label="Start">
            <input
              type="time"
              value={action.quiet_hours.start}
              onChange={(event) =>
                onChange({
                  quiet_hours: { ...action.quiet_hours!, start: event.target.value },
                } as Partial<ObserveSlackTeamAction>)
              }
              className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
            />
          </FieldGroup>
          <FieldGroup label="End">
            <input
              type="time"
              value={action.quiet_hours.end}
              onChange={(event) =>
                onChange({
                  quiet_hours: { ...action.quiet_hours!, end: event.target.value },
                } as Partial<ObserveSlackTeamAction>)
              }
              className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
            />
          </FieldGroup>
          <FieldGroup label="Timezone">
            <input
              value={action.quiet_hours.timezone}
              onChange={(event) =>
                onChange({
                  quiet_hours: {
                    ...action.quiet_hours!,
                    timezone: event.target.value,
                  },
                } as Partial<ObserveSlackTeamAction>)
              }
              className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
            />
          </FieldGroup>
        </div>
      ) : null}
      <FieldGroup label="Instructions">
        <textarea
          value={action.instructions ?? ''}
          onChange={(event) =>
            onChange({
              instructions: event.target.value,
            } as Partial<ObserveSlackTeamAction>)
          }
          placeholder="Optional detection or routing instructions..."
          className="body-3 h-spacing-20 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 text-foreground placeholder:text-muted-foreground w-full resize-none border outline-none"
        />
      </FieldGroup>
    </div>
  )
}
