import { BrainCircuit, RefreshCw } from 'lucide-react'

interface SlackPeopleHeaderProps {
  populating: boolean
  onPopulate: () => void
  onRefresh: () => void
}

export function SlackPeopleHeader({ populating, onPopulate, onRefresh }: SlackPeopleHeaderProps) {
  return (
    <header className="gap-spacing-4 flex flex-wrap items-start justify-between">
      <div>
        <p className="eyebrow text-muted-foreground">Managed team intelligence</p>
        <h1 className="title-h4 text-foreground mt-spacing-1">PEOPLE & SHADOW MODE</h1>
        <p className="body-3 text-muted-foreground mt-spacing-2 max-w-2xl">
          Classify active Slack people, connect portal identities and User Brains, then review every
          proposed message before it can reach Slack.
        </p>
      </div>
      <div className="gap-spacing-2 flex items-center">
        <button
          type="button"
          onClick={onPopulate}
          disabled={populating}
          className="button-compact button-glass-neutral"
        >
          <BrainCircuit className="icon-xs" />
          {populating ? 'Populating…' : 'Populate brains'}
        </button>
        <button type="button" onClick={onRefresh} className="button-compact button-glass-neutral">
          <RefreshCw className="icon-xs" /> Refresh Slack
        </button>
      </div>
    </header>
  )
}
