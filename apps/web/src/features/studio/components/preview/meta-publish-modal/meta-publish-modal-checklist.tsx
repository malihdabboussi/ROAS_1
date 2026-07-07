import { AlertCircle, Check } from 'lucide-react'
import type { ValidationCheck } from './meta-publish-modal.types'

export function MetaPublishModalChecklist({
  checks,
  isValidating,
}: {
  checks: ValidationCheck[]
  isValidating: boolean
}) {
  return (
    <div className={`space-y-spacing-2 ${isValidating ? 'mt-spacing-4' : ''}`}>
      {checks.map((check) => (
        <div key={check.id} className="gap-spacing-2 flex items-start">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            {check.status === 'pending' && (
              <div className="border-border h-3 w-3 rounded-full border" />
            )}
            {check.status === 'checking' && (
              <div className="border-primary h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
            )}
            {check.status === 'passed' && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
                <Check className="h-3 w-3 text-green-400" />
              </div>
            )}
            {check.status === 'failed' && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-3 w-3 text-red-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`body-3 ${
                check.status === 'passed'
                  ? 'text-foreground'
                  : check.status === 'failed'
                    ? 'text-red-400'
                    : 'text-muted-foreground'
              }`}
            >
              {check.label}
            </p>
            {check.status === 'failed' && check.error && (
              <p className="typo-caption text-red-400/70">{check.error}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
