import { clsx } from 'clsx'
import { AlertTriangle, Info, Lightbulb, XCircle } from 'lucide-react'

type CalloutType = 'info' | 'warning' | 'error' | 'tip'

interface CalloutProps {
  type?: CalloutType
  title?: string
  children: React.ReactNode
}

const icons: Record<CalloutType, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
  tip: <Lightbulb className="h-4 w-4" />,
}

const classes: Record<CalloutType, string> = {
  info: 'callout-info',
  warning: 'callout-warning',
  error: 'callout-error',
  tip: 'callout-tip',
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  return (
    <div className={clsx('my-6 rounded-lg border px-4 py-3', classes[type])}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icons[type]}</span>
        <div className="min-w-0 flex-1">
          {title && <p className="mb-1 text-[14px] font-semibold">{title}</p>}
          <div className="text-[14px] [&>p]:mb-0 [&>p]:text-current">{children}</div>
        </div>
      </div>
    </div>
  )
}
