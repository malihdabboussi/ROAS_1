import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { V, SPRING } from '../theme';
import { CinematicFrame } from '../ui/CinematicFrame';
import { VibeyLogo } from '../ui/VibeyLogo';
import { TypeReveal } from '../ui/TypeReveal';

export const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: SPRING.stiff });
  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.95, 1]);

  return (
    <CinematicFrame lighting="emerald">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 120,
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: V.font.heading,
              fontSize: 80,
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.9)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            <TypeReveal text="Stop writing." mode="word" pace={12} />
          </h2>
          <div
            style={{
              fontFamily: V.font.heading,
              fontSize: 180,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              background: V.brand.green,
              color: '#000',
              padding: '0 40px',
              borderRadius: 24,
              boxShadow: '0 0 100px rgba(16,185,129,0.5)',
            }}
          >
            <TypeReveal text="Run it." mode="char" startFrame={2 * 12} pace={3} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <VibeyLogo height={80} />
          <div
            style={{
              fontFamily: V.font.heading,
              fontSize: 40,
              color: V.brand.green,
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            <TypeReveal
              text="vibey.im"
              mode="char"
              startFrame={'Run it.'.length * 3 + 2 * 12}
              pace={2}
            />
          </div>
        </div>
      </div>
    </CinematicFrame>
  );
};
