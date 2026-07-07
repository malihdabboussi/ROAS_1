interface CardGroupProps {
  cols?: number
  children: React.ReactNode
}

export function CardGroup({ cols = 2, children }: CardGroupProps) {
  return (
    <div
      className="my-6 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  )
}
