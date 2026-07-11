import type { LucideIcon } from 'lucide-react'
import { Image, LayoutTemplate, Mail, Megaphone, Palette, Presentation } from 'lucide-react'

export type HomeDashboardTemplateId = 'social' | 'ad' | 'funnel' | 'design' | 'deck' | 'email'

export interface HomeDashboardTemplate {
  id: HomeDashboardTemplateId
  label: string
  icon: LucideIcon
  tilt: number
  placeholder: string
}

export const HOME_DASHBOARD_TEMPLATES: HomeDashboardTemplate[] = [
  {
    id: 'social',
    label: 'Social post',
    icon: Image,
    tilt: -7,
    placeholder: 'Tell Vibey about your social post…',
  },
  {
    id: 'ad',
    label: 'New ad',
    icon: Megaphone,
    tilt: 4,
    placeholder: 'Tell Vibey about your new ad…',
  },
  {
    id: 'funnel',
    label: 'Funnel',
    icon: LayoutTemplate,
    tilt: -3,
    placeholder: 'Tell Vibey about your funnel…',
  },
  {
    id: 'design',
    label: 'Design',
    icon: Palette,
    tilt: 5,
    placeholder: 'Tell Vibey about your design…',
  },
  {
    id: 'deck',
    label: 'Slide deck',
    icon: Presentation,
    tilt: -4,
    placeholder: 'Tell Vibey about your slide deck…',
  },
  {
    id: 'email',
    label: 'Email sequence',
    icon: Mail,
    tilt: 6,
    placeholder: 'Tell Vibey about your email sequence…',
  },
]

export function homeDashboardTemplate(id: HomeDashboardTemplateId | null | undefined) {
  if (!id) return null
  return HOME_DASHBOARD_TEMPLATES.find((t) => t.id === id) ?? null
}
