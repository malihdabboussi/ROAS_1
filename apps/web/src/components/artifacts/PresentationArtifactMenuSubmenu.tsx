'use client'

import { Check, Copy, Download, Monitor, Palette, Smartphone, Tablet } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import type { PresentationViewportSize } from '@/lib/artifacts'
import type {
  PresentationArtifactMenuActions,
  PresentationArtifactMenuDropdownProps,
  PresentationArtifactMenuSubmenuKind,
} from './presentation-artifact-menu-types'

const SUBMENU_WIDTH = 224

const VIEWPORT_OPTIONS: Array<{
  id: PresentationViewportSize
  label: string
  icon: typeof Monitor
}> = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
]

function campaignIconName(c: { config?: Record<string, unknown> | null }): string {
  const fromConfig = (c.config as Record<string, unknown> | undefined)?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

interface PresentationArtifactMenuSubmenuProps {
  openSubmenu: Exclude<PresentationArtifactMenuSubmenuKind, null>
  subPos: { top: number; left: number }
  actions: PresentationArtifactMenuActions
  presentation: PresentationArtifactMenuDropdownProps['presentation']
  previewOverflow: PresentationArtifactMenuDropdownProps['previewOverflow']
  onClose: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export function PresentationArtifactMenuSubmenu({
  openSubmenu,
  subPos,
  actions,
  presentation,
  previewOverflow,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: PresentationArtifactMenuSubmenuProps) {
  const currentCampaign = actions.campaigns.find((c) => c.id === presentation.campaign_id)
  const otherCampaigns = actions.campaigns.filter((c) => c.id !== presentation.campaign_id)
  const submenuRowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'

  const wrap = (fn: () => void | Promise<void>) => async () => {
    try {
      await fn()
    } finally {
      onClose()
    }
  }

  return (
    <div
      data-presentation-menu
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 gap-spacing-1 fixed flex flex-col overflow-y-auto border shadow-lg"
      style={{
        top: subPos.top,
        left: subPos.left,
        width: SUBMENU_WIDTH,
        maxHeight: `calc(100vh - ${subPos.top + 8}px)`,
      }}
    >
      {openSubmenu === 'viewport' && previewOverflow ? (
        VIEWPORT_OPTIONS.map((opt) => {
          const isActive = opt.id === previewOverflow.viewport
          const Icon = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                previewOverflow.onViewportChange(opt.id)
                onClose()
              }}
              className={submenuRowCls}
            >
              <Icon className="icon-sm shrink-0" />
              <span className="min-w-0 flex-1 truncate">{opt.label}</span>
              {isActive ? <Check className="icon-sm text-success shrink-0" /> : null}
            </button>
          )
        })
      ) : openSubmenu === 'export' && previewOverflow ? (
        <>
          {previewOverflow.fileUrl && previewOverflow.onCopyDownloadLink ? (
            <button
              type="button"
              onClick={wrap(previewOverflow.onCopyDownloadLink)}
              className={submenuRowCls}
            >
              {previewOverflow.copied ? (
                <Check className="icon-sm text-success shrink-0" />
              ) : (
                <Copy className="icon-sm shrink-0" />
              )}
              <span>{previewOverflow.copied ? 'Copied!' : 'Copy download link'}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={wrap(previewOverflow.onDownloadHtml)}
            className={submenuRowCls}
          >
            <Download className="icon-sm shrink-0" />
            <span>Download HTML</span>
          </button>
          <button
            type="button"
            onClick={wrap(previewOverflow.onExportPdf)}
            disabled={previewOverflow.exporting !== null}
            className={submenuRowCls}
          >
            <Download className="icon-sm shrink-0" />
            <span>
              {previewOverflow.exporting === 'pdf' ? 'Exporting PDF...' : 'Export as PDF'}
            </span>
          </button>
          <button
            type="button"
            onClick={wrap(previewOverflow.onOpenCanva)}
            disabled={previewOverflow.openingCanva || previewOverflow.exporting !== null}
            className={submenuRowCls}
          >
            <Palette className="icon-sm shrink-0" />
            <span>{previewOverflow.openingCanva ? 'Opening Canva…' : 'Open in Canva'}</span>
          </button>
          <button
            type="button"
            onClick={wrap(previewOverflow.onExportPpt)}
            disabled={previewOverflow.exporting !== null}
            className={submenuRowCls}
          >
            <Download className="icon-sm shrink-0" />
            <span>
              {previewOverflow.exporting === 'ppt' ? 'Exporting PPT...' : 'Export as PPT'}
            </span>
          </button>
        </>
      ) : (
        <>
          {currentCampaign ? (
            <>
              <button
                type="button"
                disabled
                className="gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground px-spacing-2 py-spacing-1 flex w-full cursor-default items-center text-left opacity-70"
              >
                <LucideIcon name={campaignIconName(currentCampaign)} className="icon-sm shrink-0" />
                <span className="min-w-0 flex-1 truncate">{currentCampaign.name}</span>
                <Check className="icon-sm text-success shrink-0" />
              </button>
              <div className="border-border border-t" />
            </>
          ) : null}
          {otherCampaigns.length === 0 ? (
            <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">
              No other campaigns
            </p>
          ) : (
            otherCampaigns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (openSubmenu === 'move') void actions.moveToCampaign(c.id)
                  else void actions.copyToCampaign(c.id)
                  onClose()
                }}
                className={submenuRowCls}
              >
                <LucideIcon name={campaignIconName(c)} className="icon-sm shrink-0" />
                <span className="min-w-0 truncate">{c.name}</span>
              </button>
            ))
          )}
        </>
      )}
    </div>
  )
}
