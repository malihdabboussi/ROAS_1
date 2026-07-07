'use client'

import type { ReactNode } from 'react'
import { AlertCircle, Layout } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { FunnelFullModeShell } from '@/features/studio/components/preview/FunnelFullModeShell'
import { FunnelHtmlPreview } from '@/features/studio/components/preview/FunnelHtmlPreview'
import { SandpackPreview } from '@/features/studio/components/preview/SandpackPreview'
import type { ArtifactPreviewPaneProps } from './artifact-preview-pane.types'

type FunnelHistoryDirection = 'undo' | 'redo'

interface ArtifactPreviewFunnelContentProps {
  selectedResource: ArtifactPreviewPaneProps['selectedResource']
  selectedFunnel: ArtifactPreviewPaneProps['selectedFunnel']
  pageContent: ArtifactPreviewPaneProps['pageContent']
  pageLoading: boolean
  pageError: string | null
  themePreviewCss: string
  funnelViewport: ArtifactPreviewPaneProps['funnelViewport']
  setFunnelViewport: ArtifactPreviewPaneProps['setFunnelViewport']
  funnelPages: ArtifactPreviewPaneProps['funnelPages']
  currentPageId: ArtifactPreviewPaneProps['currentPageId']
  onFunnelPageChange: ArtifactPreviewPaneProps['onFunnelPageChange']
  onOpenWebsiteSettings: () => void
  onFunnelHistoryRequest: (direction: FunnelHistoryDirection) => void
  funnelHtmlBundleFullMode: boolean
  spacesDeepBackButton: ReactNode
  slideOverTrailingWithDeepExtras: ReactNode
}

export function shouldRenderArtifactPreviewFunnelContent({
  selectedResource,
  selectedFunnel,
  pageContent,
  pageLoading,
  pageError,
  funnelHtmlBundleFullMode,
}: Pick<
  ArtifactPreviewFunnelContentProps,
  | 'selectedResource'
  | 'selectedFunnel'
  | 'pageContent'
  | 'pageLoading'
  | 'pageError'
  | 'funnelHtmlBundleFullMode'
>): boolean {
  return Boolean(
    (funnelHtmlBundleFullMode && selectedFunnel) ||
      pageError ||
      pageLoading ||
      pageContent ||
      (selectedResource?.type === 'funnel' && selectedFunnel?.funnelType === 'website'),
  )
}

export function ArtifactPreviewFunnelContent({
  selectedResource,
  selectedFunnel,
  pageContent,
  pageLoading,
  pageError,
  themePreviewCss,
  funnelViewport,
  setFunnelViewport,
  funnelPages,
  currentPageId,
  onFunnelPageChange,
  onOpenWebsiteSettings,
  onFunnelHistoryRequest,
  funnelHtmlBundleFullMode,
  spacesDeepBackButton,
  slideOverTrailingWithDeepExtras,
}: ArtifactPreviewFunnelContentProps) {
  if (funnelHtmlBundleFullMode && selectedFunnel) {
    return (
      <FunnelFullModeShell
        funnelId={selectedFunnel.id}
        name={selectedFunnel.name}
        themeId={selectedFunnel.themeId ?? null}
        funnelMetadata={selectedFunnel.metadata ?? null}
        bundle={pageContent?.bundle ?? null}
        pages={funnelPages ?? []}
        activePageId={currentPageId ?? null}
        onPageChange={(pageId) => onFunnelPageChange?.(pageId)}
        renderPreview={({ mode, onElementSelect, onDrawingEvent }) => {
          const bundle = pageContent?.bundle
          if (!bundle) {
            return (
              <div className="flex h-full items-center justify-center">
                <VibeyLoadingOrb size="sm" text="Loading preview..." />
              </div>
            )
          }
          const pageSwitching = bundle.page.id !== (currentPageId ?? bundle.page.id)
          return (
            <div className="relative h-full w-full">
              <FunnelHtmlPreview
                bundle={bundle}
                title={pageContent.name}
                viewport={funnelViewport}
                themePreviewCss={themePreviewCss}
                editMode={mode}
                onElementSelect={onElementSelect}
                onDrawingEvent={onDrawingEvent}
                onNavigateRequest={(target) => {
                  const pages = funnelPages ?? []
                  const byPath = pages.find(
                    (page) => (page as { path?: string | null }).path === target,
                  )
                  const byIndex = /^\d+$/.test(target)
                    ? pages[Number.parseInt(target, 10)]
                    : undefined
                  const next = byPath ?? byIndex
                  if (next && onFunnelPageChange) onFunnelPageChange(next.id)
                }}
                onHistoryRequest={(direction) => onFunnelHistoryRequest(direction)}
              />
              {pageSwitching ? (
                <div className="bg-background/60 absolute inset-0 flex items-center justify-center">
                  <VibeyLoadingOrb size="sm" text="Loading page..." />
                </div>
              ) : null}
            </div>
          )
        }}
      />
    )
  }

  if (pageError) {
    return (
      <div className="gap-spacing-2 flex h-full flex-col items-center justify-center">
        <AlertCircle className="icon-lg text-muted-foreground/40" />
        <p className="body-3 text-muted-foreground">{pageError}</p>
      </div>
    )
  }

  if (pageLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading preview..." />
      </div>
    )
  }

  if (pageContent?.bundle) {
    return (
      <FunnelHtmlPreview
        bundle={pageContent.bundle}
        title={pageContent.name}
        viewport={funnelViewport}
        themePreviewCss={themePreviewCss}
        onNavigateRequest={(target) => {
          const pages = funnelPages ?? []
          const byPath = pages.find((page) => (page as { path?: string | null }).path === target)
          const byIndex = /^\d+$/.test(target) ? pages[Number.parseInt(target, 10)] : undefined
          const next = byPath ?? byIndex
          if (next && onFunnelPageChange) onFunnelPageChange(next.id)
        }}
        onHistoryRequest={(direction) => onFunnelHistoryRequest(direction)}
      />
    )
  }

  if (pageContent) {
    return (
      <SandpackPreview
        code={pageContent.code}
        css={[themePreviewCss, pageContent.css].filter(Boolean).join('\n')}
        fileName={pageContent.name}
        contract={pageContent.contract}
        hideDownload
        viewport={funnelViewport}
        onViewportChange={setFunnelViewport}
      />
    )
  }

  if (selectedResource?.type === 'funnel' && selectedFunnel?.funnelType === 'website') {
    return (
      <>
        {spacesDeepBackButton || slideOverTrailingWithDeepExtras ? (
          <div className="border-border px-spacing-2 py-spacing-2 gap-spacing-2 flex shrink-0 items-center justify-between border-b">
            <div className="flex min-w-0 items-center">{spacesDeepBackButton}</div>
            <div className="gap-spacing-1 flex shrink-0 items-center">
              {slideOverTrailingWithDeepExtras}
            </div>
          </div>
        ) : null}
        <div className="gap-spacing-3 px-spacing-6 flex h-full flex-col items-center justify-center text-center">
          <Layout className="icon-lg text-muted-foreground/40" />
          <p className="body-2 text-muted-foreground">
            Select a page to preview, or configure this website in{' '}
            <button
              type="button"
              onClick={onOpenWebsiteSettings}
              className="text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors"
            >
              Settings
            </button>
          </p>
        </div>
      </>
    )
  }

  return null
}
