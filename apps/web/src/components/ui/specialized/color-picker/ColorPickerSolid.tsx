'use client'

import { useRef } from 'react'
import { useColorPicker } from '@/lib/hooks/useColorPicker'
import { ColorPickerArea } from './ColorPickerArea'
import { ColorPickerFormatInputs } from './ColorPickerFormatInputs'
import { ColorPickerHueSlider } from './ColorPickerHueSlider'

interface ColorPickerSolidProps {
  value: string
  onChange: (color: string) => void
}

export function ColorPickerSolid({ value, onChange }: ColorPickerSolidProps) {
  const pickerLogic = useColorPicker(value, onChange)
  const saturationRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  return (
    <>
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
        currentColor={value}
        onMove={pickerLogic.handleHueMove}
        onEyeDropper={pickerLogic.handleEyeDropper}
        supportsEyeDropper={pickerLogic.supportsEyeDropper}
      />

      <ColorPickerFormatInputs
        format={pickerLogic.format}
        setFormat={pickerLogic.setFormat}
        value={value}
        hue={pickerLogic.hue}
        saturation={pickerLogic.saturationHSL}
        lightness={pickerLogic.lightnessHSL}
        onChange={onChange}
      />
    </>
  )
}
