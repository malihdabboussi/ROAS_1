interface TemplateIncludedItemsSectionProps {
  taskCount: number
  docCount: number
  automationCount: number
  hasChannel: boolean
  includeTasks: boolean
  includeDocs: boolean
  includeChannel: boolean
  includeAutomations: boolean
  onIncludeTasksChange: (checked: boolean) => void
  onIncludeDocsChange: (checked: boolean) => void
  onIncludeChannelChange: (checked: boolean) => void
  onIncludeAutomationsChange: (checked: boolean) => void
}

export function TemplateIncludedItemsSection({
  taskCount,
  docCount,
  automationCount,
  hasChannel,
  includeTasks,
  includeDocs,
  includeChannel,
  includeAutomations,
  onIncludeTasksChange,
  onIncludeDocsChange,
  onIncludeChannelChange,
  onIncludeAutomationsChange,
}: TemplateIncludedItemsSectionProps) {
  return (
    <div className="space-y-spacing-2">
      <p className="body-2 text-foreground font-medium">What&apos;s included</p>
      {taskCount > 0 ? (
        <TemplateIncludeCheckboxRow
          label={`Sample tasks (${taskCount})`}
          description="Guided tasks that explain how to use the space."
          checked={includeTasks}
          onChange={onIncludeTasksChange}
        />
      ) : null}
      {docCount > 0 ? (
        <TemplateIncludeCheckboxRow
          label={`Guide docs (${docCount})`}
          description="Welcome doc and helpful templates."
          checked={includeDocs}
          onChange={onIncludeDocsChange}
        />
      ) : null}
      {hasChannel ? (
        <TemplateIncludeCheckboxRow
          label="Channel"
          description="Create a chat channel for this space."
          checked={includeChannel}
          onChange={onIncludeChannelChange}
        />
      ) : null}
      {automationCount > 0 ? (
        <TemplateIncludeCheckboxRow
          label={`Automations as drafts (${automationCount})`}
          description="Pre-configured flows you can review and enable."
          checked={includeAutomations}
          onChange={onIncludeAutomationsChange}
        />
      ) : null}
    </div>
  )
}

function TemplateIncludeCheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="border-border rounded-spacing-2 hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-3 flex cursor-pointer items-start border transition-colors">
      <input
        type="checkbox"
        className="checkbox-glass-green mt-0.5 shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="body-3 text-foreground block font-medium">{label}</span>
        {description ? (
          <span className="body-4 text-muted-foreground block">{description}</span>
        ) : null}
      </span>
    </label>
  )
}
