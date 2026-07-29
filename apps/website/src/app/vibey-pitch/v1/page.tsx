import type { Metadata } from 'next'
import { PitchDeckV1 } from '../PitchDeckV1'

export const metadata: Metadata = {
  title: 'ROAS Pitch V1 | ROAS',
  robots: { index: false, follow: false },
}

export default function VibeyPitchV1Page() {
  return <PitchDeckV1 />
}
