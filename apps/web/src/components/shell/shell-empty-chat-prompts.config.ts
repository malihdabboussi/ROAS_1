import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  CheckSquare,
  FileText,
  Flag,
  Image,
  Infinity,
  LineChart,
  Pencil,
  PlusCircle,
  Presentation,
  ScrollText,
  Search,
  Telescope,
  Users,
} from 'lucide-react'

/** Placeholders for empty / new conversations (ClickUp Brain–style). */
export const SHELL_EMPTY_CHAT_PLACEHOLDER = 'Ask, create, search, @ to mention…'

/**
 * Verb intents above the composer — how to approach the ask.
 * Distinct from capability chips (what to deliver) under the hero.
 */
export interface ShellEmptyChatAction {
  id: string
  label: string
  icon: LucideIcon
  iconName: string
  prompt: string
  systemContext: string
}

export const SHELL_EMPTY_CHAT_ACTIONS: ShellEmptyChatAction[] = [
  {
    id: 'find',
    label: 'Find',
    icon: Search,
    iconName: 'search',
    prompt: 'Find ',
    systemContext:
      'QUICK ACTION — FIND: Treat this as a retrieval request. Search the current Space and accessible workspace records with search_space_context, then use the relevant read/list actions for exact matches. Search Brain context when the request concerns stored knowledge. Return concrete matches with their native links or IDs. Do not create or modify records unless the user explicitly asks.',
  },
  {
    id: 'research',
    label: 'Research',
    icon: Telescope,
    iconName: 'telescope',
    prompt: 'Research ',
    systemContext:
      'QUICK ACTION — RESEARCH: Produce evidence-backed research, not a generic answer. Search accessible Brain and Space context first when relevant, then use web_search and web_fetch for current external facts. Cite the sources you actually opened, distinguish sourced facts from inference, and do not invent receipts. Create a saved deliverable only when the user asks for one.',
  },
  {
    id: 'create',
    label: 'Create',
    icon: PlusCircle,
    iconName: 'plus-circle',
    prompt: 'Create ',
    systemContext:
      'QUICK ACTION — CREATE: Deliver the requested native result instead of only describing it. Choose the matching action from the requested object: create_task for work, create_docx for a document, create_presentation for slides, generate_image for an image, or the matching native artifact action for other supported outputs. Ask one concise question only when a required decision cannot be inferred. Report completion only after a successful tool receipt.',
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: Pencil,
    iconName: 'pencil',
    prompt: 'Edit ',
    systemContext:
      'QUICK ACTION — EDIT: Update the referenced or currently selected native object in place. Read it first, preserve unrelated content, and use its matching update action. If no target can be resolved from the message, attachments, selected artifact, or current Space, ask which item to edit. Do not create a duplicate as a substitute for an update, and report success only after a tool receipt.',
  },
  {
    id: 'analyze',
    label: 'Analyze',
    icon: LineChart,
    iconName: 'line-chart',
    prompt: 'Analyze ',
    systemContext:
      'QUICK ACTION — ANALYZE: Inspect the relevant live records, artifact, Brain context, or connected source before drawing conclusions. Explain the strongest findings, evidence, risks, and next actions. Keep this read-only unless the user explicitly requests changes; do not claim an analysis was performed without reading the underlying data.',
  },
  {
    id: 'prioritize',
    label: 'Prioritize',
    icon: Flag,
    iconName: 'flag',
    prompt: 'Prioritize ',
    systemContext:
      'QUICK ACTION — PRIORITIZE: Load the relevant tasks or work items before ranking them. Prioritize using urgency, impact, dependencies, effort, and due dates, and explain the top choices briefly. If the user asks to apply the ranking, read the target Space schema and persist valid priority updates with update_task; otherwise return a recommendation without mutating records.',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Calendar,
    iconName: 'calendar',
    prompt: 'Schedule ',
    systemContext:
      'QUICK ACTION — SCHEDULE: Turn the request into a real scheduled object. Use create_calendar_event for a timed Google or Outlook event and create_task or update_task with dates for Space work. Resolve the connected provider and timezone; ask only for missing time, duration, attendees, or destination that cannot be inferred. Never say something is scheduled until the write action returns a successful receipt.',
  },
]

/**
 * Deliverable / capability starters under the empty-state hero.
 * Click seeds the composer; clearing the composer restores the scroller.
 */
export interface ShellEmptyChatCapability {
  id: string
  label: string
  icon: LucideIcon
  iconName: string
  prompt: string
  systemContext: string
}

export const SHELL_EMPTY_CHAT_CAPABILITIES: ShellEmptyChatCapability[] = [
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
    id: 'slides',
    label: 'Slides',
    icon: Presentation,
    iconName: 'presentation',
    prompt: 'Create a presentation about ',
    systemContext:
      'QUICK ACTION — SLIDES: Create a native editable presentation with create_presentation. Use the current campaign theme and available research or attachments, build a coherent slide narrative, and return the presentation artifact from the successful tool receipt. Do not stop at an outline unless the user specifically asks for an outline.',
  },
  {
    id: 'report',
    label: 'Report',
    icon: ScrollText,
    iconName: 'scroll-text',
    prompt: 'Create a sourced report about ',
    systemContext:
      'QUICK ACTION — REPORT: Research the subject with the relevant live Space, Brain, integration, and web tools, then create a native report with create_docx. Separate sourced facts from recommendations and include the source links actually used. Return the document artifact after the successful create receipt rather than only pasting a report into chat.',
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

export type ShellChatQuickStart = ShellEmptyChatAction | ShellEmptyChatCapability
