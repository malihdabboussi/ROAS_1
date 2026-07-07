import { ChevronDown, Mic, Paperclip, Settings2 } from 'lucide-react'

/** Studio chat + skill artifact; mirrors apps/web ChatInterface + MessageBubble (full-width user card; assistant `mx-2` text column, no avatar). */
export function StudioSkillChatPreview() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#161616]"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <div className="relative flex h-full min-h-0 w-full flex-col px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
        <div className="mb-4 flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
          <div className="w-full min-w-0">
            <div className="card-glass card-glass-user px-spacing-4 py-2">
              <p className="body-2 font-normal text-white">
                Create a skill that automatically scores our new inbound leads from Typeform based
                on their revenue and company size, and routes high-intent ones to the sales channel
                in Slack.
              </p>
            </div>
          </div>

          <div className="mx-2 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="body-1 text-chat px-spacing-2 flex flex-col">
              <p className="body-2 font-normal leading-relaxed text-white/90">
                I&apos;ve drafted the <strong className="font-bold">Lead Score & Routing</strong>{' '}
                skill for you. It will evaluate incoming Typeform leads and automatically notify the
                team when a lead fits your ICP criteria.
              </p>
            </div>
            <div className="w-full max-w-[300px] rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-400">{'{ }'}</span>
                </div>
                <span className="text-sm font-semibold text-white">Lead Score & Routing</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-[11px] text-white/50">Skill created</span>
                <span className="text-[11px] font-semibold text-emerald-400">Ready to test →</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-auto shrink-0">
          <div className="input-glass flex flex-col rounded-2xl border border-white/10 !bg-white/[0.03] shadow-2xl">
            <div className="px-3 pb-1 pt-2.5 md:px-4 md:pt-3">
              <p className="body-2 font-normal text-white/30">Message Vibe...</p>
            </div>

            <div className="mt-2 flex items-center justify-between px-2 py-2 md:px-3">
              <div className="flex items-center gap-1.5">
                <div className="chip-glass-blue flex h-8 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 text-[11px] font-medium text-blue-400">
                  <span className="typo-caption font-medium">Auto</span>
                  <ChevronDown size={12} className="opacity-60" />
                </div>
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Paperclip size={14} />
                </div>
                <div className="flex h-8 items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/20 px-2.5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <Settings2 size={14} />
                  <span className="typo-caption font-bold">3</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Mic size={14} />
                </div>
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/20">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
