'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

export function Slide({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center overflow-hidden px-8 py-12 md:px-16 lg:px-24 max-md:justify-start max-md:overflow-y-auto max-md:px-3 max-md:py-4 max-[380px]:px-2.5 max-[380px]:py-3.5 ${className}`}
    >
      {children}
    </div>
  )
}

/** Eyebrow pill rendered above slide titles — hidden per design (kept as a no-op so callsites
 * across every slide stay untouched and we can revive it later without touching ~80 callers). */
export function SlideLabel(_: { children: ReactNode }) {
  return null
}

export function SlideTitle({
  children,
  delay = 0.3,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay }}
      className={`mx-auto max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-3xl font-bold tracking-tight text-white max-md:text-[1.7rem] max-md:leading-[1.04] max-[380px]:text-[1.5rem] md:text-5xl lg:text-6xl ${className}`}
    >
      {children}
    </motion.h2>
  )
}

export function SlideSub({
  children,
  delay = 0.6,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-white/50 max-md:mt-3 max-md:text-[0.95rem] max-[380px]:text-[0.88rem] md:text-lg ${className}`}
    >
      {children}
    </motion.p>
  )
}
