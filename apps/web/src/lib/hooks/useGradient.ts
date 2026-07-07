import { useEffect, useState } from 'react'
import { interpolateColor } from '@/lib/utils/colors/color-utils'

export interface GradientStop {
  id: string
  position: number
  color: string
}

const generateStopId = () => `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useGradient = (initialValue: string, onChange: (gradient: string) => void) => {
  const [stops, setStops] = useState<GradientStop[]>([
    { id: generateStopId(), position: 0, color: '#FF0000' },
    { id: generateStopId(), position: 100, color: '#0000FF' },
  ])
  const [angle, setAngle] = useState(90)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)

  const parseGradient = (gradientStr: string): { stops: GradientStop[]; angle: number } | null => {
    const angleMatch = gradientStr.match(/linear-gradient\((\d+)deg/)
    if (!angleMatch?.[1]) return null

    const parsedAngle = parseInt(angleMatch[1], 10)
    const stopsMatch = gradientStr.match(/#[0-9A-Fa-f]{6}\s+\d+%/g)
    if (!stopsMatch) return null

    const parsedStops: GradientStop[] = stopsMatch
      .map((stopStr) => {
        const colorMatch = stopStr.match(/#[0-9A-Fa-f]{6}/)
        const positionMatch = stopStr.match(/(\d+)%/)
        if (!colorMatch?.[0] || !positionMatch?.[1]) return null

        return {
          id: generateStopId(),
          color: colorMatch[0],
          position: parseInt(positionMatch[1], 10),
        }
      })
      .filter((s): s is GradientStop => s !== null)

    return { stops: parsedStops, angle: parsedAngle }
  }

  const getGradientCSS = (gradientStops: GradientStop[], gradientAngle: number): string => {
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position)
    const stopStrings = sortedStops.map((stop) => `${stop.color} ${stop.position}%`)
    return `linear-gradient(${gradientAngle}deg, ${stopStrings.join(', ')})`
  }

  useEffect(() => {
    if (initialValue.startsWith('linear-gradient')) {
      const parsed = parseGradient(initialValue)
      if (parsed) {
        setStops(parsed.stops)
        setAngle(parsed.angle)

        if (!isInitialized) {
          setSelectedIndex(0)
          setIsInitialized(true)
        }
      }
    }
  }, [initialValue, isInitialized])

  const interpolateColorAtPosition = (gradientStops: GradientStop[], position: number): string => {
    const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position)

    for (let i = 0; i < sortedStops.length - 1; i++) {
      const curr = sortedStops[i]
      const next = sortedStops[i + 1]
      if (!curr || !next) continue
      if (curr.position <= position && next.position >= position) {
        const ratio = (position - curr.position) / (next.position - curr.position)
        return interpolateColor(curr.color, next.color, ratio)
      }
    }

    return '#808080'
  }

  const addStop = () => {
    if (stops.length >= 5) return

    const sortedStops = [...stops].sort((a, b) => a.position - b.position)
    let maxGap = 0
    let insertPosition = 50
    let insertAfterIndex = 0

    for (let i = 0; i < sortedStops.length - 1; i++) {
      const curr = sortedStops[i]
      const next = sortedStops[i + 1]
      if (!curr || !next) continue
      const gap = next.position - curr.position
      if (gap > maxGap) {
        maxGap = gap
        insertPosition = Math.round((curr.position + next.position) / 2)
        insertAfterIndex = i
      }
    }

    const newColor = interpolateColorAtPosition(sortedStops, insertPosition)
    const newStop = { id: generateStopId(), position: insertPosition, color: newColor }

    const newStops = [
      ...sortedStops.slice(0, insertAfterIndex + 1),
      newStop,
      ...sortedStops.slice(insertAfterIndex + 1),
    ]

    setStops(newStops)
    setSelectedIndex(insertAfterIndex + 1)
    onChange(getGradientCSS(newStops, angle))
  }

  const deleteStop = (index: number) => {
    if (stops.length <= 2) return

    const newStops = stops.filter((_, i) => i !== index)
    setStops(newStops)
    setSelectedIndex(Math.max(0, Math.min(index, newStops.length - 1)))
    onChange(getGradientCSS(newStops, angle))
  }

  const updateStopColor = (index: number, color: string) => {
    const newStops = [...stops]
    const stop = newStops[index]
    if (!stop) return
    stop.color = color
    setStops(newStops)
    onChange(getGradientCSS(newStops, angle))
  }

  const updateStopPosition = (index: number, position: number) => {
    const stop = stops[index]
    if (!stop) return
    const clampedPosition = Math.max(0, Math.min(100, Math.round(position)))
    const newStops = [...stops]
    newStops[index] = { ...stop, position: clampedPosition }

    const sortedStops = newStops.sort((a, b) => a.position - b.position)

    const newIndex = sortedStops.findIndex((s) => s.id === stop.id)

    setStops(sortedStops)
    setSelectedIndex(newIndex >= 0 ? newIndex : 0)
    onChange(getGradientCSS(sortedStops, angle))
  }

  const updateAngle = (newAngle: number) => {
    setAngle(newAngle)
    onChange(getGradientCSS(stops, newAngle))
  }

  return {
    stops,
    angle,
    selectedIndex,
    setSelectedIndex,
    addStop,
    deleteStop: () => deleteStop(selectedIndex),
    updateStopColor,
    updateStopPosition,
    updateAngle,
    getGradientCSS: (customStops?: GradientStop[], customAngle?: number) =>
      getGradientCSS(customStops || stops, customAngle || angle),
  }
}
