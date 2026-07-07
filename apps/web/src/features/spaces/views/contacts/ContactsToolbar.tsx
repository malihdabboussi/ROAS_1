'use client'

import { Columns3 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { GroupByButton } from '../_shared/GroupByButton'
import { ToolbarShell } from '../_shared/ToolbarShell'
import type { SpaceToolbarContext } from '../types'
import { ContactsDetailToolbarSection } from './ContactsDetailToolbarSection'
import { ContactsToolbarActions } from './ContactsToolbarActions'

/** Toolbar for contacts view. Has detail-mode swap (replaces left side). */
export function ContactsToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    contactDetailOpen,
    showAddColumnsToolbar,
    showGroupByInToolbar,
    openCustomizeFromToolbar,
  } = ctx

  return (
    <ToolbarShell ctx={ctx} contactsDetailLayout={contactDetailOpen}>
      {contactDetailOpen ? (
        <ContactsDetailToolbarSection {...ctx} />
      ) : (
        <div className="flex min-w-0 flex-nowrap items-center gap-1">
          {showGroupByInToolbar ? <GroupByButton ctx={ctx} /> : null}
          {showAddColumnsToolbar ? (
            <Tooltip label="Add columns" side="bottom">
              <span className="inline-flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => openCustomizeFromToolbar('fields')}
                  className="hover:bg-hover-subtle hover:text-foreground inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-spacing-2 text-muted-foreground transition-colors"
                >
                  <Columns3 className="icon-sm" />
                </button>
              </span>
            </Tooltip>
          ) : null}
        </div>
      )}

      <ContactsToolbarActions ctx={ctx} />
    </ToolbarShell>
  )
}
