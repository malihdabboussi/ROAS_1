import React from 'react';
import { V } from '../theme';
import { Globe, Monitor, Tablet, Smartphone, ChevronDown } from 'lucide-react';

/**
 * 1:1 replica of apps/web/.../FunnelToolbar.tsx + SandpackPreview shell.
 * Toolbar: px-3 py-2 gap-2
 *   name (body-3 font-medium)
 *   published pill: border border-border rounded-full px-2.5 py-0.5 gap-1.5
 *     emerald-400 dot + "Published" body-3 muted-fg
 *   page chip: chip-glass-neutral rounded-spacing-2 min-w-[140px] px-2.5 py-1
 *   viewport toggles: h-spacing-8 w-spacing-8 each (32x32)
 *   publish: chip-glass-green gap-1.5 + Globe icon
 */
export const FunnelFrame: React.FC<{
  funnelName: string;
  pagePath: string;
  published?: boolean;
  children: React.ReactNode;
}> = ({ funnelName, pagePath, published = true, children }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        background: V.dark.card,
        border: `1px solid ${V.dark.borderStrong}`,
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: `1px solid ${V.dark.border}`,
          background: V.dark.background,
        }}
      >
        <span
          style={{
            fontSize: V.text.md,
            fontWeight: 500,
            color: V.dark.foreground,
            fontFamily: V.font.body,
            minWidth: 0,
          }}
        >
          {funnelName}
        </span>
        {/* Published pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: `1px solid ${V.dark.border}`,
            borderRadius: V.radius.full,
            padding: '2px 10px',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: published ? '#34D399' : V.dark.mutedFg,
            }}
          />
          <span style={{ fontSize: V.text.md, color: V.dark.mutedFg, fontFamily: V.font.body }}>
            {published ? 'Published' : 'Draft'}
          </span>
        </div>
        {/* Page chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            minWidth: 140,
            padding: '4px 10px',
            borderRadius: 8,
            border: `1px solid ${V.dark.border}`,
            background: 'rgba(255,255,255,0.04)',
          }}
        >
          <span
            style={{
              fontSize: V.text.md,
              fontWeight: 500,
              color: V.dark.foreground,
              fontFamily: V.font.body,
            }}
          >
            {pagePath}
          </span>
          <ChevronDown size={14} color={V.dark.mutedFg} />
        </div>
        <div style={{ flex: 1 }} />
        {/* Viewport toggles */}
        <ViewportBtn active>
          <Monitor size={14} />
        </ViewportBtn>
        <ViewportBtn>
          <Tablet size={14} />
        </ViewportBtn>
        <ViewportBtn>
          <Smartphone size={14} />
        </ViewportBtn>
        {/* Publish btn */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 8,
            background:
              'linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(52,211,153,0.32) 100%)',
            border: '1px solid rgba(52,211,153,0.35)',
            color: '#A7F3D0',
            fontSize: V.text.md,
            fontWeight: 500,
            fontFamily: V.font.body,
          }}
        >
          <Globe size={14} />
          Publish
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, background: '#0F1116', position: 'relative' }}>{children}</div>
    </div>
  );
};

const ViewportBtn: React.FC<{ active?: boolean; children: React.ReactNode }> = ({
  active,
  children,
}) => (
  <div
    style={{
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      color: active ? V.dark.foreground : V.dark.mutedFg,
      border: active ? `1px solid ${V.dark.border}` : '1px solid transparent',
    }}
  >
    {children}
  </div>
);
