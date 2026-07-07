import type { ReactNode } from 'react'

export function BriefSectionIntro(props: {
  title: string
  description?: string
  align?: 'left' | 'center'
  kicker?: string
}) {
  const align = props.align ?? 'left'
  return (
    <header className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      {props.kicker ? (
        <p className="body-3 text-text-muted mb-3 font-semibold uppercase tracking-wide">
          {props.kicker}
        </p>
      ) : null}
      <h2 className="h2 tracking-tight text-foreground">{props.title}</h2>
      {props.description ? (
        <p className="text-text-muted body-2 mt-4 leading-relaxed">{props.description}</p>
      ) : null}
    </header>
  )
}

export function BriefPullQuote(props: { children: ReactNode }) {
  return (
    <p className="executive-brief-pull body-2 text-foreground leading-relaxed">{props.children}</p>
  )
}

export function BriefStepList(props: { items: readonly string[] }) {
  return (
    <ul className="executive-brief-points">
      {props.items.map((point) => (
        <li key={point} className="executive-brief-point">
          <span className="executive-brief-point-mark" aria-hidden />
          <span className="body-3 text-text-muted leading-relaxed">{point}</span>
        </li>
      ))}
    </ul>
  )
}
