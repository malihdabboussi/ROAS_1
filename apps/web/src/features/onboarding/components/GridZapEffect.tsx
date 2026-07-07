'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useState } from 'react'

interface Zap {
  id: number
  type: 'horizontal' | 'vertical'
  index: number
  duration: number
  startPct: number
  lengthPct: number
  travelDistPct: number
  direction: 1 | -1
}

const GRID_SIZE = 64

export function GridZapEffect() {
  const [zaps, setZaps] = useState<Zap[]>([])

  const createZap = useCallback(() => {
    const isHorizontal = Math.random() > 0.5
    const id = Date.now() + Math.random()
    const duration = 3 + Math.random() * 2
    const index = Math.floor(Math.random() * 50) + 1
    const startPct = Math.random() * 100
    const lengthPct = 10 + Math.random() * 20
    const travelDistPct = 30 + Math.random() * 30
    const direction = Math.random() > 0.5 ? 1 : -1

    const newZap: Zap = {
      id,
      type: isHorizontal ? 'horizontal' : 'vertical',
      index,
      duration,
      startPct,
      lengthPct,
      travelDistPct,
      direction,
    }

    setZaps((prev) => [...prev, newZap])
    setTimeout(() => {
      setZaps((prev) => prev.filter((z) => z.id !== id))
    }, duration * 1000)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        createZap()
      }
    }, 500)
    return () => clearInterval(interval)
  }, [createZap])

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      {zaps.map((zap) => {
        const gradientAngle =
          zap.type === 'horizontal'
            ? zap.direction === 1
              ? '90deg'
              : '270deg'
            : zap.direction === 1
              ? '180deg'
              : '0deg'

        const transformOrigin =
          zap.type === 'horizontal'
            ? zap.direction === 1
              ? 'right center'
              : 'left center'
            : zap.direction === 1
              ? 'center bottom'
              : 'center top'

        const horizontalStyle: CSSProperties = {
          top: `${zap.index * GRID_SIZE}px`,
          left: `${zap.startPct}%`,
          width: `${zap.lengthPct}%`,
          height: '1px',
          ['--travel' as string]: `${zap.travelDistPct * zap.direction}%`,
          transformOrigin,
          animation: `vibey-awakening-zap-h ${zap.duration}s ease-in-out forwards`,
          background: `linear-gradient(${gradientAngle}, transparent 0%, rgba(147, 51, 234, 0.2) 20%, rgba(252, 103, 217, 0.8) 100%)`,
          boxShadow: '0 0 4px 0.5px rgba(252, 103, 217, 0.3)',
          opacity: 0,
          willChange: 'transform, opacity',
        }

        const verticalStyle: CSSProperties = {
          left: `${zap.index * GRID_SIZE}px`,
          top: `${zap.startPct}%`,
          height: `${zap.lengthPct}%`,
          width: '1px',
          ['--travel' as string]: `${zap.travelDistPct * zap.direction}%`,
          transformOrigin,
          animation: `vibey-awakening-zap-v ${zap.duration}s ease-in-out forwards`,
          background: `linear-gradient(${gradientAngle}, transparent 0%, rgba(147, 51, 234, 0.2) 20%, rgba(252, 103, 217, 0.8) 100%)`,
          boxShadow: '0 0 4px 0.5px rgba(252, 103, 217, 0.3)',
          opacity: 0,
          willChange: 'transform, opacity',
        }

        return (
          <div
            key={zap.id}
            className="absolute"
            style={zap.type === 'horizontal' ? horizontalStyle : verticalStyle}
          />
        )
      })}
    </div>
  )
}
