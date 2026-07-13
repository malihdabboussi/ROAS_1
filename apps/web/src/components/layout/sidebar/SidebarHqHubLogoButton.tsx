'use client'

import { SidebarWordmark } from '../sidebar/SidebarWordmark'

export function SidebarHqHubLogoButton({
  hubOpen,
  onToggle,
}: {
  hubOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="hub-sidebar-logo-button cursor-pointer rounded-lg p-1 transition-all hover:opacity-80"
      aria-label={hubOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={hubOpen}
    >
      {hubOpen ? (
        <SidebarWordmark />
      ) : (
        <>
          <img
            src="/Logos/logov2/icon-white.png"
            alt="Vibey"
            className="hidden h-10 w-10 dark:block"
          />
          <img src="/Logos/logov2/icon-black.png" alt="Vibey" className="h-10 w-10 dark:hidden" />
        </>
      )}
    </button>
  )
}
