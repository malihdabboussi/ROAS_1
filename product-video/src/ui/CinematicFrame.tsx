import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { V } from '../theme';

export const CinematicFrame: React.FC<{
  children: React.ReactNode;
  lighting?: 'default' | 'emerald' | 'void';
}> = ({ children, lighting = 'default' }) => {
  const frame = useCurrentFrame();
  const breathing = Math.sin(frame * 0.05) * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: '#000000',
        overflow: 'hidden',
      }}
    >
      {/* Pixar Lighting Layer */}
      <AbsoluteFill
        style={{
          background: lighting === 'emerald' ? V.light.spotlight : 'transparent',
          opacity: 1 + breathing,
        }}
      />
      <AbsoluteFill style={{ background: V.light.caustic }} />
      
      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>

      {/* Apple Vignette */}
      <AbsoluteFill style={{ background: V.light.vignette, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

export const RefractiveGlass: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: V.shadow.floating,
        borderRadius: 24,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Top light edge */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)',
        }}
      />
      {children}
    </div>
  );
};
