'use client'

export interface ThemeEditorDialogHeaderProps {
  name: string
  setName: (v: string) => void
  usageCount: number | null
  isSaving: boolean
}

export function ThemeEditorDialogHeader({
  name,
  setName,
  usageCount,
  isSaving,
}: ThemeEditorDialogHeaderProps) {
  return (
    <div className="px-spacing-4 sm:px-spacing-6 py-spacing-3 sm:py-spacing-4 flex-shrink-0 border-b border-[var(--color-border)]">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Theme name"
        className="input-glass body-2 h-10 w-full font-medium"
        maxLength={50}
      />
      <p className="typo-caption mt-spacing-2 hidden text-[var(--color-muted-foreground)] sm:block">
        {usageCount !== null
          ? `${usageCount} funnel${usageCount === 1 ? '' : 's'} using this theme`
          : '0 funnels using this theme'}
        {isSaving && ' · Saving...'}
      </p>
    </div>
  )
}
