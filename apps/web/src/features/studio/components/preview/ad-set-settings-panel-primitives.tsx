import type { ReactNode } from 'react'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import type { FieldState } from './useAdSetSettingsFieldSaves'

export function FieldStatus({ state }: { state: FieldState }) {
  if (state === 'saving')
    return <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
  if (state === 'saved') return <Check className="text-success h-3.5 w-3.5" />
  if (state === 'error') return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  return null
}

export function SettingsSection({
  title,
  appearance,
  children,
}: {
  title?: string
  appearance: 'studio' | 'spaces'
  children: ReactNode
}) {
  if (appearance === 'studio') {
    return <div className="space-y-5">{children}</div>
  }
  return (
    <section className="space-y-spacing-3">
      {title ? <p className="body-4 text-muted-foreground font-medium">{title}</p> : null}
      <div className="space-y-spacing-3">{children}</div>
    </section>
  )
}

export function SettingsField({
  label,
  fieldState,
  appearance = 'studio',
  children,
}: {
  label: string
  fieldState?: FieldState
  appearance?: 'studio' | 'spaces'
  children: ReactNode
}) {
  const isSpaces = appearance === 'spaces'
  return (
    <div className={isSpaces ? 'space-y-spacing-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between gap-2">
        <label
          className={
            isSpaces
              ? 'body-4 text-muted-foreground font-medium'
              : 'body-3 text-foreground font-medium'
          }
        >
          {label}
        </label>
        {fieldState ? <FieldStatus state={fieldState} /> : null}
      </div>
      {children}
    </div>
  )
}
