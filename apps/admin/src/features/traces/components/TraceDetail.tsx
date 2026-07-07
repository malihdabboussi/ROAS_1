'use client'

import { useState, type MouseEvent } from 'react'
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react'
import { formatAgentKeyDisplay } from '@/lib/format-agent-key-display'
import { formatTraceChannel } from '../lib/format-trace-channel'
import type { AgentTrace, AgentTraceToolStep } from '../types/agent-trace.types'
import { TraceToolCalls } from './TraceToolCalls'

interface TraceDetailProps {
  trace: AgentTrace
}

function CopyableSection({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-spacing-1 gap-spacing-2 flex items-center justify-between">
      <h4 className="body-2 text-muted-foreground font-medium">{title}</h4>
      <button
        type="button"
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-spacing-2 p-spacing-2 shrink-0 transition-colors"
        title={`Copy ${title}`}
      >
        {copied ? <Check className="icon-sm text-success" /> : <Copy className="icon-sm" />}
      </button>
    </div>
  )
}

function CollapsibleSection({
  title,
  text,
  defaultExpanded = false,
}: {
  title: string
  text: string
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mb-spacing-1 gap-spacing-2 flex w-full items-center justify-between text-left"
      >
        <span className="gap-spacing-2 flex items-center">
          {expanded ? (
            <ChevronDown className="icon-sm text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="icon-sm text-muted-foreground shrink-0" />
          )}
          <h4 className="body-2 text-muted-foreground font-medium">{title}</h4>
        </span>
        <span className="gap-spacing-1 flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void handleCopy(e)
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-spacing-2 p-spacing-2 shrink-0 transition-colors"
            title={`Copy ${title}`}
          >
            {copied ? <Check className="icon-sm text-success" /> : <Copy className="icon-sm" />}
          </button>
        </span>
      </button>
      {expanded && (
        <pre className="bg-muted/50 text-foreground mt-spacing-1 rounded-spacing-2 p-spacing-3 max-h-40 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words text-xs">
          {text}
        </pre>
      )}
    </div>
  )
}

