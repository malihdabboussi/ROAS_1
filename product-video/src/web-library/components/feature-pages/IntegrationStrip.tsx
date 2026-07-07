import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function IntegrationStrip(props: { title: string; names: string[] }) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div className="mx-auto max-w-5xl">
            <h2 className="h2 mb-6 tracking-tight text-white">{props.title}</h2>
            <div className="flex flex-wrap gap-2">
              {props.names.map((name) => (
                <span
                  key={name}
                  className="chip-glass-neutral body-4 rounded-full px-4 py-2 font-medium text-white"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
