'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ChevronLeft, Fullscreen, MoreVertical, X } from 'lucide-react'

interface ArtifactPreviewChromeFunnel {
  id: string
  name: string
  status: string
  slug: string
  publishedUrl: string | null
  campaignId?: string | null
}

export interface ArtifactPreviewFunnelMenuProps {
  funnel: {
    id: string
    name: string
    status: string
    slug: string
    published_url: string | null
    campaign_id?: string | null
  }
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onOpenFullView?: () => void
}

interface UseArtifactPreviewChromeProps {
  selectedFunnel: ArtifactPreviewChromeFunnel | null
  slideOverOnClose?: () => void
  slideOverShowCloseButton: boolean
  slideOverOnOpenFullView?: () => void
  spacesDeepWorkBack?: () => void
  spacesDeepWorkToolbarExtras?: ReactNode
  renderFunnelMenu?: (props: ArtifactPreviewFunnelMenuProps) => ReactNode
}

export function useArtifactPreviewChrome({
  selectedFunnel,
  slideOverOnClose,
  slideOverShowCloseButton,
  slideOverOnOpenFullView,
  spacesDeepWorkBack,
  spacesDeepWorkToolbarExtras,
  renderFunnelMenu,
}: UseArtifactPreviewChromeProps) {
  const funnelKebabRef = useRef<HTMLButtonElement>(null)
  const [funnelMenuOpen, setFunnelMenuOpen] = useState(false)

  useEffect(() => {
    setFunnelMenuOpen(false)
  }, [selectedFunnel?.id])

  const spacesArtifactFullscreenBtn = useMemo(() => {
    if (!slideOverOnOpenFullView) return null
    return (
      <button
        type="button"
        onClick={slideOverOnOpenFullView}
        className="rounded-spacing-2 border border-border p-spacing-1 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
        aria-label="Open full view"
      >
        <Fullscreen className="icon-sm" />
      </button>
    )
  }, [slideOverOnOpenFullView])

  const spacesFunnelOptionsButton = useMemo(() => {
    if (!renderFunnelMenu) return null
    if (!slideOverOnClose && !slideOverOnOpenFullView && !spacesDeepWorkBack) return null
    if (!selectedFunnel) return null
    return (
      <button
        ref={funnelKebabRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setFunnelMenuOpen((open) => !open)
        }}
        className="rounded-spacing-2 border border-border p-spacing-1 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
        aria-label="Funnel options"
        aria-expanded={funnelMenuOpen}
        aria-haspopup="menu"
      >
        <MoreVertical className="icon-sm" />
      </button>
    )
  }, [
    renderFunnelMenu,
    slideOverOnClose,
    slideOverOnOpenFullView,
    spacesDeepWorkBack,
    selectedFunnel,
    funnelMenuOpen,
  ])

  const spacesFunnelMenu =
    funnelMenuOpen && selectedFunnel && renderFunnelMenu
      ? renderFunnelMenu({
          funnel: {
            id: selectedFunnel.id,
            name: selectedFunnel.name,
            status: selectedFunnel.status,
            slug: selectedFunnel.slug,
            published_url: selectedFunnel.publishedUrl,
            campaign_id: selectedFunnel.campaignId,
          },
          anchorRef: funnelKebabRef,
          onClose: () => setFunnelMenuOpen(false),
          onOpenFullView: slideOverOnOpenFullView
            ? () => {
                setFunnelMenuOpen(false)
                slideOverOnOpenFullView()
              }
            : undefined,
        })
      : null

  const spacesArtifactCloseButton = useMemo(() => {
    if (!slideOverShowCloseButton || !slideOverOnClose) return null
    return (
      <button
        type="button"
        onClick={slideOverOnClose}
        className="rounded-spacing-2 border border-border p-spacing-1 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
        aria-label="Close preview"
      >
        <X className="icon-sm" />
      </button>
    )
  }, [slideOverShowCloseButton, slideOverOnClose])

  const funnelTrailingChrome = useMemo(() => {
    if (!spacesArtifactCloseButton && !spacesDeepWorkToolbarExtras) return null
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        {spacesArtifactCloseButton}
        {spacesDeepWorkToolbarExtras}
      </div>
    )
  }, [spacesArtifactCloseButton, spacesDeepWorkToolbarExtras])

  const slideOverTrailingWithDeepExtras = useMemo(() => {
    const hasLead = Boolean(spacesArtifactCloseButton || spacesDeepWorkToolbarExtras)
    const hasFull = Boolean(spacesArtifactFullscreenBtn)
    if (!hasLead && !hasFull) return null
    return (
      <>
        {hasLead ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {spacesArtifactCloseButton}
            {spacesDeepWorkToolbarExtras}
          </div>
        ) : null}
        {hasFull ? (
          <>
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            {spacesArtifactFullscreenBtn}
          </>
        ) : null}
      </>
    )
  }, [spacesArtifactFullscreenBtn, spacesArtifactCloseButton, spacesDeepWorkToolbarExtras])

  const slideOverCloseChrome = useMemo(() => {
    const hasLead = Boolean(spacesArtifactCloseButton || spacesDeepWorkToolbarExtras)
    if (!hasLead) return null
    return (
      <div className="flex shrink-0 items-center gap-0.5">
        {spacesArtifactCloseButton}
        {spacesDeepWorkToolbarExtras}
      </div>
    )
  }, [spacesArtifactCloseButton, spacesDeepWorkToolbarExtras])

  const spacesDeepBackButton = useMemo(() => {
    if (!spacesDeepWorkBack) return null
    return (
      <button
        type="button"
        onClick={spacesDeepWorkBack}
        className="body-4 h-spacing-7 gap-spacing-1 rounded-spacing-2 px-spacing-2 inline-flex shrink-0 items-center font-medium text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground"
      >
        <ChevronLeft className="icon-sm" />
        Back
      </button>
    )
  }, [spacesDeepWorkBack])

  return {
    funnelTrailingChrome,
    slideOverCloseChrome,
    slideOverTrailingWithDeepExtras,
    spacesArtifactFullscreenBtn,
    spacesDeepBackButton,
    spacesFunnelMenu,
    spacesFunnelOptionsButton,
  }
}
