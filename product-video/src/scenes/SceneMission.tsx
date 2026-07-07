import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { V } from '../theme';
import { CinematicFrame } from '../ui/CinematicFrame';
import { TypeReveal } from '../ui/TypeReveal';
import { MarketingMissionExecutionMockupFrame } from '../ui/website/MarketingMissionExecutionMockupFrame';
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '../web-library/lib/agent-library-fallback';

const PORTRAITS = MARKETING_AGENT_LIBRARY_FALLBACK.slice(0, 3)
  .map((a) => a.image_url)
  .filter((u): u is string => typeof u === 'string' && u.length > 0);

/** Scene 4 — MISSION.
 *  Drops the real website `MarketingMissionExecutionMockup` into the scene
 *  (frame-driven), framed by the same headline animation. */
export const SceneMission: React.FC = () => {
  const frame = useCurrentFrame();

  const inputOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const inputY = interpolate(frame, [0, 20], [60, 0], { extrapolateRight: 'clamp' });

  return (
    <CinematicFrame lighting="emerald">
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
          padding: 32,
          opacity: inputOpacity,
          transform: `translateY(${inputY}px)`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: V.font.heading,
              fontSize: 80,
              fontWeight: 800,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            <TypeReveal text="One " mode="char" pace={3} style={{ color: '#FFFFFF' }} />
            <TypeReveal
              text="sentence."
              mode="char"
              startFrame={4 * 3}
              pace={3}
              style={{ color: V.brand.green }}
            />
          </h2>
        </div>

        <MarketingMissionExecutionMockupFrame
          portraits={PORTRAITS}
          vibeyPortraitUrl={VIBEY_MARKETING_PORTRAIT_FALLBACK}
        />
      </div>
    </CinematicFrame>
  );
};
