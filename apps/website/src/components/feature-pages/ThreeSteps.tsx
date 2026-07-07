import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import {
  FeatureMockupByKind,
  type FeatureMockupKind,
} from '@/components/feature-pages/FeatureMockups'

/** Fixed frame height: three columns share one row height; content uses `mt-auto` to bottom-align cards. */
const STEPS_MOCKUP_FRAME_H = 'h-[300px] max-h-[300px]'

export function ThreeSteps(props: {
  title: string
  steps: { title: string; description: string; mockupKind?: FeatureMockupKind }[]
}) {
  const hasMockups = props.steps.some((s) => s.mockupKind)

  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div>
            <h2 className="h2 mb-10 tracking-tight text-white">{props.title}</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {props.steps.map((step, i) => (
                <div key={step.title} className="flex flex-col gap-4">
                  <div className="md:hidden">
                    <h3 className="h4 mb-1 text-white">
                      {i + 1}. {step.title}
                    </h3>
                    <p className="text-text-muted body-3 leading-relaxed">{step.description}</p>
                  </div>
                  {hasMockups && step.mockupKind && (
                    <div
                      className={`glass-card border-section flex flex-col overflow-visible rounded-2xl border ${STEPS_MOCKUP_FRAME_H}`}
                    >
                      <div className="flex min-h-0 flex-1 flex-col overflow-visible">
                        <FeatureMockupByKind kind={step.mockupKind} compact />
                      </div>
                    </div>
                  )}
                  <div className="hidden md:block">
                    <h3 className="h4 mb-1 text-white">
                      {i + 1}. {step.title}
                    </h3>
                    <p className="text-text-muted body-3 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
