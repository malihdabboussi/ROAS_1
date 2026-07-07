import { Slide, SlideLabel } from './slide-primitives'

export function SlideProblem() {
  return (
    <Slide>
      <SlideLabel>The Problem</SlideLabel>
      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-2">
        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-8">
          <h3 className="font-[family-name:var(--font-site-headline)] text-2xl font-bold text-red-400 md:text-3xl">
            MARKETING IS BROKEN
          </h3>
          <ul className="mt-6 space-y-3 text-sm text-white/60">
            <li className="flex gap-3">
              <span className="mt-1 text-red-400/60">×</span>
              <span>
                The average SMB uses{' '}
                <a
                  href="https://chiefmartec.com/martech-landscape"
                  target="_blank"
                  rel="noopener"
                  className="border-b border-white/20 text-white/80 hover:text-white"
                >
                  7.2 marketing tools
                </a>{' '}
                that don&apos;t talk to each other
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-red-400/60">×</span> 2–4 weeks to launch a single campaign
              — what should take hours takes weeks of stitching
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-red-400/60">×</span> Brand voice becomes Frankenstein —
              different tools, different templates, zero consistency
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-red-400/60">×</span> The execution gap kills more
              businesses than bad strategy
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-8">
          <h3 className="font-[family-name:var(--font-site-headline)] text-2xl font-bold text-amber-400 md:text-3xl">
            AI AGENTS ARE UNSOLVED
          </h3>
          <ul className="mt-6 space-y-3 text-sm text-white/60">
            <li className="flex gap-3">
              <span className="mt-1 text-amber-400/60">×</span>
              <span>
                Gartner predicts{' '}
                <a
                  href="https://gartner.com/en/newsroom/press-releases/2025-08-26-gartner-predicts-40-percent-of-enterprise-apps-will-feature-task-specific-ai-agents-by-2026"
                  target="_blank"
                  rel="noopener"
                  className="border-b border-white/20 text-white/80 hover:text-white"
                >
                  40% of enterprise apps
                </a>{' '}
                will embed AI agents by end of 2026
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-amber-400/60">×</span> Claude, Cursor, ChatGPT are powerful
              — but they&apos;re single agents on your laptop
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-amber-400/60">×</span> CrewAI needs developers, OpenClaw
              needs server setup — no turnkey multi-agent system
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-amber-400/60">×</span> Enterprise needs remain unmet —
              permissions, compliance, custom workflows, autonomy
            </li>
          </ul>
        </div>
      </div>
      <p className="mt-8 max-w-3xl text-center text-sm font-medium italic text-white/30">
        &ldquo;Companies don&apos;t need another chatbot. They need an AI workforce they can hire,
        train, and manage — agents with memory, skills, tools, and real output that goes live.
        Nobody has built this. Until now.&rdquo;
      </p>
    </Slide>
  )
}
