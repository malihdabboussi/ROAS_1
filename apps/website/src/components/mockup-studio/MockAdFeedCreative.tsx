'use client'

import Image from 'next/image'

export function MockAdFeedCreative() {
  return (
    <div className="relative aspect-square w-full max-h-[280px] overflow-hidden bg-[#0f172a]">
      <Image
        src="/marketing/meta-ad-creative.png"
        alt="ROAS Meta ad creative"
        fill
        className="object-cover"
        sizes="500px"
      />
    </div>
  )
}
