import type { Metadata } from 'next'
import { PitchDeck } from './PitchDeck'

export const metadata: Metadata = {
  title: 'ROAS Pitch | ROAS',
  robots: { index: false, follow: false },
}

export default function VibeyPitchPage() {
  return <PitchDeck />
}
