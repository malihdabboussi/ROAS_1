'use client'

import { useState, type MouseEvent } from 'react'
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react'

interface TraceToolCallsProps {
  messagesOutput?: unknown
}

interface ToolCallEntry {
  id: string
  name: string
  action: string | null
  label: string | null
  arguments: unknown
  result: unknown
  isError: boolean | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function formatJson(value: unknown): string {
  if (value == null) return '(empty)'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function extractToolCalls(messagesOutput?: unknown): ToolCallEntry[] {
  const calls: ToolCallEntry[] = []
  const callsById = new Map<string, ToolCallEntry>()
  const output = Array.isArray(messagesOutput) ? messagesOutput : []

  for (const item of output) {
    const message = asRecord(item)
    if (!message) continue

    const content = Array.isArray(message.content) ? message.content : []
    for (const block of content) {
      const blockRecord = asRecord(block)
      if (!blockRecord) continue
      const type = getString(blockRecord.type)
      const name = getString(blockRecord.name)
      if (type !== 'toolCall' || !name) continue

      const args = blockRecord.arguments
      const argsRecord = asRecord(args)
      const dataRecord = asRecord(argsRecord?.data)
      const id =
        getString(blockRecord.id) ??
        `${name}-${calls.length + 1}`

      const entry: ToolCallEntry = {
        id,
        name,
        action: getString(argsRecord?.action),
        label: getString(argsRecord?.label) ?? getString(dataRecord?.label),
        arguments: args ?? null,
        result: null,
        isError: null,
      }
      calls.push(entry)
      callsById.set(id, entry)
    }

    const toolResultId = getString(message.toolCallId)
    if (!toolResultId) continue
    const target = callsById.get(toolResultId)
    if (!target) continue

    target.result = {
      content: message.content ?? null,
      details: message.details ?? null,
      isError: message.isError ?? null,
      timestamp: message.timestamp ?? null,
    }
    target.isError = typeof message.isError === 'boolean' ? message.isError : null
  }

  return calls
}

function ToolCallRow({ call, index }: { call: ToolCallEntry; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyText = formatJson({
    id: call.id,
    name: call.name,
    action: call.action,
    label: call.label,
    arguments: call.arguments,
    result: call.result,
  })

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(copyText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <li className="bg-muted/30 rounded-spacing-2 border-border border">
      <div className="gap-spacing-2 px-spacing-2 py-spacing-2 hover:bg-hover-subtle flex w-full items-center transition-colors">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="gap-spacing-2 flex min-w-0 flex-1 items-center text-left"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="icon-sm text-muted-foreground shrink-0" />
          )}
          <span className="body-4 text-muted-foreground w-8 shrink-0 font-mono">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="body-4 text-foreground min-w-0 flex-1 truncate font-mono">
            {call.name}
            {call.action ? ` · ${call.action}` : ''}
          </span>
          {call.label ? (
            <span className="body-4 text-muted-foreground hidden max-w-48 truncate sm:inline">
              {call.label}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-spacing-2 p-spacing-2 shrink-0 transition-colors"
          title="Copy tool call"
        >
          {copied ? <Check className="icon-sm text-emerald-500" /> : <Copy className="icon-sm" />}
        </button>
      </div>

      {expanded ? (
        <div className="border-border space-y-spacing-3 border-t p-spacing-3">
          <div>
            <p className="body-4 text-muted-foreground mb-spacing-1 font-medium">Arguments</p>
            <pre className="bg-muted/50 text-foreground rounded-spacing-2 p-spacing-3 max-h-64 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs">
              {formatJson(call.arguments)}
            </pre>
          </div>
          <div>
            <p className="body-4 text-muted-foreground mb-spacing-1 font-medium">Result</p>
            <pre className="bg-muted/50 text-foreground rounded-spacing-2 p-spacing-3 max-h-64 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs">
              {formatJson(call.result)}
            </pre>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function TraceToolCalls({ messagesOutput }: TraceToolCallsProps) {
  const calls = extractToolCalls(messagesOutput)
  if (calls.length === 0) return null

  return (
    <div>
      <h4 className="body-2 text-muted-foreground mb-spacing-1 font-medium">
        Tool Calls Chronology
      </h4>
      <ul className="space-y-spacing-1">
        {calls.map((call, index) => (
          <ToolCallRow key={`${call.id}-${index}`} call={call} index={index} />
        ))}
      </ul>
    </div>
  )
}
