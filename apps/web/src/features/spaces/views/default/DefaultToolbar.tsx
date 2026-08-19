'use client'

import { Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { AddColumnsButton } from '../_shared/AddColumnsButton'
import { GroupByButton } from '../_shared/GroupByButton'
import { MeetingsCallDateWindowChip } from '../_shared/MeetingsCallDateWindowChip'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { SpaceQuickFilterDock } from '../_shared/SpaceQuickFilterDock'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { SubtasksToolbarMenu } from '../../components/subtasks-toolbar-menu'
import { SpaceCustomizeButton, SubtasksToolbarTrigger } from '../../components/toolbar'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceToolbarContext } from '../types'

/** Toolbar for list / table / kanban (the default item views). */
export function DefaultToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    showGroupByInToolbar,
    showSubtasksToolbar,
    showAddColumnsToolbar,
    subtasksMenuOpen,
    setSubtasksMenuOpen,
    subtasksBtnRef,
    handleViewPatch,
    isMissionsView,
    missionsMc,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
  } = ctx

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        {showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
        {showSubtasksToolbar ? (
          <SubtasksToolbarTrigger
            open={subtasksMenuOpen}
            setOpen={setSubtasksMenuOpen}
            anchorRef={subtasksBtnRef}
          />
        ) : null}
        {showSubtasksToolbar && activeView ? (
          <SubtasksToolbarMenu
            open={subtasksMenuOpen}
            onClose={() => setSubtasksMenuOpen(false)}
            anchorRef={subtasksBtnRef}
            onViewPatch={handleViewPatch}
            activeView={activeView}
            isMissionsView={isMissionsView}
            missionsMc={missionsMc}
          />
        ) : null}
        {showAddColumnsToolbar ? <AddColumnsButton ctx={ctx} /> : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        <div className="flex shrink-0 items-center gap-1">
          <MeetingsCallDateWindowChip view={activeView} onPatch={handleViewPatch} />
          <SpaceQuickFilterDock ctx={ctx} />
          <SpaceCustomizeButton
            schemaEditorOpen={schemaEditorOpen}
            closeCustomizePanel={closeCustomizePanel}
            openCustomizeFromToolbar={openCustomizeFromToolbar}
          />
          <Tooltip label="New task" side="bottom">
            <span className="inline-flex">
              <button
                type="button"
                onClick={() => {
                  useSpacesStore.getState().requestInlineTaskComposerFocus()
                }}
                className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90"
                aria-label="New task"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Task
              </button>
            </span>
          </Tooltip>
        </div>
      </div>
    </ToolbarShell>
  )
}
