import Link from 'next/link'
import * as LucideIcons from 'lucide-react'

interface CardProps {
  title: string
  href?: string
  icon?: string
  children?: React.ReactNode
}

export function Card({ title, href, icon, children }: CardProps) {
  const IconComponent = icon ? (LucideIcons as Record<string, any>)[icon] : null

  const content = (
    <>
      {IconComponent && (
        <IconComponent
          size={16}
          style={{ color: 'var(--muted-foreground)', marginBottom: 6, flexShrink: 0 }}
        />
      )}
      <h3 className="mb-1 text-[14px] font-semibold" style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>
      {children && (
        <div className="text-[14px] [&>p]:mb-0" style={{ color: 'var(--muted-foreground)' }}>
          {children}
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className="card-glass-link no-underline">
        {content}
      </Link>
    )
  }

  return <div className="card-static">{content}</div>
}
