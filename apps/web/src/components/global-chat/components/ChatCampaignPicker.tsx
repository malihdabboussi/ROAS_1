'use client'

import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ChatCampaignPickerOption {
  id: string
  label: string
}

interface ChatCampaignPickerProps {
  options: ChatCampaignPickerOption[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}

export function ChatCampaignPicker({
  options,
  value,
  onChange,
  disabled = false,
}: ChatCampaignPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find((option) => option.id === value) ?? null
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return options
    return options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedQuery))
  }, [options, query])

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery('')
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Select client campaign"
          aria-expanded={open}
          className={cn(
            'button-default input-glass body-3 gap-spacing-2 px-spacing-3 flex w-full items-center justify-between text-left',
            selected ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {selected?.label ??
              (options.length === 0 ? 'No client campaigns available' : 'Select a campaign')}
          </span>
          <ChevronDown className="icon-sm shrink-0" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          collisionPadding={8}
          className="dropdown-menu-solid z-dropdown rounded-spacing-2 w-80 overflow-hidden outline-none"
        >
          <div className="border-border gap-spacing-2 p-spacing-2 flex items-center border-b">
            <Search className="icon-sm text-muted-foreground shrink-0" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search client campaigns…"
              aria-label="Search client campaigns"
              className="input-glass body-3 placeholder:text-muted-foreground min-w-0 flex-1 border-0 bg-transparent outline-none"
            />
          </div>

          <div className="p-spacing-2 max-h-72 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              <div className="gap-spacing-1 flex flex-col" role="listbox">
                {filteredOptions.map((option) => {
                  const isSelected = option.id === value
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.id)
                        setOpen(false)
                        setQuery('')
                      }}
                      className={cn(
                        'body-3 gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 flex w-full items-center text-left transition-colors',
                        isSelected
                          ? 'nav-glass-selected-purple text-foreground'
                          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {isSelected ? <Check className="icon-sm text-primary shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="body-3 text-muted-foreground p-spacing-3 text-center">
                No campaigns match that search.
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
