import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { cn } from '@/lib/utils/cn'

export function PanelSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-border rounded-spacing-2 overflow-hidden border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'hover:bg-hover-subtle text-foreground px-spacing-3 py-spacing-2 flex w-full items-center justify-between transition-colors',
          open && 'border-border border-b',
        )}
      >
        <span className="body-3 font-medium">{title}</span>
        <ChevronDown
          className={cn(
            'icon-sm text-muted-foreground shrink-0 transition-transform',
            !open && '-rotate-90',
          )}
          aria-hidden
        />
      </button>
      {open ? <div className="space-y-spacing-3 p-spacing-3">{children}</div> : null}
    </section>
  )
}

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-spacing-1 block">
      <span className="body-4 text-muted-foreground block font-medium">{label}</span>
      {children}
    </label>
  )
}

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="gap-spacing-3 body-3 text-muted-foreground flex items-center justify-between">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
