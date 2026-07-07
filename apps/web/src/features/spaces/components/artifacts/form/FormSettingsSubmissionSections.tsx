import { Bot, ChevronDown, UserPlus } from 'lucide-react'
import { AssigneeCell } from '@/features/spaces/components/cells/AssigneeCell'
import type { Space } from '@/features/spaces/types'
import type { Form, FormSettings } from '@/lib/forms'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import { FormSettingsTaskTitlePicker } from './FormSettingsTaskTitlePicker'
import { FieldRow, PanelSection, ToggleRow } from './FormSettingsPanelPrimitives'
import { TargetSpacePicker } from './TargetSpacePicker'

export function FormSettingsSubmissionSections({
  form,
  settings,
  update,
  roster,
  currentUserId,
  bindToSpace,
}: {
  form: Pick<Form, 'campaign_id' | 'schema'>
  settings: FormSettings
  update: (patch: Partial<FormSettings>) => void
  roster: TeamRosterEntry[]
  currentUserId: string | null
  bindToSpace: (space: Space) => void | Promise<void>
}) {
  const assigneeType = settings.assignee_type ?? 'unassigned'
  const assigneeId: string | null = settings.assignee_id ?? null
  const assigneeEntry =
    assigneeType === 'agent'
      ? (roster.find((entry) => entry.kind === 'agent' && entry.agent_key === assigneeId) ?? null)
      : assigneeType === 'human'
        ? (roster.find((entry) => entry.kind === 'human' && entry.user_id === assigneeId) ?? null)
        : null
  const assigneeIsMe = Boolean(
    assigneeEntry &&
      assigneeEntry.kind === 'human' &&
      currentUserId &&
      assigneeEntry.user_id === currentUserId,
  )

  return (
    <>
      <PanelSection title="After submitting the form">
        <FieldRow label="Assign task to">
          <div className="relative w-full [&>button]:w-full">
            <AssigneeCell
              value={
                assigneeType !== 'unassigned' && assigneeId
                  ? [{ type: assigneeType, id: assigneeId }]
                  : []
              }
              roster={roster}
              currentUserId={currentUserId}
              onChange={(next) =>
                update({
                  assignee_type: next[0]?.type ?? 'unassigned',
                  assignee_id: next[0]?.id ?? null,
                })
              }
              customTrigger={
                <span className="border-border bg-background text-foreground hover:bg-hover-subtle h-spacing-9 rounded-spacing-2 px-spacing-3 body-3 flex w-full items-center justify-between border transition-colors">
                  <span className="gap-spacing-2 flex min-w-0 items-center">
                    {assigneeEntry ? (
                      <AssigneeAvatar entry={assigneeEntry} />
                    ) : (
                      <UserPlus className="icon-sm text-muted-foreground shrink-0" />
                    )}
                    <span className={cn('truncate', !assigneeEntry && 'text-muted-foreground')}>
                      {assigneeEntry
                        ? assigneeIsMe
                          ? 'Me'
                          : assigneeEntry.display_name
                        : 'Unassigned'}
                    </span>
                  </span>
                  <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
                </span>
              }
            />
          </div>
        </FieldRow>
        <FieldRow label="Create task in space">
          <TargetSpacePicker
            campaignId={form.campaign_id}
            value={settings.target_space_id ?? null}
            onPick={bindToSpace}
          />
        </FieldRow>
      </PanelSection>

      <PanelSection title="Submission settings">
        <FormSettingsTaskTitlePicker
          questions={form.schema?.questions ?? []}
          value={settings.task_title_question_id ?? 'auto'}
          onChange={(task_title_question_id) => update({ task_title_question_id })}
        />
        <FieldRow label="Redirect URL">
          <input
            value={settings.redirect_url ?? ''}
            onChange={(event) => update({ redirect_url: event.target.value })}
            placeholder="https://"
            className="h-spacing-9 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
          />
        </FieldRow>
        <FieldRow label="Button label">
          <input
            value={settings.button_label ?? 'Submit'}
            onChange={(event) => update({ button_label: event.target.value })}
            placeholder="Submit"
            className="h-spacing-9 body-3 rounded-spacing-2 border-border bg-background text-foreground placeholder:text-muted-foreground px-spacing-3 focus:ring-ring w-full border outline-none focus:ring-2"
          />
        </FieldRow>
        <ToggleRow
          label="Add answers to the task description"
          checked={settings.add_answers_to_description ?? false}
          onChange={(checked) => update({ add_answers_to_description: checked })}
        />
        <ToggleRow
          label="Show resubmit button"
          checked={settings.show_resubmit_button ?? false}
          onChange={(checked) => update({ show_resubmit_button: checked })}
        />
        <ToggleRow
          label="Show CAPTCHA"
          checked={settings.show_recaptcha ?? false}
          onChange={(checked) => update({ show_recaptcha: checked })}
        />
      </PanelSection>
    </>
  )
}

function AssigneeAvatar({ entry }: { entry: TeamRosterEntry }) {
  if (entry.kind === 'agent' && !entry.avatar_url) {
    return (
      <span className="bg-primary/10 text-primary h-spacing-5 flex aspect-square shrink-0 items-center justify-center rounded-full">
        <Bot className="icon-xs" />
      </span>
    )
  }
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        className="h-spacing-5 aspect-square shrink-0 rounded-full object-cover"
      />
    )
  }
  const initials =
    entry.display_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  return (
    <span className="bg-secondary text-foreground typo-caption h-spacing-5 flex aspect-square shrink-0 items-center justify-center rounded-full font-semibold">
      {initials}
    </span>
  )
}
