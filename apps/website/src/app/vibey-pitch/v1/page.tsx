import type { Metadata } from 'next'
import { PitchDeckV1 } from '../PitchDeckV1'

export const metadata: Metadata = {
  title: 'Vibey Pitch V1 | Vibey',
  robots: { index: false, follow: false },
}

export default function VibeyPitchV1Page() {
  return <PitchDeckV1 />
}
