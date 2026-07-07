import { describe, expect, it } from 'vitest'
import type { FieldDef } from '../../types/space-schema'
import { formatSpaceTaskStatusLabel } from '../../components/space-item-values'
import {
  formatFieldChangeActivityLabel,
  formatStatusChangeActivityLabel,
} from '../format-field-change-activity'

const FIELDS: FieldDef[] = [
  {
    id: 'status',
    name: 'Status',
    type: 'select',
    options: [
      { id: 'todo', label: 'Backlog', color: 'slate' },
      { id: 'done', label: 'Shipped', color: 'emerald' },
    ],
  },
  {
    id: 'tags',
    name: 'Tags',
    type: 'multi_select',
    options: [
      { id: 'bug', label: 'Bug' },
      { id: 'feat', label: 'Feature' },
    ],
  },
  { id: 'done', name: 'Done?', type: 'checkbox' },
  { id: 'score', name: 'Score', type: 'rating' },
  { id: 'pct', name: 'Pct', type: 'progress' },
  { id: 'budget', name: 'Budget', type: 'currency' },
  { id: 'estimate', name: 'Estimate', type: 'number' },
]

const resolveLabel = (id: string) =>
  ({ due_date: 'Due date', start_date: 'Start date', priority: 'Priority' })[id] ??
  FIELDS.find((f) => f.id === id)?.name ??
  id

describe('formatFieldChangeActivityLabel', () => {
  it('checkbox checked / unchecked', () => {
    expect(
      formatFieldChangeActivityLabel(
        { field: 'done', from: false, to: true },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('checked the box')
    expect(
      formatFieldChangeActivityLabel(
        { field: 'done', from: true, to: false },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('unchecked the box')
  })

  it('rating uses visual preview label without duplicating value text', () => {
    expect(
      formatFieldChangeActivityLabel({ field: 'score', from: 1, to: 4.5 }, FIELDS, resolveLabel),
    ).toBe('updated Score')
  })

  it('progress, number, currency show target value in label', () => {
    expect(
      formatFieldChangeActivityLabel({ field: 'pct', from: 0, to: 75 }, FIELDS, resolveLabel),
    ).toBe('updated Pct to 75%')
    expect(
      formatFieldChangeActivityLabel(
        { field: 'budget', from: null, to: { amount: 1200, currency: 'USD' } },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('updated Budget')
    expect(
      formatFieldChangeActivityLabel({ field: 'estimate', from: 1, to: 42 }, FIELDS, resolveLabel),
    ).toBe('updated Estimate to 42')
  })

  it('priority and tags use visual preview label without duplicating value text', () => {
    expect(
      formatFieldChangeActivityLabel(
        { field: 'priority', from: 'low', to: 'high' },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('updated Priority')
    expect(
      formatFieldChangeActivityLabel(
        { field: 'tags', from: ['bug'], to: ['bug', 'feat'] },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('updated Tags')
  })

  it('due date shows formatted target', () => {
    expect(
      formatFieldChangeActivityLabel(
        { field: 'due_date', from: null, to: '2026-05-01T12:00:00.000Z' },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('updated Due date to May 1, 2026')
  })

  it('cleared values', () => {
    expect(
      formatFieldChangeActivityLabel(
        { field: 'priority', from: 'high', to: null },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('cleared Priority')
    expect(
      formatFieldChangeActivityLabel(
        { field: 'tags', from: ['bug'], to: [] },
        FIELDS,
        resolveLabel,
      ),
    ).toBe('cleared Tags')
  })

  it('returns null for plain text fields (preview handles content)', () => {
    expect(
      formatFieldChangeActivityLabel({ field: 'notes', from: 'a', to: 'b' }, FIELDS, resolveLabel),
    ).toBeNull()
  })
})

describe('formatStatusChangeActivityLabel', () => {
  it('uses schema status option label', () => {
    expect(formatStatusChangeActivityLabel({ from: 'todo', to: 'done' }, FIELDS)).toBe(
      'changed status to Shipped',
    )
  })

  it('formats custom status ids for simple status surfaces', () => {
    expect(formatSpaceTaskStatusLabel('waiting_qa')).toBe('Waiting QA')
  })
})
