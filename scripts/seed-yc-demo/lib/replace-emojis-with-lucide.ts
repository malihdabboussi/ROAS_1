/**
 * Replace emoji literals in generated funnel TSX with lucide-react icon components.
 */
const EMOJI_ICON_MAP: Readonly<Record<string, string>> = {
  '🔥': 'Flame',
  '🎯': 'Target',
  '🏆': 'Trophy',
  '💬': 'MessageSquare',
  '🤝': 'Handshake',
  '🧭': 'Compass',
  '📏': 'CreditCard',
  '⬆️': 'ArrowUp',
  '👁': 'Eye',
  '🚀': 'Rocket',
}

const LUCIDE_IMPORTS = [
  'Flame',
  'Target',
  'Trophy',
  'MessageSquare',
  'Handshake',
  'Compass',
  'CreditCard',
  'ArrowUp',
  'Eye',
  'Rocket',
  'MapPin',
  'CheckCircle2',
  'XCircle',
  'Check',
  'X',
  'Pin',
] as const

export function replaceEmojisWithLucide(source: string): string {
  let out = source

  if (!out.includes('from "lucide-react"')) {
    out = out.replace(
      'import { useState, useEffect, useRef } from "react";',
      `import React, { useState, useEffect, useRef } from "react";\nimport { ${LUCIDE_IMPORTS.join(', ')} } from "lucide-react";`,
    )
  }

  for (const [emoji, iconName] of Object.entries(EMOJI_ICON_MAP)) {
    out = out.split(`icon: "${emoji}"`).join(`icon: ${iconName}`)
  }

  out = out.replace(
    '<div className="text-3xl mb-3">{card.icon}</div>',
    '<div className="mb-3 flex items-center justify-center text-[#B8623F]">{React.createElement(card.icon, { className: "w-8 h-8", strokeWidth: 2 })}</div>',
  )
  out = out.replace(
    '<div className="text-2xl mb-2">{item.icon}</div>',
    '<div className="mb-2 flex items-center justify-center text-[#B8623F]">{React.createElement(item.icon, { className: "w-7 h-7", strokeWidth: 2 })}</div>',
  )

  out = out.replace(
    '<p className="text-white text-xs sm:text-sm font-bold tracking-widest uppercase">📍 Join ',
    '<p className="text-white text-xs sm:text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2"><MapPin className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} /> Join ',
  )

  out = out.replace(
    '<h3 className="text-lg font-black mb-6 text-green-700">✅ YES — This is for you:</h3>',
    '<h3 className="text-lg font-black mb-6 text-green-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} /> YES — This is for you:</h3>',
  )
  out = out.replace(
    '<h3 className="text-lg font-black mb-6 text-red-600">❌ NOT for you if:</h3>',
    '<h3 className="text-lg font-black mb-6 text-red-600 flex items-center gap-2"><XCircle className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} /> NOT for you if:</h3>',
  )

  out = out.replace(
    'style={{ backgroundColor: "#22c55e" }}>✓</span>',
    'style={{ backgroundColor: "#22c55e" }}><Check className="w-3 h-3" strokeWidth={3} /></span>',
  )
  out = out.replace(
    'style={{ backgroundColor: "#ef4444" }}>✕</span>',
    'style={{ backgroundColor: "#ef4444" }}><X className="w-3 h-3" strokeWidth={3} /></span>',
  )

  out = out.replace(
    '<p className="text-center text-xs text-gray-400 mt-4">📌 Team:',
    '<p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1.5"><Pin className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> Team:',
  )

  return out
}
