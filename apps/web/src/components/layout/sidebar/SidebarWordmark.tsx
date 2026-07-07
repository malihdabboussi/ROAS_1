type SidebarWordmarkProps = {
  className?: string
}

/** Horizontal Vibey wordmark: white in `dark`, black in light (`tailwind` `darkMode: 'class'`). */
export function SidebarWordmark({ className = '' }: SidebarWordmarkProps) {
  return (
    <>
      <img
        src="/Logos/logov2/icon-text-white-moregap.png"
        alt="Vibey"
        className={`hidden h-8 w-auto dark:block ${className}`}
      />
      <img
        src="/Logos/logov2/icon-text-black-moregap.png"
        alt="Vibey"
        className={`h-8 w-auto dark:hidden ${className}`}
      />
    </>
  )
}
