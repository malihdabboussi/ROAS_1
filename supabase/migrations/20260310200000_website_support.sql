-- Website support on top of funnels.
-- 1) Extend funnel_type to include all runtime values + website
-- 2) Add shared layout JSONB to funnels
-- 3) Expand page_type values for website pages

ALTER TABLE funnels DROP CONSTRAINT IF EXISTS funnels_funnel_type_check;
ALTER TABLE funnels ADD CONSTRAINT funnels_funnel_type_check CHECK (
  funnel_type = ANY (
    ARRAY[
      'lead-magnet',
      'call-booking',
      'webinar',
      'home-page',
      'live-event',
      'ecommerce-product',
      'cart-checkout',
      'vsl',
      'custom',
      'website'
    ]
  )
);

ALTER TABLE funnels
  ADD COLUMN IF NOT EXISTS layout jsonb DEFAULT NULL;

COMMENT ON COLUMN funnels.layout IS 'Shared navigation/footer layout config for website funnels.';

ALTER TABLE funnel_pages DROP CONSTRAINT IF EXISTS funnel_pages_page_type_check;
ALTER TABLE funnel_pages ADD CONSTRAINT funnel_pages_page_type_check CHECK (
  page_type = ANY (
    ARRAY[
      'opt-in',
      'thank-you',
      'upsell',
      'landing',
      'sales',
      'booking',
      'call-booking',
      'webinar',
      'confirmation',
      'replay',
      'checkout',
      'download',
      'home',
      'event',
      'product',
      'vsl',
      'application',
      'pre-call',
      'cart',
      'cta',
      'about',
      'services',
      'pricing',
      'team',
      'contact',
      'blog-listing',
      'blog-post',
      'faq',
      'testimonials',
      'portfolio',
      'custom'
    ]
  )
);
