import React from 'react';
import { V } from '../theme';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

/**
 * 1:1 replica of apps/web/.../SequencePreview.tsx + EmailPreviewEditor.
 * Card-glass outer, 16px radius, one email visible with header row + body,
 * bottom pagination with indicator dots.
 */
export const EmailSequenceCard: React.FC<{
  sequenceName: string;
  subject: string;
  delayLabel: string;
  totalEmails: number;
  activeIndex: number;
  body: React.ReactNode;
}> = ({ sequenceName, subject, delayLabel, totalEmails, activeIndex, body }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: V.dark.card,
        border: `1px solid ${V.dark.borderStrong}`,
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: V.font.body,
      }}
    >
      {/* Sequence toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}
      >
        <div
          style={{
            fontSize: V.text.md,
            fontWeight: 600,
            color: V.dark.foreground,
          }}
        >
          {sequenceName}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${V.dark.border}`,
            color: V.dark.mutedFg,
          }}
        >
          <Download size={14} />
        </div>
      </div>

      {/* Email card body */}
      <div style={{ flex: 1, padding: '0 16px', display: 'flex' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)',
            border: `1px solid ${V.dark.border}`,
            boxShadow: V.shadow.glassDark,
          }}
        >
          {/* Email header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '12px 16px',
              borderBottom: `1px solid ${V.dark.border}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: V.text.md,
                  fontWeight: 500,
                  color: V.dark.foreground,
                }}
              >
                {subject}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: V.dark.mutedFg }}>Published</span>
                  <ToggleOn />
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${V.dark.border}`,
                    minWidth: 190,
                  }}
                >
                  <span
                    style={{
                      fontSize: V.text.md,
                      color: V.dark.foreground,
                    }}
                  >
                    {delayLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Body */}
          <div
            style={{
              flex: 1,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.6,
              color: V.dark.foreground,
              background: 'rgba(255,255,255,0.02)',
              overflow: 'hidden',
            }}
          >
            {body}
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 16px',
          borderTop: `1px solid ${V.dark.border}`,
        }}
      >
        <PagerBtn>
          <ChevronLeft size={14} />
        </PagerBtn>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Array.from({ length: totalEmails }).map((_, idx) => {
            const active = idx === activeIndex;
            return (
              <div
                key={idx}
                style={{
                  width: active ? 10 : 8,
                  height: active ? 10 : 8,
                  borderRadius: '50%',
                  background: active
                    ? 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)'
                    : V.dark.border,
                  boxShadow: active ? '0 0 12px rgba(59,130,246,0.6)' : 'none',
                }}
              />
            );
          })}
        </div>
        <PagerBtn>
          <ChevronRight size={14} />
        </PagerBtn>
      </div>
    </div>
  );
};

const PagerBtn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: 32,
      height: 32,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${V.dark.border}`,
      color: V.dark.mutedFg,
    }}
  >
    {children}
  </div>
);

const ToggleOn: React.FC = () => (
  <div
    style={{
      width: 28,
      height: 16,
      borderRadius: 9999,
      background: V.dark.primary,
      position: 'relative',
      boxShadow: '0 0 12px rgba(16,185,129,0.4)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: '#FFFFFF',
      }}
    />
  </div>
);
