'use client'

import { useAnimatedNumber } from './hooks/useAnimatedNumber'

export function AnimatedPrice({ value, prevValue }: { value: number; prevValue: number }) {
  const animated = useAnimatedNumber(prevValue, value, 400, prevValue !== value)
  return <span className="text-foreground text-2xl font-bold">${animated.toLocaleString()}</span>
}
