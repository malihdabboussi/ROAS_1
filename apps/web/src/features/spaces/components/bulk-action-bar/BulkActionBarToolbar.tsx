'use client'

import { createPortal } from 'react-dom'
import {
  ArrowRightLeft,
  ChevronRight,
  CopyPlus,
  FolderInput,
  FolderMinus,
  GitMerge,
  ListTodo,
  Loader2,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import type { DelegationDispatchMode } from '../../services/delegation-intake.service'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import { PageGraderBulkSendPanel } from '../PageGraderBulkSendPanel'
import { BTN } from './bulk-action-helpers'
import { BulkActionBarCoreFields } from './BulkActionBarCoreFields'
import { ConvertPanel } from './ConvertPanel'
import { CustomFieldsPanel } from './CustomFieldsPanel'
import { DelegationBulkPanel } from './DelegationBulkPanel'
import { DeletePanel } from './DeletePanel'
import { MergeMeetingsPanel } from './MergeMeetingsPanel'
import { MovePanel } from './MovePanel'
import type { PanelKey } from './panel-key'
import { RemoveFromSpacePanel } from './RemoveFromSpacePanel'

export type BulkActionBarToolbarProps = {
  selectedIds: Set<string>
  items: SpaceItem[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  firstItem: SpaceItem
  selectedItems: SpaceItem[]
  itemKind: 'task' | 'doc'
  itemLabel: 'task' | 'doc'
  busy: boolean
  removingFromSpace: boolean
  removableDocItems: SpaceItem[]
  activePanel: PanelKey | null
  activeSpaceId: string | null
  activeSpaceCampaignId: string | null
  activeSpaceCampaignName: string | null
  statusField?: FieldDef
  tagsField?: FieldDef
  attendeesField?: FieldDef
  customRef: React.RefObject<HTMLButtonElement | null>
  moveRef: React.RefObject<HTMLButtonElement | null>
  convertRef: React.RefObject<HTMLButtonElement | null>
  removeFromSpaceRef: React.RefObject<HTMLButtonElement | null>
  delegationRef: React.RefObject<HTMLButtonElement | null>
  pageGraderRef: React.RefObject<HTMLButtonElement | null>
  mergeRef: React.RefObject<HTMLButtonElement | null>
  deleteRef: React.RefObject<HTMLButtonElement | null>
  canMergeMeetings: boolean
  onClearSelection: () => void
  onUpdateItem: (
    id: string,
    patch: Partial<SpaceItem>,
    options?: { skipSubtaskCompleteConfirm?: boolean },
  ) => Promise<void>
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent?: (itemId: string, options?: MissionSendOptions) => Promise<void>
  setBusy: (v: boolean) => void
  toggle: (key: PanelKey) => void
  closePanel: () => void
  handleMovePick: (spaceId: string) => Promise<void>
  handleConvertToSubtasks: () => Promise<void>
  handlePromoteToTasks: () => Promise<void>
  handleDuplicate: () => Promise<void>
  handleDelegationCapture: (mode: DelegationDispatchMode, note: string) => Promise<void>
  handleMergeMeetings: (survivorItemId: string) => Promise<void>
  handlePageGraderSend: (input: {
    clientId: string
    clientName: string
    taskType: string
    note: string
    dueDate: string
    clientTagId: string
    clientTagLabel: string
    assignee: {
      pageGraderUserId?: string
      email?: string
      name?: string
    } | null
  }) => Promise<void>
  handleDelete: () => Promise<void>
  handleRemoveFromSpace: () => Promise<void>
}

export function BulkActionBarToolbar({
  selectedIds,
  items,
  allFields,
  roster,
  currentUserId,
  firstItem,
  selectedItems,
  itemKind,
  itemLabel,
  busy,
  removingFromSpace,
  removableDocItems,
  activePanel,
  activeSpaceId,
  activeSpaceCampaignId,
  activeSpaceCampaignName,
  statusField,
  tagsField,
  attendeesField,
  customRef,
  moveRef,
  convertRef,
  removeFromSpaceRef,
  delegationRef,
  pageGraderRef,
  mergeRef,
  deleteRef,
  canMergeMeetings,
  onClearSelection,
  onUpdateItem,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onPushToAgent,
  setBusy,
  toggle,
  closePanel,
  handleMovePick,
  handleConvertToSubtasks,
  handlePromoteToTasks,
  handleDuplicate,
  handleDelegationCapture,
  handleMergeMeetings,
  handlePageGraderSend,
  handleDelete,
  handleRemoveFromSpace,
}: BulkActionBarToolbarProps) {
  return createPortal(
    <div className="fixed bottom-6 left-1/2 z-[9000] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 px-2">
      <div
        className={cn(
          'dropdown-menu-solid flex w-max flex-nowrap items-center gap-1 rounded-xl px-4 py-2',
          busy && 'pointer-events-none opacity-70',
        )}
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {selectedIds.size} {itemKind === 'doc' ? 'Doc' : 'Task'}
          {selectedIds.size > 1 ? 's' : ''} selected
          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Clear selection"
            title="Clear selection"
            className="ml-0.5 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <X className="h-3 w-3" />
          </button>
        </span>

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        <BulkActionBarCoreFields
          selectedIds={selectedIds}
          items={items}
          roster={roster}
          currentUserId={currentUserId}
          firstItem={firstItem}
          statusField={statusField}
          tagsField={tagsField}
          onUpdateItem={onUpdateItem}
          onEditStatuses={onEditStatuses}
          onCreateOption={onCreateOption}
          onUpdateOption={onUpdateOption}
          onDeleteOption={onDeleteOption}
          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
          setBusy={setBusy}
        />

        <button
          ref={customRef}
          type="button"
          className={cn(BTN, 'shrink-0')}
          onClick={() => toggle('custom')}
        >
          Custom Fields <ChevronRight className="h-3 w-3" />
        </button>
        {activePanel === 'custom' && firstItem && (
          <CustomFieldsPanel
            anchorRef={customRef}
            allFields={allFields}
            firstItem={firstItem}
            selectedIds={selectedIds}
            items={items}
            onUpdateItem={onUpdateItem}
            onClose={closePanel}
            roster={roster}
            currentUserId={currentUserId}
            onEditStatuses={onEditStatuses}
            onEditCategories={onEditCategories}
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            onPushToAgent={onPushToAgent}
            statusField={statusField}
            setBusy={setBusy}
          />
        )}

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        <button
          ref={moveRef}
          type="button"
          className={cn(BTN, 'shrink-0')}
          onClick={() => toggle('move')}
        >
          <FolderInput className="h-3.5 w-3.5" /> Move
        </button>
        {activePanel === 'move' && (
          <MovePanel
            anchorRef={moveRef}
            activeSpaceId={activeSpaceId ?? ''}
            sourceCampaignId={activeSpaceCampaignId}
            onPick={handleMovePick}
            onClose={closePanel}
          />
        )}

        {itemKind === 'doc' ? (
          <>
            <button
              ref={removeFromSpaceRef}
              type="button"
              className={cn(
                BTN,
                'shrink-0',
                (removableDocItems.length === 0 || removingFromSpace) &&
                  'cursor-not-allowed opacity-50',
              )}
              disabled={removableDocItems.length === 0 || removingFromSpace}
              onClick={() => toggle('removeFromSpace')}
            >
              {removingFromSpace ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderMinus className="h-3.5 w-3.5" />
              )}{' '}
              {removingFromSpace ? 'Removing' : 'Remove from space'}
            </button>
            {activePanel === 'removeFromSpace' && (
              <RemoveFromSpacePanel
                anchorRef={removeFromSpaceRef}
                count={removableDocItems.length}
                onConfirm={handleRemoveFromSpace}
                onClose={closePanel}
              />
            )}
          </>
        ) : (
          <>
            <button
              ref={convertRef}
              type="button"
              className={cn(BTN, 'shrink-0')}
              onClick={() => toggle('convert')}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Convert
            </button>
            {activePanel === 'convert' && (
              <ConvertPanel
                anchorRef={convertRef}
                selectedItems={selectedItems}
                onConvertToSubtasks={handleConvertToSubtasks}
                onPromoteToTasks={handlePromoteToTasks}
                onClose={closePanel}
              />
            )}
          </>
        )}

        <button type="button" className={cn(BTN, 'shrink-0')} onClick={handleDuplicate}>
          <CopyPlus className="h-3.5 w-3.5" /> Duplicate
        </button>

        {canMergeMeetings && (
          <>
            <button
              ref={mergeRef}
              type="button"
              className={cn(BTN, 'shrink-0')}
              onClick={() => toggle('merge')}
            >
              <GitMerge className="h-3.5 w-3.5" /> Merge
            </button>
            {activePanel === 'merge' && (
              <MergeMeetingsPanel
                anchorRef={mergeRef}
                selectedItems={selectedItems}
                busy={busy}
                onMerge={handleMergeMeetings}
                onClose={closePanel}
              />
            )}
          </>
        )}

        {itemKind !== 'doc' && (
          <>
            <button
              ref={delegationRef}
              type="button"
              className={cn(BTN, 'shrink-0')}
              onClick={() => toggle('delegation')}
            >
              <ListTodo className="h-3.5 w-3.5" /> Delegate
            </button>
            {activePanel === 'delegation' && (
              <DelegationBulkPanel
                anchorRef={delegationRef}
                selectedCount={selectedIds.size}
                busy={busy}
                onDelegate={handleDelegationCapture}
                onClose={closePanel}
              />
            )}
            <button
              ref={pageGraderRef}
              type="button"
              className={cn(BTN, 'shrink-0')}
              onClick={() => toggle('pageGrader')}
            >
              <Send className="h-3.5 w-3.5" /> The ROAS Portal
            </button>
            {activePanel === 'pageGrader' && (
              <PageGraderBulkSendPanel
                anchorRef={pageGraderRef}
                selectedCount={selectedIds.size}
                selectedItems={selectedItems}
                roster={roster}
                spaceId={activeSpaceId}
                campaignId={activeSpaceCampaignId}
                campaignName={activeSpaceCampaignName}
                tagsField={tagsField}
                attendeesField={attendeesField}
                onCreateOption={onCreateOption}
                onClose={closePanel}
                onSend={handlePageGraderSend}
              />
            )}
          </>
        )}

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        <button
          ref={deleteRef}
          type="button"
          className="text-destructive hover:bg-destructive/10 flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors"
          onClick={() => toggle('delete')}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        {activePanel === 'delete' && (
          <DeletePanel
            anchorRef={deleteRef}
            count={selectedIds.size}
            itemLabel={itemLabel}
            onConfirm={handleDelete}
            onClose={closePanel}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
