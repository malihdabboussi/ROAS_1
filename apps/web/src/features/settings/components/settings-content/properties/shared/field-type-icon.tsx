'use client'

import { LuCalendar, LuCheck, LuHash, LuList, LuType } from 'react-icons/lu'
import type { FieldType } from '@/lib/properties/custom-fields'

export function FieldTypeIcon({ type }: { type: FieldType }) {
  const cls = 'icon-xs'
  switch (type) {
    case 'text':
      return <LuType className={cls} />
    case 'number':
      return <LuHash className={cls} />
    case 'date':
      return <LuCalendar className={cls} />
    case 'dropdown':
      return <LuList className={cls} />
    case 'boolean':
      return <LuCheck className={cls} />
    default:
      return <LuType className={cls} />
  }
}
