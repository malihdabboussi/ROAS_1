import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { CompareWaitlistButton } from '@/components/compare/CompareWaitlistButton'
import type { CompareSlug } from '@/lib/compare-content'

function ThemHeaderMark({ slug, label }: { slug: CompareSlug; label: string }) {
  if (slug === 'vs-chatgpt') {
    return (
      <img
        src="/compare/openai.svg"
        alt={label}
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
      />
    )
  }
  if (slug === 'vs-manus') {
    return (
      <span className="text-color-primary border-color-glass flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-xs font-bold text-neutral-900">
        M
      </span>
    )
  }
  return (
    <span className="text-color-primary border-color-glass flex h-8 min-w-[2rem] items-center justify-center rounded-lg border bg-white px-1.5 text-[10px] font-bold leading-tight text-neutral-900">
      CF
    </span>
  )
}

export function CompareMatrix(props: {
  compareSlug: CompareSlug
  themLabel: string
  rows: { capability: string; vibey: string; them: string }[]
}) {
  return (
    <section className="section-padding border-section relative border-t">
      <AnimateOnScroll>
        <div className="site-container">
          <div className="mx-auto max-w-5xl">
            <header className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
              <h2 className="h2 mb-2 tracking-tight text-white">Feature comparison</h2>
              <p className="text-text-muted body-2">Vibey vs. {props.themLabel}</p>
            </header>

            <div className="border-section mb-10 hidden overflow-hidden rounded-2xl border md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="border-color-glass body-3 text-color-muted w-[26%] border-b px-5 py-5 align-bottom font-medium">
                        Feature
                      </th>
                      <th className="border-emerald-soft bg-emerald-soft w-[40%] border border-b px-6 py-6 align-middle">
                        <div className="flex items-center gap-3">
                          <img
                            src="/Logos/logov2/icon-white.png"
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 object-contain"
                          />
                          <span className="body-2 font-semibold text-white">Vibey</span>
                        </div>
                      </th>
                      <th className="border-color-glass w-[34%] border-b px-5 py-5 align-bottom">
                        <div className="flex items-center gap-3">
                          <ThemHeaderMark slug={props.compareSlug} label={props.themLabel} />
                          <span className="body-2 font-semibold text-white">{props.themLabel}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.rows.map((row, i) => {
                      const isLast = i === props.rows.length - 1
                      return (
                        <tr key={row.capability}>
                          <td
                            className={`body-3 px-5 py-5 font-medium text-white md:py-6 ${isLast ? '' : 'border-color-glass border-b'}`}
                          >
                            {row.capability}
                          </td>
                          <td className="border-emerald-soft bg-emerald-soft body-3 text-color-secondary border-x border-b px-6 py-5 leading-relaxed md:py-6">
                            {row.vibey}
                          </td>
                          <td
                            className={`body-3 text-color-secondary px-5 py-5 leading-relaxed md:py-6 ${isLast ? '' : 'border-color-glass border-b'}`}
                          >
                            {row.them}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-10 space-y-4 md:hidden">
              {props.rows.map((row) => (
                <div
                  key={row.capability}
                  className="glass-card border-section overflow-hidden rounded-2xl border"
                >
                  <p className="border-color-glass body-3 border-b p-4 font-semibold text-white">
                    {row.capability}
                  </p>
                  <div className="border-emerald-soft bg-emerald-soft border-b px-4 py-4">
                    <p className="text-emerald-accent body-4 mb-1.5 font-semibold uppercase tracking-wide">
                      Vibey
                    </p>
                    <p className="body-3 text-color-secondary leading-relaxed">{row.vibey}</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-color-muted body-4 mb-1.5 font-semibold uppercase tracking-wide">
                      {props.themLabel}
                    </p>
                    <p className="body-3 text-color-secondary leading-relaxed">{row.them}</p>
                  </div>
                </div>
              ))}
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
