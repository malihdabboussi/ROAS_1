ALTER TABLE funnel_pages DROP CONSTRAINT funnel_pages_page_type_check;
ALTER TABLE funnel_pages ADD CONSTRAINT funnel_pages_page_type_check CHECK (page_type = ANY (ARRAY['opt-in', 'thank-you', 'upsell', 'landing', 'sales', 'booking', 'call-booking', 'webinar', 'confirmation', 'replay', 'checkout', 'download']));;
