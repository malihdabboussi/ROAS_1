import {
  Clapperboard,
  FileText,
  Filter,
  Globe,
  Image,
  Mail,
  Megaphone,
  Presentation,
  Rocket,
  ScrollText,
  Share2,
  Sheet,
  SquareCheckBig,
  Tag,
  Target,
  UserRound,
} from 'lucide-react'
import type { ShellEmptyChatQuickStart } from './shell-empty-chat-prompts.config'

/**
 * "+ Create" menu catalog: every item is a quick start (prompt seeds the
 * composer, systemContext targets the exact tool at send time). Grouped in
 * Dylan's order of operations — offer and avatar first, then production.
 */
export interface ShellCreateMenuItem extends ShellEmptyChatQuickStart {
  action?: 'composer' | 'mission'
  /** Muted right-aligned hint, e.g. "what you sell". */
  hint?: string
  /** Icon tile tint — a badge-glass-* utility from globals.css. */
  glassClass: string
  /** Rendered disabled with a "Soon" tag; prompt is never seeded. */
  comingSoon?: boolean
}

export interface ShellCreateMenuGroup {
  id: string
  label: string
  items: ShellCreateMenuItem[]
}

export function findShellCreateMenuItem(id: string): ShellCreateMenuItem | null {
  for (const group of SHELL_CREATE_MENU_GROUPS) {
    const item = group.items.find((entry) => entry.id === id)
    if (item) return item
  }
  return null
}

