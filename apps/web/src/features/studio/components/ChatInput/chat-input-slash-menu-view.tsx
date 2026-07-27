import type { SlashItem } from './chat-input-slash-menu'

export interface SlashMenuLayout {
  playbookItems: SlashItem[]
  skillItems: SlashItem[]
  workflowItems: SlashItem[]
  playbookVisible: SlashItem[]
  skillVisible: SlashItem[]
  workflowVisible: SlashItem[]
  visibleFlat: SlashItem[]
  playbookMoreCount: number
  skillMoreCount: number
  workflowMoreCount: number
  showPlaybookMore: boolean
  showSkillMore: boolean
  showWorkflowMore: boolean
}

interface SlashCommandMenuViewProps {
  layout: SlashMenuLayout
  slashItemsCount: number
  slashHighlight: number
  onSelect: (item: SlashItem) => void
  onHighlight: (index: number) => void
  onShowMorePlaybooks: () => void
  onShowMoreSkills: () => void
  onShowMoreWorkflows: () => void
}

export function SlashCommandMenuView({
  layout,
  slashItemsCount,
  slashHighlight,
  onSelect,
  onHighlight,
  onShowMorePlaybooks,
  onShowMoreSkills,
  onShowMoreWorkflows,
}: SlashCommandMenuViewProps) {
  const {
    playbookItems,
    skillItems,
    workflowItems,
    playbookVisible,
    skillVisible,
    workflowVisible,
    visibleFlat,
    playbookMoreCount,
    skillMoreCount,
    workflowMoreCount,
    showPlaybookMore,
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

  const sections: Array<{
    title: string
    items: SlashItem[]
    visible: SlashItem[]
    moreCount: number
    showMore: boolean
    onShowMore: () => void
  }> = [
    {
      title: 'Playbooks',
      items: playbookItems,
      visible: playbookVisible,
      moreCount: playbookMoreCount,
      showMore: showPlaybookMore,
      onShowMore: onShowMorePlaybooks,
    },
    {
      title: 'Skills',
      items: skillItems,
      visible: skillVisible,
      moreCount: skillMoreCount,
      showMore: showSkillMore,
      onShowMore: onShowMoreSkills,
    },
    {
      title: 'Workflows',
      items: workflowItems,
      visible: workflowVisible,
      moreCount: workflowMoreCount,
      showMore: showWorkflowMore,
      onShowMore: onShowMoreWorkflows,
    },
  ].filter((section) => section.items.length > 0)

  return (
    <>
      {sections.map((section, index) => (
        <div key={section.title}>
          {index > 0 ? <div className="border-border border-t" /> : null}
          <SlashCommandSection
            title={section.title}
            items={section.visible}
            flatIndexById={flatIndexById}
            slashHighlight={slashHighlight}
            moreCount={section.moreCount}
            showMore={section.showMore}
            onSelect={onSelect}
            onHighlight={onHighlight}
            onShowMore={section.onShowMore}
          />
        </div>
      ))}
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
            <span className="body-4 text-muted-foreground line-clamp-1">{item.description}</span>
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
