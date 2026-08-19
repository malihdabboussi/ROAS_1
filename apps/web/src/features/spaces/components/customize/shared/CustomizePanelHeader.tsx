import { X } from 'lucide-react'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import type { ViewIdentityProps } from '../customize-view-panel.types'

export function CustomizePanelHeader({
  activeView,
  viewIconName,
  viewIconColor,
  nameDraft,
  setNameDraft,
  onViewPatch,
  onClose,
}: ViewIdentityProps) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <IconPicker
          className="z-10 shrink-0"
          value={viewIconName}
          color={activeView.icon_color}
          size="sm"
          onChange={(name) => void onViewPatch({ icon: name })}
          onColorChange={(colorId: IconColorId) => void onViewPatch({ icon_color: colorId })}
          customTrigger={
            <LucideIcon name={viewIconName} className={`h-4 w-4 ${viewIconColor.textColor}`} />
          }
        />
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const trimmed = nameDraft.trim()
            if (!trimmed) {
              setNameDraft(activeView.name)
              return
            }
            if (trimmed !== activeView.name) void onViewPatch({ name: trimmed })
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1 font-semibold text-[var(--foreground)] outline-none focus:border-[var(--border)]"
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close customize panel"
        title="Close customize panel"
        className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
