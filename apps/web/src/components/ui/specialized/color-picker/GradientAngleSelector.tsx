'use client'

import { Check } from 'lucide-react'
import type { GradientStop } from '@/lib/hooks/useGradient'

interface GradientAngleSelectorProps {
  angle: number
  stops: GradientStop[]
  onChange: (angle: number) => void
  getGradientCSS: (angle: number) => string
}

const GRADIENT_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

export function GradientAngleSelector({
  angle,
  stops: _stops,
  onChange,
  getGradientCSS,
}: GradientAngleSelectorProps) {
  return (
    <div>
      <label className="body-3 text-foreground mb-spacing-2 block">Angle</label>
      <div className="gap-spacing-2 grid grid-cols-4">
        {GRADIENT_ANGLES.map((presetAngle) => (
          <button
            key={presetAngle}
            type="button"
            onClick={() => onChange(presetAngle)}
            className="rounded-spacing-1 relative h-8 overflow-hidden transition-opacity hover:opacity-80"
            style={{
              background: getGradientCSS(presetAngle),
            }}
          >
            {angle === presetAngle && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg">
                  <Check className="text-primary h-3 w-3" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
