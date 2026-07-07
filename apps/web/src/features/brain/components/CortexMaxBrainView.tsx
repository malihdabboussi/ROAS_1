'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type {
  BeliefPattern,
  BrainTimeline,
  CompanyCortexObject,
  CustomerAvatar,
  CustomerBrainView,
  NarrativePage,
  Perspective,
} from '../types'
import { CortexMaxDetailPanel } from './CortexMaxDetailPanel'
import { CortexMaxEmptyShelfMockup } from './CortexMaxEmptyShelfMockup'
import { CortexMaxSectionList } from './CortexMaxSectionList'
import {
  EMPTY_BELIEFS,
  EMPTY_COMPANY_OBJECTS,
  EMPTY_CUSTOMER_AVATARS,
  EMPTY_PERSPECTIVES,
  EMPTY_TIMELINES,
  buildCortexItems,
  filterCortexItems,
  getCortexSectionLabels,
  getCortexSectionOrder,
  groupCortexItems,
  type CortexItem,
  type CortexMaxBrainViewLayout,
  type CortexMaxScopeType,
  type CortexSection,
} from './cortex-max-view-model'

interface CortexMaxBrainViewProps {
  pages: NarrativePage[]
  timelines?: BrainTimeline[]
  beliefs?: BeliefPattern[]
  perspectives?: Perspective[]
  customerAvatars?: CustomerAvatar[]
  customerView?: CustomerBrainView | null
  companyObjects?: CompanyCortexObject[]
  layout?: CortexMaxBrainViewLayout
  /**
   * Drives section labels — `'customer'` swaps to the customer-brain taxonomy
   * (Avatars headline, Customer Beliefs, Avatar Tensions, etc.). Anything else
   * uses the default user-brain labels.
   */
  scopeType?: CortexMaxScopeType
}

export function CortexMaxBrainView({
  pages,
  timelines = EMPTY_TIMELINES,
  beliefs = EMPTY_BELIEFS,
  perspectives = EMPTY_PERSPECTIVES,
  customerAvatars = EMPTY_CUSTOMER_AVATARS,
  customerView = null,
  companyObjects = EMPTY_COMPANY_OBJECTS,
  layout = 'default',
  scopeType = 'user',
}: CortexMaxBrainViewProps) {
  const sectionLabels = getCortexSectionLabels(scopeType)
  const sectionOrder = getCortexSectionOrder(scopeType)
  const [selectedItem, setSelectedItem] = useState<CortexItem | null>(null)
  const [query, setQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<CortexSection, boolean>>(
    () => ({}) as Record<CortexSection, boolean>,
  )
  const [collapsedSections, setCollapsedSections] = useState<Record<CortexSection, boolean>>(
    () => ({}) as Record<CortexSection, boolean>,
  )

  useEffect(() => {
    setSelectedItem(null)
  }, [pages, timelines, beliefs, perspectives, customerAvatars, customerView, companyObjects])

  const toggleSection = (section: CortexSection) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleCategoryCollapsed = (section: CortexSection) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const allItems = useMemo<CortexItem[]>(
    () =>
      buildCortexItems({
        pages,
        timelines,
        beliefs,
        perspectives,
        customerAvatars,
        customerView,
        companyObjects,
        scopeType,
      }),
    [
      pages,
      timelines,
      beliefs,
      perspectives,
      customerAvatars,
      customerView,
      companyObjects,
      scopeType,
    ],
  )

  const filteredItems = useMemo(
    () => filterCortexItems(allItems, layout, query),
    [allItems, layout, query],
  )

  useEffect(() => {
    if (!selectedItem) return
    if (!filteredItems.some((item) => item.id === selectedItem.id)) {
      setSelectedItem(null)
    }
  }, [filteredItems, selectedItem])

  const grouped = useMemo(() => groupCortexItems(filteredItems), [filteredItems])

  const listEmptyMessage =
    layout === 'team2' && allItems.length > 0 && filteredItems.length === 0 ? (
      <p className="body-4 text-muted-foreground p-spacing-4 text-center">
        No matching Cortex items.
      </p>
    ) : null

  const emptyMessage =
    scopeType === 'agent'
      ? 'This agent Cortex is empty. Add knowledge to this brain, then Atlas will organize it here.'
      : scopeType === 'customer'
        ? 'This customer Cortex is empty. Add customer information, then Atlas will organize collective knowledge, avatars, customers, and unlinked signals here.'
        : scopeType === 'company'
          ? 'This Company Cortex is empty. Let the daily dream run, then Atlas will organize company signals here.'
          : 'Atlas hasn’t organized your library yet. Add 10 memories to trigger the first sync.'

  const listBody = (
    <CortexMaxSectionList
      sectionOrder={sectionOrder}
      sectionLabels={sectionLabels}
      grouped={grouped}
      allItemsLength={allItems.length}
      selectedItemId={selectedItem?.id ?? null}
      expandedSections={expandedSections}
      collapsedSections={collapsedSections}
      listEmptyMessage={listEmptyMessage}
      onToggleSection={toggleSection}
      onToggleCategoryCollapsed={toggleCategoryCollapsed}
      onSelectItem={setSelectedItem}
    />
  )

  const detailPanel =
    allItems.length === 0 ? (
      <div className="gap-spacing-6 px-spacing-3 py-spacing-8 flex min-h-40 flex-col items-center justify-center">
        <CortexMaxEmptyShelfMockup />
        <p className="body-3 text-muted-foreground max-w-md text-center">{emptyMessage}</p>
      </div>
    ) : selectedItem ? (
      <CortexMaxDetailPanel item={selectedItem} />
    ) : (
      <div className="flex h-full min-h-40 items-center justify-center">
        <p className="body-2 text-muted-foreground">Select a Cortex item to preview its content</p>
      </div>
    )

  if (layout === 'team2') {
    return (
      <div className="gap-spacing-2 flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className="card-glass relative flex max-h-[min(40vh,260px)] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border-0 md:h-full md:max-h-none md:w-72">
          <div className="border-border flex shrink-0 items-center gap-2 border-b p-3">
            <div className="relative min-w-0 flex-1">
              <Search className="icon-left-center icon-sm pointer-events-none text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cortex…"
                className="input-leading body-4 h-spacing-8 w-full rounded-spacing-2 border border-border bg-background text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">{listBody}</div>
        </div>
        <div className="border-border flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{detailPanel}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="border-border w-[280px] shrink-0 overflow-y-auto border-r p-4">
        {listBody}
      </div>
      <div className="flex-1 overflow-y-auto p-6">{detailPanel}</div>
    </div>
  )
}
