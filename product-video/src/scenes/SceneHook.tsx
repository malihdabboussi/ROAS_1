import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { V, SPRING } from '../theme';
import { CinematicFrame } from '../ui/CinematicFrame';
import { TypeReveal } from '../ui/TypeReveal';

/**
 * Scene 1 — THE VOID (The Hook).
 * Apple/Jobs style: Focus on the "one thing."
 * Starts with a macro of a cursor typing in a black abyss.
 * Then pulls back to reveal: "You don't need another chatbot."
 * The text is elegantly weighted, not screaming.
 */
export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pull back camera animation (0-60f)
  const zoom = spring({
    frame,
    fps,
    config: SPRING.heavy,
  });
  const scale = interpolate(zoom, [0, 1], [4, 1]);
  const pullBack = interpolate(zoom, [0, 1], [200, 0]);

  // Text entrance
  const opacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });
  const textBlur = interpolate(frame, [10, 30], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <CinematicFrame>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          opacity,
          transform: `scale(${scale}) translateY(${pullBack}px)`,
          filter: `blur(${textBlur}px)`,
        }}
      >
        <h1
          style={{
            fontFamily: V.font.heading,
            fontSize: 72,
            fontWeight: 300,
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center',
            letterSpacing: '0.1em',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          <TypeReveal text="You don't need" mode="word" pace={14} />
        </h1>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TypeReveal
            text="another chatbot"
            mode="char"
            startFrame={3 * 14}
            pace={2}
            style={{
              fontFamily: V.font.heading,
              fontSize: 110,
              fontWeight: 800,
              color: V.brand.white,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              textShadow: '0 0 40px rgba(16,185,129,0.3)',
            }}
          />
          {/* Subtle cursor at the end */}
          <div
            style={{
              width: 4,
              height: 100,
              background: V.brand.green,
              marginLeft: 12,
              opacity: Math.floor(frame / 6) % 2 === 0 ? 1 : 0,
              boxShadow: `0 0 20px ${V.brand.green}`,
            }}
          />
        </div>
      </div>
    </CinematicFrame>
  );
};
