'use client'

import { Settings2, TableProperties } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'
import { canExportSpaceDoc } from '../../doc-menu/export-space-doc'
import { DocEditorExportDropdown } from './DocEditorExportDropdown'

export function DocEditorInlineRail({
  hasDocProperties,
  showPageSettings,
  showExport,
  exportTitle,
  getDocBody,
  exportVisualHtml,
  exportCampaignId,
  exportCustomData,
  onGoogleDocCreated,
  fieldsSlideOpen,
  pageSettingsOpen,
  setFieldsSlideOpen,
  setPageSettingsOpen,
}: {
  hasDocProperties: boolean
  showPageSettings: boolean
  showExport?: boolean
  exportTitle?: string
  getDocBody?: () => string
  exportVisualHtml?: string | null
  exportCampaignId?: string | null
  exportCustomData?: Record<string, unknown> | null
  onGoogleDocCreated?: (file: GoogleDriveFile) => void | Promise<void>
  fieldsSlideOpen: boolean
  pageSettingsOpen: boolean
  setFieldsSlideOpen: (v: boolean | ((p: boolean) => boolean)) => void
  setPageSettingsOpen: (v: boolean | ((p: boolean) => boolean)) => void
}) {
  const exportAvailable =
    showExport &&
    exportTitle != null &&
    getDocBody != null &&
    canExportSpaceDoc({
      customData: exportCustomData,
      docBody: getDocBody(),
      visualHtml: exportVisualHtml,
    }).canExport

  if (!hasDocProperties && !showPageSettings && !exportAvailable) return null

  const railBtnCls = (active: boolean) =>
    cn(
      'rounded-lg p-1.5 transition-colors',
      active
        ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
    )

  return (
    <div className="pointer-events-none sticky top-1 z-[30] col-start-1 row-start-1 self-start justify-self-end pr-1 pt-1">
      <div className="pointer-events-auto flex flex-col gap-0.5 rounded-2xl border border-[var(--border)] bg-[var(--color-card)] px-0.5 py-1 shadow-lg">
        {exportAvailable && exportTitle && getDocBody ? (
          <Tooltip label="Export" side="left">
            <span className="inline-flex">
              <DocEditorExportDropdown
                title={exportTitle}
                getDocBody={getDocBody}
                visualHtml={exportVisualHtml}
                campaignId={exportCampaignId}
                customData={exportCustomData}
                onGoogleDocCreated={onGoogleDocCreated}
                menuPlacement="left"
                buttonClassName={railBtnCls(false)}
              />
            </span>
          </Tooltip>
        ) : null}
        {hasDocProperties && (
          <Tooltip label="Fields" side="left">
            <button
              type="button"
              onClick={() => {
                setFieldsSlideOpen((o) => !o)
                setPageSettingsOpen(false)
              }}
              className={railBtnCls(fieldsSlideOpen)}
              aria-label="Fields"
              aria-expanded={fieldsSlideOpen}
            >
              <TableProperties className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
        {showPageSettings && (
          <Tooltip label="Page settings" side="left">
            <button
              type="button"
              onClick={() => {
                setPageSettingsOpen((o) => !o)
                setFieldsSlideOpen(false)
              }}
              className={railBtnCls(pageSettingsOpen)}
              aria-label="Page settings"
              aria-expanded={pageSettingsOpen}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
