'use client'

/**
 * Illustrated empty states for the work summary.
 *
 * Each is a small layered scene rather than a single glyph — overlapping
 * cards at slight angles, so an empty section reads as a considered "nothing
 * here yet" rather than a gap where content failed to load.
 *
 * Colour comes entirely from `currentColor`, inherited from the wrapper's
 * `text-muted-foreground`, with opacity separating the layers. That keeps the
 * art token-driven and correct in both themes with no theme branching.
 */

type EmptyArt = 'missions' | 'outputs' | 'sources' | 'connections'

function MissionsArt() {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden className="w-spacing-16">
      <rect
        x="10.5"
        y="8.5"
        width="43"
        height="31"
        rx="5"
        stroke="currentColor"
        opacity="0.25"
        transform="rotate(-4 32 24)"
      />
      <rect
        x="14.5"
        y="12.5"
        width="43"
        height="31"
        rx="5"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        opacity="0.55"
      />
      {/* Three steps, the first one ticked. */}
      <circle cx="23" cy="21" r="3.25" stroke="currentColor" opacity="0.8" />
      <path d="m21.6 21 1 1 1.8-2" stroke="currentColor" strokeLinecap="round" opacity="0.8" />
      <path d="M30 21h18" stroke="currentColor" strokeLinecap="round" opacity="0.45" />
      <circle cx="23" cy="28" r="3.25" stroke="currentColor" opacity="0.45" />
      <path d="M30 28h13" stroke="currentColor" strokeLinecap="round" opacity="0.3" />
      <circle cx="23" cy="35" r="3.25" stroke="currentColor" opacity="0.3" />
      <path d="M30 35h15" stroke="currentColor" strokeLinecap="round" opacity="0.2" />
    </svg>
  )
}

function OutputsArt() {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden className="w-spacing-16">
      <rect
        x="12.5"
        y="9.5"
        width="30"
        height="34"
        rx="4"
        stroke="currentColor"
        opacity="0.25"
        transform="rotate(-8 32 26)"
      />
      <rect
        x="20.5"
        y="7.5"
        width="30"
        height="34"
        rx="4"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        opacity="0.55"
      />
      <path d="M27 16h17" stroke="currentColor" strokeLinecap="round" opacity="0.45" />
      <path d="M27 22h17" stroke="currentColor" strokeLinecap="round" opacity="0.3" />
      {/* A small chart, the thing a generated doc usually carries. */}
      <path d="M28 34v-4" stroke="currentColor" strokeLinecap="round" opacity="0.55" />
      <path d="M33 34v-8" stroke="currentColor" strokeLinecap="round" opacity="0.55" />
      <path d="M38 34v-6" stroke="currentColor" strokeLinecap="round" opacity="0.55" />
      <path d="M43 34v-9" stroke="currentColor" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function SourcesArt() {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden className="w-spacing-16">
      <rect
        x="9.5"
        y="14.5"
        width="26"
        height="20"
        rx="4"
        stroke="currentColor"
        opacity="0.3"
        transform="rotate(-7 22 24)"
      />
      <rect
        x="28.5"
        y="14.5"
        width="26"
        height="20"
        rx="4"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        opacity="0.3"
        transform="rotate(7 42 24)"
      />
      {/* Two links, joined. */}
      <path
        d="M28 24h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M26 20.5c-3 0-5 1.6-5 3.5s2 3.5 5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M38 20.5c3 0 5 1.6 5 3.5s-2 3.5-5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
        opacity="0.7"
      />
    </svg>
  )
}

function ConnectionsArt() {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden className="w-spacing-16">
      <rect
        x="8.5"
        y="9.5"
        width="20"
        height="15"
        rx="3.5"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        opacity="0.55"
      />
      <rect
        x="35.5"
        y="23.5"
        width="20"
        height="15"
        rx="3.5"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        opacity="0.55"
      />
      {/* The tie between them, drawn as a route rather than a straight line. */}
      <path
        d="M28.5 17h6a4 4 0 0 1 4 4v2.5"
        stroke="currentColor"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="45.5" cy="23.5" r="1.75" fill="currentColor" opacity="0.45" />
      <path d="M13 15h8" stroke="currentColor" strokeLinecap="round" opacity="0.35" />
      <path d="M40 29h8" stroke="currentColor" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

const ART: Record<EmptyArt, () => React.JSX.Element> = {
  missions: MissionsArt,
  outputs: OutputsArt,
  sources: SourcesArt,
  connections: ConnectionsArt,
}

export function ShellRightPanelEmpty({ art, message }: { art: EmptyArt; message: string }) {
  const Art = ART[art]
  return (
    <div className="gap-spacing-2 py-spacing-3 px-spacing-3 text-muted-foreground flex flex-col items-center text-center">
      <Art />
      <p className="body-4 max-w-[24ch]">{message}</p>
    </div>
  )
}
