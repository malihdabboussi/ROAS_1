'use client'

import { motion } from 'framer-motion'
import {
  AtSign,
  Calendar,
  ChevronDown,
  ChevronsLeft,
  CircleCheck,
  Columns2,
  Columns3,
  FileText,
  Flag,
  FolderKanban,
  Layers,
  List,
  MessagesSquare,
  Mic,
  Paperclip,
  Plus,
  Rocket,
  Search,
  Settings2,
  Share2,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

// ─── Data ────────────────────────────────────────────────────────────────────

/** Faces for human assignees (same crop style as `/vibey-pitch/pitch-deck-workforce.tsx`). */
const HUMAN_ASSIGNMENT_PHOTO_A =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces&auto=format&q=82'
const HUMAN_ASSIGNMENT_PHOTO_B =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=64&h=64&fit=crop&crop=faces&auto=format&q=82'

const SPACES_HERO_ARTIFACT_PDF_LABEL = 'Go-to-Market Strategy Deck'

const VIEWS = [
  { id: 'list', label: 'List', Icon: List, color: 'text-blue-400', active: false },
  { id: 'board', label: 'Board', Icon: Columns2, color: 'text-purple-400', active: true },
  { id: 'missions', label: 'Missions', Icon: Rocket, color: 'text-orange-400', active: false },
  { id: 'docs', label: 'Docs', Icon: FileText, color: 'text-blue-400', active: false },
  { id: 'channels', label: 'Channels', Icon: MessagesSquare, color: 'text-purple-400', active: false },
] as const

function rowByRole(
  roleKey: string,
  libraryAgents?: PublicAgentLibraryRow[],
): PublicAgentLibraryRow | undefined {
  return (
    libraryAgents?.find((a) => a.role_key === roleKey) ??
    MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === roleKey)
  )
}

/** Agent faces from marketing hero library + DB when available (same hooks as missions/org mockups). */
function resolveSpacesAssigneePhotos(
  libraryAgents?: PublicAgentLibraryRow[],
  vibeyPortraitUrl?: string,
) {
  const vibey = vibeyPortraitUrl?.trim() || VIBEY_MARKETING_PORTRAIT_FALLBACK
  const atlasPhoto = rowByRole('analyst', libraryAgents)?.image_url ?? ''
  const jaimePhoto =
    rowByRole('pm_operations', libraryAgents)?.image_url ??
    rowByRole('pm_marketing', libraryAgents)?.image_url ??
    ''
  const fallbackAtlas =
    atlasPhoto ||
    MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === 'analyst')!.image_url
  const fallbackJaime =
    jaimePhoto ||
    MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === 'pm_operations')!.image_url

  return {
    vibey,
    atlas: fallbackAtlas,
    jaime: fallbackJaime,
    humanSf: HUMAN_ASSIGNMENT_PHOTO_A,
    humanMaya: HUMAN_ASSIGNMENT_PHOTO_B,
  }
}

type AssigneePhoto = {
  photoUrl: string
  label: string
}

type CardData = {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  assignee: AssigneePhoto
  due: string
  tags?: string[]
  isAgent?: boolean
}

type KanbanColumnData = {
  id: string
  label: string
  color: string
  bgClass: string
  borderClass: string
  tintColor: string
  cards: CardData[]
}

