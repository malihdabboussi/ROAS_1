import { useTypewriter } from './use-typewriter'

export function ThinkingTranscriptBlockExt({
  content,
  isActive,
}: {
  content: string
  isActive: boolean
}) {
  const displayContent = content
    .replace(/^Reasoning:\s*/i, '')
    .trimStart()
    .split('\n')
    .map((line) => line.replace(/^_/, '').replace(/_$/, ''))
    .join('\n')

  const { displayText } = useTypewriter({
    text: displayContent,
    enabled: isActive,
  })

  return (
    <div
      className="text-muted-foreground body-3 py-0-5"
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {displayText}
    </div>
  )
}