export const SHELL_CREATE_MENU_GROUPS: ShellCreateMenuGroup[] = [
  {
    id: 'start-with',
    label: 'Start With',
    items: [
      {
        id: 'create-mission',
        label: 'Mission',
        icon: Rocket,
        iconName: 'rocket',
        glassClass: 'badge-glass-purple',
        hint: 'background work',
        action: 'mission',
        prompt: '',
        systemContext: '',
      },
      {
        id: 'create-offer',
        label: 'Offer',
        icon: Tag,
        iconName: 'tag',
        glassClass: 'badge-glass-orange',
        hint: 'what you sell',
        prompt: 'Create an offer for ',
        systemContext:
          'QUICK ACTION — OFFER: Create a real offer with create_offer. Ask for the core promise, price point, and deliverables when they are missing, keep the offer stack concrete, and return the created offer artifact from the tool receipt.',
      },
      {
        id: 'create-avatar',
        label: 'Avatar / ICP',
        icon: UserRound,
        iconName: 'user-round',
        glassClass: 'badge-glass-muted',
        hint: 'who you sell to',
        prompt: 'Create a customer avatar for ',
        systemContext:
          'QUICK ACTION — AVATAR: Create a customer avatar with create_avatar. Ground it in provided research or Brain context, cover identity, pains, desires, and objections, and return the created avatar artifact from the tool receipt.',
      },
    ],
  },
  {
    id: 'docs-decks',
    label: 'Docs & Decks',
    items: [
      {
        id: 'create-document',
        label: 'Document',
        icon: FileText,
        iconName: 'file-text',
        glassClass: 'badge-glass-blue',
        prompt: 'Create a document about ',
        systemContext:
          'QUICK ACTION — DOC: Create a native editable document with create_docx using the current Space or campaign context when available. Produce complete, usable content with a clear title and structure. Return the created document artifact from the tool receipt; do not provide only a chat draft unless the user asks for text only.',
      },
      {
        id: 'create-presentation',
        label: 'Presentation',
        icon: Presentation,
        iconName: 'presentation',
        glassClass: 'badge-glass-orange',
        prompt: 'Create a presentation about ',
        systemContext:
          'QUICK ACTION — PRESENTATION: Create a native editable presentation with create_presentation. Use the current campaign theme and available research or attachments, build a coherent slide narrative, and return the presentation artifact from the successful tool receipt. Do not stop at an outline unless the user specifically asks for an outline.',
      },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      {
        id: 'create-funnel',
        label: 'Funnel',
        icon: Filter,
        iconName: 'filter',
        glassClass: 'badge-glass-purple',
        hint: '5 types',
        prompt: 'Create a funnel for ',
        systemContext:
          'QUICK ACTION — FUNNEL: Create a real funnel with create_funnel. Confirm the funnel type (lead magnet, call booking, webinar, VSL, or custom) when unclear, build the page flow for that type, and return the created funnel artifact from the tool receipt.',
      },
      {
        id: 'create-ad',
        label: 'Ad',
        icon: Megaphone,
        iconName: 'megaphone',
        glassClass: 'badge-glass-red',
        hint: 'creative · copy',
        prompt: 'Create an ad for ',
        systemContext:
          'QUICK ACTION — AD: Ask whether the user needs ad creative, ad copy, or both, then create the ad with create_ad. Write copy in the client voice, keep identity callouts specific, and return the created ad artifact from the tool receipt.',
      },
      {
        id: 'create-sequence',
        label: 'Email Sequence',
        icon: Mail,
        iconName: 'mail',
        glassClass: 'badge-glass-green',
        prompt: 'Create an email sequence for ',
        systemContext:
          'QUICK ACTION — EMAIL SEQUENCE: Create a real sequence with create_sequence. Confirm the flow (webinar pre/post, replay, reactivation, or custom) when unclear, write every email in the client voice, and return the created sequence artifact from the tool receipt.',
      },
      {
        id: 'create-script',
        label: 'Script',
        icon: ScrollText,
        iconName: 'scroll-text',
        glassClass: 'badge-glass-blue',
        hint: 'Ad · VSL · Social',
        prompt: 'Write a script for ',
        systemContext:
          'QUICK ACTION — SCRIPT: Ask whether this is an ad, VSL, or social script when unclear, then create the script as a native document with create_docx. Structure it hook-first with clear shot or beat directions, and return the created document artifact from the tool receipt.',
      },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      {
        id: 'create-image',
        label: 'Image',
        icon: Image,
        iconName: 'image',
        glassClass: 'badge-glass-yellow',
        prompt: 'Generate an image of ',
        systemContext:
          'QUICK ACTION — IMAGE: Generate the requested image with generate_image so the user receives a real media asset. Use attached or referenced images as source assets when present and state what to preserve for edits. Infer a sensible aspect ratio from the request when possible; ask only when a missing visual decision would materially change the result. Do not substitute a text-only prompt or mock receipt.',
      },
      {
        id: 'create-video',
        label: 'Video',
        icon: Clapperboard,
        iconName: 'clapperboard',
        glassClass: 'badge-glass-yellow',
        prompt: 'Create a video for ',
        systemContext:
          'QUICK ACTION — VIDEO: Create the requested video with generate_video so the user receives a real media asset. Confirm the format and length when a missing decision would materially change the result. Do not substitute a text-only script unless the user asks for one.',
      },
    ],
  },
  {
    id: 'more',
    label: 'More',
    items: [
      {
        id: 'create-website',
        label: 'Website',
        icon: Globe,
        iconName: 'globe',
        glassClass: 'badge-glass-cyan',
        prompt: 'Create a website for ',
        systemContext:
          'QUICK ACTION — WEBSITE: Create a real website with create_website. Confirm the page goal and sections when unclear, use the current campaign theme, and return the created website artifact from the tool receipt.',
      },
      {
        id: 'create-social-post',
        label: 'Social Post',
        icon: Share2,
        iconName: 'share-2',
        glassClass: 'badge-glass-orange',
        prompt: 'Create a social post for ',
        systemContext:
          'QUICK ACTION — SOCIAL POST: Create a real social post with create_social_post. Confirm the platform and format (carousel, story, single post) when unclear, write it in the client voice, and return the created post artifact from the tool receipt.',
      },
      {
        id: 'create-ad-campaign',
        label: 'Ad Campaign',
        icon: Target,
        iconName: 'target',
        glassClass: 'badge-glass-red',
        prompt: 'Create an ad campaign for ',
        systemContext:
          'QUICK ACTION — AD CAMPAIGN: Create a real campaign shell with create_ad_campaign and any requested ad sets with create_ad_set. Confirm objective, budget, and audience when missing, and return the created campaign artifact from the tool receipt.',
      },
      {
        id: 'create-form',
        label: 'Form',
        icon: SquareCheckBig,
        iconName: 'square-check-big',
        glassClass: 'badge-glass-muted',
        comingSoon: true,
        prompt: '',
        systemContext: '',
      },
      {
        id: 'create-spreadsheet',
        label: 'Spreadsheet',
        icon: Sheet,
        iconName: 'sheet',
        glassClass: 'badge-glass-muted',
        comingSoon: true,
        prompt: '',
        systemContext: '',
      },
    ],
  },
]

/** The exact active Create catalog rendered above an empty chat composer. */
export const SHELL_CREATE_QUICK_STARTS = SHELL_CREATE_MENU_GROUPS.flatMap((group) =>
  group.items.filter((item) => !item.comingSoon),
)
