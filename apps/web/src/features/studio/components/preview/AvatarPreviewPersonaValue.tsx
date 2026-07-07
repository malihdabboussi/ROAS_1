import type { ReactNode } from 'react'
import {
  formatDemoKey as formatKey,
  isSimpleDemoValue as isSimpleValue,
} from '../../utils/avatar-demographics-hero.layout'
import { isLongListItemText } from '../../utils/long-list-item'
import { normalizeEmDashToHyphen } from '../../utils/normalize-em-dash'
import type { JsonPath } from './avatar-preview-persona-types'

export function FieldSectionLabel({ children }: { children: ReactNode }) {
  return <p className="body-3 mb-spacing-1 text-muted-foreground">{children}</p>
}

export function LabeledStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldSectionLabel>{label}</FieldSectionLabel>
      <p className="body-2 text-foreground">{value}</p>
    </div>
  )
}

export function LabeledBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-spacing-2">
      <FieldSectionLabel>{label}</FieldSectionLabel>
      <div className="text-foreground">{children}</div>
    </div>
  )
}

const editableTextareaClass =
  'body-2 w-full h-spacing-14 whitespace-pre-wrap rounded-spacing-2 border border-border bg-background p-spacing-2 text-foreground outline-none'

export const editableInputClass =
  'body-2 w-full rounded-spacing-2 border border-border bg-background px-spacing-2 py-spacing-1 text-foreground outline-none'

function renderPersonaValueReadOnly(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    const unique = [
      ...new Set(
        value
          .map((item) =>
            normalizeEmDashToHyphen(
              String(item)
                .replace(/^[\s•\-–—*]+/, '')
                .trim(),
            ),
          )
          .filter(Boolean),
      ),
    ]
    return (
      <ul className="body-2 list-card-compact text-foreground">
        {unique.map((item, i) => (
          <li key={i} {...(isLongListItemText(item) ? { 'data-long-item': 'true' as const } : {})}>
            {item}
          </li>
        ))}
      </ul>
    )
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    return (
      <div className="space-y-spacing-4">
        {Object.entries(obj).map(([k, v]) => {
          if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) return null
          if (isSimpleValue(v)) {
            return (
              <div key={k}>
                <FieldSectionLabel>{formatKey(k)}</FieldSectionLabel>
                <p className="body-2 text-foreground">{normalizeEmDashToHyphen(String(v))}</p>
              </div>
            )
          }
          return (
            <LabeledBlock key={k} label={formatKey(k)}>
              {renderPersonaValueReadOnly(v)}
            </LabeledBlock>
          )
        })}
      </div>
    )
  }
  return (
    <p className="body-2 whitespace-pre-wrap text-foreground">
      {normalizeEmDashToHyphen(String(value))}
    </p>
  )
}

export function PersonaValue({
  value,
  path,
  editMode,
  onPersonaChange,
}: {
  value: unknown
  path: JsonPath
  editMode: boolean
  onPersonaChange: (path: JsonPath, value: unknown) => void
}) {
  if (!editMode) {
    return <>{renderPersonaValueReadOnly(value)}</>
  }

  if (value === null || value === undefined) {
    return (
      <textarea
        className={editableTextareaClass}
        value=""
        onChange={(e) => onPersonaChange(path, e.target.value)}
        aria-label="Persona field"
      />
    )
  }

  if (Array.isArray(value)) {
    const allSimple = value.every((v) => isSimpleValue(v))
    if (allSimple) {
      return (
        <ul className="body-2 list-card-compact space-y-spacing-2 text-foreground">
          {value.map((item, i) => (
            <li key={i}>
              <input
                className={editableInputClass}
                value={normalizeEmDashToHyphen(
                  String(item)
                    .replace(/^[\s•\-–—*]+/, '')
                    .trim(),
                )}
                onChange={(e) => {
                  const next = [...value]
                  next[i] = e.target.value
                  onPersonaChange(path, next)
                }}
                aria-label={`List item ${i + 1}`}
              />
            </li>
          ))}
        </ul>
      )
    }
    return (
      <div className="space-y-spacing-4">
        {value.map((item, i) => (
          <PersonaValue
            key={i}
            value={item}
            path={[...path, i]}
            editMode={editMode}
            onPersonaChange={onPersonaChange}
          />
        ))}
      </div>
    )
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    return (
      <div className="space-y-spacing-4">
        {Object.entries(obj).map(([k, v]) => {
          if (!editMode && (v == null || v === '' || (typeof v === 'string' && v.trim() === '')))
            return null
          if (v != null && isSimpleValue(v)) {
            return (
              <div key={k}>
                <FieldSectionLabel>{formatKey(k)}</FieldSectionLabel>
                <textarea
                  className={editableTextareaClass}
                  value={normalizeEmDashToHyphen(String(v))}
                  onChange={(e) => onPersonaChange([...path, k], e.target.value)}
                  aria-label={formatKey(k)}
                />
              </div>
            )
          }
          if (v == null || v === '') {
            return (
              <div key={k}>
                <FieldSectionLabel>{formatKey(k)}</FieldSectionLabel>
                <textarea
                  className={editableTextareaClass}
                  value=""
                  onChange={(e) => onPersonaChange([...path, k], e.target.value)}
                  aria-label={formatKey(k)}
                />
              </div>
            )
          }
          return (
            <LabeledBlock key={k} label={formatKey(k)}>
              <PersonaValue
                value={v}
                path={[...path, k]}
                editMode={editMode}
                onPersonaChange={onPersonaChange}
              />
            </LabeledBlock>
          )
        })}
      </div>
    )
  }

  return (
    <textarea
      className={editableTextareaClass}
      value={normalizeEmDashToHyphen(String(value))}
      onChange={(e) => onPersonaChange(path, e.target.value)}
      aria-label="Persona field"
    />
  )
}
