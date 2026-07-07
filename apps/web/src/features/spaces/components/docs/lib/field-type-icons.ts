import type React from 'react'
import {
  BarChart3,
  Calendar,
  CheckSquare,
  CircleDot,
  Clock,
  Contact,
  DollarSign,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  Phone,
  RefreshCw,
  Rocket,
  Star,
  Tags,
  Timer,
  Type,
  User,
} from 'lucide-react'
import type { FieldType } from '../../../types/space-schema'

export const FIELD_TYPE_ICON: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  select: CircleDot,
  multi_select: Tags,
  date: Calendar,
  url: LinkIcon,
  media: ImageIcon,
  assignee: User,
  contact: Contact,
  checkbox: CheckSquare,
  currency: DollarSign,
  email: Mail,
  phone: Phone,
  rating: Star,
  progress: BarChart3,
  duration: Timer,
  created_at: Clock,
  updated_at: RefreshCw,
  mission: Rocket,
}

export const NON_CLEARABLE_FIELD_TYPES = new Set(['created_at', 'updated_at', 'mission'])
