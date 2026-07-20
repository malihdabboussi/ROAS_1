import { Hash } from 'lucide-react'
import { SLACK_PEOPLE_MESSAGES } from '../../config/messages.config'
import type { SlackDiscoveredPerson } from '../../services/slack-people.service'

interface SlackPersonChannelContextProps {
  person: SlackDiscoveredPerson
}

export function SlackPersonChannelContext({ person }: SlackPersonChannelContextProps) {
  const channels = person.slack_channels ?? []
  const title =
    channels.length > 0
      ? channels.map((channel) => `#${channel}`).join(', ')
      : SLACK_PEOPLE_MESSAGES.CHANNELS_NONE
  const label =
    channels.length > 0
      ? `${person.display_name} shares ${channels.length} visible Slack ${channels.length === 1 ? 'channel' : 'channels'}`
      : `${person.display_name} has no shared Slack channels visible to this bot`

  return (
    <span
      title={title}
      aria-label={label}
      className="body-4 text-muted-foreground gap-spacing-1 flex min-w-0 items-center"
    >
      <Hash className="icon-xs shrink-0" />
      <span className="truncate">{channels[0] ?? 'No visible channels'}</span>
      {channels.length > 1 ? <span className="shrink-0">+{channels.length - 1}</span> : null}
    </span>
  )
}
