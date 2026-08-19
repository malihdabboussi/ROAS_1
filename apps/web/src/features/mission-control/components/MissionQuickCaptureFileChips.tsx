import { Paperclip, X } from 'lucide-react'

interface MissionQuickCaptureFileChipsProps {
  files: File[]
  onRemoveFile: (index: number) => void
}

export function MissionQuickCaptureFileChips({
  files,
  onRemoveFile,
}: MissionQuickCaptureFileChipsProps) {
  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {files.map((file, idx) => (
        <div
          key={`${file.name}-${idx}`}
          className="border-border bg-muted body-3 group flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all"
        >
          <Paperclip className="h-3 w-3 shrink-0" />
          <span className="max-w-[120px] truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => onRemoveFile(idx)}
            aria-label="Remove attachment"
            title="Remove attachment"
            className="text-muted-foreground hover:text-foreground rounded-full transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
