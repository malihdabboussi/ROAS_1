'use client'

import { Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { AddColumnsButton } from '../_shared/AddColumnsButton'
import { GroupByButton } from '../_shared/GroupByButton'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { SpaceQuickFilterDock } from '../_shared/SpaceQuickFilterDock'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { SubtasksToolbarMenu } from '../../components/subtasks-toolbar-menu'
import { SpaceCustomizeButton, SubtasksToolbarTrigger } from '../../components/toolbar'
import type { SpaceToolbarContext } from '../types'

/** Toolbar for missions view (campaign-scoped). */
export function MissionsToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeSpace,
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
    missionsViewRef,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
  } = ctx

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
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
          <SpaceQuickFilterDock ctx={ctx} />
          <SpaceCustomizeButton
            schemaEditorOpen={schemaEditorOpen}
            closeCustomizePanel={closeCustomizePanel}
            openCustomizeFromToolbar={openCustomizeFromToolbar}
          />
          <Tooltip
            label={activeSpace.campaign_id ? 'New mission' : 'Missions require a campaign'}
            side="bottom"
          >
            <span className="inline-flex">
              <button
                type="button"
                disabled={!activeSpace.campaign_id}
                onClick={() => {
                  if (!activeSpace.campaign_id) return
                  missionsViewRef.current?.openNewMissionCapture()
                }}
                className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                aria-label="New mission"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Mission
              </button>
            </span>
          </Tooltip>
        </div>
      </div>
    </ToolbarShell>
  )
}