function formatJson(obj: unknown): string {
  if (obj == null) return '(empty)'
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

function formatToolStepDetails(step: AgentTraceToolStep): string | null {
  const details: Record<string, unknown> = {}
  if (step.tool_call_id) details.tool_call_id = step.tool_call_id
  if (step.action) details.action = step.action
  if (step.input) details.input = step.input
  if (step.result) details.result = step.result
  return Object.keys(details).length > 0 ? formatJson(details) : null
}

export function TraceDetail({ trace }: TraceDetailProps) {
  const rawInputStr = trace.messages_input ? formatJson(trace.messages_input) : '(empty)'
  const rawOutputStr = trace.response ?? '(empty)'
  const steps = trace.tool_steps ?? []

  return (
    <div className="body-3 gap-spacing-6 flex flex-col">
      <div className="gap-spacing-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Agent</p>
          <p className="body-2 font-medium">
            {formatAgentKeyDisplay(trace.gateway_agent_id ?? trace.agent_key)}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Channel</p>
          <p className="body-2 font-medium">{formatTraceChannel(trace.channel)}</p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">History</p>
          <p className="body-2 font-mono font-medium">{trace.history_length} msgs</p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Input tokens</p>
          <p className="body-2 font-mono font-medium">
            {trace.input_tokens != null ? trace.input_tokens.toLocaleString() : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Output tokens</p>
          <p className="body-2 font-mono font-medium">
            {trace.output_tokens != null ? trace.output_tokens.toLocaleString() : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Total tokens</p>
          <p className="body-2 font-mono font-medium">
            {trace.total_tokens != null ? trace.total_tokens.toLocaleString() : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Cache read</p>
          <p className="body-2 font-mono font-medium">
            {trace.cache_read_tokens != null ? trace.cache_read_tokens.toLocaleString() : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Cache write</p>
          <p className="body-2 font-mono font-medium">
            {trace.cache_write_tokens != null ? trace.cache_write_tokens.toLocaleString() : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Cost (USD)</p>
          <p className="body-2 font-mono font-medium">
            {trace.cost_usd != null ? `$${Number(trace.cost_usd).toFixed(4)}` : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Credits charged</p>
          <p className="body-2 font-mono font-medium">
            {trace.cost_usd != null
              ? Math.round(Number(trace.cost_usd) * 800).toLocaleString()
              : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Duration</p>
          <p
            className={`body-2 font-mono font-medium ${
              trace.duration_ms == null
                ? ''
                : trace.duration_ms < 2000
                  ? 'text-success'
                  : trace.duration_ms < 5000
                    ? 'text-warning'
                    : 'text-destructive'
            }`}
          >
            {trace.duration_ms != null
              ? trace.duration_ms < 1000
                ? `${trace.duration_ms}ms`
                : `${(trace.duration_ms / 1000).toFixed(1)}s`
              : '—'}
          </p>
        </div>
        <div className="card-glass p-spacing-3 min-w-0">
          <p className="body-4 text-muted-foreground mb-0.5">Session</p>
          <p className="body-4 truncate font-mono" title={trace.session_key}>
            {trace.session_key.slice(0, 20)}…
          </p>
        </div>
        <div className="card-glass p-spacing-3">
          <p className="body-4 text-muted-foreground mb-0.5">Conv</p>
          <p className="body-4 truncate font-mono" title={trace.conversation_id}>
            {trace.conversation_id.slice(0, 8)}…
          </p>
        </div>
      </div>
      {trace.system_prompt && (
        <CollapsibleSection
          title="System Prompt"
          text={trace.system_prompt}
          defaultExpanded={false}
        />
      )}
      <div>
        <CopyableSection title="Raw Input" text={rawInputStr} />
        <pre className="bg-muted/50 text-foreground mt-spacing-1 rounded-spacing-2 p-spacing-3 max-h-64 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs">
          {rawInputStr}
        </pre>
      </div>
      <div>
        <CopyableSection title="Raw Output" text={rawOutputStr} />
        <pre className="bg-muted/50 text-foreground mt-spacing-1 rounded-spacing-2 p-spacing-3 max-h-64 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words text-xs">
          {rawOutputStr}
        </pre>
      </div>

      <TraceToolCalls messagesOutput={trace.messages_output} />

      {steps.length > 0 && (
        <div>
          <h4 className="body-2 text-muted-foreground mb-spacing-1 font-medium">Tool Steps</h4>
          <ul className="space-y-spacing-1">
            {steps.map((step, i) => (
              <li
                key={i}
                className="bg-muted/30 rounded-spacing-2 px-spacing-2 py-spacing-1 text-xs"
              >
                <div className="gap-spacing-2 flex items-center">
                  <span
                    className={
                      step.status === 'completed' ? 'text-success' : 'text-destructive'
                    }
                  >
                    {step.status === 'completed' ? '✓' : '✗'}
                  </span>
                  <span className="font-mono">{step.name}</span>
                  {step.action ? (
                    <span className="text-muted-foreground font-mono">· {step.action}</span>
                  ) : null}
                  <span className="text-muted-foreground">{step.label}</span>
                </div>
                {formatToolStepDetails(step) ? (
                  <pre className="bg-muted/50 text-foreground mt-spacing-2 rounded-spacing-2 p-spacing-3 max-h-48 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs">
                    {formatToolStepDetails(step)}
                  </pre>
                ) : null}
                {step.status !== 'completed' && step.error ? (
                  <pre className="body-4 text-destructive mt-spacing-1 ml-6 max-h-24 overflow-y-auto whitespace-pre-wrap break-words font-sans">
                    {step.error}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {trace.error && (
        <div>
          <h4 className="body-2 text-destructive mb-spacing-1 font-medium">Error</h4>
          <pre className="bg-destructive/10 text-destructive rounded-spacing-2 p-spacing-3 overflow-x-auto whitespace-pre-wrap text-xs">
            {trace.error}
          </pre>
        </div>
      )}
    </div>
  )
}
