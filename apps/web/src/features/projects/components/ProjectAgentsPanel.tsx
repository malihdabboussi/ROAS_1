'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, Check, ChevronDown, Code, MessageSquare, Mic } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { listProjectAgents, type ProjectAgent } from '../services/project-agents.service'
import type { ProjectFileMap } from '../services/project-files.service'
import { VibeyAgentsIcon } from './VibeyAgentsIcon'

interface ProjectAgentsPanelProps {
  cachedFiles?: ProjectFileMap | null
  onIntegrate: (message: string) => void
}

const agentsTabStyles = `
@keyframes agents-text-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.agents-gradient-text {
  background: linear-gradient(90deg, #10b981, #06b6d4, #34d399, #10b981);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: agents-text-shimmer 3s linear infinite;
}
`

function detectSdkEnabled(cachedFiles?: ProjectFileMap | null): boolean {
  if (!cachedFiles?.files) return false
  const pkg = cachedFiles.files['/package.json']
  if (!pkg) return false
  return pkg.includes('@vibey/sdk')
}

export function ProjectAgentsPanel({ cachedFiles, onIntegrate }: ProjectAgentsPanelProps) {
  const sdkDetected = useMemo(() => detectSdkEnabled(cachedFiles), [cachedFiles])
  const [sdkRequested, setSdkRequested] = useState(false)
  const sdkEnabled = sdkDetected || sdkRequested

  const handleEnable = useCallback(() => {
    setSdkRequested(true)
    onIntegrate(
      'Enable Vibey Agents in this project. Please start by showing the integration confirmation card.',
    )
  }, [onIntegrate])

  if (!sdkEnabled) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: agentsTabStyles }} />
        <SdkPromoCard onEnable={handleEnable} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: agentsTabStyles }} />
      <SdkEnabledView onIntegrate={onIntegrate} />
    </div>
  )
}

function SdkPromoCard({ onEnable }: { onEnable: () => void }) {
  return (
    <div className="flex h-full items-center justify-center bg-[#050508] p-6">
      <div
        className="w-full max-w-[540px] overflow-hidden rounded-[32px] border border-border"
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 182, 212, 0.03) 50%, rgba(16, 185, 129, 0.02) 100%)',
          boxShadow: '0 20px 50px -10px rgba(16, 185, 129, 0.15)',
        }}
      >
        <div className="p-8 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <VibeyAgentsIcon size="md" />
            <h2
              className="flex items-center gap-2"
              style={{ fontFamily: 'var(--font-site-headline)', letterSpacing: '1px' }}
            >
              <span className="text-3xl font-black uppercase leading-tight text-white">Vibey</span>
              <span className="agents-gradient-text text-3xl font-black uppercase leading-tight">
                Agents
              </span>
            </h2>
          </div>

          <p className="body-1 text-muted-foreground px-4 font-medium leading-relaxed">
            Bring your AI team into your app. Chat, voice, and smart features powered by agents you
            already trained.
          </p>

          <div className="mt-8 flex flex-col gap-6 text-left">
            <FeatureRow
              icon={<Bot className="h-4 w-4 text-emerald-400" />}
              title="Your trained agents"
              description="Every agent you built, their skills, personality, and knowledge, available inside your app."
            />
            <FeatureRow
              icon={<Code className="h-4 w-4 text-cyan-400" />}
              title="Zero setup"
              description="Auth handled automatically. No API keys, no config files."
            />
            <FeatureRow
              icon={<MessageSquare className="h-4 w-4 text-emerald-400" />}
              title="Included in your plan"
              description="Uses your existing Vibey credits. No extra cost."
            />
          </div>

          <button
            type="button"
            onClick={onEnable}
            className="shadow-[0_20px_50px_-10px_rgba(16, 185, 129, 0.3)] group relative mt-10 w-full overflow-hidden rounded-2xl px-12 py-4 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 182, 212, 0.35) 100%)',
              color: 'rgb(167, 243, 208)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
            }}
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="relative z-10 flex items-center justify-center gap-3">
              <span>Enable</span>
              <span
                className="agents-gradient-text"
                style={{
                  fontFamily: 'var(--font-site-headline)',
                  fontWeight: 900,
                  letterSpacing: '1px',
                }}
              >
                AGENTS
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.12)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-foreground text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground body-3">{description}</p>
      </div>
    </div>
  )
}

