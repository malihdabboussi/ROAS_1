import { AlertCircle, Check, Loader2 } from 'lucide-react'

export type FieldState = 'idle' | 'saving' | 'saved' | 'error'

export function FieldStatus({ state }: { state: FieldState }) {
  if (state === 'saving')
    return <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
  if (state === 'saved') return <Check className="text-success h-3.5 w-3.5" />
  if (state === 'error') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  return null
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="typo-caption text-muted-foreground mb-4 font-semibold uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

export function SettingsField({
  label,
  fieldState,
  children,
}: {
  label?: string
  fieldState?: FieldState
  children: React.ReactNode
}) {
  const showLabel = label != null && label !== ''
  return (
    <div className="space-y-1.5">
      {(showLabel || fieldState) && (
        <div className="flex items-center justify-between">
          {showLabel && <label className="body-3 text-foreground font-medium">{label}</label>}
          {!showLabel && <span />}
          {fieldState && <FieldStatus state={fieldState} />}
        </div>
      )}
      {children}
    </div>
  )
}
