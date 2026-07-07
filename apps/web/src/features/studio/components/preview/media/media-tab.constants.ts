import { createElement } from 'react'
import { Briefcase, FileText, Gift, LayoutTemplate, Mail, Upload, User } from 'lucide-react'

export const DOC_TYPE_ICONS: Record<string, React.ReactNode> = {
  offer: createElement(Briefcase, { className: 'h-3.5 w-3.5 flex-shrink-0' }),
  avatar: createElement(User, { className: 'h-3.5 w-3.5 flex-shrink-0' }),
  funnel: createElement(LayoutTemplate, { className: 'h-3.5 w-3.5 flex-shrink-0' }),
  lead_magnet: createElement(Gift, { className: 'h-3.5 w-3.5 flex-shrink-0' }),
  sequence: createElement(Mail, { className: 'h-3.5 w-3.5 flex-shrink-0' }),
  email: createElement(FileText, { className: 'h-3.5 w-3.5 flex-shrink-0' }),
  upload: createElement(Upload, { className: 'h-3.5 w-3.5 flex-shrink-0' }),
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  offer: 'Offers',
  avatar: 'Avatars',
  funnel: 'Funnels',
  lead_magnet: 'Lead Magnets',
  sequence: 'Sequences',
  email: 'Emails',
  upload: 'Uploaded Documents',
}

export const INITIAL_SHOW = 5

export const VIEW_MODE_STORAGE_KEY = 'media-tab-view-mode'
