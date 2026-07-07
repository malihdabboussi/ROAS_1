import React from 'react';
import { V } from '../theme';

/**
 * Agent avatar — 1:1 replica from apps/web mission control.
 * 20x20 circle, bg-primary/20 fallback with text-primary initial, text-xs font-bold.
 */
export const AgentAvatar: React.FC<{
  name: string;
  size?: number;
  color?: string;
}> = ({ name, size = 20, color }) => {
  const initial = name.charAt(0).toUpperCase();
  const accent = color ?? V.dark.primary;
  // bg-primary/20 = primary at 20% alpha
  const bg = hexToRgba(accent, 0.2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size <= 20 ? 10 : Math.round(size * 0.42),
        fontWeight: 700,
        fontFamily: V.font.body,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
