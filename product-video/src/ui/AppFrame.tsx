import React from 'react';
import { V } from '../theme';
import { Target, Users, ListChecks, Brain, FolderGit2 } from 'lucide-react';
import { VibeyLogo } from './VibeyLogo';

/**
 * Vibey app frame — dark theme.
 * Replicates: apps/web/src/app/(dashboard)/layout.tsx shell
 *   + SidebarHqSection (72px rail with card-glass)
 * Outer shell is mobile-equivalent: full 1080px width with collapsed HQ rail visible
 * at the top of the video frame for context. For the vertical (1080x1920) video, we
 * treat the inner content as the page body with the rail pinned to the left-hand side.
 */
export const AppFrame: React.FC<{
  children: React.ReactNode;
  showRail?: boolean;
  railActiveId?: string;
}> = ({ children, showRail = true, railActiveId = 'missions' }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: V.dark.background,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {showRail && <HqRail activeId={railActiveId} />}
      <main style={{ flex: 1, overflow: 'hidden' }}>{children}</main>
    </div>
  );
};

const RAIL_ITEMS = [
  { id: 'missions', label: 'Missions', Icon: Target },
  { id: 'team', label: 'Team', Icon: Users },
  { id: 'lists', label: 'Lists', Icon: ListChecks },
  { id: 'brain', label: 'Brain', Icon: Brain },
  { id: 'spaces', label: 'Spaces', Icon: FolderGit2 },
];

/** HQ rail — 1:1 from apps/web/.../SidebarHqSection.tsx (72px wide, card-glass column) */
const HqRail: React.FC<{ activeId: string }> = ({ activeId }) => {
  return (
    <div
      style={{
        width: 72,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        padding: '12px 0 12px 8px', // py-3 pl-2
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          border: `1px solid ${V.dark.border}`,
          boxShadow: V.shadow.glassDark,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo area: h-14, pt-1, icon 40x40 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 4,
          }}
        >
          <VibeyLogo variant="icon-white" height={40} />
        </div>
        {/* Nav */}
        <nav
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '8px 4px',
          }}
        >
          {RAIL_ITEMS.map((item) => {
            const active = item.id === activeId;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 4px',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                    borderRadius: 8,
                    border: `1px solid ${active ? 'rgba(199,126,255,0.28)' : 'transparent'}`,
                    background: active
                      ? 'linear-gradient(135deg, rgba(147,51,234,0.18) 0%, rgba(199,126,255,0.28) 100%)'
                      : 'transparent',
                    color: active ? V.brand.purpleLight : V.dark.mutedFg,
                  }}
                >
                  <item.Icon size={20} />
                </span>
                <span
                  style={{
                    fontSize: 10,
                    lineHeight: 1,
                    fontFamily: V.font.body,
                    color: active ? V.dark.foreground : V.dark.mutedFg,
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
