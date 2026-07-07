import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { CompareWaitlistButton } from '@/components/compare/CompareWaitlistButton'

export function CompareWhenToUse(props: {
  vibey: { title: string; points: string[]; summary: string }
  them: { title: string; points: string[]; summary: string }
}) {
  return (
    <section className="section-padding border-section relative border-t">
      <AnimateOnScroll>
        <div className="site-container">
          <div className="mx-auto max-w-5xl">
            <h2 className="h2 mx-auto mb-10 max-w-2xl text-center tracking-tight text-white md:mb-12">
              When to use each tool
            </h2>

            <div className="mb-10 grid gap-6 md:grid-cols-2 md:gap-8">
              <div className="glass-card border-section product-demo-user-bubble flex flex-col rounded-2xl border p-6 md:p-8">
                <h3 className="body-2 mb-5 font-bold text-white md:text-lg">{props.them.title}</h3>
                <ul className="flex-1 space-y-3">
                  {props.them.points.map((p) => (
                    <li
                      key={p}
                      className="text-color-secondary body-3 flex gap-2.5 leading-relaxed"
                    >
                      <span className="text-secondary-light shrink-0">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="border-color-glass body-4 text-color-muted mt-6 border-t pt-6 leading-relaxed">
                  {props.them.summary}
                </p>
              </div>

              <div className="glass-card border-section border-emerald-soft bg-emerald-soft flex flex-col rounded-2xl border p-6 md:p-8">
                <h3 className="body-2 mb-5 font-bold text-white md:text-lg">{props.vibey.title}</h3>
                <ul className="flex-1 space-y-3">
                  {props.vibey.points.map((p) => (
                    <li
                      key={p}
                      className="text-color-secondary body-3 flex gap-2.5 leading-relaxed"
                    >
                      <span className="text-emerald-accent shrink-0">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="border-emerald-soft body-4 text-color-muted mt-6 border-t pt-6 leading-relaxed">
                  {props.vibey.summary}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <CompareWaitlistButton className="chip-glass-emerald body-3 rounded-full px-10 py-3 font-semibold">
                Join Waitlist
              </CompareWaitlistButton>
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
