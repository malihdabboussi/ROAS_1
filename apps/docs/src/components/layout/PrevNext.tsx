import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { NavLink } from '@/lib/types'

interface PrevNextProps {
  prev: NavLink | null
  next: NavLink | null
}

export function PrevNext({ prev, next }: PrevNextProps) {
  if (!prev && !next) return null

  return (
    <div
      className="mt-12 flex items-center justify-between gap-4 pt-6"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {prev ? (
        <Link
          href={prev.href}
          className="text-muted-foreground hover:text-foreground group flex items-center gap-2 text-[14px] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <div>
            <div className="text-muted-foreground text-[11px]">Previous</div>
            <div className="font-medium" style={{ color: 'var(--foreground)' }}>
              {prev.title}
            </div>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="text-muted-foreground hover:text-foreground group flex items-center gap-2 text-right text-[14px] transition-colors"
        >
          <div>
            <div className="text-muted-foreground text-[11px]">Next</div>
            <div className="font-medium" style={{ color: 'var(--foreground)' }}>
              {next.title}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}
