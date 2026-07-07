'use client'

import { useEffect, useState } from 'react'
import { LuSettings } from 'react-icons/lu'
import { Pencil, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useSelectionState } from '@/lib/properties/use-selection-state'
import { getFieldTypeLabel } from '@/lib/properties/custom-fields'
import type {
  CreateCustomFieldInput,
  CustomFieldDefinition,
  FieldType,
  UpdateCustomFieldInput,
} from '@/lib/properties/custom-fields'
import { formatDateForGrid } from '@/lib/properties/format-date'
import { FieldTypeIcon } from '../shared/field-type-icon'
import { SelectionTableHeader } from '../shared/selection-table-header'
import { CustomFieldDeleteDialog } from './CustomFieldDeleteDialog'
import { CustomFieldEditorDialog } from './CustomFieldEditorDialog'

interface CustomFieldsTabProps {
  createTrigger: number
  fields: CustomFieldDefinition[]
  isLoading: boolean
  createField: (input: CreateCustomFieldInput) => Promise<CustomFieldDefinition>
  updateField: (fieldId: string, updates: UpdateCustomFieldInput) => Promise<CustomFieldDefinition>
  deleteField: (fieldId: string) => Promise<void>
}

export function CustomFieldsTab({
  createTrigger,
  fields,
  isLoading,
  createField,
  updateField,
  deleteField,
}: CustomFieldsTabProps) {
  const selectableFields = fields.filter((f) => !f.is_system)
  const { selectedIds, allSelected, handleToggleSelection, handleSelectAll, clearSelection } =
    useSelectionState(selectableFields)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [deletingField, setDeletingField] = useState<CustomFieldDefinition | null>(null)
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const hasSelection = selectedIds.length > 0

  const openCreateDialog = () => {
    setEditingField(null)
    setFieldName('')
    setFieldType('text')
    setDropdownOptions([])
    setNewOption('')
    setDialogOpen(true)
  }

  useEffect(() => {
    if (createTrigger > 0) openCreateDialog()
  }, [createTrigger])

  const openEditDialog = (field: CustomFieldDefinition, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingField(field)
    setFieldName(field.name)
    setFieldType(field.field_type)
    setDropdownOptions(field.options || [])
    setNewOption('')
    setDialogOpen(true)
  }

  const openDeleteDialog = (field: CustomFieldDefinition, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingField(field)
    setDeleteDialogOpen(true)
  }

  const addDropdownOption = () => {
    if (!newOption.trim() || dropdownOptions.includes(newOption.trim())) return
    setDropdownOptions([...dropdownOptions, newOption.trim()])
    setNewOption('')
  }

  const removeDropdownOption = (index: number) => {
    setDropdownOptions(dropdownOptions.filter((_, i) => i !== index))
  }

  const mergeTagPreview = fieldName
    ? `{{${fieldName
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')}}}`
    : ''

  const handleSaveField = async () => {
    if (!fieldName.trim()) return
    setIsSaving(true)
    try {
      const data = {
        name: fieldName.trim(),
        field_type: fieldType,
        options: fieldType === 'dropdown' ? dropdownOptions : [],
      }
      if (editingField) {
        await updateField(editingField.id, data)
      } else {
        await createField(data)
      }
      setDialogOpen(false)
      setEditingField(null)
    } catch {
      /* surface */
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingField) return
    setIsDeleting(true)
    try {
      await deleteField(deletingField.id)
      setDeleteDialogOpen(false)
      setDeletingField(null)
    } catch {
      /* surface */
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setIsBulkDeleting(true)
    try {
      for (const id of selectedIds) await deleteField(id)
      clearSelection()
    } catch {
      /* surface */
    } finally {
      setIsBulkDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <VibeyLoadingOrb size="sm" state="processing" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-spacing-6 w-full overflow-hidden">
        <div className="space-y-spacing-4 min-w-0">
          <SelectionTableHeader
            hasSelection={hasSelection}
            allSelected={allSelected}
            selectedCount={selectedIds.length}
            onSelectAll={handleSelectAll}
            onBulkDelete={handleBulkDelete}
            bulkDeleteDisabled={isBulkDeleting}
            desktopHeaderClassName="px-spacing-3 h-spacing-10 gap-spacing-4 typo-caption text-muted-foreground surface-card border-border rounded-spacing-3 hidden grid-cols-[var(--spacing-6)_2fr_1fr_1fr_176px] items-center border shadow-sm md:grid"
            desktopHeaderContent={
              <>
                <div className="body-3">Field Name</div>
                <div className="body-3 text-center">Type</div>
                <div className="body-3 text-center">Updated</div>
                <div className="body-3 pr-2 text-right">Actions</div>
              </>
            }
            mobileLabel="Custom Fields"
          />

          {fields.length === 0 ? (
            <div className="border-border rounded-spacing-3 p-spacing-12 flex flex-col items-center justify-center border border-dashed text-center">
              <div className="bg-hover-subtle mb-spacing-4 flex h-16 w-16 items-center justify-center rounded-full">
                <LuSettings className="icon-lg text-muted-foreground" />
              </div>
              <h3 className="body-1 text-foreground mb-spacing-2 font-medium">
                No custom fields yet
              </h3>
              <p className="body-2 text-muted-foreground max-w-md">
                Create custom fields to track additional info about your contacts.
              </p>
            </div>
          ) : (
            <div className="border-border rounded-spacing-2 overflow-hidden border">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="px-spacing-4 py-spacing-3 border-border hover:bg-hover-subtle w-full min-w-0 cursor-pointer border-b transition-colors last:border-b-0"
                >
                  <div className="gap-spacing-4 typo-caption hidden grid-cols-[var(--spacing-6)_2fr_1fr_1fr_176px] items-center md:grid">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(field.id)}
                      onChange={(e) => handleToggleSelection(field.id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-primary"
                      disabled={field.is_system}
                    />
                    <div className="min-w-0">
                      <div className="body-2 text-foreground truncate font-medium">
                        {field.name}
                      </div>
                      <div className="typo-caption text-muted-foreground">{`{{${field.field_key}}}`}</div>
                    </div>
                    <div className="flex justify-center">
                      <span className="badge-glass badge-glass-muted badge-glass-sm">
                        {getFieldTypeLabel(field.field_type)}
                      </span>
                    </div>
                    <div className="body-3 text-muted-foreground text-center">
                      {formatDateForGrid(field.updated_at)}
                    </div>
                    <div className="gap-spacing-2 pr-spacing-2 flex items-center justify-center">
                      {!field.is_system && (
                        <>
                          <Tooltip label="Edit">
                            <button
                              onClick={(e) => openEditDialog(field, e)}
                              className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Tooltip>
                          <Tooltip label="Delete">
                            <button
                              onClick={(e) => openDeleteDialog(field, e)}
                              className="p-spacing-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-spacing-2 typo-caption min-w-0 md:hidden">
                    <div className="gap-spacing-3 flex min-w-0 items-start justify-between">
                      <div className="gap-spacing-3 flex min-w-0 flex-1 items-start">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(field.id)}
                          onChange={(e) => handleToggleSelection(field.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-primary mt-1"
                          disabled={field.is_system}
                        />
                        <div className="min-w-0">
                          <div className="body-2 text-foreground truncate font-medium">
                            {field.name}
                          </div>
                          <div className="body-3 text-muted-foreground mt-spacing-1">
                            {getFieldTypeLabel(field.field_type)} &bull; {`{{${field.field_key}}}`}
                          </div>
                        </div>
                      </div>
                      <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <FieldTypeIcon type={field.field_type} />
                      </div>
                    </div>
                    <div className="gap-spacing-2 flex items-center justify-end">
                      {!field.is_system && (
                        <>
                          <button
                            onClick={(e) => openEditDialog(field, e)}
                            className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => openDeleteDialog(field, e)}
                            className="p-spacing-1 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CustomFieldEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingField(null)
          setDialogOpen(open)
        }}
        isEditing={!!editingField}
        fieldName={fieldName}
        fieldType={fieldType}
        dropdownOptions={dropdownOptions}
        newOption={newOption}
        mergeTagPreview={mergeTagPreview}
        isSaving={isSaving}
        onFieldNameChange={setFieldName}
        onFieldTypeChange={setFieldType}
        onDropdownOptionsChange={setDropdownOptions}
        onNewOptionChange={setNewOption}
        onAddOption={addDropdownOption}
        onRemoveOption={removeDropdownOption}
        onSave={handleSaveField}
      />

      <CustomFieldDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        deletingField={deletingField}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
      />
    </>
  )
}
