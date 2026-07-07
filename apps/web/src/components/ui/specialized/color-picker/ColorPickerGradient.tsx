'use client'

import { useRef } from 'react'
import { useColorPicker } from '@/lib/hooks/useColorPicker'
import { useGradient } from '@/lib/hooks/useGradient'
import { ColorPickerArea } from './ColorPickerArea'
import { ColorPickerFormatInputs } from './ColorPickerFormatInputs'
import { ColorPickerHueSlider } from './ColorPickerHueSlider'
import { GradientAngleSelector } from './GradientAngleSelector'
import { GradientBar } from './GradientBar'

interface ColorPickerGradientProps {
  value: string
  onChange: (gradient: string) => void
}

export function ColorPickerGradient({ value, onChange }: ColorPickerGradientProps) {
  const gradient = useGradient(value, onChange)
  const selectedStop = gradient.stops[gradient.selectedIndex]
  const selectedColor = selectedStop?.color || '#000000'

  const pickerLogic = useColorPicker(selectedColor, (newColor) => {
    gradient.updateStopColor(gradient.selectedIndex, newColor)
  })

  const saturationRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <GradientBar
        stops={gradient.stops}
        selectedIndex={gradient.selectedIndex}
        onSelectStop={gradient.setSelectedIndex}
        onDragStop={gradient.updateStopPosition}
        onAddStop={gradient.addStop}
        onDeleteStop={gradient.deleteStop}
        getGradientCSS={() => gradient.getGradientCSS(gradient.stops, 90)}
        canDelete={gradient.stops.length > 2}
        canAdd={gradient.stops.length < 5}
      />

      <ColorPickerArea
        ref={saturationRef}
        hue={pickerLogic.hue}
        saturation={pickerLogic.saturation}
        lightness={pickerLogic.lightness}
        onMove={pickerLogic.handleSaturationMove}
      />

      <ColorPickerHueSlider
        ref={hueRef}
        hue={pickerLogic.hue}
        currentColor={selectedColor}
        onMove={pickerLogic.handleHueMove}
        onEyeDropper={pickerLogic.handleEyeDropper}
        supportsEyeDropper={pickerLogic.supportsEyeDropper}
      />

      <ColorPickerFormatInputs
        format={pickerLogic.format}
        setFormat={pickerLogic.setFormat}
        value={selectedColor}
        hue={pickerLogic.hue}
        saturation={pickerLogic.saturationHSL}
        lightness={pickerLogic.lightnessHSL}
        onChange={(newColor) => gradient.updateStopColor(gradient.selectedIndex, newColor)}
      />

      <div className="mt-spacing-4">
        <GradientAngleSelector
          angle={gradient.angle}
          stops={gradient.stops}
          onChange={gradient.updateAngle}
          getGradientCSS={(angle) => gradient.getGradientCSS(gradient.stops, angle)}
        />
      </div>
    </>
  )
}
