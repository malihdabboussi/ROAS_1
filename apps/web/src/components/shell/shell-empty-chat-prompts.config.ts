import type { LucideIcon } from 'lucide-react'
import {
  CheckSquare,
  FileText,
  Image,
  Infinity,
  Presentation,
  Telescope,
  Users,
  Video,
} from 'lucide-react'

/** Placeholders for empty / new conversations (ClickUp Brain–style). */
export const SHELL_EMPTY_CHAT_PLACEHOLDER = 'Ask, create, search, @ to mention…'

/**
 * Single quick-start row above the empty-chat composer.
 * One curated set — not duplicated under the hero or as a second pill row.
 */
export interface ShellEmptyChatQuickStart {
  id: string
  label: string
  icon: LucideIcon
  iconName: string
  prompt: string
  systemContext: string
}

export const SHELL_EMPTY_CHAT_QUICK_STARTS: ShellEmptyChatQuickStart[] = [
  {
    id: 'deep-search',
    label: 'Deep Search',
    icon: Telescope,
    iconName: 'telescope',
    prompt: 'Deep-search my workspace for ',
    systemContext:
      'QUICK ACTION — DEEP SEARCH: Search broadly across the current Space, accessible workspace content, and Brain context. Use search_space_context and search_brain_context, then verify promising matches with the relevant read actions. Search the live web only when the user asks for external information. Return the best matches with native links or IDs and identify where each result came from.',
  },
  {
    id: 'task',
    label: 'Task',
    icon: CheckSquare,
    iconName: 'check-square',
    prompt: 'Create a task for ',
    systemContext:
      'QUICK ACTION — TASK: Create a real Space task with create_task. Use the current Space when one is in scope; otherwise let create_task resolve or ensure the appropriate task Space. Include a useful title and any stated owner, due date, description, or priority. Read the Space schema before sending custom status or priority values. Return the created task link or ID from the tool receipt.',
  },
  {
    id: 'image',
    label: 'Image',
    icon: Image,
    iconName: 'image',
    prompt: 'Generate an image of ',
    systemContext:
      'QUICK ACTION — IMAGE: Generate the requested image with generate_image so the user receives a real media asset. Use attached or referenced images as source assets when present and state what to preserve for edits. Infer a sensible aspect ratio from the request when possible; ask only when a missing visual decision would materially change the result. Do not substitute a text-only prompt or mock receipt.',
  },
  {
    id: 'video',
    label: 'Video',
    icon: Video,
    iconName: 'video',
    prompt: 'Create a video of ',
    systemContext:
      'QUICK ACTION — VIDEO: First establish which output the user wants: a single video clip, a produced organic story ad, or a video script. Single clip: call generate_video with the prompt, pass space_id from the current Space so the finished asset registers in Space Media, honor any stated model or aspect ratio, then wait 30 seconds and poll get_video_status with the returned job_id until succeeded or failed (max ~5 polls). Produced organic story ad: gather the kickoff conversationally — industry or scene preference, copy mode (write_for_me or use_my_copy), sticker copy (pill line, headline, highlight phrase, CTA line), and offer context — then call create_mission with playbook_id "ig-organic-video-ad" and the collected fields under input.playbook_kickoff, and return the mission from the tool receipt. Script only: write the script and save it with create_docx. Every path ends in a real tool receipt — do not stop at a text description of a video.',
  },
  {
    id: 'slides',
    label: 'Slides',
    icon: Presentation,
    iconName: 'presentation',
    prompt: 'Create a presentation about ',
    systemContext:
      'QUICK ACTION — SLIDES: Create a native editable presentation with create_presentation. Use the current campaign theme and available research or attachments, build a coherent slide narrative, and return the presentation artifact from the successful tool receipt. Do not stop at an outline unless the user specifically asks for an outline.',
  },
  {
    id: 'doc',
    label: 'Doc',
    icon: FileText,
    iconName: 'file-text',
    prompt: 'Create a document about ',
    systemContext:
      'QUICK ACTION — DOC: Create a native editable document with create_docx using the current Space or campaign context when available. Produce complete, usable content with a clear title and structure. Return the created document artifact from the tool receipt; do not provide only a chat draft unless the user asks for text only.',
  },
  {
    id: 'daily-brief',
    label: 'Daily Brief',
    icon: Users,
    iconName: 'users',
    prompt: 'Prepare my daily brief for ',
    systemContext:
      'QUICK ACTION — DAILY BRIEF: Build a private, actionable briefing from the user’s accessible tasks, calendar, recent meetings, messages, and current Space context. Start with get_person_briefing or get_person_agenda, then use the relevant read/list actions for missing detail. Summarize today’s priorities, meetings, blockers, follow-ups, and drafts that need approval. Do not invent unavailable data or send messages. Create a saved document only when requested.',
  },
  {
    id: 'delegate',
    label: 'Delegate',
    icon: Infinity,
    iconName: 'infinity',
    prompt: 'Delegate this to the right agent: ',
    systemContext:
      'QUICK ACTION — DELEGATE: Resolve the best managed agent with list_team, then create real delegated work with delegate_to_agent. Use brainstorm_agents only when the user wants multiple agents to debate or ideate together. Give the assignee a concrete outcome, scope, and relevant context, and return the delegation receipt. Do not simulate agent work in the current response.',
  },
]

export type ShellChatQuickStart = ShellEmptyChatQuickStart
