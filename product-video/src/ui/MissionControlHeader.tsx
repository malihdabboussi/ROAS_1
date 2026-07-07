import React from 'react';
import { V } from '../theme';
import { Zap, Bell } from 'lucide-react';

/**
 * 1:1 replica of apps/web/.../MissionControlContainer.tsx header block:
 *   h1 "MISSION CONTROL" (text-lg font-bold uppercase)
 *   subtitle "Run missions, watch delegation, and keep momentum moving." (body-3 muted-fg mt-1)
 *   right side: Autopilot chip + notification bell
 */
export const MissionControlHeader: React.FC = () => {
  return (
    <header
      style={{
        marginBottom: 16, // mb-spacing-4
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            color: V.dark.foreground,
            fontSize: 18, // text-lg
            fontWeight: 700,
            textTransform: 'uppercase',
            fontFamily: V.font.body,
            letterSpacing: '0.02em',
          }}
        >
          MISSION CONTROL
        </h1>
        <p
          style={{
            margin: '4px 0 0 0', // mt-1
            color: V.dark.mutedFg,
            fontSize: V.text.md, // body-3
            lineHeight: 1.5,
            fontFamily: V.font.body,
          }}
        >
          Run missions, watch delegation, and keep momentum moving.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${V.dark.border}`,
            background: V.dark.card,
            color: V.dark.foreground,
            fontSize: V.text.md,
            fontFamily: V.font.body,
            fontWeight: 500,
          }}
        >
          <Zap size={16} />
          AutoPilot
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${V.dark.border}`,
            background: V.dark.card,
            color: V.dark.foreground,
          }}
        >
          <Bell size={16} />
        </div>
      </div>
    </header>
  );
};
