'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw, Search } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import { ReportingTimeRangeSelector } from '../../components/reporting/shared/ReportingTimeRangeSelector'
import { SocialPlatformsToolbarMenu } from '../../components/reporting/shared/SocialPlatformsToolbarMenu'
import { FinancePlusMenu, SpaceCustomizeButton } from '../../components/toolbar'
import type { SpaceToolbarContext } from '../types'

/** Toolbar for reporting views (campaign overview, social, funnel analytics, email, ads, finance). */
export function ReportingToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const {
    activeSpace,
    activeView,
    isAdsPerformanceView,
    isSocialReportingView,
    isFinanceOverviewView,
    reportingToolbarApi,
    openIntegrationsLibrary,
    handleViewPatch,
    financeToolbarSearch,
    setFinanceToolbarSearch,
    financeSearchOpen,
    setFinanceSearchOpen,
    financePlusOpen,
    setFinancePlusOpen,
    financePlusRootRef,
    financeOverviewRef,
    schemaEditorOpen,
    closeCustomizePanel,
    openCustomizeFromToolbar,
  } = ctx

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
        {isSocialReportingView && activeSpace.campaign_id && activeView ? (
          <SocialPlatformsToolbarMenu
            config={activeView.reporting_config ?? {}}
            onPatch={(patch) =>
              void handleViewPatch({
                reporting_config: { ...(activeView.reporting_config ?? {}), ...patch },
              })
            }
          />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        {activeSpace.campaign_id ? (
          <>
            <ReportingTimeRangeSelector
              variant="calendar"
              config={activeView?.reporting_config ?? {}}
              onConfigPatch={(patch) =>
                void handleViewPatch({
                  reporting_config: { ...(activeView?.reporting_config ?? {}), ...patch },
                })
              }
            />
            {isFinanceOverviewView ? (
              <div className="flex items-center">
                <AnimatePresence>
                  {financeSearchOpen && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 200, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <input
                        autoFocus
                        type="text"
                        value={financeToolbarSearch}
                        onChange={(e) => setFinanceToolbarSearch(e.target.value)}
                        onBlur={() => {
                          if (!financeToolbarSearch) setFinanceSearchOpen(false)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setFinanceToolbarSearch('')
                            setFinanceSearchOpen(false)
                          }
                        }}
                        placeholder="Search products, links, coupons…"
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Tooltip label="Search" side="bottom">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => {
                        if (financeSearchOpen && !financeToolbarSearch) setFinanceSearchOpen(false)
                        else setFinanceSearchOpen(true)
                      }}
                      aria-label="Search"
                      className={`rounded-md p-1.5 transition-colors ${
                        financeSearchOpen || financeToolbarSearch
                          ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </div>
            ) : null}
            <Tooltip label="Refresh" side="bottom">
              <span className="inline-flex">
                <button
                  type="button"
                  disabled={!reportingToolbarApi || reportingToolbarApi.refreshing}
                  onClick={() => void Promise.resolve(reportingToolbarApi?.refresh?.())}
                  aria-label="Refresh"
                  className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-40"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${reportingToolbarApi?.refreshing ? 'animate-spin' : ''}`}
                  />
                </button>
              </span>
            </Tooltip>
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            <SpaceCustomizeButton
              schemaEditorOpen={schemaEditorOpen}
              closeCustomizePanel={closeCustomizePanel}
              openCustomizeFromToolbar={openCustomizeFromToolbar}
            />
            {(isAdsPerformanceView && reportingToolbarApi?.metaAdsConnected === false) ||
            isSocialReportingView ? (
              <Tooltip label="Open Integrations library" side="bottom">
                <span className="inline-flex">
                  <button
                    type="button"
                    onClick={openIntegrationsLibrary}
                    className="badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center px-3 py-1.5 font-semibold transition-opacity hover:opacity-90"
                  >
                    Connect
                  </button>
                </span>
              </Tooltip>
            ) : null}
          </>
        ) : (
          <SpaceCustomizeButton
            schemaEditorOpen={schemaEditorOpen}
            closeCustomizePanel={closeCustomizePanel}
            openCustomizeFromToolbar={openCustomizeFromToolbar}
          />
        )}
        {isFinanceOverviewView ? (
          <FinancePlusMenu
            open={financePlusOpen}
            setOpen={setFinancePlusOpen}
            rootRef={financePlusRootRef}
            financeOverviewRef={financeOverviewRef}
          />
        ) : null}
      </div>
    </ToolbarShell>
  )
}
