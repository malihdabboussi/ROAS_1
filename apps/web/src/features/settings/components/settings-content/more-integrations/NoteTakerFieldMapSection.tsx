'use client'

import type { NoteTakerFormErrors, NoteTakerFormState } from './use-note-taker-definition-form'

type PathKey = Extract<keyof NoteTakerFormState, `${string}Path`>

type Props = {
  state: NoteTakerFormState
  errors: NoteTakerFormErrors
  setField: <K extends keyof NoteTakerFormState>(key: K, value: NoteTakerFormState[K]) => void
}

type FieldSpec = { key: PathKey; label: string; placeholder: string; required?: boolean }

const MEETING_FIELDS: FieldSpec[] = [
  { key: 'externalIdPath', label: 'Meeting id', placeholder: 'session_id', required: true },
  { key: 'titlePath', label: 'Title', placeholder: 'title' },
  { key: 'startTimePath', label: 'Start time', placeholder: 'start_time' },
  { key: 'endTimePath', label: 'End time', placeholder: 'end_time' },
  { key: 'hostEmailPath', label: 'Host email', placeholder: 'owner.email' },
  { key: 'sourceUrlPath', label: 'Link to the meeting in the tool', placeholder: 'report_url' },
  { key: 'summaryPath', label: 'Summary text', placeholder: 'summary' },
]

const TRANSCRIPT_FIELDS: FieldSpec[] = [
  {
    key: 'transcriptPath',
    label: 'List of transcript turns',
    placeholder: 'transcript.speaker_blocks[]',
    required: true,
  },
  {
    key: 'transcriptTextPath',
    label: 'Text inside each turn',
    placeholder: 'words',
    required: true,
  },
  {
    key: 'transcriptSpeakerPath',
    label: 'Speaker name inside each turn',
    placeholder: 'speaker.name',
  },
  {
    key: 'transcriptTimestampPath',
    label: 'Timestamp inside each turn',
    placeholder: 'start_time',
  },
]

const PEOPLE_AND_ACTIONS: FieldSpec[] = [
  { key: 'participantsPath', label: 'List of attendees', placeholder: 'participants[]' },
  { key: 'participantEmailPath', label: 'Email inside each attendee', placeholder: 'email' },
  { key: 'actionsPath', label: 'List of action items', placeholder: 'action_items[]' },
  { key: 'actionTextPath', label: 'Text inside each action item', placeholder: 'text' },
]

function PathField({
  spec,
  value,
  error,
  onChange,
}: {
  spec: FieldSpec
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="body-3 text-muted-foreground mb-spacing-1 block" htmlFor={`nt-${spec.key}`}>
        {spec.label}
        {spec.required ? <span className="text-destructive"> *</span> : null}
      </label>
      <input
        id={`nt-${spec.key}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={spec.placeholder}
        className={`input-glass body-3 w-full font-mono ${error ? 'border-destructive' : ''}`}
      />
      {error ? <p className="body-4 text-destructive mt-spacing-1">{error}</p> : null}
    </div>
  )
}

function Group({
  title,
  hint,
  fields,
  state,
  errors,
  setField,
}: Props & { title: string; hint: string; fields: FieldSpec[] }) {
  return (
    <div className="space-y-spacing-3">
      <div>
        <p className="body-2 text-foreground font-medium">{title}</p>
        <p className="body-4 text-muted-foreground">{hint}</p>
      </div>
      <div className="gap-spacing-3 grid grid-cols-1 sm:grid-cols-2">
        {fields.map((spec) => (
          <PathField
            key={spec.key}
            spec={spec}
            value={state[spec.key]}
            error={errors[spec.key]}
            onChange={(value) => setField(spec.key, value)}
          />
        ))}
      </div>
    </div>
  )
}

/** Where each meeting field lives in the tool's JSON. */
export function NoteTakerFieldMapSection(props: Props) {
  return (
    <div className="space-y-spacing-5">
      <p className="body-4 text-muted-foreground">
        Write paths with dots, and <code className="font-mono">[]</code> after a list, for example{' '}
        <code className="font-mono">transcript.speaker_blocks[].words</code>. Paths inside a list
        are relative to each item.
      </p>
      <Group
        title="The meeting"
        hint="Only the meeting id is required."
        fields={MEETING_FIELDS}
        {...props}
      />
      <Group
        title="The transcript"
        hint="The list of turns and the text in each one are required."
        fields={TRANSCRIPT_FIELDS}
        {...props}
      />
      <Group
        title="Attendees and action items"
        hint="Optional. A list of plain strings works too; leave the inner path empty."
        fields={PEOPLE_AND_ACTIONS}
        {...props}
      />
    </div>
  )
}
