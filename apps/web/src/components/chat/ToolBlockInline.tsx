'use client'

import {
  Bot,
  Brain,
  FileDown,
  FileEdit,
  FileText,
  FolderOpen,
  Github,
  Image,
  ImagePlus,
  Layout,
  List,
  Mail,
  Megaphone,
  MessageSquare,
  Palette,
  PenLine,
  Plug,
  Search,
  Settings,
  Shield,
  User,
  Users,
  Video,
  Volume2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { VibeyChatOrb, type OrbAnimationStyle } from '@/components/vibey/vibey-chat-orb'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'

export const ORB_STYLES: OrbAnimationStyle[] = [
  'elastic',
  'trails',
  'constellation',
  'liquid',
  'firefly',
]

const TOOL_ICON_MAP: Record<string, LucideIcon> = {
  web_search: Search,
  web_fetch: FileDown,
  browser: Layout,
  image: Image,
  'nano-banana-pro': ImagePlus,
  brain_context: Brain,
  document_context: FileText,
  artifact_context: FolderOpen,
  reference_context: MessageSquare,
  skill_context: Bot,
  tts: Volume2,
  message: MessageSquare,
  campaign_capability: Plug,
  vibey_backend: Plug,
  create_offer: FileEdit,
  update_offer_step: PenLine,
  get_offer: FileText,
  list_offers: List,
  list_custom_fields: List,
  create_ad: Megaphone,
  create_ad_campaign: Megaphone,
  create_ad_set: Settings,
  create_funnel: Layout,
  add_funnel_page: Layout,
  update_funnel_page: PenLine,
  patch_funnel_page: PenLine,
  get_funnel: Layout,
  list_funnels: List,
  create_presentation: FileText,
  update_presentation: FileEdit,
  list_presentations: List,
  create_sequence: Mail,
  add_sequence_email: Mail,
  list_sequences: List,
  create_avatar: User,
  list_avatars: Users,
  create_theme: Palette,
  list_themes: List,
  list_agent_skills: List,
  create_agent_skill: Bot,
  update_agent_skill: Settings,
  delete_agent_skill: X,
  save_document: FileDown,
  list_documents: FolderOpen,
  use_integration: Plug,
  update_state: Settings,
  get_state: Settings,
  check_meta_connection: Shield,
  check_integration_connection: Plug,
  list_meta_ad_accounts: List,
  list_meta_pages: List,
  publish_ad_to_meta: Megaphone,
  update_ad_campaign: Megaphone,
  update_ad_set: Megaphone,
  get_meta_ad_status: Shield,
  get_capabilities: List,
  get_media_generation_status: Settings,
  generate_image: ImagePlus,
  generate_video: Video,
  get_video_status: Video,
  create_agent: Bot,
  list_team: Users,
  create_project: FolderOpen,
  create_file: FileEdit,
  update_file: PenLine,
  read_file: FileText,
  delete_file: X,
  list_project_files: List,
  update_project_deps: Settings,
  import_github_repo: Github,
  send_user_message: MessageSquare,
  read_brain_context: Brain,
  read_attachments: FileText,
  link_selected_items: FolderOpen,
  resolve_references: MessageSquare,
  load_requested_skills: Bot,
}

export function getToolIcon(name: string, action?: string): LucideIcon {
  if (
    (name === 'vibey_backend' || name === 'campaign_capability') &&
    action &&
    action in TOOL_ICON_MAP
  ) {
    return TOOL_ICON_MAP[action]!
  }
  return TOOL_ICON_MAP[name] ?? FileEdit
}

export function ToolStatusIcon({ name, action }: { name: string; action?: string }) {
  const Icon = getToolIcon(name, action)
  return (
    <div className="card-glass rounded-spacing-2 flex h-5 w-5 shrink-0 items-center justify-center">
      <Icon className="h-2.5 w-2.5 text-foreground" strokeWidth={2.5} />
    </div>
  )
}

export function ToolBlockInline({
  block,
  styleIndex = 0,
}: {
  block: Extract<MessageContentBlock, { type: 'tool' }>
  styleIndex?: number
}) {
  const isActive = block.state === 'active'
  const style = ORB_STYLES[styleIndex % ORB_STYLES.length]
  const latestProgress =
    Array.isArray(block.progress) && block.progress.length > 0
      ? block.progress[block.progress.length - 1]?.detail
      : null

  return (
    <div className="py-0.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-visible">
          {isActive ? (
            <VibeyChatOrb state="executing" style={style} />
          ) : (
            <ToolStatusIcon name={block.name} action={block.action} />
          )}
        </div>
        <span
          className={`body-3 font-medium ${
            isActive
              ? 'text-shimmer-gradient animate-[shimmer_4s_infinite_linear]'
              : 'text-muted-foreground'
          }`}
        >
          {block.label}
        </span>
      </div>
      {isActive && latestProgress && (
        <div className="text-muted-foreground body-3 ml-7 mt-1">{latestProgress}</div>
      )}
    </div>
  )
}
