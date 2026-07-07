import { Plus, Trash2 } from 'lucide-react'
import { AVATAR_DEEP_DIVE_FIELDS } from '@/features/studio/config/avatar-deep-dive-fields.config'
import type { CustomField, JsonPath } from './avatar-preview-persona-types'
import { readCustomFields } from './avatar-preview-persona-types'
import { AvatarPreviewHeroCard } from './AvatarPreviewHeroCard'
import { FieldSectionLabel, LabeledBlock, PersonaValue } from './AvatarPreviewPersonaValue'

function BackgroundSummaryCard({
  pd,
  editMode,
  onPersonaChange,
}: {
  pd: Record<string, unknown>
  editMode: boolean
  onPersonaChange: (path: JsonPath, value: unknown) => void
}) {
  const background = pd.background_profile as unknown
  const summary = pd.comprehensive_summary as unknown

  if (!editMode && !background && !summary) return null

  return (
    <div className="card-glass rounded-spacing-3">
      <div className="space-y-spacing-6 p-spacing-4 sm:p-spacing-5 md:p-spacing-6">
        {(background || editMode) && (
          <LabeledBlock label="Background Profile">
            <PersonaValue
              value={background ?? (editMode ? '' : null)}
              path={['background_profile']}
              editMode={editMode}
              onPersonaChange={onPersonaChange}
            />
          </LabeledBlock>
        )}
        {(summary || editMode) && (
          <LabeledBlock label="Comprehensive Summary">
            <PersonaValue
              value={summary ?? (editMode ? '' : null)}
              path={['comprehensive_summary']}
              editMode={editMode}
              onPersonaChange={onPersonaChange}
            />
          </LabeledBlock>
        )}
      </div>
    </div>
  )
}

function FieldCard({
  label,
  value,
  fieldKey,
  editMode,
  onPersonaChange,
}: {
  label: string
  value: unknown
  fieldKey: string
  editMode: boolean
  onPersonaChange: (path: JsonPath, value: unknown) => void
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && value.trim() === '')
  if (!editMode && isEmpty) return null

  return (
    <div className="card-glass rounded-spacing-3">
      <div className="p-spacing-4 sm:p-spacing-5 md:p-spacing-6">
        <LabeledBlock label={label}>
          <PersonaValue
            value={isEmpty && editMode ? '' : value}
            path={[fieldKey]}
            editMode={editMode}
            onPersonaChange={onPersonaChange}
          />
        </LabeledBlock>
      </div>
    </div>
  )
}

function CustomFieldsSection({
  fields,
  editMode,
  onAdd,
  onUpdate,
  onRemove,
}: {
  fields: CustomField[]
  editMode: boolean
  onAdd: () => void
  onUpdate: (index: number, patch: Partial<Pick<CustomField, 'label' | 'value'>>) => void
  onRemove: (index: number) => void
}) {
  const visible = editMode
    ? fields
    : fields.filter((field) => field.label.trim() !== '' || field.value.trim() !== '')
  if (!editMode && visible.length === 0) return null

  return (
    <>
      {visible.map((field) => {
        const index = fields.indexOf(field)
        return (
          <div key={field.id} className="card-glass rounded-spacing-3">
            <div className="p-spacing-4 sm:p-spacing-5 md:p-spacing-6 space-y-spacing-2">
              <div className="gap-spacing-2 flex items-start">
                <div className="min-w-0 flex-1">
                  {editMode ? (
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => onUpdate(index, { label: e.target.value })}
                      placeholder="Field name"
                      className="body-3 mb-spacing-1 w-full rounded-spacing-2 border border-border bg-background px-spacing-2 py-spacing-1 text-muted-foreground outline-none"
                      aria-label="Custom field name"
                    />
                  ) : (
                    <FieldSectionLabel>{field.label || 'Custom field'}</FieldSectionLabel>
                  )}
                </div>
                {editMode ? (
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="h-spacing-7 text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex aspect-square shrink-0 items-center justify-center rounded-spacing-2 transition-colors"
                    aria-label="Remove field"
                  >
                    <Trash2 className="icon-sm" />
                  </button>
                ) : null}
              </div>
              {editMode ? (
                <textarea
                  className="body-2 w-full h-spacing-14 whitespace-pre-wrap rounded-spacing-2 border border-border bg-background p-spacing-2 text-foreground outline-none"
                  value={field.value}
                  onChange={(e) => onUpdate(index, { value: e.target.value })}
                  placeholder="Free text — leave empty for the agent to fill"
                  aria-label="Custom field value"
                />
              ) : (
                <p className="body-2 whitespace-pre-wrap text-foreground">{field.value || '—'}</p>
              )}
            </div>
          </div>
        )
      })}
      {editMode ? (
        <button
          type="button"
          onClick={onAdd}
          className="border-border body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-3 gap-spacing-2 py-spacing-4 flex w-full items-center justify-center border border-dashed font-medium transition-colors"
        >
          <Plus className="icon-sm" />
          Add card
        </button>
      ) : null}
    </>
  )
}

export function AvatarPreviewBody({
  pd,
  editMode,
  onPersonaChange,
  onAddCustomField,
  onUpdateCustomField,
  onRemoveCustomField,
}: {
  pd: Record<string, unknown>
  editMode: boolean
  onPersonaChange: (path: JsonPath, value: unknown) => void
  onAddCustomField: () => void
  onUpdateCustomField: (index: number, patch: Partial<Pick<CustomField, 'label' | 'value'>>) => void
  onRemoveCustomField: (index: number) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-spacing-8 p-spacing-4">
        <div className="space-y-spacing-3">
          <h2 className="title-h3">Buyer Persona</h2>
          <AvatarPreviewHeroCard pd={pd} editMode={editMode} onPersonaChange={onPersonaChange} />
          <BackgroundSummaryCard pd={pd} editMode={editMode} onPersonaChange={onPersonaChange} />
          {AVATAR_DEEP_DIVE_FIELDS.map(([key, label]) => (
            <FieldCard
              key={key}
              label={label}
              fieldKey={key}
              value={pd[key]}
              editMode={editMode}
              onPersonaChange={onPersonaChange}
            />
          ))}
          <CustomFieldsSection
            fields={readCustomFields(pd)}
            editMode={editMode}
            onAdd={onAddCustomField}
            onUpdate={onUpdateCustomField}
            onRemove={onRemoveCustomField}
          />
        </div>
      </div>
    </div>
  )
}
