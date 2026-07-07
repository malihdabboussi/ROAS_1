import type { SlashItem } from './chat-input-slash-menu'

export interface SlashMenuLayout {
  skillItems: SlashItem[]
  workflowItems: SlashItem[]
  skillVisible: SlashItem[]
  workflowVisible: SlashItem[]
  visibleFlat: SlashItem[]
  skillMoreCount: number
  workflowMoreCount: number
  showSkillMore: boolean
  showWorkflowMore: boolean
}

interface SlashCommandMenuViewProps {
  layout: SlashMenuLayout
  slashItemsCount: number
  slashHighlight: number
  onSelect: (item: SlashItem) => void
  onHighlight: (index: number) => void
  onShowMoreSkills: () => void
  onShowMoreWorkflows: () => void
}

export function SlashCommandMenuView({
  layout,
  slashItemsCount,
  slashHighlight,
  onSelect,
  onHighlight,
  onShowMoreSkills,
  onShowMoreWorkflows,
}: SlashCommandMenuViewProps) {
  const {
    skillItems,
    workflowItems,
    skillVisible,
    workflowVisible,
    visibleFlat,
    skillMoreCount,
    workflowMoreCount,
    showSkillMore,
    showWorkflowMore,
  } = layout
  const flatIndexById = new Map(visibleFlat.map((it, i) => [it.id, i]))

  if (slashItemsCount === 0) {
    return (
      <div className="body-4 text-muted-foreground px-spacing-3 py-spacing-4 text-center">
        No commands found
      </div>
    )
  }

  return (
    <>
      {skillItems.length > 0 && (
        <SlashCommandSection
          title="Skills"
          items={skillVisible}
          flatIndexById={flatIndexById}
          slashHighlight={slashHighlight}
          moreCount={skillMoreCount}
          showMore={showSkillMore}
          onSelect={onSelect}
          onHighlight={onHighlight}
          onShowMore={onShowMoreSkills}
        />
      )}
      {skillItems.length > 0 && workflowItems.length > 0 && <div className="border-border border-t" />}
      {workflowItems.length > 0 && (
        <SlashCommandSection
          title="Workflows"
          items={workflowVisible}
          flatIndexById={flatIndexById}
          slashHighlight={slashHighlight}
          moreCount={workflowMoreCount}
          showMore={showWorkflowMore}
          onSelect={onSelect}
          onHighlight={onHighlight}
          onShowMore={onShowMoreWorkflows}
        />
      )}
    </>
  )
}

function SlashCommandSection({
  title,
  items,
  flatIndexById,
  slashHighlight,
  moreCount,
  showMore,
  onSelect,
  onHighlight,
  onShowMore,
}: {
  title: string
  items: SlashItem[]
  flatIndexById: Map<string, number>
  slashHighlight: number
  moreCount: number
  showMore: boolean
  onSelect: (item: SlashItem) => void
  onHighlight: (index: number) => void
  onShowMore: () => void
}) {
  return (
    <div className="py-spacing-1">
      <span className="body-4 px-spacing-3 py-spacing-1 text-muted-foreground block font-medium">
        {title}
      </span>
      {items.map((item) => {
        const idx = flatIndexById.get(item.id) ?? 0
        return (
          <button
            key={item.id}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              onSelect(item)
            }}
            onMouseEnter={() => onHighlight(idx)}
            className={`px-spacing-3 py-spacing-2 flex w-full flex-col gap-0.5 text-left transition-colors ${
              idx === slashHighlight ? 'bg-hover-subtle' : 'hover:bg-hover-subtle'
            }`}
          >
            <span className="body-3 text-foreground font-medium">/{item.key}</span>
            <span className="body-4 text-muted-foreground line-clamp-1">
              {item.description}
            </span>
          </button>
        )
      })}
      {showMore && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onShowMore()
          }}
          className="body-4 text-muted-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 w-full text-left transition-colors"
        >
          Show {moreCount} more
        </button>
      )}
    </div>
  )
}
