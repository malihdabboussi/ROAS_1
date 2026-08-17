'use client'

import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  conversationScopeDisplayLabel,
  type ConversationScopeSelection,
} from '@/components/conversations/conversation-scope-picker-layout'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from '@/components/conversations/ConversationScopePicker'
import type { ChatHistoryFilterState } from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'

export function ChatHistoryFilterScopeRow({
  value,
  onChange,
  rowClass,
}: {
  value: ChatHistoryFilterState
  onChange: (next: ChatHistoryFilterState) => void
  rowClass: string
}) {
  const rowRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<ConversationScopePickerHandle>(null)
  const selected = Boolean(value.campaignId || value.spaceId)
  const displayValue = selected ? value.scopeLabel?.trim() || 'Campaign' : 'All'

  const applyScope = (scope: ConversationScopeSelection) => {
    const scopeLabel =
      scope.campaignId || scope.spaceId
        ? conversationScopeDisplayLabel({
            campaignName: scope.campaignName,
            spaceTitle: scope.spaceTitle,
            programName: scope.programName,
            campaignId: scope.campaignId,
            spaceId: scope.spaceId,
            emptyLabel: 'All',
          })
        : null
    onChange({
      ...value,
      campaignId: scope.campaignId,
      spaceId: scope.spaceId,
      scopeLabel,
    })
  }

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        onClick={() => pickerRef.current?.openMenuFromBanner()}
        className={cn(rowClass)}
      >
        <span className="text-foreground">Campaign</span>
        <span className="text-muted-foreground gap-spacing-1 flex min-w-0 items-center">
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="icon-sm shrink-0" aria-hidden />
        </span>
      </button>
      <ConversationScopePicker
        ref={pickerRef}
        conversation={null}
        campaignId={value.campaignId}
        spaceId={value.spaceId}
        hideTrigger
        allowClear
        bannerAnchorRef={rowRef}
        onScopeChanged={applyScope}
      />
    </>
  )
}