function buildKanbanColumns(photos: ReturnType<typeof resolveSpacesAssigneePhotos>) {
  const AT = {
    photoUrl: photos.atlas,
    label: 'Atlas',
  }
  const JM = {
    photoUrl: photos.jaime,
    label: 'Jaime',
  }
  const VB = {
    photoUrl: photos.vibey,
    label: 'ROAS',
  }
  const SF = { photoUrl: photos.humanSf, label: 'Sefy' }
  const MY = { photoUrl: photos.humanMaya, label: 'Maya' }

  const columns: KanbanColumnData[] = [
    {
      id: 'todo',
      label: 'To Do',
      color: 'cyan',
      bgClass: 'bg-cyan-500/[0.04]',
      borderClass: 'border-cyan-500/10',
      tintColor: 'rgba(6,182,212,0.10)',
      cards: [
        {
          id: 'c1',
          title: 'Draft Q3 product update blog post',
          priority: 'medium' as const,
          assignee: AT,
          due: 'May 22',
          tags: ['Content'],
          isAgent: true,
        },
        {
          id: 'c2',
          title: 'Review onboarding flow wireframes',
          priority: 'high' as const,
          assignee: SF,
          due: 'May 20',
          tags: ['Design'],
        },
      ],
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'amber',
      bgClass: 'bg-amber-500/[0.04]',
      borderClass: 'border-amber-500/10',
      tintColor: 'rgba(245,158,11,0.10)',
      cards: [
        {
          id: 'c3',
          title: 'Competitive analysis — APAC market',
          priority: 'high' as const,
          assignee: JM,
          due: 'May 19',
          tags: ['Research'],
          isAgent: true,
        },
        {
          id: 'c4',
          title: 'Set up Fathom → Brain flow',
          priority: 'medium' as const,
          assignee: MY,
          due: 'May 21',
          tags: ['Ops'],
        },
        {
          id: 'c5',
          title: 'Write investor update email sequence',
          priority: 'high' as const,
          assignee: VB,
          due: 'May 20',
          isAgent: true,
        },
      ],
    },
    {
      id: 'in_review',
      label: 'In Review',
      color: 'violet',
      bgClass: 'bg-violet-500/[0.04]',
      borderClass: 'border-violet-500/10',
      tintColor: 'rgba(139,92,246,0.10)',
      cards: [
        {
          id: 'c7',
          title: 'Vendor MSA — legal review queue',
          priority: 'medium' as const,
          assignee: SF,
          due: 'May 23',
          tags: ['Legal'],
        },
      ],
    },
    {
      id: 'done',
      label: 'Done',
      color: 'emerald',
      bgClass: 'bg-emerald-500/[0.04]',
      borderClass: 'border-emerald-500/10',
      tintColor: 'rgba(16,185,129,0.10)',
      cards: [
        {
          id: 'c6',
          title: 'Go-to-market strategy deck',
          priority: 'low' as const,
          assignee: AT,
          due: 'May 18',
          tags: ['Strategy'],
          isAgent: true,
        },
      ],
    },
  ]
  return columns
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-orange-400',
  medium: 'text-blue-400',
  low: 'text-slate-400',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssigneeAvatar({
  photoUrl,
  label,
  size = 'sm',
  isAgent,
}: {
  photoUrl: string
  label: string
  size?: 'sm' | 'xs'
  isAgent?: boolean
}) {
  const dim = size === 'xs' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <div title={label} className={`${dim} relative shrink-0 overflow-hidden rounded-full`}>
      <img src={photoUrl} alt="" className="h-full w-full object-cover object-center" decoding="async" />
      {isAgent ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-[var(--bg-deep)]" />
      ) : null}
    </div>
  )
}

function TagChip({ label }: { label: string }) {
  return (
    <span className="border border-hairline inline-flex items-center rounded px-1 py-0.5 text-[8px] font-semibold text-white/50">
      {label}
    </span>
  )
}

function KanbanCard({ card }: { card: CardData }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-glass rounded-lg p-2.5"
    >
      <p className="mb-2 text-[10px] leading-snug text-white/90">{card.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <AssigneeAvatar
          photoUrl={card.assignee.photoUrl}
          label={card.assignee.label}
          size="xs"
          isAgent={card.isAgent}
        />
        <span className={`flex items-center gap-0.5 ${PRIORITY_COLOR[card.priority]}`}>
          <Flag className="h-2.5 w-2.5" fill="currentColor" />
        </span>
        <span className="flex items-center gap-0.5 text-[8px] text-white/40">
          <Calendar className="h-2 w-2" />
          {card.due}
        </span>
        {card.tags?.map((t) => <TagChip key={t} label={t} />)}
      </div>
    </motion.article>
  )
}

