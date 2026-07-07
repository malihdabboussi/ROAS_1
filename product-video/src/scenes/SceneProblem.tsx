import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { V, SPRING } from '../theme';
import { CinematicFrame } from '../ui/CinematicFrame';
import { FeatureFloatingMockShell } from '../ui/website/FeatureFloatingMockShell';
import { MissionDeliverablePdfMockup } from '../ui/website/MissionDeliverablePdfMockup';
import { revealByChar } from '../lib/reveal-text';

/** Scene 2 — THE FRICTION.
 *  Uses the website's `FeatureFloatingMockShell` + `MissionDeliverablePdfMockup`
 *  instead of placeholder skeleton bars so the "document" is the real glass card. */
export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();

  const stage = Math.floor(frame / 30);
  const floating = Math.sin(frame * 0.08) * 10;
  const rotation = Math.sin(frame * 0.04) * 2;

  return (
    <CinematicFrame>
      <div
        style={{
          width: 520,
          transform: `translateY(${floating}px) rotate(${rotation}deg)`,
          perspective: 1000,
        }}
      >
        <FeatureFloatingMockShell className="!min-h-0">
          <div style={{ padding: 20 }}>
            <MissionDeliverablePdfMockup label="Q2_Nurture_Sequence.pdf" />
          </div>
        </FeatureFloatingMockShell>
      </div>

      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 200,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <StageText
            visible={stage >= 0}
            text="3 HOURS"
            active={stage === 0}
            frame={frame}
          />
          <StageText
            visible={stage >= 1}
            text="1 DOCUMENT"
            active={stage === 1}
            frame={frame - 30}
          />
          <StageText
            visible={stage >= 2}
            text="0 LEADS"
            active={stage === 2}
            frame={frame - 60}
            color={V.brand.danger}
          />
        </div>
      </AbsoluteFill>
    </CinematicFrame>
  );
};

const StageText: React.FC<{
  visible: boolean;
  text: string;
  active: boolean;
  frame: number;
  color?: string;
}> = ({ visible, text, active, frame, color }) => {
  const { fps } = useVideoConfig();
  if (!visible) return null;

  const s = spring({
    frame,
    fps,
    config: SPRING.stiff,
  });

  const opacity = interpolate(s, [0, 1], [0, active ? 1 : 0.4]);
  const y = interpolate(s, [0, 1], [20, 0]);
  const blur = interpolate(s, [0, 1], [10, 0]);

  return (
    <div
      style={{
        fontFamily: V.font.heading,
        fontSize: 56,
        fontWeight: active ? 800 : 400,
        color: color ?? '#FFFFFF',
        letterSpacing: '0.05em',
        opacity,
        transform: `translateY(${y}px)`,
        filter: `blur(${blur}px)`,
        textTransform: 'uppercase',
      }}
    >
      {active ? revealByChar(text, frame, 0, 2) : text}
    </div>
  );
};
