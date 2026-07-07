'use client'

import React from 'react'

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  duration?: number
  pauseOnHover?: boolean
  direction?: 'left' | 'right' | 'up' | 'down'
  fade?: boolean
  fadeAmount?: number
}

function cx(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function Marquee({
  children,
  className,
  duration = 20,
  pauseOnHover = false,
  direction = 'left',
  fade = true,
  fadeAmount = 10,
  ...props
}: MarqueeProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isPaused, setIsPaused] = React.useState(false)

  const items = React.Children.toArray(children)
  const isVertical = direction === 'up' || direction === 'down'

  const animationName = isVertical
    ? direction === 'up'
      ? 'marquee-scroll-y'
      : 'marquee-scroll-y-reverse'
    : direction === 'left'
      ? 'marquee-scroll'
      : 'marquee-scroll-reverse'

  const maskGradient = isVertical
    ? `linear-gradient(to bottom, transparent 0%, black ${fadeAmount}%, black ${100 - fadeAmount}%, transparent 100%)`
    : `linear-gradient(to right, transparent 0%, black ${fadeAmount}%, black ${100 - fadeAmount}%, transparent 100%)`

  return (
    <>
      <style>{`
        @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes marquee-scroll-reverse { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @keyframes marquee-scroll-y { from { transform: translateY(0); } to { transform: translateY(-50%); } }
        @keyframes marquee-scroll-y-reverse { from { transform: translateY(-50%); } to { transform: translateY(0); } }
      `}</style>
      <div
        ref={containerRef}
        className={cx('flex w-full overflow-hidden', isVertical && 'flex-col', className)}
        style={{
          ...(fade && {
            maskImage: maskGradient,
            WebkitMaskImage: maskGradient,
          }),
        }}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
        {...props}
      >
        <div
          className={cx('flex shrink-0', isVertical && 'flex-col')}
          style={{
            animation: `${animationName} ${duration}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {items.map((item, index) => (
            <div key={`a-${index}`} className={cx('flex shrink-0', isVertical && 'w-full')}>
              {item}
            </div>
          ))}
          {items.map((item, index) => (
            <div key={`b-${index}`} className={cx('flex shrink-0', isVertical && 'w-full')}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
