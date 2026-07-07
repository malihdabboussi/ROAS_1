'use client'

import { SaveViewDropdown } from '../../components/SaveViewDropdown'
import type { SpaceToolbarContext } from '../types'

/** Save-view dropdown + separator. Rendered at the start of the right side of every toolbar. */
export function SaveViewSlot({ ctx }: { ctx: SpaceToolbarContext }) {
  return (
    <>
      <SaveViewDropdown
        visible={ctx.hasDraft}
        onSaveView={ctx.handleSaveViewDraft}
        onEnableAutosave={ctx.handleEnableAutosaveAndFlush}
        onSaveAsNewView={ctx.handleSaveAsNewView}
        onRevertChanges={ctx.handleRevertViewDraft}
      />
      {ctx.hasDraft ? (
        <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
      ) : null}
    </>
  )
}
