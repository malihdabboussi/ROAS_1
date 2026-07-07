import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideComms() {
  return (
    <Slide>
      <SlideLabel>Communications</SlideLabel>
      <SlideTitle>AGENTS COME TO YOU</SlideTitle>
      <SlideSub>
        Your team doesn&apos;t want another app. We bring the agents to your existing channels.
      </SlideSub>
      <div className="mt-8 grid w-full max-w-3xl gap-4 md:grid-cols-3">
        <div className="border-white/8 rounded-2xl border bg-white/[0.03] p-5">
          <div className="mb-3 text-xl">#</div>
          <div className="text-sm font-semibold text-white">Slack</div>
          <p className="mt-2 text-xs text-white/40">
            Agents live in your channels. Pull info, review data, execute tasks — from tools your
            team already uses.
          </p>
        </div>
        <div className="border-white/8 rounded-2xl border bg-white/[0.03] p-5">
          <div className="mb-3 text-xl">{'\u2708\uFE0F'}</div>
          <div className="text-sm font-semibold text-white">Telegram</div>
          <p className="mt-2 text-xs text-white/40">
            Message your agents from anywhere. Get updates, give instructions, review work — all
            from your phone.
          </p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 opacity-60">
          <div className="mb-3 text-xl">{'\u{1F4AC}'}</div>
          <div className="text-sm font-semibold text-white/60">WhatsApp</div>
          <p className="mt-2 text-xs text-white/30">Coming soon</p>
        </div>
      </div>
    </Slide>
  )
}
