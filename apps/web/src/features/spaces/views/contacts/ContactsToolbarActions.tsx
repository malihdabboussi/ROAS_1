'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, PieChart, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { ContactsAddMenu, SpaceCustomizeButton } from '../../components/toolbar'
import type { CrmSort } from '../../services/contacts-view.service'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import type { SpaceToolbarContext } from '../types'

const CONTACT_SORT_OPTIONS: { id: CrmSort; label: string }[] = [
  { id: 'created_at.desc', label: 'Newest first' },
  { id: 'created_at.asc', label: 'Oldest first' },
  { id: 'email.asc', label: 'Email A → Z' },
  { id: 'email.desc', label: 'Email Z → A' },
  { id: 'name.asc', label: 'Name A → Z' },
  { id: 'name.desc', label: 'Name Z → A' },
]

export function ContactsToolbarActions({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeView,
    activeSpace,
    contactDetailOpen,
    contactsSearch,
    setContactsSearch,
    contactsSearchOpen,
    setContactsSearchOpen,
    contactsSort,
    setContactsSort,
    contactsSortOpen,
    setContactsSortOpen,
    contactsLoading,
    contactsViewRef,
    activeContactsSegmentName,
    setActiveContactsSegmentId,
    setActiveContactsSegmentName,
    contactsSegmentPanelOpen,
    setContactsSegmentPanelOpen,
    docsIsTreeLayout,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
    contactsAddOpen,
    setContactsAddOpen,
    contactsAddRootRef,
    setContactsManualOpen,
    setContactsCsvOpen,
    setContactsGhlOpen,
    setContactsAcOpen,
    handleViewPatch,
  } = ctx

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      <SaveViewSlot ctx={ctx} />
      <AnimatePresence mode="popLayout" initial={false}>
        {!contactDetailOpen ? (
          <motion.div
            key="contacts-space-toolbar-dock"
            className="flex shrink-0 items-center justify-end gap-1 overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex min-h-7 shrink-0 flex-wrap items-center gap-0.5">
              <div className="flex h-spacing-7 items-center">
                <AnimatePresence>
                  {contactsSearchOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 180, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="flex h-spacing-7 items-center overflow-hidden"
                    >
                      <input
                        autoFocus
                        type="text"
                        value={contactsSearch}
                        onChange={(e) => setContactsSearch(e.target.value)}
                        onBlur={() => {
                          if (!contactsSearch) setContactsSearchOpen(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setContactsSearch('')
                            setContactsSearchOpen(false)
                          }
                        }}
                        placeholder="Search..."
                        className="body-4 h-spacing-7 w-full rounded-spacing-2 border border-border bg-background px-2.5 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Tooltip
                  label="Search contacts"
                  side="bottom"
                  triggerClassName="flex h-7 items-center"
                >
                  <span className="inline-flex h-spacing-7 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (contactsSearchOpen && !contactsSearch) setContactsSearchOpen(false)
                        else setContactsSearchOpen(true)
                      }}
                      className={`inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-spacing-2 transition-colors ${
                        contactsSearchOpen || contactsSearch
                          ? 'bg-hover-subtle text-foreground'
                          : 'hover:bg-hover-subtle hover:text-foreground text-muted-foreground'
                      }`}
                    >
                      <Search className="icon-sm" />
                    </button>
                  </span>
                </Tooltip>
              </div>

              <div className="relative flex h-spacing-7 items-center">
                <Tooltip label="Sort" side="bottom" triggerClassName="flex h-7 items-center">
                  <span className="inline-flex h-spacing-7 items-center">
                    <button
                      type="button"
                      onClick={() => setContactsSortOpen((open) => !open)}
                      className="hover:bg-hover-subtle hover:text-foreground inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-spacing-2 text-muted-foreground transition-colors"
                    >
                      <SlidersHorizontal className="icon-sm" />
                    </button>
                  </span>
                </Tooltip>
                {contactsSortOpen && (
                  <div className="dropdown-menu-solid z-dropdown absolute right-0 top-full mt-1 w-44 rounded-xl py-1">
                    {CONTACT_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setContactsSort(option.id)
                          setContactsSortOpen(false)
                          const [sortBy, sortDir] = option.id.split('.') as [
                            'created_at' | 'name' | 'email',
                            'asc' | 'desc',
                          ]
                          void handleViewPatch({
                            contacts_config: {
                              ...(activeView?.contacts_config ?? {}),
                              sort_by: sortBy,
                              sort_dir: sortDir,
                            },
                          })
                        }}
                        className={`body-4 hover:bg-hover-subtle flex w-full items-center justify-between px-3 py-1.5 transition-colors ${
                          contactsSort === option.id
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <span>{option.label}</span>
                        {contactsSort === option.id ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Tooltip label="Refresh" side="bottom" triggerClassName="flex h-7 items-center">
                <span className="inline-flex h-spacing-7 items-center">
                  <button
                    type="button"
                    onClick={() => contactsViewRef.current?.refresh()}
                    disabled={contactsLoading}
                    className="hover:bg-hover-subtle hover:text-foreground inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-spacing-2 text-muted-foreground transition-colors"
                  >
                    <RefreshCw className={`icon-sm ${contactsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </span>
              </Tooltip>

              {activeContactsSegmentName ? (
                <Tooltip
                  label="Clear segment filter"
                  side="bottom"
                  triggerClassName="flex h-7 items-center"
                >
                  <span className="inline-flex h-spacing-7 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveContactsSegmentId(null)
                        setActiveContactsSegmentName(null)
                      }}
                      className="badge-glass badge-glass-blue body-4 rounded-spacing-2 group inline-flex max-w-[200px] shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1 font-medium transition-opacity hover:opacity-90"
                    >
                      <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        <PieChart className="icon-sm transition-opacity group-hover:opacity-0" />
                        <X className="icon-sm absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                      <span className="min-w-0 truncate">{activeContactsSegmentName}</span>
                    </button>
                  </span>
                </Tooltip>
              ) : null}

              <Tooltip label="Segments" side="bottom" triggerClassName="flex h-7 items-center">
                <span className="inline-flex h-spacing-7 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setContactsSegmentPanelOpen(true)
                      setContactsSortOpen(false)
                    }}
                    className={`inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-spacing-2 transition-colors ${
                      contactsSegmentPanelOpen
                        ? 'bg-hover-subtle text-foreground'
                        : 'hover:bg-hover-subtle hover:text-foreground text-muted-foreground'
                    }`}
                    aria-label="Segments"
                  >
                    <PieChart className="icon-sm" />
                  </button>
                </span>
              </Tooltip>
            </div>

            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            {!docsIsTreeLayout ? (
              <SpaceCustomizeButton
                schemaEditorOpen={schemaEditorOpen}
                closeCustomizePanel={closeCustomizePanel}
                openCustomizeFromToolbar={openCustomizeFromToolbar}
              />
            ) : null}
            {activeSpace?.campaign_id ? (
              <ContactsAddMenu
                open={contactsAddOpen}
                setOpen={(open) => {
                  setContactsAddOpen(open)
                  if (open) setContactsSortOpen(false)
                }}
                rootRef={contactsAddRootRef}
                onAddManually={() => setContactsManualOpen(true)}
                onImportCsv={() => setContactsCsvOpen(true)}
                onImportGhl={() => setContactsGhlOpen(true)}
                onImportAc={() => setContactsAcOpen(true)}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
