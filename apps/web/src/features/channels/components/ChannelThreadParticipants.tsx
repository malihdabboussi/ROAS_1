import { useEffect, useRef, useState } from 'react'
import { Bot } from 'lucide-react'

export interface ThreadParticipant {
  id: string
  label: string
  avatarUrl: string | null
  type: 'user' | 'agent'
}

export function ThreadParticipants({ participants }: { participants: ThreadParticipant[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2"
      >
        <div className="flex -space-x-1.5">
          {participants.slice(0, 5).map((p) =>
            p.avatarUrl ? (
              <img
                key={p.id}
                src={p.avatarUrl}
                alt={p.label}
                className="border-background h-5 w-5 rounded-full border object-cover"
              />
            ) : (
              <span
                key={p.id}
                className="bg-muted text-muted-foreground border-background inline-flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-semibold uppercase"
              >
                {p.type === 'agent' ? <Bot className="h-2.5 w-2.5" /> : p.label.charAt(0)}
              </span>
            ),
          )}
          {participants.length > 5 && (
            <span className="bg-muted text-muted-foreground border-background inline-flex h-5 w-5 items-center justify-center rounded-full border text-[8px] font-semibold">
              +{participants.length - 5}
            </span>
          )}
        </div>
        <span className="typo-caption text-muted-foreground">
          {participants.length} participants
        </span>
      </button>

      {open && (
        <div className="border-border bg-card absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border py-1 shadow-lg">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 px-3 py-1.5">
              {p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt={p.label}
                  className="h-6 w-6 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="bg-muted text-muted-foreground inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase">
                  {p.type === 'agent' ? <Bot className="h-3 w-3" /> : p.label.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span className="body-4 text-foreground block truncate font-medium">{p.label}</span>
                {p.type === 'agent' && (
                  <span className="typo-caption text-muted-foreground">Agent</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
