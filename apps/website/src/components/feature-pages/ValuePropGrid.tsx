import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function ValuePropGrid(props: {
  title: string
  subtitle?: string
  items: { title: string; description: string }[]
}) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div>
            <h2 className="h2 mb-2 tracking-tight text-white">{props.title}</h2>
            {props.subtitle && (
              <p className="text-text-muted body-2 mb-8 max-w-2xl">{props.subtitle}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {props.items.map((item) => (
                <div
                  key={item.title}
                  className="glass-card glass-card-hover border-section rounded-2xl border p-6 transition-all"
                >
                  <h3 className="h4 mb-2 text-white">{item.title}</h3>
                  <p className="text-text-muted body-3 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
