type SidebarWordmarkProps = {
  className?: string
}

/** Horizontal ROAS wordmark: white in `dark`, black in light (`tailwind` `darkMode: 'class'`). */
export function SidebarWordmark({ className = '' }: SidebarWordmarkProps) {
  return (
    <>
      <img
        src="/Logos/roas/wordmark-white.png"
        alt="ROAS"
        className={`hidden h-5 w-auto dark:block ${className}`}
      />
      <img
        src="/Logos/roas/wordmark-black.png"
        alt="ROAS"
        className={`h-5 w-auto dark:hidden ${className}`}
      />
    </>
  )
}
