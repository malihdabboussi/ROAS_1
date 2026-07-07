interface SessionCompactionDividerProps {
  label: string
  isActive: boolean
}

export function SessionCompactionDivider({ label, isActive }: SessionCompactionDividerProps) {
  return (
    <div
      className="py-spacing-1 mb-spacing-2 gap-spacing-3 flex items-center"
      aria-label="Conversation summarized"
    >
      <div className="border-border min-w-0 flex-1 border-t" aria-hidden />
      <span
        className={`typo-caption px-spacing-3 py-spacing-1 font-medium ${
          isActive
            ? 'text-shimmer-gradient animate-[shimmer_4s_infinite_linear]'
            : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
      <div className="border-border min-w-0 flex-1 border-t" aria-hidden />
    </div>
  )
}
