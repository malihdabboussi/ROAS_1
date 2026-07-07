type SiteLogoProps = {
  className?: string
  /** Always `icon-text-white-moregap` (dark chrome: modals, app mock sidebar). */
  forceDark?: boolean
}

/** Wordmark: `icon-text-white-moregap` when OS prefers dark, `icon-text-black-moregap` when light. */
export function SiteLogo({ className = '', forceDark }: SiteLogoProps) {
  if (forceDark) {
    return (
      <img
        src="/Logos/logov2/icon-text-white-moregap.png"
        alt="Vibey"
        className={`h-10 w-auto ${className}`}
      />
    )
  }

  return (
    <>
      <img
        src="/Logos/logov2/icon-text-white-moregap.png"
        alt="Vibey"
        className={`hidden h-10 w-auto dark:block ${className}`}
      />
      <img
        src="/Logos/logov2/icon-text-black-moregap.png"
        alt="Vibey"
        className={`block h-10 w-auto dark:hidden ${className}`}
      />
    </>
  )
}
