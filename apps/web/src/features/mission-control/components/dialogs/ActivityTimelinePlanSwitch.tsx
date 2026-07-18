export function PlanSwitch({ checked, onClick }: { checked?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className="switch-glass-primary relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300"
    >
      <span
        className={`switch-glass-primary-thumb pointer-events-none block h-4 w-4 rounded-full transition-transform duration-300 ${checked ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  )
}

export function AutoApproveSwitch({
  autoApprovePlans,
  onToggleAutoApprove,
}: {
  autoApprovePlans?: boolean
  onToggleAutoApprove: (enabled: boolean) => void
}) {
  return (
    <div className="border-border mt-spacing-3 pt-spacing-3 flex items-center justify-between border-t">
      <span className="body-3 text-muted-foreground">Auto-approve future plans</span>
      <PlanSwitch
        checked={autoApprovePlans}
        onClick={() => onToggleAutoApprove(!autoApprovePlans)}
      />
    </div>
  )
}
