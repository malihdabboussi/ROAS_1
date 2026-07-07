'use client'

import Image from 'next/image'

export function MockInstagramFeedCreative() {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ maxHeight: 360 }}>
      <Image
        src="/marketing/ig-social-creative.png"
        alt="Vibey Instagram creative"
        fill
        className="object-cover"
        sizes="400px"
      />
    </div>
  )
}
