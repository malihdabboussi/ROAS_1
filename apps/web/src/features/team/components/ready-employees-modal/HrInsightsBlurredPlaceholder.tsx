const DESKTOP_LINES = [
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.',
  'Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
]

const MOBILE_LINES = [
  'Lorem ipsum dolor sit amet consectetur adipiscing.',
  'Ut enim ad minim veniam quis nostrud.',
]

export interface HrInsightsBlurredPlaceholderProps {
  variant: 'mobile' | 'desktop'
}

export function HrInsightsBlurredPlaceholder({ variant }: HrInsightsBlurredPlaceholderProps) {
  const lines = variant === 'desktop' ? DESKTOP_LINES : MOBILE_LINES
  return (
    <>
      {lines.map((text, i) => (
        <div key={i} className="card-glass-panel rounded-spacing-2 border-0 px-3 py-2">
          <p className="body-3 text-muted-foreground blur-sm">{text}</p>
        </div>
      ))}
    </>
  )
}
