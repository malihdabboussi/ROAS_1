import { conversationActivityLabel, type ConversationActivity } from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'

export function ConversationActivityIndicator({ activity }: { activity: ConversationActivity }) {
  if (activity === 'idle') return null
  const label = conversationActivityLabel[activity]
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className="h-spacing-3 w-spacing-3 relative flex shrink-0 items-center justify-center"
    >
      {activity === 'working' ? (
        <>
          <span className="bg-primary absolute h-full w-full animate-ping rounded-full opacity-40" />
          <span className="bg-primary h-spacing-2 w-spacing-2 relative rounded-full" />
        </>
      ) : (
        <span
          className={cn(
            'h-spacing-2 w-spacing-2 rounded-full',
            activity === 'needs_action' ? 'bg-warning' : 'badge-glass-blue',
          )}
        />
      )}
    </span>
  )
}
