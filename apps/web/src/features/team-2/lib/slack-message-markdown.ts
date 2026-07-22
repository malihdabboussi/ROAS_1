const SLACK_EMOJI: Record<string, string> = {
  white_check_mark: '✅',
  eyes: '👀',
  wave: '👋',
  rocket: '🚀',
}

export function slackMrkdwnToMarkdown(value: string): string {
  return value
    .replace(/\u2014/g, '&mdash;')
    .replace(/<((?:https?:\/\/|mailto:)[^>|]+)\|([^>]+)>/g, '[$2]($1)')
    .replace(/<(https?:\/\/[^>]+)>/g, '$1')
    .replace(/<@([A-Z0-9]+)>/g, '@$1')
    .replace(/<#([A-Z0-9]+)\|([^>]+)>/g, '#$2')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|[.,!?;:])/g, '$1**$2**')
    .replace(/:([a-z0-9_+-]+):/g, (match, name: string) => SLACK_EMOJI[name] ?? match)
}

export function slackMrkdwnToPlainPreview(value: string): string {
  return slackMrkdwnToMarkdown(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
