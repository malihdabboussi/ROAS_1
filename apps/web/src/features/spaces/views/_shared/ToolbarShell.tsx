'use client'

import type { ReactNode } from 'react'
import { GroupByToolbarPopover } from '../../components/group-by-toolbar-popover'
import type { SpaceToolbarContext } from '../types'

/**
 * Shared outer wrapper for every per-view toolbar:
 *   - the flex row container with consistent padding rules
 *   - the GroupByToolbarPopover anchored to ctx.groupByBtnRef
 *
 * Children render the row's left + right contents.
 */
export function ToolbarShell({
  ctx,
  contactsDetailLayout,
  artifactDetailLayout,
  channelsLayout,
  children,
}: {
  ctx: SpaceToolbarContext
  /** True only for contacts view in detail mode (uses tighter padding). */
  contactsDetailLayout?: boolean
  /** True for artifact deep-work view (same padding as contact detail). */
  artifactDetailLayout?: boolean
  /** Tighter bottom padding before the channels content border. */
  channelsLayout?: boolean
  children: ReactNode
}) {
  return (
    <>
      <div
        className={`flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 ${
          contactsDetailLayout || artifactDetailLayout
            ? 'pb-spacing-1 px-spacing-2 pt-2'
            : channelsLayout
              ? 'pb-spacing-1 px-4 pt-2'
              : 'px-4 py-2'
        }`}
      >
        {children}
      </div>
      {ctx.activeView && ctx.showGroupByInToolbar && !ctx.docsDriveBrowseActive ? (
        <GroupByToolbarPopover
          open={ctx.groupByOpen}
          onClose={() => ctx.setGroupByOpen(false)}
          anchorRef={ctx.groupByBtnRef}
          onViewPatch={ctx.handleViewPatch}
          activeView={ctx.activeView}
          variant={
            ctx.isAllArtifactsView
              ? 'all_artifacts'
              : ctx.isMediaView
                ? 'media'
                : ctx.isSocialResearchView
                  ? 'ig'
                  : ctx.isMissionsView
                    ? 'missions'
                    : ctx.isContactsView
                      ? 'contacts'
                      : 'space'
          }
          socialPlatform={ctx.socialPlatform ?? 'instagram'}
          groupableFields={ctx.groupableFields}
        />
      ) : null}
    </>
  )
}
