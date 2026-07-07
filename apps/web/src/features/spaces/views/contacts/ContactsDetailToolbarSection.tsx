'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Columns3 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { Tooltip } from '@/components/ui/tooltip'
import { CONTACT_DETAIL_RESIZE_HANDLE_PX } from '../../components/contacts/ContactsView'
import type { SpaceToolbarContext } from '../types'

type ContactsDetailToolbarSectionProps = Pick<
  SpaceToolbarContext,
  | 'contactsDetailToolbarLeftRef'
  | 'contactsViewRef'
  | 'showAddColumnsToolbar'
  | 'openCustomizeFromToolbar'
  | 'contactCommsLoaded'
  | 'contactDetailColumnLayout'
  | 'contactsDetailToolbarLeftPx'
  | 'contactCommunicationTab'
  | 'setContactCommunicationTab'
>

function ContactsCommunicationTabs({
  value,
  onValueChange,
}: {
  value: SpaceToolbarContext['contactCommunicationTab']
  onValueChange: SpaceToolbarContext['setContactCommunicationTab']
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue === 'all' || nextValue === 'emails' || nextValue === 'agent') {
          onValueChange(nextValue)
        }
      }}
      className="flex w-fit max-w-full shrink-0 flex-col gap-0"
    >
      <TabsList variant="liquid" className="h-spacing-7 w-fit">
        <TabsTrigger value="all" className="body-3 px-spacing-2 shrink-0">
          All
        </TabsTrigger>
        <TabsTrigger value="emails" className="body-3 px-spacing-2 shrink-0">
          Emails
        </TabsTrigger>
        <TabsTrigger value="agent" className="body-3 px-spacing-2 shrink-0">
          Agent Chats
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function ContactsDetailToolbarSection({
  contactsDetailToolbarLeftRef,
  contactsViewRef,
  showAddColumnsToolbar,
  openCustomizeFromToolbar,
  contactCommsLoaded,
  contactDetailColumnLayout,
  contactsDetailToolbarLeftPx,
  contactCommunicationTab,
  setContactCommunicationTab,
}: ContactsDetailToolbarSectionProps) {
  const communicationTabs = (
    <ContactsCommunicationTabs
      value={contactCommunicationTab}
      onValueChange={setContactCommunicationTab}
    />
  )

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div ref={contactsDetailToolbarLeftRef} className="flex shrink-0 items-center gap-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key="contacts-back"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={() => contactsViewRef.current?.back()}
              className="body-4 hover:bg-hover-subtle hover:text-foreground inline-flex h-spacing-7 items-center gap-1 rounded-spacing-2 px-spacing-2 font-medium text-muted-foreground transition-colors"
            >
              <ChevronLeft className="icon-sm" />
              Back
            </button>
          </motion.div>
        </AnimatePresence>
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
      {contactCommsLoaded ? (
        contactDetailColumnLayout &&
        contactDetailColumnLayout.commsWidthPx > 0 &&
        contactsDetailToolbarLeftPx > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex min-w-0 shrink-0 justify-center overflow-hidden"
            style={{
              width: contactDetailColumnLayout.commsWidthPx,
              marginLeft: Math.max(
                0,
                contactDetailColumnLayout.infoWidthPx +
                  CONTACT_DETAIL_RESIZE_HANDLE_PX -
                  contactsDetailToolbarLeftPx -
                  8,
              ),
            }}
          >
            {communicationTabs}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex min-w-0 flex-1 justify-center"
          >
            {communicationTabs}
          </motion.div>
        )
      ) : null}
    </div>
  )
}
