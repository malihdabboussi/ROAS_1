import type { Metadata } from 'next'
import { PitchDeck } from './PitchDeck'

export const metadata: Metadata = {
  title: 'Vibey Pitch | Vibey',
  robots: { index: false, follow: false },
}

export default function VibeyPitchPage() {
  return <PitchDeck />
}
