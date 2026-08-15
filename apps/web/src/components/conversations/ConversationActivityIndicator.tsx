import { conversationActivityLabel, type ConversationActivity } from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'

export function ConversationActivityIndicator({
  activity,
  overlay = false,
}: {
  activity: ConversationActivity
  overlay?: boolean
}) {
  if (activity === 'idle') return null
  const label = conversationActivityLabel[activity]
  const dotClass =
    activity === 'needs_action'
      ? 'bg-warning'
      : activity === 'working'
        ? 'bg-primary'
        : 'badge-glass-blue'

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={
        overlay
          ? 'pointer-events-none absolute -right-px -top-px flex items-center justify-center'
          : 'h-spacing-3 w-spacing-3 relative flex shrink-0 items-center justify-center'
      }
    >
      {activity === 'working' ? (
        <>
          <span
            className={cn(
              'bg-primary absolute rounded-full opacity-40',
              overlay ? 'h-spacing-2 w-spacing-2 animate-ping' : 'h-full w-full animate-ping',
            )}
          />
          <span
            className={cn(
              'bg-primary h-spacing-2 w-spacing-2 relative rounded-full',
              overlay && 'ring-card ring-2',
            )}
          />
        </>
      ) : (
        <span
          className={cn(
            'h-spacing-2 w-spacing-2 rounded-full',
            dotClass,
            overlay && 'ring-card ring-2',
          )}
        />
      )}
    </span>
  )
}
