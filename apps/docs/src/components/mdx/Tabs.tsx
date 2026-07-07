'use client'

import { Children, isValidElement, useState, type ReactElement, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface TabsProps {
  items?: string[]
  children: ReactNode
}

interface TabProps {
  label?: string
  children: ReactNode
}

export function Tabs({ items, children }: TabsProps) {
  const [active, setActive] = useState(0)
  const panels = Children.toArray(children).filter(isValidElement) as ReactElement<TabProps>[]
  const labels = Array.isArray(items)
    ? items
    : panels.map((panel, i) => panel.props.label || `Tab ${i + 1}`)

  return (
    <div className="my-6">
      <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
        {labels.map((label, i) => (
          <button
            key={label}
            onClick={() => setActive(i)}
            className={clsx(
              '-mb-px border-b-2 px-3 py-2 text-[14px] font-medium transition-colors',
              active === i
                ? 'text-foreground border-[rgb(147,51,234)]'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pt-4">{panels[active]}</div>
    </div>
  )
}

export function Tab({ children }: TabProps) {
  return <div>{children}</div>
}
