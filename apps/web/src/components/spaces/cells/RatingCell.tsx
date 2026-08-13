'use client'

import { Star, StarHalf, X } from 'lucide-react'
import type { BaseCellProps } from './cell-types'

const MAX_STARS = 5
const MIN_RATING = 0.5

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2
}

function toRating(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
  if (Number.isNaN(n)) return null
  const rounded = roundToHalf(n)
  if (rounded < MIN_RATING || rounded > MAX_STARS) return null
  return rounded
}

function sameStep(a: number, b: number): boolean {
  return Math.round(a * 2) === Math.round(b * 2)
}

/** One click on star k: k−0.5, second click: k. Lower star clicks reduce toward that star’s half. */
function ratingAfterStarClick(r: number | null, k: number): number {
  const half = k - 0.5
  if (r == null) {
    return half
  }
  if (r < half) {
    return half
  }
  if (sameStep(r, half)) {
    return k
  }
  if (sameStep(r, k)) {
    return half
  }
  if (r > k) {
    return half
  }
  return half
}

type StarState = 'empty' | 'half' | 'full'

function stateForStar(rating: number | null, starIndex: number): StarState {
  if (rating == null) return 'empty'
  if (rating >= starIndex) return 'full'
  if (rating >= starIndex - 0.5) return 'half'
  return 'empty'
}

function StarIcon({ state, size }: { state: StarState; size: number }) {
  if (state === 'full') {
    return (
      <Star
        className="shrink-0 text-amber-400"
        size={size}
        fill="currentColor"
        strokeWidth={0}
        aria-hidden
      />
    )
  }
  if (state === 'half') {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <Star
          className="absolute left-0 top-0 text-[var(--color-muted-foreground)]"
          size={size}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        />
        <StarHalf
          className="absolute left-0 top-0 text-amber-400"
          size={size}
          fill="currentColor"
          strokeWidth={0}
          aria-hidden
        />
      </div>
    )
  }
  return (
    <Star
      className="shrink-0 text-[var(--color-muted-foreground)]"
      size={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    />
  )
}

export function RatingStarsReadonly({ value, size = 14 }: { value: unknown; size?: number }) {
  const rating = toRating(value)
  if (rating == null) return null
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const starIndex = i + 1
        return <StarIcon key={starIndex} state={stateForStar(rating, starIndex)} size={size} />
      })}
    </div>
  )
}

export function RatingCell({
  value,
  onChange,
  readonly,
  fieldRowVariant = 'default',
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const rating = toRating(value)
  const isKanban = fieldRowVariant === 'kanban'
  const iconSize = isKanban ? 12 : 14
  const xSize = isKanban ? 10 : 11

  if (readonly && rating == null) {
    return <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
  }

  const showClear = !readonly && rating != null

  return (
    <div className={`group relative w-full min-w-0 ${showClear ? 'pr-5' : ''}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: MAX_STARS }, (_, i) => {
          const starIndex = i + 1
          const st = stateForStar(rating, starIndex)
          if (readonly) {
            return <StarIcon key={starIndex} state={st} size={iconSize} />
          }
          return (
            <button
              key={starIndex}
              type="button"
              className="shrink-0 border-0 bg-transparent p-0"
              title={`Set rating (star ${starIndex})`}
              aria-label={`Star ${starIndex}`}
              onClick={(e) => {
                e.stopPropagation()
                onChange(ratingAfterStarClick(rating, starIndex))
              }}
            >
              <StarIcon state={st} size={iconSize} />
            </button>
          )
        })}
      </div>
      {showClear && (
        <button
          type="button"
          className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center rounded border-0 p-0.5 text-[var(--color-muted-foreground)] opacity-0 transition-[opacity,colors] duration-150 hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] group-hover:pointer-events-auto group-hover:opacity-100 motion-reduce:transition-none"
          style={{ minWidth: xSize, minHeight: xSize }}
          title="Clear rating"
          aria-label="Clear rating"
          onClick={(e) => {
            e.stopPropagation()
            onChange(null)
          }}
        >
          <X className="shrink-0" size={xSize} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
