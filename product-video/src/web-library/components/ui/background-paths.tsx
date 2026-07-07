'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
    duration: 20 + (i % 9) * 1.15,
  }))

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="text-color-primary h-full w-full" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export type BackgroundPathsVariant = 'full' | 'embed'

export function BackgroundPaths({
  title = 'Background Paths',
  ctaLabel = 'Discover Excellence',
  variant = 'full',
  className,
}: {
  title?: string
  ctaLabel?: string
  variant?: BackgroundPathsVariant
  className?: string
}) {
  const words = title.split(' ')

  const isEmbed = variant === 'embed'

  return (
    <div
      className={cn(
        'bg-color-deep text-color-primary relative flex w-full items-center justify-center overflow-hidden',
        isEmbed ? 'h-full min-h-0 px-2 py-6' : 'min-h-screen',
        className,
      )}
    >
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div
        className={cn(
          'relative z-10 mx-auto px-4 text-center md:px-6',
          isEmbed ? 'max-w-full' : 'container max-w-4xl',
        )}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: isEmbed ? 0.8 : 2 }}
          className={cn('mx-auto', isEmbed ? 'max-w-[260px]' : 'max-w-4xl')}
        >
          <h1
            className={cn(
              'mb-4 font-bold tracking-tighter',
              isEmbed
                ? 'text-lg leading-tight sm:text-xl'
                : 'mb-8 text-5xl sm:text-7xl md:text-8xl',
            )}
          >
            {words.map((word, wordIndex) => (
              <span key={`${word}-${wordIndex}`} className="mr-2 inline-block last:mr-0">
                {word.split('').map((letter, letterIndex) => (
                  <motion.span
                    key={`${word}-${letterIndex}`}
                    initial={{ y: isEmbed ? 40 : 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.08 + letterIndex * 0.02,
                      type: 'spring',
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="gradient-text inline-block"
                  >
                    {letter === ' ' ? '\u00a0' : letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          <div className="border-color-glass bg-color-subtle group relative inline-block overflow-hidden rounded-2xl border p-px shadow-lg transition-shadow duration-300 hover:shadow-xl">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'rounded-[1.15rem] font-semibold backdrop-blur-md transition-all duration-300',
                isEmbed
                  ? 'px-4 py-2 text-[10px] group-hover:-translate-y-0.5'
                  : 'px-8 py-6 text-lg group-hover:-translate-y-0.5',
              )}
            >
              <span className="opacity-90 transition-opacity group-hover:opacity-100">
                {ctaLabel}
              </span>
              <span className="ml-2 opacity-70 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                →
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
