import { ExternalLink } from 'lucide-react'

export function DriveDocTitleChromeActions({ openInDriveHref }: { openInDriveHref: string }) {
  return (
    <a
      href={openInDriveHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
    >
      Open in Drive
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
    </a>
  )
}
