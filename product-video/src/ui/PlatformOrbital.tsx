import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { Brain, Server, BookOpen, Plug, Users, Zap, Target, MessageSquare } from 'lucide-react';
import { V } from '../theme';

/**
 * 1:1 replica of apps/docs/src/components/mdx/PlatformOrbital.tsx.
 *
 * Outer container: 100% × 480px, border-radius 12, bg var(--muted), 1px border.
 * Ring: 360×280 px, border-radius 50%, 1px border, opacity 0.5.
 * Center: VibeyOrb 80×80 (we use the static orb PNG for video fidelity).
 * Satellites: 8 nodes on ellipse rx=180 ry=140.
 * Rotation: 0.25° every 50ms (≈ 5°/s).
 * Depth: depth = (1 + sin(angle)) / 2; zIndex 50–100; scale 0.75–1.0; opacity 0.4–1.0.
 * Each node: 40×40 circle, 1.5px border, Lucide 16px icon, foreground color.
 * Label below: top 46, fontSize 11, weight 600, letter-spacing 0.02em.
 *
 * For the vertical video we render at a larger scale — the component accepts
 * `scale` to uniformly enlarge all interior dimensions.
 */
const NODES = [
  { title: 'The Brain', Icon: Brain, color: 'rgba(16, 185, 129, 0.9)' },
  { title: 'Cloud Computer', Icon: Server, color: 'rgba(59, 130, 246, 0.9)' },
  { title: 'Skills', Icon: BookOpen, color: 'rgba(245, 158, 11, 0.9)' },
  { title: 'Integrations', Icon: Plug, color: 'rgba(139, 92, 246, 0.9)' },
  { title: 'Your Team', Icon: Users, color: 'rgba(236, 72, 153, 0.9)' },
  { title: 'Autopilot', Icon: Zap, color: 'rgba(239, 68, 68, 0.9)' },
  { title: 'Missions', Icon: Target, color: 'rgba(20, 184, 166, 0.9)' },
  { title: 'Studio', Icon: MessageSquare, color: 'rgba(99, 102, 241, 0.9)' },
];

export const PlatformOrbital: React.FC<{
  /** Uniform scale factor (1 = match real app). */
  scale?: number;
  /** Optional base rotation offset in degrees */
  rotationOffset?: number;
}> = ({ scale = 1, rotationOffset = 0 }) => {
  const frame = useCurrentFrame();
  // Real app: 0.25° every 50ms → 5°/s. We're at 30fps so 5/30 = 0.1667°/frame.
  const rotation = rotationOffset + frame * (5 / 30);

  const rx = 180 * scale;
  const ry = 140 * scale;
  const ringW = 360 * scale;
  const ringH = 280 * scale;
  const orbSize = 80 * scale;
  const nodeSize = 40 * scale;
  const iconSize = 16 * scale;
  const labelFont = 11 * scale;
  const labelTop = 46 * scale;

  return (
    <div
      style={{
        position: 'relative',
        width: 560 * scale,
        height: 480 * scale,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Ring */}
        <div
          style={{
            position: 'absolute',
            width: ringW,
            height: ringH,
            borderRadius: '50%',
            border: `1px solid ${V.dark.border}`,
            opacity: 0.5,
          }}
        />

        {/* Center orb */}
        <div
          style={{
            position: 'absolute',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Img
            src={staticFile('vibey-orb-static.png')}
            style={{
              width: orbSize,
              height: orbSize,
              borderRadius: '50%',
              objectFit: 'cover',
              filter: 'drop-shadow(0 0 24px rgba(16,185,129,0.35))',
            }}
          />
        </div>

        {/* Satellites */}
        {NODES.map((node, i) => {
          const angle = ((i / NODES.length) * 360 + rotation) * (Math.PI / 180);
          const x = Math.cos(angle) * rx;
          const y = Math.sin(angle) * ry;
          // Depth: (1 + sin(angle)) / 2 → 0..1
          const depth = (1 + Math.sin(angle)) / 2;
          const z = Math.round(50 + depth * 50);
          const nodeScale = 0.75 + depth * 0.25;
          const opacity = 0.4 + depth * 0.6;
          return (
            <div
              key={node.title}
              style={{
                position: 'absolute',
                transform: `translate(${x}px, ${y}px) scale(${nodeScale})`,
                transformOrigin: 'center',
                zIndex: z,
                opacity,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: '50%',
                  border: `1.5px solid ${node.color}`,
                  background: V.dark.card,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: V.dark.foreground,
                }}
              >
                <node.Icon size={iconSize} />
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: labelTop,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: labelFont,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  color: V.dark.mutedFg,
                  fontFamily: V.font.body,
                  whiteSpace: 'nowrap',
                }}
              >
                {node.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
