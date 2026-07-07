import type { YourTurnItem } from '../../services/your-turn.service'
import { formatSpaceTaskStatusLabel } from '../space-item-values'

export interface YourTurnCardProps {
  item: YourTurnItem
  onOpen: () => void
  onActionAccept?: () => void
  onActionDismiss?: () => void
}

const KIND_LABELS: Record<YourTurnItem['kind'], string> = {
  mission_subtask: 'Mission subtask',
  space_item: 'Space item',
  suggestion: 'Suggestion',
  plan_approval: 'Plan approval',
}

export function YourTurnCard({ item, onOpen, onActionAccept, onActionDismiss }: YourTurnCardProps) {
  const isSuggestion = item.kind === 'suggestion'
  return (
    <div className="section-card p-spacing-4 gap-spacing-2 flex flex-col">
      <div className="gap-spacing-2 flex items-center">
        <span className="body-3 bg-secondary text-muted-foreground rounded-spacing-1 px-spacing-2 py-spacing-1 font-medium">
          {KIND_LABELS[item.kind]}
        </span>
        <span className="body-3 text-muted-foreground">
          {formatSpaceTaskStatusLabel(item.status)}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="body-2 text-foreground text-left font-medium hover:underline"
      >
        {item.title}
      </button>
      {item.preview && <p className="body-3 text-muted-foreground line-clamp-2">{item.preview}</p>}
      <div className="gap-spacing-2 flex items-center justify-between">
        <span className="body-3 text-muted-foreground">
          {item.due_at ? `Due ${new Date(item.due_at).toLocaleDateString()}` : 'No due date'}
        </span>
        {isSuggestion && (
          <div className="gap-spacing-2 flex">
            <button
              type="button"
              onClick={onActionDismiss}
              className="button-glass-secondary rounded-spacing-2 px-spacing-3 body-3 font-medium"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={onActionAccept}
              className="button-glass-accent rounded-spacing-2 px-spacing-3 body-3 font-medium"
            >
              Accept
            </button>
          </div>
        )}
        {!isSuggestion && (
          <button
            type="button"
            onClick={onOpen}
            className="button-glass-accent rounded-spacing-2 px-spacing-3 body-3 font-medium"
          >
            Open
          </button>
        )}
      </div>
    </div>
  )
}
