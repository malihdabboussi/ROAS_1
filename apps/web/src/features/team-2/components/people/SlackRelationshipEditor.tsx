'use client'

import { useState } from 'react'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import type {
  SlackDiscoveredPerson,
  SlackRelationshipKind,
} from '../../services/slack-people.service'

const OPTIONS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'ignored', label: 'Ignored' },
] as const

interface SlackRelationshipEditorProps {
  person: SlackDiscoveredPerson
  onSave: (kind: SlackRelationshipKind) => void
}

export function SlackRelationshipEditor({ person, onSave }: SlackRelationshipEditorProps) {
  const [editing, setEditing] = useState(person.relationship_source !== 'manual')
  const [value, setValue] = useState<SlackRelationshipKind | ''>(
    person.relationship_source === 'manual' ? person.relationship_kind : '',
  )

  if (!editing) {
    return (
      <div className="gap-spacing-2 flex items-center">
        <span className="badge-glass badge-glass-muted body-4 capitalize">
          {person.relationship_kind}
        </span>
        <button
          type="button"
          className="button-compact button-glass-neutral"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="gap-spacing-2 flex min-w-0 items-center">
      <SettingsSelect
        value={value}
        options={OPTIONS}
        onChange={setValue}
        placeholder="Choose type"
        wrapperClassName="relative min-w-32"
      />
      <button
        type="button"
        disabled={!value}
        className="button-compact button-glass-accent"
        onClick={() => {
          if (!value) return
          onSave(value)
          setEditing(false)
        }}
      >
        Save
      </button>
      {person.relationship_source === 'manual' ? (
        <button
          type="button"
          className="button-compact button-glass-neutral"
          onClick={() => {
            setValue(person.relationship_kind)
            setEditing(false)
          }}
        >
          Cancel
        </button>
      ) : null}
    </div>
  )
}
