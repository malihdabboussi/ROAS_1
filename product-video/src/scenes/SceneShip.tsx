import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { V, SPRING } from '../theme';
import { CinematicFrame, RefractiveGlass } from '../ui/CinematicFrame';
import { FunnelPage } from '../ui/FunnelPage';
import { AdFbFeed } from '../ui/AdFbFeed';
import { ContactsTable } from '../ui/ContactsTable';
import { TypeReveal } from '../ui/TypeReveal';
import { revealByChar } from '../lib/reveal-text';

/**
 * Scene 5 — THE SHIP (Unboxing).
 * High-speed materialization of artifacts.
 * Each beat is 60 frames. 5 beats total.
 * Panels fly in from 3D space.
 */
const EMAIL_SUBJ = 'Subject: Welcome.';
const EMAIL_BODY =
  'Your campaign is live and your first email is already in their inbox.';

const EmailBeatCopy: React.FC<{ frame: number }> = ({ frame }) => {
  const subjDone = EMAIL_SUBJ.length * 2;
  const subj = revealByChar(EMAIL_SUBJ, frame, 0, 2);
  const body = revealByChar(EMAIL_BODY, frame, subjDone, 2);
  return (
    <div style={{ padding: 80, fontSize: 32, color: '#FFF', fontFamily: V.font.body }}>
      <div style={{ fontWeight: 700, marginBottom: 20 }}>{subj}</div>
      <div style={{ opacity: 0.7 }}>{body}</div>
    </div>
  );
};

export const SceneShip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beat = Math.floor(frame / 60);
  const localFrame = frame % 60;

  return (
    <CinematicFrame lighting="emerald">
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
        }}
      >
        <BeatPanel beat={beat} localFrame={localFrame} fps={fps} />
      </AbsoluteFill>
    </CinematicFrame>
  );
};

const BeatPanel: React.FC<{ beat: number; localFrame: number; fps: number }> = ({
  beat,
  localFrame,
  fps,
}) => {
  const entrance = spring({
    frame: localFrame,
    fps,
    config: SPRING.stiff,
  });

  const scale = interpolate(entrance, [0, 1], [0.8, 1]);
  const opacity = interpolate(localFrame, [0, 10, 50, 60], [0, 1, 1, 0]);
  const rotateX = interpolate(entrance, [0, 1], [20, 0]);
  const y = interpolate(entrance, [0, 1], [100, 0]);

  const labels = ['FUNNEL. LIVE.', 'ADS. RUNNING.', 'EMAILS. SENT.', 'ON YOUR DOMAIN.', 'LEADS. FLOWING.'];
  const label = labels[beat] ?? '';
  const bits = label.trim().split(/\s+/);
  const secondWord = bits.length > 1 ? (bits[bits.length - 1] ?? '') : '';
  const firstWord =
    bits.length > 1 ? `${bits.slice(0, -1).join(' ')} ` : label;
  const secondStart = firstWord.length * 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 60,
        opacity,
        transform: `scale(${scale}) translateY(${y}px) rotateX(${rotateX}deg)`,
        perspective: 1000,
        width: '100%',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h2
          style={{
            fontFamily: V.font.heading,
            fontSize: 100,
            fontWeight: 800,
            color: V.brand.white,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            margin: 0,
            textShadow: '0 0 40px rgba(16,185,129,0.3)',
          }}
        >
          <TypeReveal text={firstWord} mode="char" pace={2} />
          <TypeReveal
            text={secondWord}
            mode="char"
            startFrame={secondStart}
            pace={2}
            style={{ color: V.brand.green }}
          />
        </h2>
      </div>

      <RefractiveGlass
        style={{
          width: 900,
          height: 1200,
          padding: beat === 4 ? 40 : 0,
          overflow: 'hidden',
        }}
      >
        {beat === 0 && <div style={{ transform: 'scale(1.2)', transformOrigin: 'top' }}><FunnelPage /></div>}
        {beat === 1 && (
          <div style={{ padding: 40 }}>
            <AdFbFeed
              advertiser="Coaching.io"
              headline="Scale your business."
              primaryText="Launch campaigns in seconds, not weeks."
              domain="VIBEY.IM"
              cta="Try now"
              image={<div style={{ height: 400, background: V.brand.green }} />}
            />
          </div>
        )}
        {beat === 2 && (
          <EmailBeatCopy frame={localFrame} />
        )}
        {beat === 3 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontSize: 40,
              color: V.brand.green,
              fontWeight: 700,
            }}
          >
            <TypeReveal text="go.yourbrand.com/launch" mode="char" pace={2} />
          </div>
        )}
        {beat === 4 && (
          <ContactsTable
            contacts={[{ name: 'Sarah J.', email: 's@hey.com', phone: '***', created: '1s ago', tags: ['lead'], funnel: 'launch' }]}
            visibleCount={1}
            totalCount={42}
          />
        )}
      </RefractiveGlass>
    </div>
  );
};
