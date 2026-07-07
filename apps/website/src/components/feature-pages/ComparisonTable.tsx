import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function ComparisonTable(props: {
  title: string
  subtitle?: string
  columns: string[]
  rows: { label: string; cells: string[] }[]
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
            <div className="glass-card border-section overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-color-glass border-b">
                    <th className="text-color-muted body-3 p-4 font-medium">Capability</th>
                    {props.columns.map((c) => (
                      <th key={c} className="text-color-muted body-3 p-4 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.rows.map((row) => (
                    <tr key={row.label} className="border-color-glass border-b last:border-0">
                      <td className="body-3 p-4 font-medium text-white">{row.label}</td>
                      {row.cells.map((cell, i) => (
                        <td key={`${row.label}-${i}`} className="text-color-secondary body-3 p-4">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
