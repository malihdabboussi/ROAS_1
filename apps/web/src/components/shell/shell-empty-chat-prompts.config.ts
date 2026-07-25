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
  prompt: string
}

export const SHELL_EMPTY_CHAT_ACTIONS: ShellEmptyChatAction[] = [
  { id: 'find', label: 'Find', icon: Search, prompt: 'Find ' },
  { id: 'research', label: 'Research', icon: Telescope, prompt: 'Research ' },
  { id: 'create', label: 'Create', icon: PlusCircle, prompt: 'Create ' },
  { id: 'edit', label: 'Edit', icon: Pencil, prompt: 'Edit ' },
  { id: 'analyze', label: 'Analyze', icon: LineChart, prompt: 'Analyze ' },
  { id: 'prioritize', label: 'Prioritize', icon: Flag, prompt: 'Prioritize ' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, prompt: 'Schedule ' },
]

/**
 * Deliverable / capability starters under the empty-state hero.
 * Click seeds the composer; clearing the composer restores the scroller.
 */
export interface ShellEmptyChatCapability {
  id: string
  label: string
  icon: LucideIcon
  prompt: string
}

export const SHELL_EMPTY_CHAT_CAPABILITIES: ShellEmptyChatCapability[] = [
  {
    id: 'deep-search',
    label: 'Deep Search',
    icon: Telescope,
    prompt: 'Deep search for ',
  },
  {
    id: 'task',
    label: 'Task',
    icon: CheckSquare,
    prompt: 'Create a task to ',
  },
  {
    id: 'image',
    label: 'Image',
    icon: Image,
    prompt: 'Generate an image of ',
  },
  {
    id: 'slides',
    label: 'Slides',
    icon: Presentation,
    prompt: 'Create a slide deck about ',
  },
  {
    id: 'report',
    label: 'Report',
    icon: ScrollText,
    prompt: 'Write a report on ',
  },
  {
    id: 'doc',
    label: 'Doc',
    icon: FileText,
    prompt: 'Draft a document about ',
  },
  {
    id: 'standup',
    label: 'StandUp',
    icon: Users,
    prompt: 'Write a standup update covering ',
  },
  {
    id: 'super-agents',
    label: 'Super Agents',
    icon: Infinity,
    prompt: 'Coordinate agents to ',
  },
]
