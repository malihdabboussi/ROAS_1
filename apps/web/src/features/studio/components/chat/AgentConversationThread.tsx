'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { motion } from 'framer-motion'
import {
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  FileText,
  Maximize2,
  MessageSquare,
  Minimize2,
  X,
} from 'lucide-react'
import { ChatMarkdownDocument } from '@/components/chat/ChatMarkdownDocument'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { useTypewriter } from '@/lib/hooks/use-typewriter'
import { renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import type { A2ATurn } from '../../types'
import { parseContent } from '../message-bubble/message-bubble.utils'
import { PdfCard } from '../message-bubble/PdfCard'
import {
  ArtifactInlinePreviewCard,
  type ArtifactInlinePreviewCardProps,
} from './artifact-inline-preview-card'
import { DocumentCard } from './DocumentCard'
import { ORB_STYLES, ToolStatusIcon } from './FlowTimeline'
import { GeneratedAudio, GeneratedImage, GeneratedVideo } from './InlineImageGen'
import { ThinkingTranscriptBlock } from './ThinkingTranscriptBlock'

export interface AgentConversationThreadProps {
  delegationId: string
  callerAgent: string
  callerAgentName: string
  callerAgentImage?: string
  callerAgentRole?: string
  targetAgent: string
  targetAgentName: string
  targetAgentImage?: string
  targetAgentRole?: string
  delegationType: 'query' | 'delegation' | 'brainstorm'
  initialPrompt: string
  turns: A2ATurn[]
  status: 'active' | 'completed' | 'failed'
  participants?: Array<{ id: string; name: string; image?: string; role?: string }>
  deliverables?: { id: string; title: string; type: string }[]
  summary?: string
}

function AgentAvatar({ name, image, size = 24 }: { name: string; image?: string; size?: number }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  const initial = ((name || '?')[0] ?? '?').toUpperCase()
  return (
    <div
      className="bg-muted text-muted-foreground flex flex-shrink-0 items-center justify-center rounded-full text-xs font-medium"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  )
}

interface TurnGroup {
  from: string
  fromName: string
  fromImage?: string
  turns: A2ATurn[]
}

function groupTurnsByAgent(turns: A2ATurn[]): TurnGroup[] {
  const groups: TurnGroup[] = []
  for (const turn of turns) {
    const last = groups[groups.length - 1]
    if (last && last.from === turn.from) {
      last.turns.push(turn)
    } else {
      groups.push({
        from: turn.from,
        fromName: turn.fromName,
        fromImage: turn.fromImage,
        turns: [turn],
      })
    }
  }
  return groups
}

function ToolRow({
  turn,
  isActive,
  orbIndex,
}: {
  turn: A2ATurn
  isActive: boolean
  orbIndex: number
}) {
  const displayLabel = turn.content || turn.toolName || (isActive ? 'Working...' : 'Done')
  if (isActive) {
    const orbStyle = ORB_STYLES[orbIndex % ORB_STYLES.length]
    return (
      <div className="flex items-center gap-2.5 py-0.5">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
          <VibeyChatOrb state="executing" style={orbStyle} />
        </div>
        <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
          {displayLabel}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <ToolStatusIcon name={turn.toolName ?? 'tool'} />
      <span className="body-3 text-muted-foreground font-medium">{displayLabel}</span>
    </div>
  )
}

function PreSection({ turns, isGroupActive }: { turns: A2ATurn[]; isGroupActive: boolean }) {
  const completedToolNames = new Set(
    turns.filter((t) => t.turnType === 'tool_result').map((t) => t.toolName ?? t.content),
  )
  const hasTools = turns.some(
    (t) =>
      t.turnType === 'tool_result' ||
      (t.turnType === 'tool_use' && !completedToolNames.has(t.toolName ?? t.content)),
  )
  const thinkingTurn = turns.find((t) => t.turnType === 'thinking')
  const hasActive = isGroupActive && (thinkingTurn != null || hasTools)

  const [expanded, setExpanded] = useState(hasActive)

  useEffect(() => {
    if (hasActive) {
      setExpanded(true)
      return
    }
    const t = setTimeout(() => setExpanded(false), 600)
    return () => clearTimeout(t)
  }, [hasActive])

  if (!thinkingTurn && !hasTools) return null

  let toolOrbCounter = 0
  const toolCount = turns.filter((t) => t.turnType === 'tool_result').length

  const summaryParts: string[] = []
  if (toolCount > 0) summaryParts.push(`${toolCount} tool${toolCount !== 1 ? 's' : ''}`)
  const summary = summaryParts.join(', ')

  const label = hasActive ? 'Locked in...' : summary ? `Locked in · ${summary}` : 'Locked in'

  return (
    <div className="mb-spacing-1 overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1 pl-0 pr-3"
      >
        <span
          className={`body-3 font-medium ${hasActive ? 'text-shimmer-gradient animate-[shimmer_4s_infinite_linear]' : 'text-muted-foreground'}`}
        >
          {label}
        </span>
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <div className="flex flex-col gap-1 py-1">
          {thinkingTurn && (
            <ThinkingTranscriptBlock
              content={thinkingTurn.content || ''}
              isActive={isGroupActive && !hasTools}
            />
          )}
          {turns.map((turn) => {
            if (turn.turnType === 'tool_use') {
              const key = turn.toolName ?? turn.content
              if (completedToolNames.has(key)) return null
              const orbIdx = toolOrbCounter++
              return (
                <ToolRow
                  key={`${turn.turnIndex}-tool_use`}
                  turn={turn}
                  isActive={isGroupActive}
                  orbIndex={orbIdx}
                />
              )
            }
            if (turn.turnType === 'tool_result') {
              const orbIdx = toolOrbCounter++
              return (
                <ToolRow
                  key={`${turn.turnIndex}-tool_result`}
                  turn={turn}
                  isActive={false}
                  orbIndex={orbIdx}
                />
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

function A2AMarkdownContent({
  content,
  streaming = false,
}: {
  content: string
  streaming?: boolean
}) {
  const { displayText } = useTypewriter({ text: content, enabled: streaming })
  const segments = useMemo(() => parseContent(displayText), [displayText])
  const hasInlineMedia = segments.some((segment) => segment.type !== 'text')
  if (!displayText.trim()) return null
  if (!hasInlineMedia) {
    return <ChatMarkdownDocument markdown={displayText} />
  }
  return (
    <div className="gap-spacing-2 flex flex-col">
      {segments.map((segment, idx) => {
        if (segment.type === 'text') {
          const text = segment.value.trim()
          if (!text) return null
          return <ChatMarkdownDocument key={`text-${idx}`} markdown={text} />
        }
        if (segment.type === 'video') {
          return <GeneratedVideo key={`video-${idx}`} url={segment.url} prompt={segment.prompt} />
        }
        if (segment.type === 'audio') {
          return <GeneratedAudio key={`audio-${idx}`} url={segment.url} prompt={segment.prompt} />
        }
        if (segment.type === 'pdf') {
          return <PdfCard key={`pdf-${idx}`} url={segment.url} label={segment.label} />
        }
        return <GeneratedImage key={`image-${idx}`} url={segment.url} prompt={segment.alt} />
      })}
    </div>
  )
}

type TurnSegment =
  | { kind: 'tool_group'; turns: A2ATurn[] }
  | { kind: 'message'; turn: A2ATurn }
  | { kind: 'ui_block'; turn: A2ATurn }

function segmentTurns(turns: A2ATurn[]): TurnSegment[] {
  const segments: TurnSegment[] = []
  let currentToolGroup: A2ATurn[] | null = null

  for (const turn of turns) {
    if (
      turn.turnType === 'thinking' ||
      turn.turnType === 'tool_use' ||
      turn.turnType === 'tool_result'
    ) {
      if (!currentToolGroup) currentToolGroup = []
      currentToolGroup.push(turn)
    } else {
      if (currentToolGroup) {
        segments.push({ kind: 'tool_group', turns: currentToolGroup })
        currentToolGroup = null
      }
      if (turn.turnType === 'ui_block' && turn.blockData) {
        segments.push({ kind: 'ui_block', turn })
      } else if (turn.turnType === 'message') {
        segments.push({ kind: 'message', turn })
      }
    }
  }
  if (currentToolGroup) {
    segments.push({ kind: 'tool_group', turns: currentToolGroup })
  }
  return segments
}

function resolveUiBlockVisual(
  blockData: Record<string, unknown> | undefined,
): { kind: 'image' | 'video'; url: string } | null {
  if (!blockData) return null
  const blockType = typeof blockData.type === 'string' ? blockData.type : ''

  if (blockType === 'browser_screenshot') {
    const imageUrl = typeof blockData.imageUrl === 'string' ? blockData.imageUrl.trim() : ''
    if (imageUrl) return { kind: 'image', url: imageUrl }
  }

  if (blockType === 'artifact_preview') {
    const videoUrl = typeof blockData.videoUrl === 'string' ? blockData.videoUrl.trim() : ''
    if (videoUrl) return { kind: 'video', url: videoUrl }
    const imageUrl = typeof blockData.imageUrl === 'string' ? blockData.imageUrl.trim() : ''
    if (imageUrl) return { kind: 'image', url: imageUrl }
  }

  const mediaKindRaw =
    typeof blockData.mediaKind === 'string'
      ? blockData.mediaKind
      : typeof blockData.kind === 'string'
        ? blockData.kind
        : ''
  const mediaKind = mediaKindRaw.trim().toLowerCase()
  const mediaUrl =
    typeof blockData.mediaUrl === 'string'
      ? blockData.mediaUrl.trim()
      : typeof blockData.url === 'string'
        ? blockData.url.trim()
        : ''
  if ((mediaKind === 'image' || mediaKind === 'video') && mediaUrl) {
    return { kind: mediaKind, url: mediaUrl }
  }
  return null
}

function AgentTurnGroup({
  group,
  role,
  avatarSize,
  status,
  isLastGroup,
}: {
  group: TurnGroup
  role?: string
  avatarSize: number
  status: 'active' | 'completed' | 'failed'
  isLastGroup: boolean
}) {
  const segments = useMemo(() => segmentTurns(group.turns), [group.turns])
  const isGroupActive = status === 'active' && isLastGroup
  const lastMessageIdx = segments.reduce((idx, s, i) => (s.kind === 'message' ? i : idx), -1)

  return (
    <div className="gap-spacing-3 py-spacing-2 flex">
      <AgentAvatar name={group.fromName} image={group.fromImage} size={avatarSize} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-spacing-1">
          <div className="text-foreground/60 text-[11px] font-medium">{group.fromName}</div>
          {role && <div className="text-muted-foreground text-[10px] leading-tight">{role}</div>}
        </div>

        {segments.map((seg, si) => {
          if (seg.kind === 'tool_group') {
            const isLastSeg = si === segments.length - 1
            return (
              <PreSection
                key={`toolgroup-${si}`}
                turns={seg.turns}
                isGroupActive={isGroupActive && isLastSeg}
              />
            )
          }

          if (seg.kind === 'ui_block') {
            const block = seg.turn.blockData!
            const blockType = block.type as string
            if (blockType === 'artifact_preview') {
              return (
                <div key={`ui-${seg.turn.turnIndex}`} className="my-spacing-1">
                  <ArtifactInlinePreviewCard
                    artifactType={
                      block.artifactType as ArtifactInlinePreviewCardProps['artifactType']
                    }
                    artifactId={block.artifactId as string}
                    name={block.name as string}
                    subtitle={block.subtitle as string | undefined}
                    career={block.career as string | undefined}
                    age={block.age as string | undefined}
                    backgroundProfile={block.backgroundProfile as string | undefined}
                    bodyPreview={block.bodyPreview as string | undefined}
                    emailSubject={block.emailSubject as string | undefined}
                    funnelPageId={block.funnelPageId as string | undefined}
                    spaceId={block.spaceId as string | undefined}
                    imageUrl={block.imageUrl as string | undefined}
                    videoUrl={block.videoUrl as string | undefined}
                    status={block.status as string | undefined}
                  />
                </div>
              )
            }
            if (blockType === 'document_card') {
              return (
                <div key={`ui-${seg.turn.turnIndex}`} className="my-spacing-1">
                  <DocumentCard
                    title={block.title as string}
                    documentId={(block.documentId as string | undefined) ?? ''}
                    spaceId={block.spaceId as string | undefined}
                    spaceItemId={block.spaceItemId as string | undefined}
                    snippet={(block.snippet as string | undefined) ?? ''}
                  />
                </div>
              )
            }
            if (blockType === 'browser_screenshot') {
              const imageUrl = typeof block.imageUrl === 'string' ? block.imageUrl.trim() : ''
              if (!imageUrl) return null
              const pageUrl = typeof block.pageUrl === 'string' ? block.pageUrl.trim() : ''
              return (
                <div key={`ui-${seg.turn.turnIndex}`} className="my-spacing-1">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="surface-card border-border block overflow-hidden rounded-lg border"
                  >
                    <img
                      src={imageUrl}
                      alt="Browser screenshot"
                      className="max-h-56 w-full object-cover"
                    />
                  </a>
                  {pageUrl ? (
                    <p className="text-muted-foreground body-4 mt-1 truncate" title={pageUrl}>
                      {pageUrl}
                    </p>
                  ) : null}
                </div>
              )
            }
            return null
          }

          if (seg.kind === 'message') {
            const isStreamingTurn = isGroupActive && si === lastMessageIdx
            return (
              <div key={`${seg.turn.turnIndex}-message`}>
                {seg.turn.content ? (
                  <A2AMarkdownContent content={seg.turn.content} streaming={isStreamingTurn} />
                ) : isStreamingTurn ? (
                  <span className="bg-foreground/60 ml-0.5 inline-block h-4 w-1 animate-pulse rounded" />
                ) : null}
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}

function AgentIdentity({
  name,
  image,
  role,
  size = 32,
}: {
  name: string
  image?: string
  role?: string
  size?: number
}) {
  return (
    <div className="gap-spacing-2 flex items-center">
      <AgentAvatar name={name} image={image} size={size} />
      <div className="min-w-0">
        <div className="text-foreground truncate text-sm font-medium leading-tight">{name}</div>
        {role && (
          <div className="text-muted-foreground truncate text-[11px] leading-tight">{role}</div>
        )}
      </div>
    </div>
  )
}

function AgentConversationModal({
  open,
  onClose,
  callerAgent,
  callerAgentName,
  callerAgentImage,
  callerAgentRole,
  targetAgentName,
  targetAgentImage,
  targetAgentRole,
  delegationType,
  turns,
  status,
  participants,
}: {
  open: boolean
  onClose: () => void
  callerAgent: string
  callerAgentName: string
  callerAgentImage?: string
  callerAgentRole?: string
  targetAgentName: string
  targetAgentImage?: string
  targetAgentRole?: string
  delegationType: 'query' | 'delegation' | 'brainstorm'
  turns: A2ATurn[]
  status: 'active' | 'completed' | 'failed'
  participants?: Array<{ id: string; name: string; image?: string; role?: string }>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const isBrainstorm = delegationType === 'brainstorm' && participants && participants.length > 0
  const typeLabel =
    delegationType === 'brainstorm'
      ? 'brainstorm'
      : delegationType === 'query'
        ? 'asked'
        : 'delegated to'
  const messageCount = turns.filter((t) => t.turnType === 'message').length
  const turnGroups = useMemo(() => groupTurnsByAgent(turns), [turns])
  const participantMap = useMemo(
    () =>
      new Map([
        ...(participants ?? []).map((p) => [p.id, p] as const),
        [
          callerAgent,
          {
            id: callerAgent,
            name: callerAgentName,
            image: callerAgentImage,
            role: callerAgentRole,
          },
        ],
      ]),
    [participants, callerAgent, callerAgentName, callerAgentImage, callerAgentRole],
  )

  useEffect(() => {
    if (!open) setIsExpanded(false)
  }, [open])

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [open, turns.length])

  const toggleExpanded = useCallback(() => setIsExpanded((v) => !v), [])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content asChild>
          <motion.div
            className="z-modal-content rounded-spacing-4 border-border surface-card fixed inset-4 mx-auto flex flex-col overflow-hidden border shadow-xl sm:inset-y-8"
            initial={false}
            animate={{ maxWidth: isExpanded ? 1152 : 672 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Agent conversation</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="gap-spacing-3 border-border px-spacing-4 py-spacing-3 flex items-center border-b">
              {isBrainstorm ? (
                <>
                  <div className="flex items-center -space-x-1.5">
                    {participants.map((p) => (
                      <AgentAvatar key={p.id} name={p.name} image={p.image} size={30} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-sm font-medium">Brainstorm</div>
                    <div className="text-muted-foreground text-xs">
                      {participants.map((p) => p.name).join(', ')} · {messageCount} msg
                      {messageCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AgentIdentity
                    name={callerAgentName}
                    image={callerAgentImage}
                    role={callerAgentRole}
                    size={36}
                  />
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                      {typeLabel}
                    </span>
                    <div className="bg-border h-3 w-px" />
                  </div>
                  <AgentIdentity
                    name={targetAgentName}
                    image={targetAgentImage}
                    role={targetAgentRole}
                    size={36}
                  />
                  <div className="gap-spacing-2 ml-auto flex shrink-0 items-center">
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {messageCount} msg{messageCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </>
              )}
              <div className="gap-spacing-1 ml-auto flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className="btn-icon-bare rounded-full p-1.5 hover:bg-white/10"
                  aria-label={
                    isExpanded ? 'Collapse conversation panel' : 'Expand conversation panel'
                  }
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <Minimize2 className="icon-sm text-muted-foreground" />
                  ) : (
                    <Maximize2 className="icon-sm text-muted-foreground" />
                  )}
                </button>
                <DialogPrimitive.Close className="btn-icon-bare rounded-full p-1.5 hover:bg-white/10">
                  <X className="icon-sm text-muted-foreground" />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div ref={scrollRef} className="px-spacing-4 py-spacing-2 flex-1 overflow-y-auto">
              {turnGroups.map((group, gi) => {
                const p = participantMap.get(group.from)
                return (
                  <AgentTurnGroup
                    key={`group-${gi}-${group.from}`}
                    group={group}
                    role={
                      p?.role ?? (group.from === callerAgent ? callerAgentRole : targetAgentRole)
                    }
                    avatarSize={28}
                    status={status}
                    isLastGroup={gi === turnGroups.length - 1}
                  />
                )
              })}
            </div>

            <div className="gap-spacing-2 border-border px-spacing-4 py-spacing-2 flex items-center border-t">
              {status === 'active' && (
                <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-visible">
                  <VibeyChatOrb state="executing" style="elastic" />
                </div>
              )}
              {status === 'completed' && (
                <MessageSquare className="text-muted-foreground h-3.5 w-3.5" />
              )}
              {status === 'failed' && <X className="text-destructive h-3.5 w-3.5" />}
              <span className="text-muted-foreground text-xs">
                {status === 'active' ? 'Conversation in progress...' : 'Conversation complete'}
              </span>
            </div>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ─── Activity feed (preview card body) ───────────────────────────────────────

function ActivityMessageRow({ turn, isStreaming }: { turn: A2ATurn; isStreaming: boolean }) {
  const { displayText } = useTypewriter({ text: turn.content || '', enabled: isStreaming })
  const segments = useMemo(() => parseContent(displayText), [displayText])
  const mediaSegment = segments.find(
    (segment) => segment.type === 'image' || segment.type === 'video',
  )
  const textOnly = segments
    .filter((segment): segment is { type: 'text'; value: string } => segment.type === 'text')
    .map((segment) => segment.value)
    .join('\n')
    .trim()
  const html = renderChatMarkdown(textOnly || displayText)
  if (!displayText && !isStreaming) return null
  if (mediaSegment) {
    return (
      <div className="flex w-full flex-col gap-1">
        {textOnly ? (
          <div
            className="body-3 text-foreground/80"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : null}
        {mediaSegment.type === 'image' ? (
          <a
            href={mediaSegment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="surface-card border-border block h-20 w-full overflow-hidden rounded-md border"
          >
            <img
              src={mediaSegment.url}
              alt={mediaSegment.alt || 'Image preview'}
              className="h-full w-full object-cover"
            />
          </a>
        ) : (
          <video
            src={mediaSegment.url}
            className="surface-card border-border h-20 w-full rounded-md border bg-black object-cover"
            muted
            playsInline
            preload="metadata"
          />
        )}
      </div>
    )
  }
  return (
    <div
      className="body-3 text-foreground/80"
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
    >
      {displayText ? (
        <span dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <span className="bg-foreground/60 ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded" />
      )}
    </div>
  )
}

function ActivityRow({
  turn,
  isActive,
  isStreaming,
  orbIndex,
  showSpeakerAvatar,
}: {
  turn: A2ATurn
  isActive: boolean
  isStreaming: boolean
  orbIndex: number
  showSpeakerAvatar: boolean
}) {
  const label = turn.content || turn.toolName || (isActive ? 'Working...' : 'Done')

  if (turn.turnType === 'thinking') {
    return (
      <div className="flex items-center gap-2 py-0.5">
        {showSpeakerAvatar && <AgentAvatar name={turn.fromName} image={turn.fromImage} size={14} />}
        {!showSpeakerAvatar && <div style={{ width: 14 }} />}
        <BrainCircuit className="text-[var(--color-muted-foreground)]/40 h-3 w-3 shrink-0" />
        <span className="body-5 text-muted-foreground/50 italic">Thinking...</span>
      </div>
    )
  }

  if (turn.turnType === 'tool_use') {
    const orbStyle = ORB_STYLES[orbIndex % ORB_STYLES.length]
    if (isActive) {
      return (
        <div className="flex items-center gap-2 py-0.5">
          {showSpeakerAvatar && (
            <AgentAvatar name={turn.fromName} image={turn.fromImage} size={14} />
          )}
          {!showSpeakerAvatar && <div style={{ width: 14 }} />}
          <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-visible">
            <VibeyChatOrb state="executing" style={orbStyle} />
          </div>
          <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
            {label}
          </span>
        </div>
      )
    }
    return null
  }

  if (turn.turnType === 'tool_result') {
    return (
      <div className="flex items-center gap-2 py-0.5">
        {showSpeakerAvatar && <AgentAvatar name={turn.fromName} image={turn.fromImage} size={14} />}
        {!showSpeakerAvatar && <div style={{ width: 14 }} />}
        <ToolStatusIcon name={turn.toolName ?? 'tool'} />
        <span className="body-3 text-muted-foreground font-medium">{label}</span>
      </div>
    )
  }

  if (turn.turnType === 'message') {
    return (
      <div className="flex items-start gap-2 py-0.5">
        {showSpeakerAvatar && <AgentAvatar name={turn.fromName} image={turn.fromImage} size={14} />}
        {!showSpeakerAvatar && <div style={{ width: 14 }} />}
        <ActivityMessageRow turn={turn} isStreaming={isStreaming} />
      </div>
    )
  }

  if (turn.turnType === 'ui_block' && turn.blockData) {
    const blockType = (turn.blockData.type as string | undefined) ?? ''
    const blockName =
      (turn.blockData.name as string | undefined) ??
      (turn.blockData.title as string | undefined) ??
      blockType
    const visual = resolveUiBlockVisual(turn.blockData)
    if (blockType === 'artifact_preview') {
    }
    return (
      <div className="flex w-full flex-col gap-1 py-0.5">
        <div className="flex items-center gap-2">
          {showSpeakerAvatar && (
            <AgentAvatar name={turn.fromName} image={turn.fromImage} size={14} />
          )}
          {!showSpeakerAvatar && <div style={{ width: 14 }} />}
          <FileText className="text-muted-foreground h-3 w-3 shrink-0" />
          <span className="body-3 text-muted-foreground truncate font-medium">{blockName}</span>
        </div>
        {visual ? (
          visual.kind === 'image' ? (
            <a
              href={visual.url}
              target="_blank"
              rel="noopener noreferrer"
              className="surface-card border-border ml-6 block h-20 w-full overflow-hidden rounded-md border"
            >
              <img
                src={visual.url}
                alt={blockName || 'Preview image'}
                className="h-full w-full object-cover"
              />
            </a>
          ) : (
            <video
              src={visual.url}
              className="surface-card border-border ml-6 h-20 w-full rounded-md border bg-black object-cover"
              muted
              playsInline
              preload="metadata"
            />
          )
        ) : null}
      </div>
    )
  }

  return null
}

function ActivityFeed({
  turns,
  status,
}: {
  turns: A2ATurn[]
  status: 'active' | 'completed' | 'failed'
}) {
  const isActive = status === 'active'
  const lastTurnIdx = turns.length - 1

  const completedToolNames = useMemo(() => {
    const s = new Set<string>()
    for (const t of turns) {
      if (t.turnType === 'tool_result') s.add(t.toolName ?? t.content)
    }
    return s
  }, [turns])

  let prevFrom = ''
  let orbCounter = 0

  return (
    <div className="flex flex-col">
      {turns.length === 0 && isActive && (
        <div className="flex items-center gap-2 py-0.5">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-visible">
            <VibeyChatOrb state="executing" style="elastic" />
          </div>
          <span className="body-3 text-shimmer-gradient animate-[shimmer_4s_infinite_linear] font-medium">
            Starting...
          </span>
        </div>
      )}
      {turns.map((turn, idx) => {
        const showSpeakerAvatar = turn.from !== prevFrom
        prevFrom = turn.from

        const isLastTurn = idx === lastTurnIdx
        const isActiveTurn = isActive && isLastTurn
        const isToolActive =
          turn.turnType === 'tool_use' && !completedToolNames.has(turn.toolName ?? turn.content)
        const orbIdx = orbCounter
        if (turn.turnType === 'tool_use' || turn.turnType === 'tool_result') orbCounter++

        return (
          <ActivityRow
            key={`${turn.turnIndex}-${turn.turnType}`}
            turn={turn}
            isActive={isToolActive && isActiveTurn}
            isStreaming={turn.turnType === 'message' && isActiveTurn}
            orbIndex={orbIdx}
            showSpeakerAvatar={showSpeakerAvatar}
          />
        )
      })}
    </div>
  )
}

export const AgentConversationThread = memo(function AgentConversationThread(
  props: AgentConversationThreadProps,
) {
  const {
    callerAgent,
    callerAgentName,
    callerAgentImage,
    callerAgentRole,
    targetAgentName,
    targetAgentImage,
    targetAgentRole,
    delegationType,
    turns,
    status,
    participants,
  } = props

  const [modalOpen, setModalOpen] = useState(false)
  const openModal = useCallback(() => setModalOpen(true), [])
  const closeModal = useCallback(() => setModalOpen(false), [])
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [turns.length])

  const messageTurns = turns.filter((t) => t.turnType === 'message')
  const messageCount = messageTurns.length
  const isBrainstorm = delegationType === 'brainstorm' && participants && participants.length > 0
  const typeLabel =
    delegationType === 'brainstorm'
      ? 'brainstorm'
      : delegationType === 'query'
        ? 'asked'
        : 'delegated to'

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="my-spacing-2 w-full max-w-[520px] cursor-pointer text-left"
      >
        <div className="card-glass rounded-spacing-3 overflow-hidden transition-all hover:ring-1 hover:ring-white/10">
          {/* Header: identity row */}
          <div className="border-border px-spacing-3 pt-spacing-2 pb-spacing-1 flex items-center gap-2 border-b">
            {isBrainstorm ? (
              <>
                <div className="flex items-center -space-x-1">
                  {participants.map((p) => (
                    <AgentAvatar key={p.id} name={p.name} image={p.image} size={16} />
                  ))}
                </div>
                <span className="body-4 text-muted-foreground min-w-0 flex-1 truncate">
                  Brainstorm · {participants.length} agents
                </span>
              </>
            ) : (
              <>
                <AgentAvatar name={callerAgentName} image={callerAgentImage} size={16} />
                <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  {typeLabel}
                </span>
                <AgentAvatar name={targetAgentName} image={targetAgentImage} size={16} />
                <span className="body-4 text-foreground/60 min-w-0 flex-1 truncate">
                  {callerAgentName} &amp; {targetAgentName}
                </span>
              </>
            )}
            {status === 'active' && (
              <div className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-visible">
                <VibeyChatOrb state="executing" style="elastic" />
              </div>
            )}
          </div>

          {/* Activity feed body */}
          <div className="relative" style={{ maxHeight: 160 }}>
            {/* Top shadow — makes content feel like it scrolls into darkness */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6"
              style={{ background: 'linear-gradient(to bottom, var(--color-card), transparent)' }}
            />
            <div
              ref={feedRef}
              className="scrollbar-hide overflow-y-auto"
              style={{ maxHeight: 160 }}
            >
              <div className="px-spacing-3 pt-spacing-2 pb-spacing-1">
                <ActivityFeed turns={turns} status={status} />
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
              style={{ background: 'linear-gradient(to bottom, transparent, var(--color-card))' }}
            />
          </div>

          {/* Footer */}
          <div className="gap-spacing-2 px-spacing-3 py-spacing-2 hover:bg-hover-subtle flex items-center transition-colors">
            {status === 'active' ? (
              <span className="body-4 text-muted-foreground">In progress...</span>
            ) : status === 'failed' ? (
              <>
                <X className="icon-sm text-destructive shrink-0" />
                <span className="body-4 text-destructive">Failed</span>
              </>
            ) : (
              <>
                <MessageSquare className="icon-sm text-muted-foreground shrink-0" />
                <span className="body-4 text-muted-foreground">Completed</span>
              </>
            )}
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {messageCount} msg{messageCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </button>

      <AgentConversationModal
        open={modalOpen}
        onClose={closeModal}
        callerAgent={callerAgent}
        callerAgentName={callerAgentName}
        callerAgentImage={callerAgentImage}
        callerAgentRole={callerAgentRole}
        targetAgentName={targetAgentName}
        targetAgentImage={targetAgentImage}
        targetAgentRole={targetAgentRole}
        delegationType={delegationType}
        turns={turns}
        status={status}
        participants={participants}
      />
    </>
  )
})
