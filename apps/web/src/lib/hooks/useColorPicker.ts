import { useEffect, useState } from 'react'
import { hexToHSL, hslToHex, hslToHSV, hsvToHSL } from '@/lib/utils/colors/color-utils'

/**
 * Hook to manage color picker state
 *
 * Handles:
 * - HSV color state (for visual picker positioning)
 * - HSL conversion for output (standard color format)
 * - Format switching (HEX/RGB/HSL)
 * - Color space interactions (saturation area, hue slider)
 * - EyeDropper API integration
 */
export const useColorPicker = (initialHex: string, onChange: (hex: string) => void) => {
  const [hue, setHue] = useState(0)
  const [saturationHsv, setSaturationHsv] = useState(100)
  const [valueHsv, setValueHsv] = useState(100)
  const [format, setFormat] = useState<'hex' | 'rgb' | 'hsl'>('hex')
  const [supportsEyeDropper, setSupportsEyeDropper] = useState(false)

  useEffect(() => {
    setSupportsEyeDropper('EyeDropper' in window)
  }, [])

  useEffect(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(initialHex)) {
      const hsl = hexToHSL(initialHex)
      const hsv = hslToHSV(hsl.h, hsl.s, hsl.l)
      setHue(hsv.h)
      setSaturationHsv(hsv.s)
      setValueHsv(hsv.v)
    }
  }, [initialHex])

  const getHSL = () => hsvToHSL(hue, saturationHsv, valueHsv)

  const updateColorFromHSV = (newHue: number, newSatHsv: number, newValueHsv: number) => {
    setHue(newHue)
    setSaturationHsv(newSatHsv)
    setValueHsv(newValueHsv)
    const hsl = hsvToHSL(newHue, newSatHsv, newValueHsv)
    const hex = hslToHex(hsl.h, hsl.s, hsl.l)
    onChange(hex)
  }

  const handleSaturationMove = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height))

    const newSatHsv = (x / rect.width) * 100
    const newValueHsv = 100 - (y / rect.height) * 100

    updateColorFromHSV(hue, newSatHsv, newValueHsv)
  }

  const handleHueMove = (clientX: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const newHue = (x / rect.width) * 360

    updateColorFromHSV(newHue, saturationHsv, valueHsv)
  }

  const handleEyeDropper = async () => {
    if (!('EyeDropper' in window)) return

    try {
      const eyeDropper = new (
        window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }
      ).EyeDropper()
      const result = await eyeDropper.open()
      const hex = result.sRGBHex.toUpperCase()

      const hsl = hexToHSL(hex)
      const hsv = hslToHSV(hsl.h, hsl.s, hsl.l)
      updateColorFromHSV(hsv.h, hsv.s, hsv.v)
    } catch {
      // User cancelled or error occurred
    }
  }

  const updateColor = (newHue: number, newSat: number, newLight: number) => {
    const hsv = hslToHSV(newHue, newSat, newLight)
    updateColorFromHSV(hsv.h, hsv.s, hsv.v)
  }

  const currentHSL = getHSL()

  return {
    hue,
    saturation: saturationHsv,
    lightness: valueHsv,
    saturationHSL: currentHSL.s,
    lightnessHSL: currentHSL.l,
    format,
    setFormat,
    supportsEyeDropper,
    handleSaturationMove,
    handleHueMove,
    handleEyeDropper,
    updateColor,
  }
}
