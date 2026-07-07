import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { V, SPRING } from '../theme';
import { CinematicFrame, RefractiveGlass } from '../ui/CinematicFrame';
import { TypeReveal } from '../ui/TypeReveal';

export const SceneAutopilot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneS = spring({ frame, fps, config: SPRING.heavy });
  const phoneScale = interpolate(phoneS, [0, 1], [0.8, 1]);
  const phoneOpacity = interpolate(phoneS, [0, 1], [0, 1]);

  return (
    <CinematicFrame lighting="void">
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 120,
          opacity: phoneOpacity,
          transform: `scale(${phoneScale})`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: V.font.heading,
              fontSize: 56,
              fontWeight: 200,
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            <TypeReveal text="You sleep." mode="word" pace={14} />
          </h2>
          <div
            style={{
              fontFamily: V.font.heading,
              fontSize: 90,
              fontWeight: 800,
              color: V.brand.green,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              textShadow: '0 0 60px rgba(16,185,129,0.3)',
            }}
          >
            <TypeReveal text="It keeps working." mode="char" startFrame={2 * 14} pace={2} />
          </div>
        </div>

        <RefractiveGlass
          style={{
            width: 500,
            height: 1000,
            borderRadius: 60,
            background: 'rgba(0,0,0,0.8)',
            border: '8px solid #1A1A1A',
            padding: 40,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          {/* Notification */}
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: 24,
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 24, height: 24, background: V.brand.green, borderRadius: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>
                <TypeReveal text="Vibey · Digest" mode="char" pace={2} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: V.brand.green }}>
              <TypeReveal text="12 missions done." mode="char" pace={2} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#FFF' }}>
              <TypeReveal
                text="47 new leads."
                mode="char"
                startFrame={'12 missions done.'.length * 2}
                pace={2}
              />
            </div>
          </div>
        </RefractiveGlass>
      </div>
    </CinematicFrame>
  );
};
