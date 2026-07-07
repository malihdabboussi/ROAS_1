/**
 * Post-process generated presentation TSX for mobile/tablet viewports.
 * Presentations preview as vertically scrolled sections inside Sandpack.
 */
export function makePresentationResponsive(source: string): string {
  let out = source

  out = out.replace(/\btext-#([A-Fa-f0-9]{3,8})\b/g, 'text-[#$1]')
  out = out.replace(/\bbg-#([A-Fa-f0-9]{3,8})\b/g, 'bg-[#$1]')
  out = out.replace(/\bborder-#([A-Fa-f0-9]{3,8})\b/g, 'border-[#$1]')

  out = out.replace(
    /<section style=\{\{aspectRatio:'16\/9'\}\} className="/g,
    '<section className="min-h-[100svh] py-10 sm:py-12 lg:min-h-0 lg:aspect-video lg:py-0 ',
  )

  out = out.replace(
    '<div className="font-sans">',
    '<div className="font-sans w-full overflow-x-hidden">',
  )

  out = out.replace(/\bpx-24\b/g, 'px-6 sm:px-10 md:px-16 lg:px-24')
  out = out.replace(/\bpx-16\b/g, 'px-6 sm:px-10 lg:px-16')
  out = out.replace(/\bleft-24\b/g, 'left-6 lg:left-24')
  out = out.replace(/\bright-24\b/g, 'right-6 lg:right-24')

  out = out.replace(
    /\bflex items-center justify-between\b/g,
    'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 lg:gap-0',
  )

  out = out.replace(/\bgrid grid-cols-3\b/g, 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3')
  out = out.replace(/\bgrid grid-cols-2\b/g, 'grid grid-cols-1 lg:grid-cols-2')
  out = out.replace(/\bcol-span-2\b/g, 'md:col-span-2')
  out = out.replace(/\bgap-16\b/g, 'gap-8 lg:gap-16')

  out = out.replace(/\bmax-w-\[55%\]\b/g, 'w-full lg:max-w-[55%]')
  out = out.replace(/\bw-64 h-64\b/g, 'w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64')

  out = out.replace(
    /\btext-\[4\.5rem\]\b/g,
    'text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] leading-[1.05]',
  )
  out = out.replace(
    /\btext-\[3\.8rem\]\b/g,
    'text-3xl sm:text-4xl md:text-5xl lg:text-[3.8rem] leading-tight',
  )
  out = out.replace(/\btext-5xl font-black\b/g, 'text-3xl sm:text-4xl lg:text-5xl font-black')

  out = out.replace(/\btext-\[340px\]\b/g, 'hidden lg:block text-[180px] xl:text-[340px]')
  out = out.replace(/\btext-\[280px\]\b/g, 'hidden lg:block text-[160px] xl:text-[280px]')
  out = out.replace(/\btext-\[220px\]\b/g, 'hidden md:block text-[100px] lg:text-[220px]')

  return out
}
