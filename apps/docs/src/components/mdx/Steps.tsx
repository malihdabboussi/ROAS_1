import { Children, isValidElement } from 'react'

interface StepsProps {
  children: React.ReactNode
}

interface StepProps {
  title: string
  children: React.ReactNode
}

export function Steps({ children }: StepsProps) {
  const steps = Children.toArray(children).filter(isValidElement)

  return (
    <div className="relative my-8 ml-4">
      <div className="step-line" />
      <div className="space-y-8">
        {steps.map((child, i) => {
          if (isValidElement<StepProps>(child)) {
            return (
              <div key={i} className="relative pl-10">
                <div className="step-circle">
                  <span className="step-number">{i + 1}</span>
                </div>
                <h3
                  className="mb-1.5 text-[15px] font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  {child.props.title}
                </h3>
                <div className="text-[15px] [&>p]:mb-2" style={{ color: 'var(--text)' }}>
                  {child.props.children}
                </div>
              </div>
            )
          }
          return child
        })}
      </div>
    </div>
  )
}

export function Step({ title, children }: StepProps) {
  return (
    <div>
      <h3 className="mb-1.5 text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>
        {title}
      </h3>
      <div className="text-[15px] [&>p]:mb-2" style={{ color: 'var(--text)' }}>
        {children}
      </div>
    </div>
  )
}
