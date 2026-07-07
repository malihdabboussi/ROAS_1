import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ThumbsUp, MessageCircle, Share, MoreHorizontal, Globe, X } from 'lucide-react';
import { revealByChar } from '../lib/reveal-text';

/**
 * 1:1 replica of apps/web/.../ad-preview/ad-preview-fb-feed.tsx.
 * Fixed hex palette: #ccd0d5 border, #050505 text, #65676b gray, #1877f2 blue.
 * Hard-coded engagement: 39 likes.
 */
export const AdFbFeed: React.FC<{
  advertiser: string;
  headline: string;
  primaryText: string;
  domain: string;
  cta: string;
  image: React.ReactNode;
  avatarLetter?: string;
}> = ({ advertiser, headline, primaryText, domain, cta, image, avatarLetter }) => {
  const frame = useCurrentFrame();
  const letter = (avatarLetter ?? advertiser).slice(0, 1).toUpperCase();
  const primaryDone = primaryText.length * 2;
  const primaryShown = revealByChar(primaryText, frame, 0, 2);
  const linkHeadline = revealByChar(headline, frame, primaryDone, 2);
  const afterHeadline = primaryDone + headline.length * 2;
  const linkDomain = revealByChar(domain, frame, afterHeadline, 2);
  const ctaShown = revealByChar(cta, frame, afterHeadline + domain.length * 2, 2);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderRadius: 8,
        border: '1px solid #ccd0d5',
        background: '#FFFFFF',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#1877f2',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {letter}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#050505' }}>{advertiser}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13, color: '#65676b' }}>Sponsored</span>
            <span style={{ fontSize: 13, color: '#65676b' }}>·</span>
            <Globe size={12} color="#65676b" />
          </div>
        </div>
        <MoreHorizontal size={24} color="#65676b" />
        <X size={24} color="#65676b" />
      </div>
      {/* Primary text */}
      <div
        style={{
          padding: '0 16px 12px',
          fontSize: 15,
          lineHeight: '20px',
          color: '#050505',
        }}
      >
        {primaryShown}
      </div>
      {/* Image */}
      <div style={{ background: '#000', aspectRatio: '1.91 / 1', overflow: 'hidden' }}>{image}</div>
      {/* Link strip */}
      <div
        style={{
          padding: '12px 16px',
          background: '#f0f2f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: '#65676b',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {linkDomain}
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#050505' }}>{linkHeadline}</div>
        </div>
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: '#e4e6eb',
            color: '#050505',
            fontSize: 15,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {ctaShown}
        </div>
      </div>
      {/* Engagement */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
          <ThumbsUp size={18} color="#1877f2" fill="#1877f2" />
          <span style={{ fontSize: 15, color: '#65676b' }}>39</span>
        </div>
      </div>
      {/* Footer actions */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid #ccd0d5',
          padding: '6px 0',
        }}
      >
        <FooterBtn>
          <ThumbsUp size={18} color="#65676b" /> <span>Like</span>
        </FooterBtn>
        <FooterBtn>
          <MessageCircle size={18} color="#65676b" /> <span>Comment</span>
        </FooterBtn>
        <FooterBtn>
          <Share size={18} color="#65676b" /> <span>Share</span>
        </FooterBtn>
      </div>
    </div>
  );
};

const FooterBtn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '8px 0',
      color: '#65676b',
      fontSize: 15,
      fontWeight: 600,
    }}
  >
    {children}
  </div>
);