function SdkEnabledView({ onIntegrate }: { onIntegrate: (message: string) => void }) {
  const [agents, setAgents] = useState<ProjectAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set())

  useEffect(() => {
    listProjectAgents()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleSnippets = useCallback((agentKey: string) => {
    setExpandedSnippets((prev) => {
      const next = new Set(prev)
      if (next.has(agentKey)) next.delete(agentKey)
      else next.add(agentKey)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#050508]">
        <VibeyLoadingOrb text="Loading team agents..." state="processing" size="lg" />
      </div>
    )
  }

  return (
    <div className="scrollbar-thin flex h-full flex-col overflow-y-auto bg-[#050508] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VibeyAgentsIcon size="sm" />
          <h2
            className="flex items-center gap-1.5"
            style={{
              fontFamily: 'var(--font-site-headline)',
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '2px',
            }}
          >
            <span className="uppercase text-white">Vibey</span>
            <span className="agents-gradient-text uppercase">Agents</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Enabled
          </span>
        </div>
      </div>

      <p className="body-3 text-muted-foreground mb-6">
        Your team agents are ready to integrate. Select an agent to add smart features to your app.
      </p>

      <div className="flex flex-col gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            snippetsExpanded={expandedSnippets.has(agent.agent_key)}
            onToggleSnippets={() => toggleSnippets(agent.agent_key)}
            onAddChat={() =>
              onIntegrate(
                `Integrate a chat interface for my agent "${agent.name}" (key: ${agent.agent_key}) into the app. Use @vibey/sdk for the API layer. Build a custom chat UI that fits the app's existing styling.`,
              )
            }
            onAddVoice={() =>
              onIntegrate(
                `Integrate a voice interface for my agent "${agent.name}" (key: ${agent.agent_key}) into the app. Use @vibey/sdk for the API layer. Build a voice input UI with a microphone button.`,
              )
            }
          />
        ))}
      </div>
    </div>
  )
}

function AgentCard({
  agent,
  snippetsExpanded,
  onToggleSnippets,
  onAddChat,
  onAddVoice,
}: {
  agent: ProjectAgent
  snippetsExpanded: boolean
  onToggleSnippets: () => void
  onAddChat: () => void
  onAddVoice: () => void
}) {
  const initials = agent.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="card-glass group relative overflow-hidden rounded-xl p-4">
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent group-hover:animate-[shimmer_3s_infinite]" />
      <div className="relative z-10 flex items-center gap-3">
        {agent.image_url ? (
          <img
            src={agent.image_url}
            alt={agent.name}
            className="h-9 w-9 shrink-0 rounded-full border border-emerald-500/20 object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-xs font-bold text-emerald-400">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-foreground group-hover:agents-gradient-text block truncate text-sm font-semibold transition-all">
            {agent.name}
          </span>
          <span className="body-3 text-muted-foreground block truncate">{agent.role}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onAddChat}
          className="chip-glass-neutral hover:chip-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 flex items-center rounded-lg text-xs font-medium transition-all"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Add Chat
        </button>
        <button
          type="button"
          onClick={onAddVoice}
          className="chip-glass-neutral hover:chip-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 flex items-center rounded-lg text-xs font-medium transition-all"
        >
          <Mic className="h-3.5 w-3.5" />
          Add Voice
        </button>
        <button
          type="button"
          onClick={onToggleSnippets}
          className="chip-glass-neutral hover:chip-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 flex items-center rounded-lg text-xs font-medium transition-all"
        >
          <Code className="h-3.5 w-3.5" />
          Code
          <ChevronDown
            className={`h-3 w-3 transition-transform ${snippetsExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {snippetsExpanded && (
        <div className="mt-3 flex flex-col gap-2">
          <CodeSnippet
            label="One-shot call"
            code={`import { vibey } from '@vibey/sdk'\n\nconst result = await vibey.agent('${agent.agent_key}').ask(\n  'Your prompt here',\n  { /* optional context */ }\n)\n// result.response — agent's text response`}
          />
          <CodeSnippet
            label="Streaming chat"
            code={`import { vibey } from '@vibey/sdk'\n\nconst conv = await vibey.conversations.create('${agent.agent_key}')\nawait vibey.chat.send(conv.id, 'Your message', {\n  onContent: (text) => console.log(text),\n  onDone: () => console.log('Done'),\n})`}
          />
        </div>
      )}
    </div>
  )
}

function CodeSnippet({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="card-glass-panel overflow-hidden rounded-lg">
      <div className="border-border flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-muted-foreground text-[10px] font-medium uppercase">{label}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="text-muted-foreground hover:text-foreground text-[10px] font-medium transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-3 text-[11px] leading-relaxed">
        <code className="text-foreground/80">{code}</code>
      </pre>
    </div>
  )
}