function KanbanColumn({
  column,
}: {
  column: KanbanColumnData
}) {
  return (
    <div
      className={`relative flex w-[180px] shrink-0 flex-col overflow-hidden rounded-xl border ${column.bgClass} ${column.borderClass}`}
    >
      {/* tint overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: column.tintColor, opacity: 0.6 }}
        aria-hidden
      />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        {/* Column header */}
        <div className="flex items-center justify-between px-2.5 py-2">
          <span
            className={`border-section inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70`}
          >
            {column.label}
            <span className="ml-1 opacity-50">{column.cards.length}</span>
          </span>
          <button
            type="button"
            className="rounded p-0.5 text-white/30 transition-colors hover:text-white/60"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {/* Cards */}
        <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
          {column.cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Matches `ToolbarShell` / `DefaultToolbar`: group by · add columns | search dock · customize · Task. */
function SpacesHeroSpaceToolbar() {
  return (
    <div
      aria-hidden
      className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2"
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
        <button
          type="button"
          className="badge-glass-purple inline-flex h-[26px] shrink-0 items-center gap-1 rounded-full px-2 text-[9px] font-medium"
        >
          <Layers className="h-3 w-3 shrink-0" />
          Status
        </button>
        <button
          type="button"
          className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
        >
          <Columns3 className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
        <div className="flex h-[26px] shrink-0 items-center gap-px">
          <button
            type="button"
            className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
          </button>
          <button
            type="button"
            className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
          >
            <CircleCheck className="h-3.5 w-3.5 shrink-0" />
          </button>
          <button
            type="button"
            className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
        <div className="mx-1 h-3.5 w-px shrink-0 self-center bg-white/10" aria-hidden />
        <button
          type="button"
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-color-glass-dim p-1 text-white/40 transition-colors hover:text-white/65"
        >
          <Settings2 className="h-3.5 w-3.5 shrink-0" />
        </button>
        <button
          type="button"
          className="badge-glass-green inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-semibold transition-opacity hover:opacity-90"
        >
          <Plus className="h-3 w-3 shrink-0" />
          Task
        </button>
      </div>
    </div>
  )
}

/**
 * Parity with `apps/web` `PdfCard` (`message-bubble/PdfCard.tsx`): `card-glass`, white `h-48` viewport,
 * footer row — static copy instead of iframe (marketing).
 */
function ChatEmbeddedPdfCardMockup() {
  const label = SPACES_HERO_ARTIFACT_PDF_LABEL
  return (
    <div className="card-glass my-3 w-full max-w-[400px] overflow-hidden">
      <div className="bg-marketing-pdf-paper relative h-48 overflow-hidden">
        <div className="text-color-deep h-full select-none overflow-hidden px-3.5 pb-3 pt-3">
          <p className="body-4 mb-1 font-semibold leading-tight">Go-to-Market Strategy</p>
          <p className="body-4 mb-2 leading-snug text-color-muted">
            Q2 rollout · Messaging · Channel mix · Targets & KPIs
          </p>
          <p className="body-4 mb-1 leading-snug">
            <span className="text-color-deep font-medium">Positioning.</span>{' '}
            <span className="text-color-muted">
              Wedge narrative for founders who ship fast but lose context across threads and apps.
            </span>
          </p>
          <p className="body-4 text-color-muted line-clamp-2 leading-snug">
            <span className="text-color-deep font-medium">Motion.</span> Paid + founder demos week one;
            partner intros week two — SQLs, activation, time-to-second workspace.
          </p>
        </div>
      </div>
      <div className="hover:bg-[var(--color-secondary)] flex items-center gap-2.5 px-3.5 py-2 transition-colors">
        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="text-foreground min-w-0 truncate text-sm font-medium">{label}</span>
      </div>
    </div>
  )
}

/** Static shell matching `apps/web` `ChatInput` with `compact` (SpaceVibey strip: `px-3 pb-3 pt-2`). */
function SpacesHeroChatComposerCompact() {
  return (
    <div className="relative shrink-0 border-t border-color-glass-dim px-3 pb-3 pt-2">
      <div className="input-glass relative flex flex-col overflow-hidden rounded-2xl">
        <div className="relative flex-1 px-spacing-1 pt-1.5">
          <textarea
            readOnly
            aria-hidden
            tabIndex={-1}
            rows={1}
            placeholder="Message Pixel..."
            className="body-2 caret-accent relative max-h-[200px] min-h-[24px] w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="flex items-center justify-between px-spacing-1 py-spacing-1">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="chip-glass-blue flex h-8 shrink-0 items-center gap-1 rounded-full px-2 transition-all"
            >
              <span className="typo-caption font-medium">Auto</span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
            <div className="gap-spacing-0 flex shrink-0 items-center">
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
              </button>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="-ml-spacing-0-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              >
                <AtSign className="h-3.5 w-3.5 shrink-0" />
              </button>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="-ml-spacing-0-5 flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
          </div>
          <div className="gap-spacing-0 ml-2 flex shrink-0 items-center">
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mic className="h-3.5 w-3.5 shrink-0" />
            </button>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              disabled
              className="-ml-spacing-0-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-primary transition-opacity hover:opacity-90 disabled:opacity-30"
              aria-label="Send message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SpacesVibeyOpenChatPanel({ vibeyPhotoUrl }: { vibeyPhotoUrl: string }) {
  return (
    <div className="flex h-full min-h-0 max-w-[30%] min-w-0 shrink-0 grow-0 basis-[30%] flex-col">
      <div
        className="surface-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-color-glass-dim"
        aria-hidden
      >
      {/* Match SpaceVibeyChatPanel: title row + toolbar */}
      <div className="border-color-glass-dim shrink-0 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-0.5">
          <span className="body-4 min-w-0 flex-1 truncate text-left text-[10px] font-semibold leading-tight text-white/90 sm:text-[11px]">
            Q3 Product launch — board
          </span>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/35 transition-colors hover:text-white/60 sm:h-7 sm:w-7"
            aria-hidden
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/35 transition-colors hover:text-white/60 sm:h-7 sm:w-7"
            aria-hidden
          >
            <Search className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/35 transition-colors hover:text-white/60 sm:h-7 sm:w-7"
            aria-hidden
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white/35 transition-colors hover:text-white/60 sm:h-7 sm:w-7"
            aria-hidden
          >
            <List className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="surface-bg flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-3">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex justify-end"
          >
            <div className="max-w-[92%] rounded-2xl border border-purple-400/15 bg-purple-500/10 px-2.5 py-2">
              <p className="text-[10px] leading-snug text-white/90">
                Finish the revised GTM strategy deck for Q3 launch. Tie it back to tasks on the Board.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12 }}
            className="flex gap-2"
          >
            <AssigneeAvatar photoUrl={vibeyPhotoUrl} label="ROAS" size="sm" isAgent />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="card-glass rounded-2xl px-2.5 py-2">
                <p className="text-[10px] leading-snug text-white/85">
                  Done — here is your updated artifact with the roadmap, segments, and launch phases. Preview it inline or move the card on the Board to Done.
                </p>
              </div>
              <ChatEmbeddedPdfCardMockup />
            </div>
          </motion.div>
        </div>

        <SpacesHeroChatComposerCompact />
      </div>
    </div>
    </div>
  )
}

// ─── Main mockup ──────────────────────────────────────────────────────────────

export function SpacesHeroMockup(props?: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
  sizeVariant?: 'default' | 'deck' | 'brief'
}) {
  const photos = resolveSpacesAssigneePhotos(props?.libraryAgents, props?.vibeyPortraitUrl)
  const columns = buildKanbanColumns(photos)
  const shellClassName =
    props?.sizeVariant === 'deck'
      ? '!min-h-[250px] overflow-hidden !p-0 max-md:!min-h-[280px] sm:!min-h-[300px] lg:!min-h-[340px]'
      : props?.sizeVariant === 'brief'
        ? '!min-h-[360px] overflow-hidden !p-0 sm:!min-h-[400px] lg:!min-h-[420px]'
        : '!min-h-[440px] overflow-hidden !p-0 sm:!min-h-[560px]'

  return (
    <FeatureFloatingMockShell
      hideBrainGrid
      className={shellClassName}
    >
      <div className="flex h-full min-h-0 gap-0 overflow-hidden pb-3 pl-2 pt-2" style={{ background: 'var(--bg-deep)' }}>

        <SpacesVibeyOpenChatPanel vibeyPhotoUrl={photos.vibey} />

        {/* ── Main area ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

          {/* Breadcrumb header */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px]">
              <div className="flex items-center gap-1 text-white/30">
                <User className="h-3 w-3 shrink-0" />
                <span>Personal</span>
              </div>
              <span className="select-none text-white/20">/</span>
              <button
                type="button"
                className="flex items-center gap-1 font-semibold text-white/80"
              >
                <FolderKanban className="h-3 w-3 shrink-0 text-purple-400" />
                <span>Product Launch Q3</span>
                <ChevronDown className="h-2.5 w-2.5 text-white/30" />
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                className="rounded p-1 text-white/30 transition-colors hover:text-white/60"
              >
                <Zap className="h-3 w-3" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded px-1.5 py-1 text-[9px] text-white/30 transition-colors hover:text-white/60"
              >
                <Share2 className="h-3 w-3" />
                Share
              </button>
            </div>
          </div>

          {/* View tabs */}
          <div className="border-color-glass-dim flex items-center gap-0.5 border-b px-3 pb-0">
            {VIEWS.map((v) => {
              const Icon = v.Icon
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`flex items-center gap-1 rounded-t px-2 py-1.5 text-[9px] font-medium transition-colors ${
                    v.active
                      ? 'border-b-2 border-purple-400 text-white/90'
                      : 'text-white/30 hover:text-white/60'
                  }`}
                  style={v.active ? { marginBottom: '-1px' } : undefined}
                >
                  <Icon className={`h-2.5 w-2.5 ${v.active ? v.color : ''}`} />
                  {v.label}
                </button>
              )
            })}
            <div className="ml-auto mb-1 flex shrink-0 items-center">
              <div className="mr-2 h-4 w-px shrink-0 self-center bg-white/10" aria-hidden />
              <button
                type="button"
                className="flex shrink-0 items-center rounded-md px-1.5 py-1 text-[9px] font-medium text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/65"
                title="Add view"
              >
                + View
              </button>
            </div>
          </div>

          <SpacesHeroSpaceToolbar />

          {/* Kanban board */}
          <div className="relative flex-1 overflow-hidden">
            <div className="scrollbar-hide flex h-full gap-2 overflow-x-auto px-3 pb-0 pt-2.5">
              {columns.map((col) => (
                <KanbanColumn key={col.id} column={col} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}
