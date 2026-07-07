'use client'

export function HomeFounderNote() {
  return (
    <section className="bg-color-deep relative py-20 md:py-28">
      <div className="site-container">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card border-section relative overflow-hidden rounded-3xl border p-8 md:p-12">
            <div className="absolute -right-12 -top-12 size-48 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden />
            <div className="absolute -bottom-16 -left-12 size-56 rounded-full bg-purple-400/10 blur-3xl" aria-hidden />

            <div className="relative flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <p className="text-color-dim body-4 font-semibold uppercase tracking-[0.25em]">
                  A note from the founder
                </p>
              </div>

              <p className="body-1 leading-relaxed text-white">
                I did not build Vibey to replace your team. I built it because the people I respect
                most are drowning in tools that should be doing the boring half of the job for them.
              </p>

              <p className="body-2 text-color-secondary leading-relaxed">
                Every other &ldquo;AI for business&rdquo; tool I tried gave me a smarter chatbot
                and asked me to do the integration work. Vibey flips it: the system is the
                integration. Your knowledge lives in one place. Your agents share it. Your team
                works in the same workspace as them. The result is not autonomy theater — it is a
                hybrid org where humans make the calls and agents take the load.
              </p>

              <p className="body-2 text-color-secondary leading-relaxed">
                If that resonates, the Beta is open. Bring a real workflow. Connect a real tool.
                Tell me what breaks. I am building this for you.
              </p>

              <div className="border-color-glass mt-2 flex items-center gap-4 border-t pt-6">
                <div className="border-color-glass relative h-14 w-14 shrink-0 overflow-hidden rounded-full border">
                  <img
                    src="/images/authors/sefy-tofan.png"
                    alt="Sefy Tofan"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="body-3 font-semibold text-white">Sefy Tofan</p>
                  <p className="body-4 text-color-muted">Founder, Vibey</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
