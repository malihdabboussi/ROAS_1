'use client'

import type { SpaceItem } from '@/lib/spaces'
import { AssigneeCell } from './AssigneeCell'
import type { ExtendedCellProps } from './cell-types'
import { CheckboxCell } from './CheckboxCell'
import { ContactCell } from './ContactCell'
import { CurrencyCell } from './CurrencyCell'
import { DateCell } from './DateCell'
import { DueDateCell } from './DueDateCell'
import { EmailCell } from './EmailCell'
import { MediaCell } from './MediaCell'
import { MissionCell } from './MissionCell'
import { MultiSelectCell } from './MultiSelectCell'
import { NumberCell } from './NumberCell'
import { PhoneCell } from './PhoneCell'
import { ProgressCell } from './ProgressCell'
import { RatingCell } from './RatingCell'
import { SelectCell } from './SelectCell'
import { isInterceptedSpaceFieldId, SpaceFieldIdCell } from './SpaceFieldIdCell'
import { TextCell } from './TextCell'
// import { DurationCell } from './DurationCell' // duration field disabled for now
import { TimestampCell } from './TimestampCell'
import { UrlCell } from './UrlCell'

export function SpaceCell({
  field,
  value,
  onChange,
  readonly,
  nameAsListOpenTarget,
  nameListHoverGroup,
  listInlineEditActive,
  onListInlineTitleEditEnd,
  roster,
  currentUserId,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  fieldRowVariant = 'default',
  spaceItem,
  onItemPatch,
  statusField,
  onPushToAgent,
  allFields,
  openOnMount,
  bulkInlineEditor,
  dateDisplayFormat,
  dateDisplayFormats,
  onOpenDetail,
}: ExtendedCellProps) {
  const resolvedDateDisplayFormat =
    dateDisplayFormats?.[field.id as keyof NonNullable<typeof dateDisplayFormats>] ??
    dateDisplayFormat ??
    (field.id === 'call_date' ? 'date_time' : undefined)

  if (isInterceptedSpaceFieldId(field.id, spaceItem)) {
    return (
      <SpaceFieldIdCell
        field={field}
        value={value}
        onChange={onChange}
        readonly={readonly}
        nameAsListOpenTarget={nameAsListOpenTarget}
        nameListHoverGroup={nameListHoverGroup}
        listInlineEditActive={listInlineEditActive}
        onListInlineTitleEditEnd={onListInlineTitleEditEnd}
        roster={roster}
        currentUserId={currentUserId}
        onEditStatuses={onEditStatuses}
        onEditCategories={onEditCategories}
        onCreateOption={onCreateOption}
        onUpdateOption={onUpdateOption}
        onDeleteOption={onDeleteOption}
        onTagCustomSwatchesChange={onTagCustomSwatchesChange}
        fieldRowVariant={fieldRowVariant}
        spaceItem={spaceItem}
        onItemPatch={onItemPatch}
        statusField={statusField}
        onPushToAgent={onPushToAgent}
        allFields={allFields}
        openOnMount={openOnMount}
        bulkInlineEditor={bulkInlineEditor}
        dateDisplayFormat={dateDisplayFormat}
        dateDisplayFormats={dateDisplayFormats}
        onOpenDetail={onOpenDetail}
      />
    )
  }

  switch (field.type) {
    case 'text':
      return (
        <TextCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          nameAsListOpenTarget={nameAsListOpenTarget}
          nameListHoverGroup={nameListHoverGroup}
          listInlineEditActive={listInlineEditActive}
          onListInlineTitleEditEnd={onListInlineTitleEditEnd}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'number':
      return (
        <NumberCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'select':
      return (
        <SelectCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          onEditStatuses={onEditStatuses}
          onEditCategories={onEditCategories}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'multi_select':
      return (
        <MultiSelectCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'date':
      if (spaceItem && onItemPatch && (field.id === 'due_date' || field.id === 'start_date')) {
        return (
          <DueDateCell
            value={{
              start_date: spaceItem.start_date,
              due_date: spaceItem.due_date,
              recurrence: spaceItem.recurrence,
            }}
            onChange={(patch) => {
              const updates: Partial<SpaceItem> = {}
              if ('due_date' in patch) updates.due_date = patch.due_date ?? null
              if ('start_date' in patch) updates.start_date = patch.start_date ?? null
              if ('recurrence' in patch) updates.recurrence = patch.recurrence ?? null
              onItemPatch(updates)
            }}
            fieldRowVariant={fieldRowVariant}
            statusField={statusField}
            onEditStatuses={onEditStatuses}
            initialActiveField={field.id === 'start_date' ? 'start' : 'due'}
            openOnMount={openOnMount}
            bulkInlineEditor={bulkInlineEditor}
            displayFormat={resolvedDateDisplayFormat}
            triggerField={field.id === 'start_date' ? 'start' : 'due'}
          />
        )
      }
      if (field.id === 'due_date') {
        const dueDateStr = typeof value === 'string' ? value : null
        return (
          <DueDateCell
            value={{ start_date: null, due_date: dueDateStr, recurrence: null }}
            onChange={(patch) => {
              if ('due_date' in patch) onChange(patch.due_date ?? null)
            }}
            fieldRowVariant={fieldRowVariant}
            statusField={statusField}
            onEditStatuses={onEditStatuses}
            openOnMount={openOnMount}
            bulkInlineEditor={bulkInlineEditor}
            displayFormat={resolvedDateDisplayFormat}
            triggerField="due"
          />
        )
      }
      if (field.id === 'start_date') {
        const startStr = typeof value === 'string' ? value : null
        return (
          <DueDateCell
            value={{ start_date: startStr, due_date: null, recurrence: null }}
            initialActiveField="start"
            onChange={(patch) => {
              if ('start_date' in patch) onChange(patch.start_date ?? null)
            }}
            fieldRowVariant={fieldRowVariant}
            statusField={statusField}
            onEditStatuses={onEditStatuses}
            openOnMount={openOnMount}
            bulkInlineEditor={bulkInlineEditor}
            displayFormat={resolvedDateDisplayFormat}
            triggerField="start"
          />
        )
      }
      return (
        <DateCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
          dateDisplayFormat={resolvedDateDisplayFormat ?? 'date'}
        />
      )
    case 'url':
      return (
        <UrlCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'media':
      return (
        <MediaCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'checkbox':
      return (
        <CheckboxCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'currency':
      return (
        <CurrencyCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'email':
      return (
        <EmailCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'phone':
      return (
        <PhoneCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'assignee':
      return (
        <AssigneeCell
          value={
            Array.isArray(value) ? (value as Array<{ type: 'human' | 'agent'; id: string }>) : []
          }
          roster={roster ?? []}
          currentUserId={currentUserId ?? null}
          onChange={(next) => onChange(next)}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'contact':
      return <ContactCell value={value} onChange={onChange} readonly={readonly} />
    case 'rating':
      return (
        <RatingCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'progress':
      return (
        <ProgressCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          fieldRowVariant={fieldRowVariant}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    // case 'duration':
    //   return <DurationCell field={field} value={value} onChange={onChange} readonly={readonly} fieldRowVariant={fieldRowVariant} />
    case 'created_at':
    case 'updated_at':
      return (
        <TimestampCell
          field={field}
          value={value}
          onChange={onChange}
          readonly
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    case 'mission':
      if (!spaceItem || !onPushToAgent) {
        return <span className="text-[var(--color-muted-foreground)]">—</span>
      }
      return (
        <MissionCell
          field={field}
          spaceItem={spaceItem}
          onPushToAgent={onPushToAgent}
          allFields={allFields ?? []}
          roster={roster ?? []}
          fieldRowVariant={fieldRowVariant}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
    default:
      return (
        <TextCell
          field={field}
          value={value}
          onChange={onChange}
          readonly={readonly}
          openOnMount={openOnMount}
          bulkInlineEditor={bulkInlineEditor}
        />
      )
  }
}
