import { FileText } from 'lucide-react'

export function PdfCard({ url, label }: { url: string; label: string }) {
  return (
    <div className="card-glass my-3 w-full max-w-sm overflow-hidden">
      <div className="relative h-48">
        <iframe title={label} src={url} className="bg-muted h-full w-full border-0" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-10"
          aria-label={`Open ${label}`}
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:bg-secondary flex items-center gap-2.5 px-3.5 py-2 transition-colors"
      >
        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-foreground min-w-0 truncate text-sm font-medium">{label}</span>
      </a>
    </div>
  )
}
