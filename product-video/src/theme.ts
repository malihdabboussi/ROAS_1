/**
 * APPLE X PIXAR DESIGN SYSTEM
 * Extreme focus on lighting, depth, and minimalist precision.
 */

export const V = {
  brand: {
    green: '#10B981',
    greenGlow: 'rgba(16, 185, 129, 0.4)',
    white: '#FFFFFF',
    black: '#000000',
    silver: '#F5F5F7', // Apple silver
    spaceGray: '#1D1D1F', // Apple space gray
    danger: '#EF4444',
    purpleLight: '#C77DFF',
  },
  dark: {
    background: '#000000',
    foreground: '#FFFFFF',
    card: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.1)',
    borderStrong: 'rgba(255,255,255,0.14)',
    mutedFg: 'rgba(255,255,255,0.5)',
    primary: '#10B981',
    secondary: 'rgba(255,255,255,0.05)',
  },
  radius: {
    full: 9999,
  },
  // Studio Lighting Effects
  light: {
    caustic: 'radial-gradient(600px 600px at 50% -10%, rgba(255,255,255,0.06) 0%, transparent 100%)',
    spotlight: 'radial-gradient(1200px 800px at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 80%)',
    vignette: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
  },
  // Pixar Depth
  shadow: {
    // Soft, wide shadows for "floating" objects
    floating: '0 30px 100px rgba(0,0,0,0.5)',
    // Sharp refractive edge for glass
    glassEdge: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    glassDark: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  // Apple Typography
  font: {
    heading: "'Futura LT', -apple-system, BlinkMacSystemFont, sans-serif",
    body: "'Inter', -apple-system, sans-serif",
  },
  text: {
    /** body-2 (15px) */
    body2: 15,
    /** body-3 (14px) */
    md: 14,
    size: {
      tiny: 11,
      small: 14,
      base: 17, // Apple default
      large: 24,
      hero: 80,
      macro: 120,
    },
    weight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 800,
    },
  },
} as const;

export const VIDEO = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 1050, // 35s
};

export const SPRING = {
  stiff: { damping: 20, stiffness: 200, mass: 0.5 },
  heavy: { damping: 40, stiffness: 100, mass: 1.5 },
  smooth: { damping: 200 },
};

// Scene durations (in frames, at 30fps)
export const SCENE = {
  hook: 60, // 2s
  problem: 90, // 3s
  team: 150, // 5s
  mission: 120, // 4s
  ship: 300, // 10s
  autopilot: 180, // 6s
  close: 150, // 5s
} as const;
