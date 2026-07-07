import type { FieldDef } from '../types/space-schema'

/** List / kanban table columns: status renders as row chrome, not as a data column. */
export function displayColumnsForList(visibleFields: FieldDef[]): FieldDef[] {
  return visibleFields.filter((f) => f.id !== 'status')
}

/** Header label for a column. */
export function listColumnHeaderLabel(field: FieldDef): string {
  return field.name
}
