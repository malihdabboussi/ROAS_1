import React from 'react';
import { V } from '../theme';

/**
 * 1:1 replica of apps/web/.../CrmContactsTable.tsx.
 *   Header row: h-spacing-10 (40px), typo-caption (12px/500), surface-card,
 *               border, rounded-spacing-3 (12px), shadow-sm, grid columns.
 *   Rows: px-spacing-3 py-spacing-2, border-b, hover:bg-hover-subtle.
 *   Name: body-3 font-medium; Email: body-3; secondary: body-3 muted-fg.
 *   Default visible columns: Name, Email, Phone, Created, Tags, Funnel.
 */
type Contact = {
  name: string;
  email: string;
  phone: string;
  created: string;
  tags: string[];
  funnel: string;
};

export const ContactsTable: React.FC<{
  contacts: Contact[];
  visibleCount: number;
  totalCount: number;
}> = ({ contacts, visibleCount, totalCount }) => {
  const colTemplate =
    'minmax(200px, 1fr) minmax(260px, 1.2fr) minmax(160px, 0.8fr) minmax(140px, 0.7fr) minmax(240px, 1fr) minmax(220px, 1fr)';

  return (
    <div style={{ fontFamily: V.font.body, color: V.dark.foreground }}>
      {/* Status pills toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          padding: 16,
          borderRadius: 8,
          background: V.dark.card,
          border: `1px solid ${V.dark.border}`,
        }}
      >
        {(['all', 'lead', 'customer', 'archived'] as const).map((s, i) => (
          <Pill key={s} active={i === 1}>
            {cap(s)}
          </Pill>
        ))}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#6EE7B7',
            fontSize: V.text.md,
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: V.dark.primary,
              boxShadow: '0 0 8px rgba(16,185,129,0.6)',
            }}
          />
          LIVE
        </div>
      </div>

      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: colTemplate,
          gap: 16,
          alignItems: 'center',
          height: 40,
          padding: '0 12px',
          marginBottom: 16,
          borderRadius: 12,
          border: `1px solid ${V.dark.border}`,
          background: V.dark.card,
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          fontSize: 12,
          fontWeight: 500,
          color: V.dark.mutedFg,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <div>Name</div>
        <div>Email</div>
        <div>Phone</div>
        <div>Created</div>
        <div>Tags</div>
        <div>Funnel</div>
      </div>

      {/* Rows */}
      <div style={{ background: V.dark.card, borderRadius: 12, border: `1px solid ${V.dark.border}` }}>
        {contacts.slice(0, visibleCount).map((c, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: colTemplate,
              gap: 16,
              alignItems: 'center',
              padding: '12px',
              borderBottom: i === contacts.length - 1 ? 'none' : `1px solid ${V.dark.border}`,
              background: i === visibleCount - 1 ? 'rgba(16,185,129,0.08)' : 'transparent',
            }}
          >
            <div
              style={{
                fontSize: V.text.md,
                fontWeight: 500,
                color: V.dark.foreground,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {c.name}
            </div>
            <div
              style={{
                fontSize: V.text.md,
                color: V.dark.foreground,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {c.email}
            </div>
            <div style={{ fontSize: V.text.md, color: V.dark.mutedFg }}>{c.phone}</div>
            <div style={{ fontSize: V.text.md, color: V.dark.mutedFg }}>{c.created}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  style={{
                    padding: '2px 8px',
                    borderRadius: V.radius.full,
                    border: `1px solid ${V.dark.border}`,
                    background: V.dark.card,
                    color: V.dark.foreground,
                    fontSize: 12,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div style={{ fontSize: V.text.md, color: V.dark.mutedFg }}>{c.funnel}</div>
          </div>
        ))}
      </div>

      {/* Total counter */}
      <div
        style={{
          marginTop: 16,
          textAlign: 'right',
          color: V.dark.mutedFg,
          fontSize: V.text.md,
        }}
      >
        Showing {visibleCount} of {totalCount} contacts
      </div>
    </div>
  );
};

const Pill: React.FC<{ active?: boolean; children: React.ReactNode }> = ({ active, children }) => (
  <div
    style={{
      padding: '6px 14px',
      borderRadius: V.radius.full,
      background: active
        ? 'linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(52,211,153,0.32) 100%)'
        : 'rgba(255,255,255,0.04)',
      border: active ? '1px solid rgba(52,211,153,0.35)' : `1px solid ${V.dark.border}`,
      color: active ? '#A7F3D0' : V.dark.mutedFg,
      fontSize: V.text.md,
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
