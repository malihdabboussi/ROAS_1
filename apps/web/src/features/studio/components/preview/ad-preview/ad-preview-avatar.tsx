'use client'

export function AdPreviewAvatar({
  letter,
  size = 40,
  ring,
  imageUrl,
}: {
  letter: string
  size?: number
  ring?: boolean
  imageUrl?: string | null
}) {
  return (
    <div
      className={`flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] ${ring ? 'p-[2px]' : ''}`}
      style={{ width: size, height: size }}
    >
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#7c3aed] text-white"
        style={{ fontSize: imageUrl ? 0 : size * 0.4, fontWeight: 700 }}
      >
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : letter}
      </div>
    </div>
  )
}
