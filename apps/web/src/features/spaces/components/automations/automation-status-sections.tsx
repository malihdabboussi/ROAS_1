'use client'

import { STATUS_CATEGORIES } from '../../lib/status-categories'
import type { SelectOption } from '../../types/space-schema'
import { OptionDot } from '../OptionBadge'
import type { AutomationCategorizedSection } from './AutomationCategorizedSelect'

/** Same grouping as `SelectCell` for status (`group` defaults to `active`). */
export function buildAutomationStatusSections(
  statusOptions: SelectOption[],
): AutomationCategorizedSection[] {
  return STATUS_CATEGORIES.map((cat) => ({
    heading: cat.label,
    options: statusOptions
      .filter((o) => (o.group ?? 'active') === cat.id)
      .map((o) => ({
        value: o.id,
        label: o.label,
        leading: <OptionDot color={o.color} size="sm" />,
      })),
  })).filter((s) => s.options.length > 0)
}
