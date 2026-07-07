import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { V, SPRING } from '../theme';
import { CinematicFrame } from '../ui/CinematicFrame';
import { PlatformOrbital } from '../ui/PlatformOrbital';
import { TypeReveal } from '../ui/TypeReveal';

/**
 * Scene 3 — THE HERO (Meet your team).
 * This is the pivot. We go from the dark void to the emerald glow.
 * Pixar-grade lighting on the Vibey Orb.
 * Elegance and depth.
 */
export const SceneTeam: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Majestic reveal animation
  const reveal = spring({
    frame,
    fps,
    config: SPRING.heavy,
  });

  const orbitalScale = interpolate(reveal, [0, 1], [0.8, 1.4]);
  const orbitalOpacity = interpolate(reveal, [0, 1], [0, 1]);
  const textY = interpolate(reveal, [0, 1], [40, 0]);

  return (
    <CinematicFrame lighting="emerald">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 100,
          width: '100%',
          opacity: orbitalOpacity,
        }}
      >
        {/* Title - Apple style whitespace */}
        <div
          style={{
            transform: `translateY(${textY}px)`,
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: V.font.heading,
              fontSize: 64,
              fontWeight: 200,
              color: 'rgba(255, 255, 255, 0.8)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            <TypeReveal text="Meet your" mode="word" pace={18} />
          </h2>
          <div
            style={{
              fontFamily: V.font.heading,
              fontSize: 120,
              fontWeight: 800,
              color: V.brand.white,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              textShadow: '0 0 60px rgba(16,185,129,0.5)',
            }}
          >
            <TypeReveal text="team." mode="char" startFrame={2 * 18} pace={3} />
          </div>
        </div>

        {/* The Orbital - Centerpiece */}
        <div
          style={{
            transform: `scale(${orbitalScale})`,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <PlatformOrbital scale={1.8} />
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            fontFamily: V.font.body,
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
            fontWeight: 300,
            letterSpacing: '0.05em',
          }}
        >
          <TypeReveal text="A team of specialist agents." mode="char" pace={2} />
          <br />
          <TypeReveal
            text="Infinite capability."
            mode="char"
            startFrame={'A team of specialist agents.'.length * 2}
            pace={2}
            style={{ color: V.brand.green, fontWeight: 500 }}
          />
        </div>
      </div>
    </CinematicFrame>
  );
};
