-- Migration: Insert funnel-builder skill resources (funnel examples library).
-- Recovered from git history (commit 6b9ee102~1) — these files were deleted but the skill still references them.

-- Clean up any existing funnel-builder resources
DELETE FROM agent_skill_resources WHERE skill_key = 'funnel-builder' AND agent_key = '*';

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/INDEX.md',
  $res_INDEX_md$
# Funnel Examples Library — Master Index

25 real-world funnel page examples across 7 categories. Every example contains **full source code** — entry files plus all sub-component implementations.

**Base path:** `examples/funnels/`

**Source Legend:** All examples now contain full, self-contained source code with all component implementations inlined.

---

## General Home Pages (3 examples)

| Example | Company | Description | File |
|---------|---------|-------------|------|
| BRR Guys - Home Page | The BRR Guys | Real estate education. Hero with dual CTAs, animated scroll timeline, team bios with combined stats, deal criteria cards with video walkthrough, strong CTA section | `general-home-page/brrr-guys-home.md` |
| Origin Studios - Home Page | Origin Studios | Podcast studio. Animated hero with typewriter text, 3-tier pricing cards, studio showcase with images, celebrity carousel, gallery, FAQ with Google Reviews and location map, CTA | `general-home-page/origin-studios-home.md` |
| Anson Park - Home Page | Anson Park Investing | Real estate syndication. Luxury dark theme, deal summary with locked/blurred premium content requiring form submission, property gallery, location analysis, team section, exit intent popup | `general-home-page/anson-park-home.md` |

---

## Ecommerce Product Pages (1 example)

| Example | Company | Description | File |
|---------|---------|-------------|------|
| AE1 - Product Page | AE1 | Supplement product page. Product image gallery with thumbnails, subscribe-and-save vs one-time pricing with radio buttons, competitor comparison table, clinical ingredients breakdown, benefits icons, 12-item FAQ accordion, third-party tested CTA | `ecommerce-product/ae1-product-page.md` |

---

## Webinar Funnels (9 examples)

### Opt-In Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| Leveraged VA - Opt-In | Leveraged VA | Light theme CRE webinar. Hero with countdown and trust badges, 3-card benefits grid, target audience checklist, host bio with icon stats, bonus section with card grid and countdown, registration popup modal with loading state | `webinar/leveraged-va-optin.md` |
| Freedom Builders - Opt-In | Freedom Builders | Dark theme webinar. Sticky desktop header with banner + CTA, hero with gradient orbs and countdown, about coach with animated count-up stats, what you'll learn numbered card grid, mobile sticky bar, form modal with embedded GHL form | `webinar/freedom-builders-optin.md` |
| Sample Webinar - Opt-In | ROAS | Dark theme webinar. Animated hero with trust badges, what you'll learn section with locked/blurred case studies, countdown timer, registration modal with phone country picker, sticky bottom bar, logo bar | `webinar/sample-webinar-optin.md` |
| Insurance Creators - Opt-In | Insurance Creators | Gold/black premium webinar. Logo header, animated hero with countdown, what you'll learn with locked case studies, registration modal, sticky bottom bar. Gold theme variant | `webinar/insurance-creators-optin.md` |

### Confirmation / Thank-You Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| Freedom Builders - Confirmation | Freedom Builders | Confetti on load, sticky header, video welcome with click-to-unmute, calendar buttons, 3-step prep cards with gradient backgrounds, coach bio with video modal, 8 case study video grid with modal player, podcast grid, split FAQ with photo, blueprint CTA | `webinar/freedom-builders-confirmation.md` |
| Sample Webinar - Confirmation | ROAS | Gamified 4-step completion system (watch video, add to calendar, share with friends, case studies). Confetti, progress popup, exit intent, social sharing with copy-paste message | `webinar/sample-webinar-confirmation.md` |
| Insurance Creators - Confirmation | Insurance Creators | Premium gold/black theme. 3 action steps (add calendar, check email, block time), optional video section, what to expect bullet list, closing note from team, exit intent popup | `webinar/insurance-creators-confirmation.md` |

### Additional Webinar Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| Freedom Builders - CTA / Call Booking | Freedom Builders | Post-webinar call booking. Urgency banner (limited spots), two-column: coach headshot + intro on left, embedded booking calendar on right. Dark theme with gradient backgrounds | `webinar/freedom-builders-cta.md` |
| Freedom Builders - Replay | Freedom Builders | Time-limited replay with countdown to expiry. Wistia video embed, key takeaways checklist, urgency sections, sticky bottom CTA bar with countdown, multiple booking CTAs | `webinar/freedom-builders-replay.md` |

---

## Live Event Pages (2 examples)

| Example | Company | Description | File |
|---------|---------|-------------|------|
| Battista Academy - Event Page | Battista Academy | In-person event. Fixed header with nav + ticket popup, hero with animated underlines, event highlights with countdown, venue calendar + map, 3-tier ticket cards (GA/VIP/CEO), speaker lineup with hover effects, event details, learning topics grid, accordion FAQ, footer CTA, back-to-top | `live-event/battista-event.md` |
| Standard Plumbing - Event Page | Standard Plumbing | Trade event. Same structure as Battista with added sponsors section. Fixed header, hero, highlights, venue, tickets, speakers, sponsors, learning, FAQ, footer | `live-event/standard-plumbing-event.md` |

---

## Cart / Checkout Pages (1 example)

| Example | Company | Description | File |
|---------|---------|-------------|------|
| Krista Mashore - Cart Page | Krista Mashore | Virtual event checkout. Dark purple theme, step progress bar (3 steps), tiered pricing progress bar with spots counter, countdown timer, two-column layout (embedded checkout iframe + value stack with icons), testimonial screenshots masonry grid, social proof popup, money-back guarantee badge, mobile-only CTA button | `cart/krista-mashore-cart.md` |

---

## VSL & Call Booking Pages (6 examples)

### VSL Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| BRR Guys - VSL | The BRR Guys | Video Sales Letter with progressive content unlocking. Vidalytics video embed, two countdown timers (2:35 and 11:35), content unlocks progressively after each timer, value bullets, social proof bar, mini testimonials, sticky bottom bar, exit intent popup | `vsl-call-booking/brrr-guys-vsl.md` |

### Application / Booking Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| BRR Guys - Application | The BRR Guys | Multi-step qualifying questionnaire (8 questions) before call booking. Radio buttons with auto-advance, progress bar, partial data persistence to Supabase on each answer, then embedded GHL calendar on final step | `vsl-call-booking/brrr-guys-application.md` |
| Anson Park - Info Request | Anson Park Investing | Two-column info request page. Left: headline, key metrics (some locked/blurred), property photos. Right: embedded GHL form with accredited investor toggle (Switch component). Exit intent dialog | `vsl-call-booking/anson-park-lead-magnet.md` |
| Anson Park - Call Booking | Anson Park Investing | Full investment detail page. Investment deck (Canva embed), quick navigation links, deal summary cards (Investment Terms + Projected Returns), deal overview grid, tax benefits, full property gallery with video, location map, team section, embedded booking calendar | `vsl-call-booking/anson-park-call-booking.md` |

### Pre-Call / Confirmation Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| BRR Guys - Pre-Call | The BRR Guys | 7-step pre-call page. Confetti on load, step completion buttons, video welcome (Vidalytics), prep tips grid, calendar confirmation with screenshot, FAQ video grid (10 vertical videos), program offer overview, testimonial video carousel (11 videos), Skool community CTA | `vsl-call-booking/brrr-guys-pre-call.md` |
| Anson Park - Pre-Call | Anson Park Investing | 4-step investment pre-call. Check email with calendar screenshot, review investment details checklist, prepare questions list, meet team with photos and social links. What to expect section with call agenda and duration | `vsl-call-booking/anson-park-pre-call.md` |

---

## Lead Magnet Pages (3 examples)

### Opt-In Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| Freedom Builders - Opt-In | Freedom Builders | Blueprint opt-in (long-form). Dark theme, sticky header, hero with gradient orbs and product mockup, what's inside 3-card grid with gradient backgrounds plus bonus cards, preview screenshots, video preview, problem/solution framing, credibility bar, form with mockup, about coach with video modal | `lead-magnet/freedom-builders-optin.md` |
| BRR Guys - Opt-In | The BRR Guys | Simple lead magnet opt-in (short-form). Clean white design, headline with stats, embedded GHL form, trust element badge, 5 bullet points of what they'll discover, disclaimer. Minimal and conversion-focused | `lead-magnet/brrr-guys-optin.md` |

### Delivery / Confirmation Pages

| Example | Company | Description | File |
|---------|---------|-------------|------|
| Freedom Builders - Delivery | Freedom Builders | Lead magnet delivery with call booking upsell. YouTube walkthrough video of the blueprint, Canva template CTA button, then section with coach photo and embedded booking calendar for strategy call | `lead-magnet/freedom-builders-delivery.md` |
$res_INDEX_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/cart/krista-mashore-cart.md',
  $res_cart_krista_mashore_cart_md$
---
name: "Krista Mashore - Cart Page"
category: cart
company: "Krista Mashore"
page_type: checkout
description: "Virtual event checkout. Dark purple, tiered pricing bar, countdown, two-column (form + value stack), testimonials, social proof popup, guarantee."
tags: [cart, checkout, event, tiered-pricing, countdown, value-stack, testimonials]
---

# Page Source

```tsx
// File: Checkout.tsx
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Ticket, Check, Gift, ShieldCheck, Video, BookOpen, Users, TicketPlus, BookMarked, GraduationCap, Bot, Sparkles } from "lucide-react";

import { useCountdown } from "@/hooks/useCountdown";
import eventBundleImg from "@/assets/placeholder.jpg";
import coachingImg from "@/assets/placeholder.jpg";
import coachingPortraitImg from "@/assets/placeholder.jpg";
import blueprintsSpreadImg from "@/assets/placeholder.jpg";
import communityImg from "@/assets/placeholder.jpg";
import paymentCardsImg from "@/assets/placeholder.jpg";
import ProofPopup from "@/components/ProofPopup";

const COUNTDOWN_TARGET = new Date("2026-02-23T08:00:00");

const TESTIMONIAL_IMAGES = [
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
  "/placeholder.jpg
];

/* ── FadeInOnScroll ── */
function FadeInOnScroll({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease-out, transform 0.6s ease-out",
      }}
    >
      {children}
    </div>
  );
}

/* ── Gradient Divider ── */
function GradientDivider() {
  return (
    <div className="mx-auto my-2 h-px w-3/4 max-w-xl" style={{
      background: "linear-gradient(90deg, transparent, var(--funnel-glow), transparent)",
    }} />
  );
}

/* ── Value Stack Icon Map ── */
const VALUE_ICONS: Record<number, React.ElementType> = {
  0: Video,
  1: BookOpen,
  2: Users,
  3: TicketPlus,
  4: BookMarked,
  5: GraduationCap,
  6: Bot,
  7: Gift,
};

const CheckoutPage = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const countdown = useCountdown(COUNTDOWN_TARGET);

  // Redirect parent window on form submission (iframe navigates)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let loadCount = 0;
    const onIframeLoad = () => {
      loadCount++;
      // First load is initial page; subsequent loads mean form submitted & redirected
      if (loadCount > 1) {
        const successUrl = "https://success.kristamashore.com/dar-48seller";
        if (window.parent !== window) {
          // We're embedded — redirect the parent
          window.parent.postMessage({ type: "REDIRECT", url: successUrl }, "*");
          // Also try top-level redirect as fallback
          try { window.top!.location.href = successUrl; } catch (e) {}
        } else {
          window.location.href = successUrl;
        }
      }
    };
    iframe.addEventListener("load", onIframeLoad);
    return () => iframe.removeEventListener("load", onIframeLoad);
  }, []);

  // Listen for height from inner checkout iframe & resize it
  // Also broadcast OUR height to the outer GHL parent
  useEffect(() => {
    let lastSentHeight = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function sendOwnHeight() {
      debounceTimer = null;
      const wrapper = document.getElementById("checkout-wrapper");
      const height = wrapper
        ? Math.ceil(wrapper.getBoundingClientRect().height)
        : Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (Math.abs(height - lastSentHeight) < 5) return;
      lastSentHeight = height;
      window.parent.postMessage({ type: "EMBED_PAGE_HEIGHT", height }, "*");
    }

    function scheduleSend() {
      if (debounceTimer) return;
      debounceTimer = setTimeout(sendOwnHeight, 200);
    }

    const handleMessage = (event: MessageEvent) => {
      // Handle ping from outer parent — respond with our height
      if (event.data?.type === "EMBED_PAGE_PING") {
        sendOwnHeight();
        return;
      }
      // Handle height from inner GHL iframe
      if (event.source === window.parent) return;
      if (event.data?.type === "EMBED_PAGE_HEIGHT" && typeof event.data.height === "number") {
        if (iframeRef.current) {
          iframeRef.current.style.height = `${event.data.height}px`;
        }
        scheduleSend();
      }
    };

    window.addEventListener("message", handleMessage);

    const wrapper = document.getElementById("checkout-wrapper");

    // Use ResizeObserver for reliable size tracking
    const resizeObs = new ResizeObserver(() => {
      scheduleSend();
    });
    if (wrapper) {
      resizeObs.observe(wrapper);
    }

    const observer = new MutationObserver(() => {
      scheduleSend();
    });
    if (wrapper) {
      observer.observe(wrapper, { childList: true, subtree: true });
    }

    window.addEventListener("resize", scheduleSend);

    // Send height at multiple intervals to catch late-loading content
    sendOwnHeight();
    setTimeout(sendOwnHeight, 500);
    setTimeout(sendOwnHeight, 1000);
    setTimeout(sendOwnHeight, 2000);
    setTimeout(sendOwnHeight, 4000);

    // Also re-send when all images finish loading
    const images = document.querySelectorAll("#checkout-wrapper img");
    images.forEach((img) => {
      if (!(img as HTMLImageElement).complete) {
        img.addEventListener("load", scheduleSend, { once: true });
      }
    });

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("resize", scheduleSend);
      resizeObs.disconnect();
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  const [spotsTaken, setSpotsTaken] = useState(() => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const progress = hours / 24;
    const eased = progress * progress * (3 - 2 * progress);
    return Math.floor(12 + eased * 15);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;
      const progress = hours / 24;
      const eased = progress * progress * (3 - 2 * progress);
      setSpotsTaken(Math.floor(12 + eased * 15));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const valueItems = [
    { title: "Over 15 Hours of Coaching", desc: "Experience High-Level Training Normally Reserved For MY Elite & Mastery Clients", value: "$6,997", isBonus: false },
    { title: "Detailed & Customizable Mastery Class Workbook & Implementation Blueprint", desc: "Use Your 3-Day Mastery Course Workbook To Create Your Immediate Business Action Plan", value: "$984", isBonus: false },
    { title: "Private Facebook Community", desc: "Access Additional Resources, Videos, Event Recordings (Limited Time Only), Brainstorm and Connect with Agents & Lenders Nationwide", value: "$627", isBonus: false },
    { title: "BONUS 1: Event Ticket for a Partner or Colleague", desc: "", value: "$97", isBonus: true },
    { title: "BONUS 2: My Latest Best-Selling Book Top Producer Secrets", desc: "", value: "$24", isBonus: true },
    { title: "BONUS 3: Pre Event Training", desc: "", value: "$497", isBonus: true },
    { title: "BONUS 4: AI Krista In Your Pocket", desc: "Trial During Event", value: "$297", isBonus: true },
    { title: "BONUS 5: Receive a Mastery Class GIFT when you register", desc: "Make sure you let us know the best address to send it.", value: "$149", isBonus: true },
  ];

  return (
    <div id="checkout-wrapper" className="relative overflow-x-hidden" style={{ background: "var(--funnel-bg)" }}>
      <ProofPopup />
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: "180vw", height: "600px", left: "-40vw", top: "500px",
          background: "var(--funnel-glow)", mixBlendMode: "plus-lighter", opacity: 0.24, filter: "blur(280px)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          width: "180vw", height: "300px", left: "-40vw", bottom: "0",
          background: "var(--funnel-glow)", mixBlendMode: "plus-lighter", opacity: 0.24, filter: "blur(280px)",
        }}
      />

      {/* Step Progress Bar */}
      <div
        className="relative z-20 hidden flex-wrap items-center justify-center gap-2 px-3 py-3 sm:flex sm:gap-3 lg:gap-4"
        style={{ background: "linear-gradient(135deg, #3A1A5E 0%, #2A1040 100%)" }}
      >
        {[
          { step: 1, label: "START REGISTRATION", active: false, completed: true },
          { step: 2, label: "PURCHASE TICKET", active: true, completed: false },
          { step: 3, label: "FINISH REGISTRATION", active: false, completed: false },
        ].map((item) => (
          <div
            key={item.step}
            className="flex items-center justify-center rounded-lg px-3 py-2 text-[10px] font-bold tracking-wider sm:px-4 sm:py-2.5 sm:text-xs md:px-6 lg:px-8 lg:py-3 lg:text-sm"
            style={{
              background: item.active
                ? "linear-gradient(135deg, var(--funnel-accent), #C44EE0)"
                : "rgba(80, 40, 100, 0.6)",
              color: item.active ? "var(--funnel-bg)" : "rgba(249, 216, 255, 0.6)",
              border: item.active ? "none" : "1px solid rgba(150, 80, 170, 0.3)",
              minWidth: "fit-content",
            }}
          >
            STEP {item.step}: {item.label}
          </div>
        ))}
      </div>

      {/* Top Banner - Tiered Pricing */}
      <div
        className="relative z-20 flex flex-col items-center justify-center gap-3 px-4 py-3 sm:px-8"
        style={{ background: "rgba(30, 10, 35, 0.85)", borderBottom: "1px solid rgba(150, 80, 170, 0.25)" }}
      >
        <span className="text-xs font-light tracking-wide sm:text-sm" style={{ color: "var(--funnel-text)", opacity: 0.7 }}>
          Ticket price discount for {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
        <TieredPricingBar spotsTaken={spotsTaken} />
      </div>

      {/* Hero Section */}
      <FadeInOnScroll>
        <div className="relative z-20 flex flex-col items-center px-2 py-5 text-center sm:px-4 sm:py-8" id="checkout-top">
          <p
            className="mb-2 text-base font-semibold italic tracking-wide sm:text-2xl lg:text-3xl"
            style={{ color: "var(--funnel-accent)" }}
          >
            On This Page, You Can Register For...
          </p>
          <div className="mb-4 flex flex-col items-center gap-1">
            <h1 className="text-3xl font-extrabold uppercase leading-none sm:text-5xl lg:text-6xl xl:text-7xl" style={{ color: "var(--funnel-text-bright)", letterSpacing: "-0.03em" }}>
              The Sell 100 Homes
            </h1>
            <h1 className="text-3xl uppercase leading-none sm:text-5xl lg:text-6xl xl:text-7xl" style={{ color: "var(--funnel-text-bright)", letterSpacing: "-0.03em", fontWeight: 900 }}>
              3-Day Virtual Event!</h1>
            <div className="mt-2.5 flex flex-col items-center gap-2 sm:mt-0 sm:flex-row sm:gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-white sm:text-sm">LIVE ON ZOOM</span>
              </span>
              <span className="text-sm font-semibold tracking-wider text-white sm:text-xl" style={{ letterSpacing: "0.08em" }}>
                Feb 23 - 25 | 8am-1pm PST
              </span>
            </div>
          </div>

        </div>
      </FadeInOnScroll>

      {/* Gradient divider before white container */}
      <GradientDivider />

      {/* Countdown banner — attached to white container */}
      <div className="relative z-30 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="relative mx-0 overflow-hidden flex flex-col items-center gap-2 rounded-t-xl px-4 py-4 sm:flex-row sm:justify-center sm:gap-6 sm:px-6 lg:mx-[120px]"
          style={{
            background: "linear-gradient(135deg, #FFD600, #F5A623, #FFD600)",
            boxShadow: "0 0 40px 10px rgba(255, 214, 0, 0.3), 0 0 80px 20px rgba(245, 166, 35, 0.15)",
          }}
        >
          {/* Ambient glows */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-40" style={{ background: "radial-gradient(circle, rgba(255,214,0,0.6), transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(245,166,35,0.5), transparent 70%)" }} />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4), transparent 60%)" }} />
          <span className="relative z-10 text-sm font-extrabold uppercase tracking-wider text-gray-900 sm:text-base">
            ⏰ Registration closes soon:
          </span>
          <div className="flex items-center gap-3">
            {[
              { value: countdown.days, label: "Days" },
              { value: countdown.hours, label: "Hours" },
              { value: countdown.minutes, label: "Minutes" },
              { value: countdown.seconds, label: "Seconds" },
            ].map((item, idx) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className={`text-2xl font-extrabold tabular-nums text-gray-900 sm:text-3xl ${item.label === "Seconds" ? "transition-transform duration-150" : ""}`}
                    style={item.label === "Seconds" ? { animation: "fade-in-up 0.3s ease-out" } : undefined}
                    key={item.label === "Seconds" ? item.value : undefined}
                  >
                    {String(item.value).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-900/60">{item.label}</span>
                </div>
                {idx < 3 && <span className="text-xl font-bold text-gray-900/40">:</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* One big white container */}
      <div className="relative z-20 mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div
          className="overflow-hidden rounded-b-2xl"
          style={{
            background: "#ffffff",
            boxShadow: "0px 8px 83px 34px rgba(0,0,0,0.25)",
          }}
        >

          {/* Two-column content inside white container */}
          <div className="flex flex-col lg:flex-row">
            {/* Left column — Order Form */}
            <div ref={formRef} className="w-full lg:w-1/2 lg:border-r lg:border-gray-100">
              <p className="px-6 py-4 text-center text-base font-medium leading-relaxed text-gray-600 sm:text-lg">
                Enter your information now to secure your ticket and get{" "}
                <span className="font-semibold" style={{ color: "#3A1A5E" }}>instant access to $250+ in bonus materials...</span>
              </p>
              <iframe
                ref={iframeRef}
                src="https://success.kristamashore.com/checkout/v3"
                className="w-full border-0"
                style={{ height: "1420px", transition: "height 0.3s ease" }}
                allow="payment"
                title="Checkout Form"
              />
            </div>

            {/* Right column — Event Bundle Image + Value Stack */}
            <div className="flex w-full flex-col items-center px-6 py-8 lg:w-1/2">
              <img
                src={eventBundleImg}
                alt="Event bundle including tickets, workbook, and books"
                className="-my-4 w-full max-w-md"
              />
              <h3 className="mb-1 text-xl font-bold sm:text-2xl" style={{ color: "#7C3AED" }}>
                Here's Everything You Get
              </h3>
              <p className="mb-4 text-sm font-medium text-gray-600">
                When You Register For The Sell 100 Homes Event Today
              </p>
              <p className="mb-4 text-center text-xs font-medium leading-relaxed text-gray-500 sm:text-sm">
                Plus Access The Private Community, Done-For-You Templates, Scripts & The Complete M.A.G.N.E.T. System To Attract Clients On Autopilot And Get...
              </p>
              <div className="mb-6 flex w-full flex-col gap-0 text-left">
                {valueItems.map((item, i) => {
                  const IconComp = VALUE_ICONS[i] || Check;
                  return (
                    <div key={i}>
                      <div className="flex items-start gap-3 border-b border-gray-100 px-1 py-4">
                        <div
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: "linear-gradient(135deg, #FFD600, #FFA800)" }}
                        >
                          <IconComp className="h-4 w-4 text-gray-900" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold leading-snug text-gray-900 sm:text-base">
                            {item.title}
                          </p>
                          {item.desc && (
                            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500 sm:text-sm">
                              {item.desc}
                            </p>
                          )}
                        </div>
                        {item.value && (
                          <span className="shrink-0 text-sm font-bold sm:text-base" style={{ color: "#7C3AED" }}>
                            ({item.value} Value)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gradient divider */}
              <div className="mb-4 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #7C3AED, transparent)" }} />

              <p className="mb-2 text-lg font-normal text-gray-400 line-through">
                TOTAL VALUE: $9,997+
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-400 line-through sm:text-3xl">
                  $97.00
                </span>
                <span className="text-3xl font-extrabold sm:text-4xl animate-price-glow" style={{ color: "#7C3AED", letterSpacing: "-0.02em" }}>
                  $28.79
                </span>
              </div>
              <p className="mt-1 text-sm font-medium tracking-wide text-gray-400">
                TODAY ONLY — Limited spots at this price
              </p>

              {/* Money-Back Guarantee Badge */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
                <ShieldCheck className="h-6 w-6 shrink-0 text-green-600" />
                <span className="text-xs font-bold text-green-800 sm:text-sm">100% Money-Back Guarantee</span>
              </div>

              <p className="mt-3 text-center text-sm font-medium leading-relaxed text-gray-600 sm:text-base">
                Start diving in right away with exclusive bonuses, expert resources, and gifts available immediately after registration!
              </p>

              {/* Mobile-only CTA button */}
              <button
                onClick={scrollToForm}
                className="mt-4 flex w-full flex-col items-center rounded-lg px-8 py-4 transition-transform hover:scale-105 animate-pulse-glow sm:hidden"
                style={{
                  background: "linear-gradient(135deg, #FFD600, #FFA800)",
                  color: "#1a1a1a",
                }}
              >
                <span className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wider">
                  <Ticket className="h-5 w-5" />
                  Secure My Ticket Now
                </span>
                <span className="mt-1 text-xs font-semibold tracking-wide opacity-70">
                  Includes free invite for a friend
                </span>
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Gradient divider */}
      <GradientDivider />

      {/* WHAT / WHEN / WHY — 3-column on desktop */}
      <FadeInOnScroll>
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Coaching image with overlay text */}
          <div className="relative mb-8 overflow-hidden rounded-xl" style={{ minHeight: "200px" }}>
            <img src={coachingImg} alt="" className="h-full w-full object-cover" style={{ mixBlendMode: "luminosity", minHeight: "200px" }} />
            <div className="absolute inset-0" style={{ background: "rgba(88, 28, 88, 0.7)" }} />
            <div className="absolute inset-0 flex items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
              <p className="max-w-4xl text-center text-base font-bold leading-relaxed sm:text-2xl sm:leading-loose lg:text-4xl" style={{ color: "rgba(255, 255, 255, 0.75)" }}>
                <strong>PLUS:</strong> For those who register, show up, and play full out, you'll be eligible to <strong>WIN DAILY PRIZES</strong>, including swag, books, bonus trainings, PDFs, and more!
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* WHAT */}
            <div className="overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-1 w-full" style={{ background: "var(--funnel-accent)" }} />
              <div className="px-5 py-5">
                <h4 className="text-2xl font-black sm:text-3xl" style={{ color: "var(--funnel-text-bright)" }}>WHAT</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed sm:text-base" style={{ color: "var(--funnel-text)", opacity: 0.85 }}>
                  3-Day Virtual Live Event With Top 1% Agent Krista Mashore On Authority, AI, Marketing & Lead Generation
                </p>
              </div>
            </div>

            {/* WHEN */}
            <div className="overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-1 w-full" style={{ background: "var(--funnel-accent)" }} />
              <div className="px-5 py-5">
                <h4 className="text-2xl font-black sm:text-3xl" style={{ color: "var(--funnel-text-bright)" }}>WHEN</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed sm:text-base" style={{ color: "var(--funnel-text)", opacity: 0.85 }}>
                  February 23rd – 25th{"\n"}8AM - 1PM PT | 11AM - 4PM ET
                </p>
              </div>
            </div>

            {/* WHY */}
            <div className="overflow-hidden rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="h-1 w-full" style={{ background: "var(--funnel-accent)" }} />
              <div className="px-5 py-5">
                <h4 className="text-2xl font-black sm:text-3xl" style={{ color: "var(--funnel-text-bright)" }}>WHY</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed sm:text-base" style={{ color: "var(--funnel-text)", opacity: 0.85 }}>
                  So you can go from 'getting leads' to SELLING 100+ HOMES with a proven system!
                </p>
              </div>
            </div>
          </div>
        </div>
      </FadeInOnScroll>

      {/* Gradient divider */}
      <GradientDivider />

      {/* Full-width content resumes */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <FadeInOnScroll>
          {/* Headline moved above testimonials */}
          <h2
            className="mx-auto max-w-4xl text-center text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl xl:text-6xl"
            style={{ color: "var(--funnel-text-bright)", letterSpacing: "-0.02em" }}
          >
            Get More <span className="relative inline-block"><em className="italic">*Qualified*</em><svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none" style={{ height: "0.3em" }}><path d="M0 5 Q 10 0, 20 5 T 40 5 T 60 5 T 80 5 T 100 5" fill="none" stroke="var(--funnel-accent)" strokeWidth="2" /></svg></span> Buyers And{" "}
            <span style={{ color: "var(--funnel-accent)" }}>Sell 100+ Homes In 2026</span>
          </h2>
          <p
            className="mx-auto mt-4 max-w-2xl text-center text-lg font-medium sm:text-xl"
            style={{ color: "var(--funnel-text)", opacity: 0.85 }}
          >
            Just like these agents that went through the training...
          </p>
        </FadeInOnScroll>

        {/* Video Testimonials */}
        <FadeInOnScroll className="mx-auto mt-12 max-w-5xl">
          <div className="overflow-hidden rounded-xl" style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.3)" }}>
            <iframe
              src="https://sotellus.com/iframe/krista-mashore-coaching/"
              scrolling="yes"
              width="100%"
              height="700"
              style={{ border: "none" }}
              title="Video Testimonials"
            />
          </div>
        </FadeInOnScroll>

        {/* Screenshot Testimonials */}
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4" style={{ columnFill: "balance" }}>
            {TESTIMONIAL_IMAGES.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Agent testimonial ${i + 1}`}
                className="mb-3 w-full rounded-lg"
                loading="lazy"
                style={{ breakInside: "avoid" }}
              />
            ))}
          </div>

          {/* Tiered Pricing Breakdown */}
          <FadeInOnScroll>
            <div className="mx-auto mt-12 max-w-xl">
              <h3
                className="mb-8 text-center text-2xl font-extrabold italic sm:text-3xl"
                style={{ color: "var(--funnel-text-bright)" }}
              >
                SPECIAL FINAL DAY SALES PROMO
              </h3>
              <div
                className="overflow-visible rounded-2xl"
                style={{ background: "rgba(240,240,245,0.95)", boxShadow: "0 4px 30px rgba(0,0,0,0.15)" }}
              >
                {/* Top tier — highlighted */}
                <div
                  className="relative flex flex-col items-center rounded-t-2xl px-6 py-8"
                  style={{ background: "#ffffff", border: "3px solid #7C3AED" }}
                >
                  <span
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-md px-5 py-1 text-xs font-extrabold uppercase tracking-widest text-white"
                    style={{ background: "#7C3AED" }}
                  >
                    LAST FEW
                  </span>
                  <span className="mt-1 text-sm font-bold text-gray-800">First 30 seats</span>
                  <span className="text-5xl font-extrabold animate-price-glow sm:text-6xl" style={{ color: "#7C3AED" }}>
                    <Sparkles className="mx-auto mb-1 h-5 w-5 text-yellow-400 opacity-70" />
                    $28.79
                  </span>
                  <span className="mt-1 text-sm font-semibold text-gray-600">w/ Bonus Materials!!!</span>
                </div>

                {/* Second tier */}
                <div className="flex flex-col items-center border-t border-gray-200 px-6 py-5" style={{ background: "rgba(245,245,248,1)" }}>
                  <span className="text-xs font-bold tracking-wide text-gray-400">1,001 – 2,000 seats</span>
                  <span className="text-3xl font-bold text-gray-400 sm:text-4xl">$47.99</span>
                </div>

                {/* Third tier */}
                <div className="flex flex-col items-center rounded-b-2xl border-t border-gray-200 px-6 py-5" style={{ background: "rgba(245,245,248,1)" }}>
                  <span className="text-xs font-bold tracking-wide text-gray-400">2,001+ seats</span>
                  <span className="text-3xl font-bold text-gray-400 sm:text-4xl">$97.00</span>
                </div>
              </div>

              {/* Price Today */}
              <div className="mt-8 flex flex-col items-center">
                <span className="text-xl font-extrabold sm:text-2xl" style={{ color: "var(--funnel-text-bright)" }}>
                  Price Today:{" "}
                  <span className="line-through text-gray-400">$997</span>{" "}
                  <span className="line-through text-gray-400">$250</span>
                </span>
                <span className="text-5xl font-extrabold sm:text-6xl" style={{ color: "#7C3AED" }}>$28.79!</span>
              </div>

              {/* Chevrons */}
              <div className="mt-4 flex items-center justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <svg key={i} width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ color: "#b8a060", opacity: 0.7 }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 4l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={scrollToForm}
                className="mt-8 flex w-full flex-col items-center rounded-lg px-10 py-5 transition-transform hover:scale-105 animate-pulse-glow"
                style={{
                  background: "linear-gradient(135deg, #FFD600, #FFA800)",
                  color: "#1a1a1a",
                }}
              >
                <span className="flex items-center gap-2 text-lg font-extrabold uppercase tracking-wider sm:text-xl">
                  <Ticket className="h-6 w-6" />
                  Secure My Ticket Now
                </span>
                <span className="mt-1 text-xs font-semibold tracking-wide opacity-70 sm:text-sm">
                  Includes free invite for a friend
                </span>
              </button>


              {/* Money-Back Guarantee */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <ShieldCheck className="h-5 w-5" style={{ color: "var(--funnel-accent)" }} />
                <span className="text-xs font-semibold" style={{ color: "var(--funnel-text)", opacity: 0.7 }}>
                  100% Money-Back Guarantee
                </span>
              </div>
            </div>
          </FadeInOnScroll>

          <div className="pb-8" />
        </div>
      </div>
    </div>
  );
};

function MidnightCountdown() {
  const midnight = useMemo(() => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(24, 0, 0, 0);
    return target;
  }, []);
  const { hours, minutes, seconds } = useCountdown(midnight);

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--funnel-text)", opacity: 0.5 }}>
        Ticket sale ends in
      </span>
      <div className="flex items-center gap-1.5 font-mono text-xl font-bold sm:text-2xl" style={{ color: "var(--funnel-accent)" }}>
        <span>{String(hours).padStart(2, "0")}</span>
        <span className="animate-pulse">:</span>
        <span>{String(minutes).padStart(2, "0")}</span>
        <span className="animate-pulse">:</span>
        <span>{String(seconds).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

function TieredPricingBar({ spotsTaken }: { spotsTaken: number }) {
  return (
    <div className="w-full max-w-lg">
      <div className="flex items-end justify-between">
        <div className="flex flex-1 flex-col items-center">
          <span className="text-lg font-bold sm:text-xl" style={{ color: "var(--funnel-accent)" }}>$28.79</span>
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: "var(--funnel-text)", opacity: 0.6 }}>FIRST 30</span>
        </div>
        <div className="mb-1 h-6 w-px" style={{ background: "rgba(150, 80, 170, 0.4)" }} />
        <div className="flex flex-1 flex-col items-center">
          <span className="text-lg font-bold sm:text-xl" style={{ color: "var(--funnel-text-bright)" }}>$47.99</span>
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: "var(--funnel-text)", opacity: 0.6 }}>30–50</span>
        </div>
        <div className="mb-1 h-6 w-px" style={{ background: "rgba(150, 80, 170, 0.4)" }} />
        <div className="flex flex-1 flex-col items-center">
          <span className="text-lg font-bold sm:text-xl" style={{ color: "var(--funnel-text)", opacity: 0.7 }}>$97.00</span>
          <span className="text-[10px] font-semibold tracking-wide" style={{ color: "var(--funnel-text)", opacity: 0.6 }}>50+</span>
        </div>
      </div>
      {/* Progress bar with shimmer */}
      <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full" style={{ background: "rgba(80, 40, 100, 0.5)" }}>
        <div className="absolute top-0 h-full w-px" style={{ left: "33.3%", background: "rgba(255,255,255,0.15)" }} />
        <div className="absolute top-0 h-full w-px" style={{ left: "66.6%", background: "rgba(255,255,255,0.15)" }} />
        <div
          className="shimmer-bar relative h-full overflow-hidden rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min((spotsTaken / 30) * 33.3, 100)}%`,
            background: "linear-gradient(90deg, var(--funnel-accent), #EB7EFF)",
          }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold" style={{ color: "var(--funnel-text)", opacity: 0.6 }}>
          {spotsTaken} of 30 spots claimed
        </span>
        <span className="text-[10px] font-semibold" style={{ color: "var(--funnel-text)", opacity: 0.4 }}>
          Tier 2 pricing next →
        </span>
      </div>
    </div>
  );
}

function ContentRow({ image, text }: { image: string; text: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ boxShadow: "0px 8px 56px 6px rgba(0,0,0,0.25)", aspectRatio: "16/7" }}
    >
      <img src={image} alt="" className="block h-full w-full object-cover" style={{ mixBlendMode: "luminosity" }} />
      <div className="absolute inset-0" style={{ background: "rgba(88, 28, 88, 0.82)" }} />
      <div className="absolute inset-0 flex items-center justify-center px-6 py-4">
        <p className="text-center text-lg font-bold leading-snug sm:text-xl" style={{ color: "var(--funnel-text)", letterSpacing: "-0.02em" }}>
          {text}
        </p>
      </div>
    </div>
  );
}

export default CheckoutPage;

```

$res_cart_krista_mashore_cart_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/ecommerce-product/ae1-product-page.md',
  $res_ecommerce_product_ae1_product_page_md$
---
name: "AE1 - Product Page"
category: ecommerce-product
company: "AE1"
page_type: product
description: "Supplement product page. Image gallery, subscribe-and-save pricing, comparison table, clinical ingredients, benefits, FAQ accordion, final CTA."
tags: [ecommerce, product, supplement, pricing, comparison, faq, subscribe]
---

# Page Source

```tsx
// File: Index.tsx
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ComparisonTable } from "@/components/ComparisonTable";
import { IngredientOverview } from "@/components/IngredientOverview";
import { ResearchBacked } from "@/components/ResearchBacked";
import { ClinicalIngredients } from "@/components/ClinicalIngredients";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { AE1Difference } from "@/components/AE1Difference";
import { Benefits } from "@/components/Benefits";
import { CapsuleOption } from "@/components/CapsuleOption";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <ComparisonTable />
      <IngredientOverview />
      <ResearchBacked />
      <ClinicalIngredients />
      <HowItWorks />
      <AE1Difference />
      <FinalCTA />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;

```

```tsx
// File: Hero.tsx
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import productCombo from "@/assets/placeholder.jpg";
import lifestyleWorkout from "@/assets/placeholder.jpg";
import productShaker from "@/assets/placeholder.jpg";
import productCapsules from "@/assets/placeholder.jpg";
import productOnetime from "@/assets/placeholder.jpg";
import { Check, Star, Award, Package, Shield, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";

const productImages = [
  { src: productCombo, alt: "AE1 Rocket Fuel Powder & Capsules Combo" },
  { src: productCapsules, alt: "AE1 Rocket Fuel Capsules" },
  { src: lifestyleWorkout, alt: "AE1 Rocket Fuel Lifestyle - Training" },
  { src: productShaker, alt: "AE1 Rocket Fuel with Shaker" },
];

const trustBadges = [
  { icon: Award, label: "70+ Clinical Ingredients" },
  { icon: Shield, label: "3rd Party Tested" },
  { icon: Package, label: "Free Shipping" },
];

export const Hero = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [purchaseType, setPurchaseType] = useState("subscribe");
  const { addItem } = useCart();

  const handleAddToCart = () => {
    const currentImage = purchaseType === "onetime" && selectedImage === 0 ? productOnetime : productImages[selectedImage].src;
    
    addItem({
      id: `ae1-rocket-fuel-${purchaseType}`,
      name: "AE1 Rocket Fuel® - Premium Powder + Pill Combo",
      price: purchaseType === "subscribe" ? 129 : 197,
      type: purchaseType as "onetime" | "subscribe",
      image: currentImage,
    });
  };

  return (
    <section id="hero" className="bg-background py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 max-w-7xl mx-auto">
          {/* Left Column - Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="bg-muted rounded-lg overflow-hidden">
              <img
                src={purchaseType === "onetime" && selectedImage === 0 ? productOnetime : productImages[selectedImage].src}
                alt={purchaseType === "onetime" && selectedImage === 0 ? "AE1 Rocket Fuel One-Time Purchase" : productImages[selectedImage].alt}
                className="w-full h-auto"
              />
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all touch-manipulation ${
                    selectedImage === index
                      ? "border-accent"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-16 md:h-24 object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 pt-4 md:pt-6 border-t border-border">
              {trustBadges.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <div key={index} className="flex flex-col items-center text-center">
                    <div className="bg-accent/10 rounded-full p-2 md:p-3 mb-2">
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                    </div>
                    <p className="text-[10px] md:text-xs font-medium leading-tight">{badge.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column - Product Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Trust Badge */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-sm font-medium">
                Premium Clinical Grade Formula
              </span>
            </div>

            {/* Product Title */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-5xl font-black leading-tight mb-2">
                AE1 Rocket Fuel®
              </h1>
              <p className="text-lg md:text-xl font-bold text-accent">
                PREMIUM POWDER + PILL COMBO
              </p>
            </div>

            {/* Flavor Selection */}
            <div>
              <p className="text-sm font-medium mb-2">Flavor</p>
              <Badge className="bg-secondary text-secondary-foreground border-accent border-2 px-4 py-2">
                🌶️ Spicy Watermelon
              </Badge>
            </div>

            {/* Purchase Options */}
            <div className="space-y-3">
              <RadioGroup value={purchaseType} onValueChange={setPurchaseType}>
                {/* One-time Purchase */}
                <div
                  className={`border-2 rounded-lg p-3 md:p-4 cursor-pointer transition-all touch-manipulation ${
                    purchaseType === "onetime"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => setPurchaseType("onetime")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <RadioGroupItem value="onetime" id="onetime" />
                      <div>
                        <Label htmlFor="onetime" className="font-bold cursor-pointer text-sm md:text-base">
                          Buy one time
                        </Label>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Includes free shaker
                        </p>
                      </div>
                    </div>
                    <span className="text-lg md:text-xl font-black">$197</span>
                  </div>
                </div>

                {/* Subscribe & Save */}
                <div
                  className={`border-2 rounded-lg p-3 md:p-4 cursor-pointer transition-all touch-manipulation ${
                    purchaseType === "subscribe"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => setPurchaseType("subscribe")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="subscribe" id="subscribe" />
                      <div>
                        <Label
                          htmlFor="subscribe"
                          className="font-bold cursor-pointer flex items-center gap-2"
                        >
                          Subscribe & Save
                          <Badge className="bg-accent text-accent-foreground text-xs">
                            BEST VALUE
                          </Badge>
                        </Label>
                        <p className="text-xl font-black">
                          $129<span className="text-sm font-normal">/mo</span>
                          <span className="text-base line-through text-muted-foreground ml-2">
                            $197
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pl-9">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Free shipping delivered every 30 days</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Free Travel Capsules Bottle</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Free Welcome Kit* with Scoop, and Shaker</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Easily edit, skip, or cancel anytime</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>90-Day Money Back Guarantee</span>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg py-6 shadow-glow"
              onClick={handleAddToCart}
            >
              Add to Cart
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>

            {/* View Supplement Facts */}
            <Button
              variant="outline"
              size="lg"
              className="w-full font-bold border-2"
              onClick={() => {
                const element = document.getElementById("ingredients");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              View Supplement Facts
            </Button>

            {/* Key Benefits */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-bold text-lg mb-3">What You Get:</h3>
              <div className="space-y-2">
                {[
                  "70+ clinical-grade ingredients at upper daily limits",
                  "62g monster scoop with research-backed compounds",
                  "Enhance circulation, energy, and mitochondrial function",
                  "Support longevity markers and reduce inflammation",
                  "Boost testosterone, libido, and alpha-male performance",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

```

```tsx
// File: ComparisonTable.tsx
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const comparisonData = [
  { 
    category: "Testosterone Support",
    ae1: true,
    multivitamins: false,
    testBoosters: true,
    preWorkouts: false,
  },
  { 
    category: "Fertility Optimization",
    ae1: true,
    multivitamins: false,
    testBoosters: false,
    preWorkouts: false,
  },
  { 
    category: "Mitochondrial Energy",
    ae1: true,
    multivitamins: false,
    testBoosters: false,
    preWorkouts: true,
  },
  { 
    category: "Longevity & Anti-Aging",
    ae1: true,
    multivitamins: false,
    testBoosters: false,
    preWorkouts: false,
  },
  { 
    category: "Cognitive & Focus",
    ae1: true,
    multivitamins: false,
    testBoosters: false,
    preWorkouts: true,
  },
  { 
    category: "Recovery Support",
    ae1: true,
    multivitamins: false,
    testBoosters: false,
    preWorkouts: false,
  },
  { 
    category: "Antioxidants",
    ae1: true,
    multivitamins: true,
    testBoosters: false,
    preWorkouts: false,
  },
];

export const ComparisonTable = () => {
  return (
    <section className="bg-background py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase">
              AE1 IS A MORE-IN-ONE SOLUTION
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-xl md:rounded-2xl overflow-x-auto shadow-elegant"
          >
            <div className="min-w-[640px]">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr,1.2fr,1fr,1fr,1fr] gap-0">
              <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30">
              </div>
              <div className="p-4 md:p-6 lg:p-8 bg-accent text-white border-b border-white/10">
                <p className="font-black text-xs md:text-sm lg:text-base uppercase tracking-wider text-center">
                  AE1 Rocket Fuel
                </p>
              </div>
              <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30">
                <p className="font-bold text-[10px] md:text-xs lg:text-sm uppercase tracking-wider text-center text-muted-foreground">
                  Multivitamins
                </p>
              </div>
              <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30">
                <p className="font-bold text-[10px] md:text-xs lg:text-sm uppercase tracking-wider text-center text-muted-foreground">
                  Test Boosters
                </p>
              </div>
              <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30">
                <p className="font-bold text-[10px] md:text-xs lg:text-sm uppercase tracking-wider text-center text-muted-foreground">
                  Pre-Workouts
                </p>
              </div>
            </div>

            {/* Table Rows */}
            {comparisonData.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                className="grid grid-cols-[2fr,1.2fr,1fr,1fr,1fr] gap-0"
              >
                <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30 flex items-center">
                  <span className="font-medium text-xs md:text-sm lg:text-base">{item.category}</span>
                </div>
                <div className="p-4 md:p-6 lg:p-8 bg-accent border-b border-white/10 flex items-center justify-center">
                  {item.ae1 ? (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-accent" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <X className="w-3 h-3 md:w-4 md:h-4 text-white/60" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30 flex items-center justify-center">
                  {item.multivitamins ? (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/40" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30 flex items-center justify-center">
                  {item.testBoosters ? (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/40" strokeWidth={2} />
                    </div>
                  )}
                </div>
                <div className="p-4 md:p-6 lg:p-8 bg-background border-b border-border/30 flex items-center justify-center">
                  {item.preWorkouts ? (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/40" strokeWidth={2} />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm text-muted-foreground italic mt-8"
          >
            Based on clinically studied doses. Most supplements underdose active ingredients.
          </motion.p>
        </div>
      </div>
    </section>
  );
};

```

```tsx
// File: Benefits.tsx
import { motion } from "framer-motion";
import { Activity, Zap, Brain } from "lucide-react";

const benefits = [
  {
    icon: Activity,
    title: "RECOVERY",
    description:
      "Enhanced recovery, motility, and testosterone production for optimal recovery from workouts and strain",
  },
  {
    icon: Zap,
    title: "ENERGY",
    description:
      "Improved mitochondrial function and cellular ATP production for sustained daily performance",
  },
  {
    icon: Brain,
    title: "FOCUS",
    description:
      "Enhanced cognitive function and mental clarity through improved brain health and neurotransmitter support",
  },
];

export const Benefits = () => {
  return (
    <section id="benefits" className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-bold tracking-wide uppercase mb-3 text-muted-foreground">
            WHAT YOU'LL EXPERIENCE
          </p>
          <h2 className="text-3xl md:text-5xl font-black uppercase">
            BENEFITS OF <span className="text-accent">DAILY USE</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center group"
              >
                <div className="bg-accent w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-10 h-10 text-accent-foreground" strokeWidth={2.5} />
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-4 text-accent">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-base">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

```

```tsx
// File: FinalCTA.tsx
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import finalCtaLifestyle from "@/assets/placeholder.jpg";

export const FinalCTA = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Header */}
              <h3 className="text-3xl md:text-4xl font-black uppercase mb-6">
                3RD PARTY <span className="text-accent">TESTED</span>
              </h3>

              {/* Main Content */}
              <div className="space-y-4 text-base md:text-lg leading-relaxed">
                <p className="font-bold">
                  Train with confidence. Every batch of <span className="font-black">AE1 Rocket Fuel®</span> is tested and 
                  certified for quality, purity, and potency.
                </p>

                <p>
                  This means zero banned substances, no compromises and total trust in every scoop. 
                  If it doesn't pass rigorous testing, it doesn't make it to you.
                </p>

                <p className="font-bold text-lg md:text-xl mt-6">
                  We don't just claim purity... we prove it.
                </p>

                <p>
                  We rigorously test for label accuracy, heavy metals, microbial contaminants, 
                  and overall quality. That's science-backed performance, backed by real data.
                </p>

                <p className="font-black text-xl md:text-2xl text-accent mt-8">
                  Stop settling for average.
                </p>

                <p className="text-base">
                  Your body is either building or breaking down. There's no middle ground. Every day 
                  you wait is another day of suboptimal testosterone, weak energy, and fertility decline.
                </p>

                <p className="font-bold text-lg">
                  Most guys will keep making excuses. Are you most guys?
                </p>
              </div>

              {/* CTA Button */}
              <div className="pt-6">
                <Button
                  size="lg"
                  className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xl px-12 py-6 shadow-glow mb-4"
                >
                  GET THE POWDER + CAPSULE COMBO
                </Button>

              </div>
            </motion.div>

            {/* Right Column - Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-lg overflow-hidden shadow-strong">
                <img
                  src={finalCtaLifestyle}
                  alt="AE1 Rocket Fuel Results"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

```

```tsx
// File: FAQ.tsx
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is AE1 Rocket Fuel?",
    answer:
      "AE1 Rocket Fuel is the most comprehensive male optimization formula ever created. It's a 62g powder containing 70+ clinical-grade ingredients at research-backed doses—not the pixie dust amounts you find in typical supplements. One scoop covers testosterone support, fertility optimization, mitochondrial energy, longevity, cognitive performance, and recovery. It replaces the 6+ supplements most men piece together and hope work.",
  },
  {
    question: "Why is the scoop so massive?",
    answer:
      "Because real doses require real volume. Most supplements keep their scoops small so the product \"lasts longer\" and looks like better value. But you're not paying for powder—you're paying for results. Clinical research uses specific amounts. 6g of L-Arginine takes up space. 55mg of Zinc takes up space. We refused to cut corners, which means a 62g scoop. That's the cost of a formula that actually works.",
  },
  {
    question: "How do I take it?",
    answer:
      "One scoop mixed with 1 liter (32oz) of water, first thing in the morning. Stir thoroughly and let it fully dissolve. Take it daily without exception—consistency is everything. Do not exceed one scoop per day.",
  },
  {
    question: "What does it taste like?",
    answer:
      "Spicy watermelon with a gritty texture. Let's be clear: this isn't candy-flavored garbage designed to taste good and do nothing. The taste reminds you every morning that you're taking something serious. Most men get used to it within a week. Some learn to love it. If you want delicious, buy a smoothie. If you want results, drink AE1.",
  },
  {
    question: "When will I notice results?",
    answer:
      "Most users report changes in energy and mental clarity within the first 1-2 weeks. More significant improvements in recovery, performance, and overall vitality typically appear within 4-6 weeks of consistent daily use. Fertility and testosterone optimization require 90+ days for full effect, as that's how long spermatogenesis and hormonal adaptation take.",
  },
  {
    question: "Is it safe? How do I know what's in it?",
    answer:
      "Every batch is third-party tested with Certificates of Analysis available. No proprietary blends—every ingredient and dose is listed on the label. The formula was developed using peer-reviewed research on each compound. That said, consult your doctor before starting any supplement regimen, especially if you have existing health conditions or take medications.",
  },
  {
    question: "What if I can't mix the powder every day?",
    answer:
      "That's exactly why we created the AE1 Capsules. Same core mission, portable format. Three pills deliver the essential compounds for baseline male health when you're traveling, slammed at work, or just can't do the full ritual. The powder is for peak optimization. The capsules are for never missing a day.",
  },
  {
    question: "Why get the combo instead of just powder or capsules?",
    answer:
      "Because consistency beats intensity. The powder delivers maximum clinical doses—that's where transformation happens. But one missed day leads to two, then a week, then you're back to baseline. The capsules eliminate excuses. Business trip? Capsules. Crazy morning? Capsules. The combo ensures you never break your streak, which is the only thing that actually matters.",
  },
  {
    question: "Who is this NOT for?",
    answer:
      "Women, anyone under 18, or men who think one scoop will fix a garbage diet, no sleep, and zero exercise. AE1 is a force multiplier—it amplifies the work you're already putting in. It's not a magic pill for guys who won't do the basics.",
  },
  {
    question: "What if it doesn't work for me?",
    answer:
      "We offer a 30-day money-back guarantee. If you take it consistently for 30 days and don't notice a difference, contact us for a full refund. We're confident because the formula works—but we also don't want your money if you're not getting results.",
  },
  {
    question: "How does the subscription work?",
    answer:
      "Your first order ships immediately. Then every 30 days, a new supply arrives automatically so you never run out. You can pause, skip, or cancel anytime—no hoops, no phone calls, no nonsense. Manage everything from your account dashboard.",
  },
  {
    question: "Is this just an expensive multivitamin?",
    answer:
      "No. Multivitamins give you baseline micronutrients at minimum doses. AE1 includes vitamins and minerals, but also clinical doses of amino acids, testosterone-supporting compounds, longevity actives, nootropics, and performance enhancers. Comparing AE1 to a multivitamin is like comparing a Ferrari to a bicycle. They both have wheels—that's where the similarity ends.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="bg-background py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-black text-center mb-16 uppercase tracking-tight"
        >
          Frequently Asked <span className="text-accent">Questions</span>
        </motion.h2>

        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="bg-card rounded-xl px-8 py-2 border-2 border-border/50 shadow-strong hover:shadow-glow hover:border-accent/30 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left font-bold text-base md:text-lg hover:text-accent transition-colors py-6 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed text-base pt-2 pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

```

$res_ecommerce_product_ae1_product_page_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/general-home-page/anson-park-home.md',
  $res_general_home_page_anson_park_home_md$
---
name: "Anson Park - Home Page"
category: general-home-page
company: "Anson Park Investing"
page_type: home
description: "Real estate syndication home page. Luxury dark theme, deal summary with locked/blurred premium content, gallery, location analysis, team, exit intent."
tags: [home, landing, real-estate, investment, luxury, dark-theme]
---

# Page Source

```tsx
// File: Index.tsx
import { useState, useEffect } from "react";
import { Hero } from "@/components/Hero";
import { BookCallDialog } from "@/components/BookCallDialog";
import { ExitIntentDialog } from "@/components/ExitIntentDialog";
import { PropertyAccessDialog } from "@/components/PropertyAccessDialog";
import { PropertyGallerySection } from "@/components/PropertyGallerySection";
import { WhyAbilene } from "@/components/WhyAbilene";
import { StargateSection } from "@/components/StargateSection";
import { TeamSection } from "@/components/TeamSection";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const [propertyAccessOpen, setPropertyAccessOpen] = useState(false);
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const navigate = useNavigate();

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownExitIntent) {
        setExitIntentOpen(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitIntent]);

  return (
    <main className="min-h-screen">
      <Navigation 
        variant="home"
        onUnlockDetails={() => setPropertyAccessOpen(true)}
      />
      <Hero 
        onBookCall={() => setBookCallOpen(true)}
        onUnlockDetails={() => setPropertyAccessOpen(true)}
      />
      
      <div className="container mx-auto px-4 py-24 space-y-32">
        {/* Deal Summary */}
        <section id="deal-summary" className="max-w-6xl mx-auto scroll-mt-24">
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-block">
              <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight">Deal Summary</h2>
              <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full" />
            </div>
            <p className="text-xl text-muted-foreground font-medium mt-6">
              A compelling investment opportunity with exceptional returns
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 animate-slide-up">
            <Card className="p-12 bg-white border-2 border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                Investment Terms
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Minimum Investment", value: "$100,000" },
                  { label: "Hold Period", value: "5 Years" },
                  { label: "Preferred Return", value: "6%", highlight: true }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className={`font-bold text-2xl ${item.highlight ? 'text-accent' : 'text-foreground'}`}>{item.value}</span>
                  </div>
                ))}
                
                {/* Blurred locked items */}
                <div 
                  onClick={() => setPropertyAccessOpen(true)}
                  className="space-y-6 cursor-pointer transition-all duration-300 select-none"
                >
                  {[
                    { label: "Equity Split" },
                    { label: "Distribution Timing" }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium blur-[6px]">{item.label}</span>
                      <span className="font-bold text-lg text-accent hover:text-accent-light transition-colors flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Unlock
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-12 bg-gradient-to-br from-accent/10 to-accent/20 border-2 border-accent/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-accent/30 rounded-xl">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                Projected Returns
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Total ROI", value: "2.3X" },
                  { label: "Average Annual Return", value: "27%" },
                  { label: "IRR", value: "21%+" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-bold text-2xl text-accent">{item.value}</span>
                  </div>
                ))}
                
                {/* Blurred locked items */}
                <div 
                  onClick={() => setPropertyAccessOpen(true)}
                  className="space-y-6 cursor-pointer transition-all duration-300 select-none"
                >
                  {[
                    { label: "Cash-on-Cash Return" },
                    { label: "Exit Cap Rate" }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium blur-[6px]">{item.label}</span>
                      <span className="font-bold text-lg text-accent hover:text-accent-light transition-colors flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Unlock
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <PropertyGallerySection onSeeAllPhotos={() => setPropertyAccessOpen(true)} />

        <div id="location" className="scroll-mt-24">
          <WhyAbilene onUnlockDetails={() => setPropertyAccessOpen(true)} />
        </div>
        
        <StargateSection />

        <div id="team">
          <TeamSection />
        </div>

        {/* Why This Deal Stands Out */}
        <section id="contact" className="max-w-5xl mx-auto scroll-mt-24 animate-fade-in">
          <div className="p-16 md:p-20 text-white shadow-luxury rounded-3xl relative overflow-hidden border-2 border-accent/30" style={{ background: 'linear-gradient(135deg, hsl(200 50% 12%) 0%, hsl(200 45% 20%) 100%)' }}>
            <div className="relative z-10">
              <div className="text-center mb-10">
                <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-white inline-block">
                  Why This Deal Stands Out
                </h2>
                <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full max-w-md mx-auto" />
              </div>
              <div className="space-y-6 text-lg md:text-xl leading-relaxed mb-10">
                <p className="text-white">
                  By combining <strong className="text-accent">projected 21%+ average annual returns</strong>, proximity (<strong className="text-accent">2.4 miles</strong>) to the Stargate campus, and Abilene's powerful fundamentals—we believe this project is uniquely positioned to deliver both stability and upside.
                </p>
                <p className="text-white">
                  If you'd like the full offering memorandum (with pro formas, LIHTC/QC details, and Stargate market comps), we'd be happy to walk you through the numbers directly.
                </p>
              </div>
              <div className="flex flex-col gap-4 items-stretch pt-4 px-4 sm:px-0">
                <Button 
                  size="lg"
                  onClick={() => setPropertyAccessOpen(true)}
                  className="bg-accent hover:bg-accent-light text-primary-dark font-bold text-xs sm:text-base md:text-xl px-4 sm:px-8 md:px-12 py-3 sm:py-6 md:py-8 shadow-2xl hover:shadow-glow rounded-xl hover:scale-105 transition-all duration-300 border-0 w-full whitespace-normal leading-tight"
                >
                  Request Full Memorandum
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  size="lg"
                  onClick={() => setBookCallOpen(true)}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/90 text-white hover:text-primary border-2 border-white/50 hover:border-white/70 font-semibold text-xs sm:text-base md:text-xl px-4 sm:px-8 md:px-12 py-3 sm:py-6 md:py-8 rounded-xl backdrop-blur-xl transition-all duration-300 hover:scale-105 w-full whitespace-normal leading-tight"
                >
                  Book a Call to Talk With Us
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <BookCallDialog open={bookCallOpen} onOpenChange={setBookCallOpen} />
      <PropertyAccessDialog open={propertyAccessOpen} onOpenChange={setPropertyAccessOpen} />
      <ExitIntentDialog open={exitIntentOpen} onOpenChange={setExitIntentOpen} />
    </main>
  );
};

export default Index;

```

$res_general_home_page_anson_park_home_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/general-home-page/brrr-guys-home.md',
  $res_general_home_page_brrr_guys_home_md$
---
name: "BRR Guys - Home Page"
category: general-home-page
company: "The BRR Guys"
page_type: home
description: "Real estate investment education home page. Hero with dual CTAs, animated scroll timeline, team bios with stats, deal criteria cards with video, and strong CTA."
tags: [home, landing, real-estate, education, cta, timeline, team]
---

# Page Source

```tsx
// File: Home.tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/placeholder.jpg";
import teamBackground from "@/assets/placeholder.jpg";
import ctaBackground from "@/assets/placeholder.jpg";
import jamesPhoto from "@/assets/placeholder.jpg";
import anthonyPhoto from "@/assets/placeholder.jpg";
import Footer from "@/components/Footer";
import LiveDealCaseStudy from "@/components/LiveDealCaseStudy";
import { CheckCircle, TrendingUp, Shield, Zap, Users, Target, DollarSign, Home as HomeIcon, Award, BarChart3, ArrowRight, Building, Wrench, Key, RefreshCw, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUtmParams } from "@/hooks/useUtmParams";
import { usePageTracking } from "@/hooks/usePageTracking";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const Home = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useUtmParams(); // Capture UTM parameters on page load
  usePageTracking(); // Track page view

  return (
    <div className="min-h-screen font-sans bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <img src={logo} alt="BRRRR in 90" className="h-16 md:h-20" />
          <nav className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost"
              onClick={() => navigate('/calculator')}
              className="font-semibold"
            >
              Calculator
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate('/app')}
              className="font-semibold"
            >
              Download Investor App
            </Button>
            <Button 
              variant="ghost"
              onClick={() => window.open('https://www.skool.com', '_blank')}
              className="font-semibold"
            >
              Join Community
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate("/call")}
              className="font-semibold"
            >
              Book a Call
            </Button>
            <Button 
              size="lg"
              onClick={() => navigate("/opt-in")}
              className="font-semibold"
            >
              Watch Free Training
            </Button>
          </nav>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <Button 
              size="sm"
              onClick={() => navigate("/opt-in")}
              className="font-semibold text-xs px-3 h-9 whitespace-nowrap"
            >
              Get Started
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      navigate('/calculator');
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Calculator
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      navigate('/app');
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Download Investor App
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      window.open('https://www.skool.com', '_blank');
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Join Community
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      navigate("/call");
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Book a Call
                  </Button>
                  <Button 
                    size="lg"
                    onClick={() => {
                      navigate("/opt-in");
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold text-lg h-14"
                  >
                    Watch Free Training
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-2 border-2 border-dashed border-primary px-4 md:px-6 py-2 md:py-3 rounded-full">
            <span className="text-sm md:text-lg font-semibold text-foreground italic">Calling All Aspiring Real Estate Investors</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-foreground leading-tight px-2">
            Close Your First BRRRR Deal in{" "}
            <span className="text-primary italic">90 Days</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto px-4">
            Build a cash-flowing rental portfolio using the proven BRRRR strategy—while keeping your W-2, without massive capital, and without relocating
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center pt-4">
            <Button 
              size="lg"
              onClick={() => navigate("/opt-in")}
              className="w-full sm:w-auto font-bold text-sm sm:text-base md:text-lg h-11 sm:h-12 md:h-14 px-4 sm:px-6 md:px-10 whitespace-nowrap"
            >
              Watch Free Training Now <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate("/call")}
              className="w-full sm:w-auto font-bold text-sm sm:text-base md:text-lg h-11 sm:h-12 md:h-14 px-4 sm:px-6 md:px-10 border-2 whitespace-nowrap"
            >
              Talk with Our Team
            </Button>
          </div>
        </div>
      </section>

      {/* Live Deal Case Study */}
      <LiveDealCaseStudy />

      {/* Animated Timeline */}
      <AnimatedTimeline />

      {/* Meet The Team */}
      <section className="bg-card py-12 md:py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-16 px-2">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4">Meet Your Mentors</h2>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground">27 years combined, $500M+ transactions, 800+ properties</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold text-primary mt-4 md:mt-6">AND YES... WE ARE IN THE TRENCHES WITH YOU</p>
            </div>

            <div className="space-y-8 md:space-y-16">
              {/* James */}
              <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 shadow-xl">
                <div className="grid md:grid-cols-[400px_1fr] gap-0">
                  <div className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 h-64 md:h-auto">
                    <img 
                      src={jamesPhoto} 
                      alt="James Jones" 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                  <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center">
                    <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">James Jones</h3>
                    <p className="text-primary font-bold text-lg md:text-xl mb-4 md:mb-6">The Visionary</p>
                    <div className="text-muted-foreground space-y-3 md:space-y-4 text-sm md:text-base lg:text-lg">
                      <p>Managing over $87M in assets and completing $500M+ in transactions. Started in 2004, learned through hustle and persistence.</p>
                      <p>Discovered Section 8's power to create stable income streams. Now the big-picture guy looking for game-changing opportunities.</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Anthony */}
              <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 shadow-xl">
                <div className="grid md:grid-cols-[1fr_400px] gap-0">
                  <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center order-1 md:order-none">
                    <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">Anthony Redmond</h3>
                    <p className="text-primary font-bold text-lg md:text-xl mb-4 md:mb-6">The Hustler</p>
                    <div className="text-muted-foreground space-y-3 md:space-y-4 text-sm md:text-base lg:text-lg">
                      <p>Portfolio of 200+ doors. Started in 2015 with setbacks, drove Uber nights while building his business.</p>
                      <p>First deal led to explosive growth. Built investor network and rental empire through relentless hustle.</p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 order-2 md:order-none h-64 md:h-auto">
                    <img 
                      src={anthonyPhoto} 
                      alt="Anthony Redmond" 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                </div>
              </Card>

              {/* Together - Combined Stats */}
              <Card className="p-6 md:p-8 lg:p-16 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground border-2 border-primary">
                <div className="max-w-4xl mx-auto">
                  <h3 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center mb-6 md:mb-8">
                    TOGETHER
                  </h3>
                  
                  <div className="grid sm:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
                    <div className="text-center">
                      <div className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2">27+</div>
                      <p className="text-sm md:text-base lg:text-lg opacity-90">Years Combined Experience</p>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2">$500M+</div>
                      <p className="text-sm md:text-base lg:text-lg opacity-90">Transactions Closed</p>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2">800+</div>
                      <p className="text-sm md:text-base lg:text-lg opacity-90">Properties Owned</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 md:gap-6 pt-6 md:pt-8 border-t border-primary-foreground/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-base md:text-lg mb-1">500+ Units Managed</p>
                        <p className="text-sm md:text-base opacity-90">Active portfolio across multiple markets</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-base md:text-lg mb-1">309 Section 8 Properties</p>
                        <p className="text-sm md:text-base opacity-90">Consistent cash flow strategies</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-base md:text-lg lg:text-xl text-center mt-6 md:mt-8 font-semibold">
                    Now sharing our hard-won knowledge with you
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What We Look For in a Deal */}
      <section className="py-12 md:py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-16 px-2">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4">
                Our Deal <span className="text-primary">Criteria</span>
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground">The exact metrics we use to find winning BRRRR properties</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-start">
              {/* Video on the left */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black mx-auto max-w-md w-full aspect-[9/16]">
                <video 
                  id="property-video"
                  className="w-full h-full object-cover"
                  preload="metadata"
                >
                  <source src="https://example.com/placeholder-video.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Custom Play Button Overlay */}
                <div 
                  id="video-overlay"
                  className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-black/40 group"
                  onClick={() => {
                    const video = document.getElementById('property-video') as HTMLVideoElement;
                    const overlay = document.getElementById('video-overlay');
                    if (video && overlay) {
                      video.play();
                      overlay.style.display = 'none';
                      video.setAttribute('controls', 'true');
                    }
                  }}
                >
                  {/* Title at top */}
                  <div className="absolute top-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-b from-black/80 via-black/50 to-transparent">
                    <h3 className="text-white font-display text-2xl md:text-3xl lg:text-4xl font-bold text-center leading-tight">
                      Property Walkthrough<br />With Anthony
                    </h3>
                  </div>
                  
                  {/* Play button in center */}
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-t-[16px] border-t-transparent border-l-[26px] border-l-primary-foreground border-b-[16px] border-b-transparent ml-2" />
                  </div>
                </div>
              </div>

              {/* Criteria cards on the right */}
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { 
                    icon: DollarSign, 
                    title: "Affordable Entry Point", 
                    desc: "Properties at $60K-$120K", 
                    detail: "Lower prices mean less capital needed and easier refinancing"
                  },
                  { 
                    icon: TrendingUp, 
                    title: "Strong Rent-to-Price Ratio", 
                    desc: "1.2%-1.5% monthly rent", 
                    detail: "Ensures positive cash flow after refinance"
                  },
                  { 
                    icon: Shield, 
                    title: "Landlord-Friendly Laws", 
                    desc: "Quick eviction process", 
                    detail: "Protects your investment and cash flow"
                  },
                  { 
                    icon: Users, 
                    title: "Strong Tenant Demand", 
                    desc: "Consistent renter pool", 
                    detail: "Minimize vacancy and maintain steady income"
                  },
                  { 
                    icon: BarChart3, 
                    title: "Market Appreciation", 
                    desc: "4-6% annually", 
                    detail: "Build equity through market growth"
                  },
                  { 
                    icon: Award, 
                    title: "Economic Growth", 
                    desc: "Expanding job market", 
                    detail: "Major employers create sustainable demand"
                  }
                ].map((item, index) => (
                  <Card key={index} className="p-6 border-2 hover:border-primary hover:shadow-lg transition-all group">
                    <div className="flex flex-col gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:scale-110 transition-all">
                        <item.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-foreground mb-1">{item.title}</h3>
                        <p className="text-primary font-semibold text-sm mb-1">{item.desc}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section 
        className="py-12 md:py-20 lg:py-32 relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${ctaBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-display text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 px-2">
            The Time is <span className="text-primary">NOW</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto px-4">
            Every quarter you wait costs you a potential deal. Properties available. Lenders ready. Contractors ready.
          </p>
          <Button size="lg" onClick={() => navigate("/call")} className="w-full sm:w-auto font-bold text-sm sm:text-base md:text-lg lg:text-xl h-11 sm:h-12 md:h-14 lg:h-16 px-6 sm:px-8 md:px-10 lg:px-12 whitespace-nowrap">
            Book Your Strategy Session <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ml-2" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const AnimatedTimeline = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const sectionTop = sectionRef.current.offsetTop;
      const sectionHeight = sectionRef.current.offsetHeight;
      const windowScroll = window.scrollY;
      const windowHeight = window.innerHeight;

      // Start animation later so first card is fully visible
      const scrollStart = sectionTop - windowHeight * 0.5 + 400;
      // End later so final step stays visible longer
      const scrollEnd = sectionTop + sectionHeight - windowHeight * 0.3; // Changed from 0.5 to 0.3
      
      if (windowScroll < scrollStart) {
        setScrollProgress(0);
      } else if (windowScroll > scrollEnd) {
        setScrollProgress(1);
      } else {
        const progress = (windowScroll - scrollStart) / (scrollEnd - scrollStart);
        setScrollProgress(Math.max(0, Math.min(1, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const steps = [
    { days: "Days 1-7", title: "Foundation & Education", icon: Target, items: ["Market mastery", "Weekly coaching calls", "Fundamentals training", "RealSync AI tool"] },
    { days: "Days 7-21", title: "Analysis & Financing", icon: BarChart3, items: ["Analyze properties", "Meet lenders", "Get pre-qualified", "Submit deals"] },
    { days: "Days 21-45", title: "Under Contract", icon: Key, items: ["Make offers", "Get under contract", "Connect contractors", "Close deal"] },
    { days: "Days 45-75", title: "Rehab & Tenants", icon: Wrench, items: ["Complete rehab", "Tenant placement", "Start cash flow"] },
    { days: "Days 75-90", title: "Refinance", icon: RefreshCw, items: ["Submit refinance", "Pull capital out", "Start deal #2"] },
    { days: "Days 90-180", title: "Rinse & Repeat", icon: Building, items: ["Close deal #2", "Add 1-2 per quarter", "Scale to 5-10 properties"] }
  ];

  const getStepProgress = (index: number) => {
    const stepSize = 1 / steps.length;
    const stepStart = index * stepSize;
    const stepEnd = (index + 1) * stepSize;
    
    if (scrollProgress < stepStart) return 0;
    
    // Keep last step highlighted when at the end
    if (index === steps.length - 1 && scrollProgress >= stepEnd - stepSize / 2) {
      return 1;
    }
    
    if (scrollProgress > stepEnd) return 0;
    
    // Peak at the middle of each step
    const stepMiddle = stepStart + (stepSize / 2);
    const distanceFromMiddle = Math.abs(scrollProgress - stepMiddle);
    const normalizedDistance = distanceFromMiddle / (stepSize / 2);
    
    return Math.max(0, 1 - normalizedDistance);
  };

  return (
    <section ref={sectionRef} className="relative min-h-[300vh] py-20 md:py-32 bg-background">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Sticky Left Side - Header */}
              <div className="md:sticky md:top-1/4">
                <h2 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
                  Your <span className="text-primary">90-Day</span> Roadmap
                </h2>
                <p className="text-xl text-muted-foreground mb-6">
                  From zero to cash-flowing rental property in just 3 months
                </p>
                
                {/* Progress Indicator */}
                <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${scrollProgress * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Step {Math.floor(scrollProgress * steps.length) + 1} of {steps.length}
                </p>
              </div>

              {/* Scrolling Right Side - Timeline Content */}
              <div className="relative h-[70vh] overflow-visible">
                <div 
                  ref={contentRef}
                  className="absolute top-0 left-0 right-0 transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateY(calc(35vh - ${scrollProgress * (steps.length - 1) * 16.67}%))`
                  }}
                >
                  <div className="space-y-8 pr-8 pl-2">
                    {steps.map((step, index) => {
                      const progress = getStepProgress(index);
                      const isActive = progress > 0.3;
                      
                      return (
                        <Card 
                          key={index}
                          className="p-6 border-2 transition-all duration-500 relative overflow-visible"
                          style={{
                            borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                            backgroundColor: isActive ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.5)',
                            boxShadow: isActive ? '0 20px 60px -10px hsl(var(--primary) / 0.6), 0 0 0 3px hsl(var(--primary) / 0.2)' : 'none',
                            opacity: isActive ? 1 : 0.4 + (progress * 0.3),
                            transform: `scale(${isActive ? 1.02 : 0.95 + (progress * 0.05)})`,
                            zIndex: isActive ? 10 : 1
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div 
                              className="w-14 h-14 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
                              style={{
                                backgroundColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'
                              }}
                            >
                              <step.icon 
                                className="w-7 h-7" 
                                style={{ color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))' }}
                              />
                            </div>
                            
                            <div className="flex-1">
                              <div 
                                className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                                style={{
                                  backgroundColor: isActive ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                                }}
                              >
                                {step.days}
                              </div>
                              <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                                {step.title}
                              </h3>
                              <ul className="space-y-2">
                                {step.items.map((item, i) => (
                                  <li key={i} className="flex gap-2 items-start">
                                    <CheckCircle 
                                      className="w-5 h-5 flex-shrink-0 mt-0.5" 
                                      style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                                    />
                                    <span className="text-sm text-muted-foreground">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
```

$res_general_home_page_brrr_guys_home_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/general-home-page/origin-studios-home.md',
  $res_general_home_page_origin_studios_home_md$
---
name: "Origin Studios - Home Page"
category: general-home-page
company: "Origin Studios"
page_type: home
description: "Podcast studio home page. Decomposed into hero, pricing, studios showcase, celebrities, gallery, FAQ with reviews, and CTA."
tags: [home, landing, podcast, studio, pricing, faq, gallery]
---

# Page Source

```tsx
// File: Index.tsx
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { HeroSection } from "@/components/home/HeroSection";
import { ShowsCarousel } from "@/components/home/ShowsCarousel";
import { PricingSection } from "@/components/home/PricingSection";
import { StudiosSection } from "@/components/home/StudiosSection";
import { CelebritiesSection } from "@/components/home/CelebritiesSection";
import { GallerySection } from "@/components/home/GallerySection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <Layout>
      <SEO />
      <HeroSection />
      <ShowsCarousel />
      <PricingSection />
      <StudiosSection />
      <CelebritiesSection />
      <GallerySection />
      <FAQSection />
      <CTASection />
    </Layout>
  );
};

export default Index;

```

```tsx
// File: HeroSection.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AnimatedHeroBackground } from "./AnimatedHeroBackground";
import { BookingModal } from "@/components/BookingModal";
import { TypewriterText } from "./TypewriterText";
import { VideoEmbed } from "./VideoEmbed";

export function HeroSection() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden -mt-20 pt-20">
      {/* Animated Background */}
      <AnimatedHeroBackground />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay z-10 opacity-50" />

      {/* Content */}
      <div className="relative z-20 container-custom text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="hero-text font-display font-bold mb-6 max-w-5xl mx-auto">
            <span className="text-foreground">Share Your </span>
            <TypewriterText />
            <br />
            <span className="text-foreground">Through the Power of Podcasting</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base md:text-lg text-foreground/80 max-w-2xl mx-auto mb-8 font-medium tracking-wide"
        >
          🎙️ 20+ Years Producing Podcasts <span className="text-primary">⭐ Top Rated Vegas Studio</span>
          <br />
          Thousands of Episodes Shot • Come Try Us Out!
        </motion.p>

        {/* Video embed between subheadline and buttons */}
        <VideoEmbed />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            onClick={() => setIsBookingOpen(true)}
            className="btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg"
          >
            Book Now
          </Button>
          <Button
            asChild
            size="lg"
            className="btn-secondary text-lg px-8 py-6 rounded-lg"
          >
            <Link to="/about">Contact Us</Link>
          </Button>
        </motion.div>
      </div>

      <BookingModal open={isBookingOpen} onOpenChange={setIsBookingOpen} />
    </section>
  );
}

```

```tsx
// File: PricingSection.tsx
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSkipInitialAnimation } from "@/hooks/useSafariMobile";

const pricingPlans = [
  {
    name: "UNLIMITED",
    price: "$797",
    tagline: "Just Show Up and Press Record",
    features: [
      "Unlimited Monthly Podcasts",
      "Your Choice of Our 2 Standard Studios",
      "Up to 2 Bookings Daily",
      "Schedule Open Spots 48 Hours In Advance up to 1 Hour Before",
    ],
    featured: false,
  },
  {
    name: "FULL SERVICE",
    price: "$997",
    tagline: "Just Show Up, We Do the Rest",
    features: [
      "Everything in UNLIMITED plus:",
      "Our Premium Studio",
      "Real Time Editing",
      "Schedule Up to 6-Months in Advance",
      "We Trim and Upload Your Podcast",
      "Distribution to All Podcast Platforms",
    ],
    featured: true,
  },
  {
    name: "THE TOTAL",
    price: "$1,497",
    tagline: "The Ultimate Setup for Success",
    features: [
      "Everything in FULL SERVICE plus:",
      "Custom Graphics for Show Branding",
      "Priority Scheduling",
      "Show Transcripts",
      "Post Production Editing",
      "Episode Thumbnail Graphics",
      "Short Form Content For Every Episode",
      "We Post Your Shortform Content",
    ],
    featured: false,
  },
];

export function PricingSection() {
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-card via-background to-background relative overflow-hidden">
      <div className="container-custom">
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Our Monthly <span className="text-primary">Memberships</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the plan that fits your podcasting needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={skipAnimation ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={cn(
                "relative rounded-2xl p-8 card-hover",
                plan.featured
                  ? "glass-card glow-cyan border-primary/30"
                  : "bg-card/50 border border-border/50"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-3">
                  <span className={cn(
                    "font-display text-4xl font-bold",
                    plan.featured ? "text-primary" : "text-foreground"
                  )}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground text-sm">{plan.tagline}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full rounded-lg",
                  plan.featured
                    ? "btn-glow bg-primary text-primary-foreground hover:bg-accent"
                    : "btn-secondary"
                )}
              >
                <Link to="/pricing">Learn More</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

```

```tsx
// File: StudiosSection.tsx
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useSkipInitialAnimation } from "@/hooks/useSafariMobile";

// Import studio images
import studioA from "@/assets/placeholder.jpg";
import studioB from "@/assets/placeholder.jpg";
import studioC from "@/assets/placeholder.jpg";

const studios = [
  {
    name: "STUDIO A",
    price: "$200/HR",
    image: studioA,
    description: "Intimate recording space for one-on-one interviews and voiceovers",
  },
  {
    name: "STUDIO B",
    price: "$250/HR",
    image: studioB,
    description: "Premium 4-person podcasting setup with dynamic displays",
  },
  {
    name: "STUDIO C",
    price: "$350/HR",
    image: studioC,
    description: "State-of-the-art video wall studio for premium productions",
  },
];

export function StudiosSection() {
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-background via-background to-card relative overflow-hidden">
      <div className="container-custom">
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-medium tracking-wider uppercase mb-2">
            Our Spaces
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
            Premium Podcast <span className="text-primary">Studios</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {studios.map((studio, index) => (
            <motion.div
              key={studio.name}
              initial={skipAnimation ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative rounded-2xl overflow-hidden card-hover bg-card"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={studio.image}
                  alt={studio.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-xl font-bold">{studio.name}</h3>
                  <span className="text-primary font-bold">{studio.price}</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  {studio.description}
                </p>
                <Button
                  asChild
                  className="w-full btn-glow bg-primary text-primary-foreground hover:bg-accent rounded-lg"
                >
                  <Link to="/hourly">Book Now</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

```

```tsx
// File: CTASection.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/BookingModal";
import { useSkipInitialAnimation } from "@/hooks/useSafariMobile";

interface CTASectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  primaryCTA?: string;
  secondaryCTA?: string;
  primaryLink?: string;
  secondaryLink?: string;
  useBookingModal?: boolean;
}

export function CTASection({
  title = "READY TO GO?",
  subtitle = "LET'S GET STARTED",
  description = "Our secure online booking portal allows you to book your next podcast with us. Alternatively you can contact us using the options below.",
  primaryCTA = "Book Now",
  secondaryCTA = "Contact Us",
  primaryLink,
  secondaryLink = "/about",
  useBookingModal = true,
}: CTASectionProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-background via-card to-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-primary">{title}</span>
            <br />
            <span className="text-foreground">{subtitle}</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {useBookingModal && !primaryLink ? (
              <Button
                size="lg"
                onClick={() => setIsBookingOpen(true)}
                className="btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg"
              >
                {primaryCTA}
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg"
              >
                <Link to={primaryLink || "/pricing"}>{primaryCTA}</Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              className="btn-secondary text-lg px-8 py-6 rounded-lg"
            >
              <Link to={secondaryLink}>{secondaryCTA}</Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {useBookingModal && <BookingModal open={isBookingOpen} onOpenChange={setIsBookingOpen} />}
    </section>
  );
}

```

```tsx
// File: FAQSection.tsx
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Star, ExternalLink, PenLine } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useSkipInitialAnimation } from "@/hooks/useSafariMobile";
import goodVibesAvatar from "@/assets/placeholder.jpg";
import chrisOramAvatar from "@/assets/placeholder.jpg";
import kateGrayAvatar from "@/assets/placeholder.jpg";

const faqItems = [
  {
    question: "How do I book a session?",
    answer:
      "Booking a session is easy! If you're a member, you'll receive your own personalized booking link to reserve sessions at your convenience. Simply select your preferred studio and time slot, and you're all set. If you have any questions about reservations or need help getting started, don't hesitate to reach out to us—we're here to help!",
  },
  {
    question: "What happens if I'm late to my session?",
    answer:
      "We understand that things happen! However, your session time is reserved specifically for you, so arriving late will reduce your available recording time. We recommend arriving 10-15 minutes early to get settled. If you're running more than 15 minutes late, please contact us.",
  },
  {
    question: "Do you provide editing and production services?",
    answer:
      "Yes! Our Full Service and The Total membership plans include comprehensive editing and production services. This includes real-time editing, post-production work, episode thumbnails, short-form content creation, and distribution to all major podcast platforms.",
  },
  {
    question: "Can I bring my own production team?",
    answer:
      "Absolutely! You're welcome to bring your own production team to any of our studios. Our facilities are designed to accommodate both solo creators and full production crews. Just let us know in advance so we can ensure the space is set up appropriately.",
  },
  {
    question: "Who has recorded here before?",
    answer:
      "We've had the privilege of hosting some incredible guests including Flex Lewis, Ric Flair, Dan Bilzerian, Charlie Kirk, Dave Asprey, Roger Stone, Suga Sean O'Malley, Ari Shaffir, Fresh & Fit, and many more. At Origin, we welcome all guests, regardless of political affiliation, personal viewpoint, or background.",
  },
];

const GOOGLE_MAPS_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3224.0!2d-115.1537!3d36.0840!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c8c41d4e5c5c5d%3A0x5c5c5c5c5c5c5c5c!2s6565+Spencer+St+%23+100%2C+Las+Vegas%2C+NV+89119!5e0!3m2!1sen!2sus!4v1234567890";
const GOOGLE_REVIEWS_URL = "https://www.google.com/maps/place/Origin+Studios/@36.084,-115.1537,17z/data=!4m8!3m7!1s0x0:0x0!8m2!3d36.084!4d-115.1537!9m1!1b1!16s";
const GOOGLE_LEAVE_REVIEW_URL = "https://g.page/r/CdVFRXfY3QqgEAI/review";

const contactInfo = {
  address: "6565 Spencer Street Unit 101",
  city: "Las Vegas, NV 89119",
  phone: "+1 702-200-4-POD (4763)",
  email: "info@originpodcasting.com",
  hours: [
    { days: "Sunday – Monday", time: "Closed" },
    { days: "Tuesday", time: "11 AM – 7 PM" },
    { days: "Wednesday", time: "8 AM – 7 PM" },
    { days: "Thursday", time: "11 AM – 7 PM" },
    { days: "Friday", time: "11 AM – 7 PM" },
    { days: "Saturday", time: "11 AM – 7 PM" },
  ],
  afterHoursNote: "After hours available by appointment",
};

const overallRating = 5.0;
const totalReviews = 8;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < rating 
              ? "fill-primary text-primary" 
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function FAQSection() {
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-card via-card to-background relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={skipAnimation ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-primary text-sm font-medium tracking-wider uppercase mb-2">
              Got Questions?
            </p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
          </motion.div>

          <motion.div
            initial={skipAnimation ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-secondary/50 rounded-xl border border-border/50 px-6 overflow-hidden"
                >
                  <AccordionTrigger className="text-left font-display text-lg font-medium hover:text-primary hover:no-underline py-6">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>

        {/* Location Section */}
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 md:mt-20"
        >
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            {/* Map Container */}
            <div className="relative rounded-2xl overflow-hidden bg-background border border-border shadow-lg min-h-[400px]">
              <iframe
                src={GOOGLE_MAPS_EMBED_URL}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "400px" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Origin Studios Location - Las Vegas Podcast Studio"
                className="absolute inset-0"
              />
            </div>

            {/* Contact Info Card */}
            <div className="bg-background rounded-2xl border border-border p-8 md:p-10 flex flex-col">
              <div className="space-y-5">
                {/* Address */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground">{contactInfo.address}</p>
                    <p className="text-muted-foreground">{contactInfo.city}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <a 
                    href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {contactInfo.phone}
                  </a>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <a 
                    href={`mailto:${contactInfo.email}`}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {contactInfo.email}
                  </a>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    {contactInfo.hours.map((schedule, index) => (
                      <p key={index} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{schedule.days}:</span>{" "}
                        {schedule.time}
                      </p>
                    ))}
                    <p className="text-sm text-primary mt-2 italic">
                      {contactInfo.afterHoursNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Google Reviews Section */}
          <motion.div
            initial={skipAnimation ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 bg-background rounded-2xl border border-border p-6 md:p-8"
          >
            {/* Rating Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
              {/* Rating Info */}
              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="flex items-center gap-2">
                  <img 
                    src="/placeholder.jpg
                    alt="Google" 
                    className="w-5 h-5"
                  />
                  <span className="text-2xl font-bold text-primary">{overallRating}</span>
                  <StarRating rating={overallRating} />
                </div>
                <a 
                  href={GOOGLE_REVIEWS_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  See all reviews on Google
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Leave Review Button */}
              <Button asChild size="sm" className="group">
                <a 
                  href={GOOGLE_LEAVE_REVIEW_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <PenLine className="w-3.5 h-3.5 mr-1.5" />
                  Leave a Review
                </a>
              </Button>
            </div>

            {/* Review Highlights */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={chrisOramAvatar} 
                    alt="Chris Oram" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">Chris Oram</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "Origin Podcast Studio is a hidden gem. World class facility and incredible staff members. They exceed the standards for how a video podcast should look in 2025."
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={kateGrayAvatar} 
                    alt="Kate Gray" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">Kate Gray</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "We have loved our time working at Origin Podcast Studio! Professional team and high quality sound/lights/camera! Amazing value!"
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={goodVibesAvatar} 
                    alt="Good Vibes" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">Good Vibes</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "Mics, cameras, and headphones were top notch. This is the best place in Las Vegas for Podcast and it's next to the airport, very central."
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

```

$res_general_home_page_origin_studios_home_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/lead-magnet/brrr-guys-optin.md',
  $res_lead_magnet_brrr_guys_optin_md$
---
name: "BRR Guys - Lead Magnet Opt-In"
category: lead-magnet
company: "The BRR Guys"
page_type: lead-magnet-optin
description: "Simple lead magnet opt-in. Clean white design, headline with stats, embedded GHL form, trust badge, bullet points, disclaimer. Minimal, conversion-focused."
tags: [lead-magnet, optin, simple, clean, form, trust-badge]
---

# Page Source

```tsx
// File: Info.tsx
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useUtmParams } from "@/hooks/useUtmParams";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Check, AlertTriangle } from "lucide-react";

const Info = () => {
  const { utmQueryString } = useUtmParams();
  usePageTracking();

  const getCurrentMonth = () => {
    return new Date().toLocaleString('default', { month: 'long' });
  };

  useEffect(() => {
    localStorage.setItem('brrrr_source_page', '/info');
    
    const script = document.createElement('script');
    script.src = "https://your-form-provider.com/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const bulletPoints = [
    "The Google Map showing our 800+ Memphis properties (with addresses)",
    "Why 90% of course buyers never close deals (the Guru Profit Gap)",
    "Our exact contractors and lenders (warm introductions included)",
    "How to close your first rental in 90 days, not 90 weeks",
    `Limited to 20 Partner Track spots (${getCurrentMonth()} cohort)`,
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight">
              90% Who Buy Real Estate Courses Never Close a Deal.{" "}
              <span className="text-primary">Here's Why.</span>
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground mb-4 leading-relaxed">
              Give me twelve minutes to show you how to close your first rental property in 90 days using our contractors, lenders, and proven playbook
            </p>

          </div>

            <iframe
              src={`https://your-form-provider.com/embed/YOUR_FORM_ID${utmQueryString ? `?${utmQueryString}` : ''}`}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '3px', minHeight: '462px' }}
              id="inline-YOUR_FORM_ID" 
              data-layout="{'id':'INLINE'}"
              data-trigger-type="alwaysShow"
              data-trigger-value=""
              data-activation-type="alwaysActivated"
              data-activation-value=""
              data-deactivation-type="neverDeactivate"
              data-deactivation-value=""
              data-form-name="VSL - Opt- In - Info Form "
              data-height="462"
              data-layout-iframe-id="YOUR_FORM_ID"
              data-form-id="YOUR_FORM_ID"
            title="VSL - Opt- In - Info Form "
            />

          {/* Trust Element */}
          <div className="flex justify-center mt-4">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-600 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold">
                🏠 From the owners of 800+ rental properties (proof on next page)
              </span>
            </div>
          </div>

          {/* Bullet Points Section */}

          {/* Bullet Points Section */}
          <div className="mt-4 pt-4 border-t border-border/30">
              <p className="text-lg font-semibold text-foreground mb-4">
                In this video you'll discover:
              </p>
              <ul className="space-y-3">
                {bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground/70 text-center mt-6">
            By continuing, you agree to receive SMS and email about BRRRR in 90. This is a paid program with limited spots.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Info;

```

$res_lead_magnet_brrr_guys_optin_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/lead-magnet/freedom-builders-delivery.md',
  $res_lead_magnet_freedom_builders_delivery_md$
---
name: "Freedom Builders - Lead Magnet Delivery"
category: lead-magnet
company: "Freedom Builders"
page_type: lead-magnet-delivery
description: "Lead magnet delivery with upsell. YouTube walkthrough video, Canva template CTA, and embedded booking calendar for strategy call upsell."
tags: [lead-magnet, delivery, video-walkthrough, canva, upsell, booking]
---

# Page Source

```tsx
// File: Blueprint.tsx
import logo from "@/assets/placeholder.jpg";
import mikeHeadshot from "@/assets/placeholder.jpg";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";
import Footer from "@/components/Footer";
import { ExternalLink } from "lucide-react";

const Blueprint = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: "#090909" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-4 flex items-center justify-center">
          <img src={logo} alt="Freedom Builderz" className="h-8 shrink-0" />
        </div>
      </div>

      {/* Hero */}
      <section className="relative py-14 md:py-20 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <img src={purpleGradient} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={orangeGradient} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={patternWhite} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[#FF5D2E] font-bold text-sm uppercase tracking-widest mb-4">
            Special Access
          </p>

          <h1 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            YOUR STEP-BY-STEP PLAN TO{" "}
            <span style={{ color: "#FF5D2E" }}>LAUNCH AN ONLINE PROGRAM</span>
          </h1>

          <p className="text-white/60 text-base md:text-lg mb-10 max-w-xl mx-auto">
            Use this blueprint to map out, structure, and launch your digital business. Watch the walkthrough, then use the button below the video to grab the template.
          </p>

          {/* Embedded YouTube */}
          <div className="max-w-2xl mx-auto">
            <div
              className="relative w-full rounded-[16px] overflow-hidden"
              style={{ paddingBottom: "56.25%", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://example.com/placeholder-video-embed"
                title="Builderz Blueprint Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Canva CTA */}
          <div className="mt-10 max-w-2xl mx-auto">
            <a
              href="https://www.canva.com/design/DAFfrfBI1YI/pkmB-PSzYBTq9w0T74eVnQ/view?utm_content=DAFfrfBI1YI&utm_campaign=designshare&utm_medium=link&utm_source=publishsharelink&mode=preview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white text-base font-bold transition-all hover:brightness-110"
              style={{ background: "#FF5D2E" }}
            >
              <ExternalLink className="w-5 h-5" />
              Open the Canva Template
            </a>
          </div>
        </div>
      </section>

      {/* Calendar Booking Section */}
      <section className="relative py-14 md:py-20 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
          {/* Left: Mike intro */}
          <div className="lg:w-[340px] shrink-0 text-center lg:text-left lg:sticky lg:top-28">
            <img
              src={mikeHeadshot}
              alt="Mike G."
              className="w-36 h-36 rounded-full object-cover mx-auto lg:mx-0 mb-6 border-2 border-[#FF5D2E]/30"
            />
            <h2 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-3">
              READY TO GO DEEPER?
            </h2>
            <p className="text-white/60 text-base md:text-lg">
              Book a free one-on-one call with{" "}
              <span className="text-white font-semibold">Mike G.</span>, founder
              of Freedom Builderz, and get personalized guidance on launching
              your program.
            </p>
          </div>

          {/* Right: Booking calendar */}
          <div className="flex-1 min-w-0 rounded-[20px] overflow-hidden" style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.08)" }}>
            <iframe
              src="https://your-form-provider.com/embed/YOUR_FORM_ID"
              style={{ width: "100%", minHeight: "1000px", border: "none" }}
              scrolling="no"
              id="IsH4zinswqcsggqaBikA_booking"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blueprint;

```

$res_lead_magnet_freedom_builders_delivery_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/lead-magnet/freedom-builders-optin.md',
  $res_lead_magnet_freedom_builders_optin_md$
---
name: "Freedom Builders - Lead Magnet Opt-In"
category: lead-magnet
company: "Freedom Builders"
page_type: lead-magnet-optin
description: "Blueprint opt-in page (long-form). Dark theme, sticky header with logo, hero with gradient orbs and product mockup image, what's inside 3-card grid with gradient backgrounds plus bonus cards, blueprint preview with floating screenshots, video preview section, problem/solution framing, credibility bar, form section with mockup, about the coach with video modal and Instagram link."
tags: [lead-magnet, optin, blueprint, preview, credibility, form, dark-theme, gradient-orbs, product-mockup]
---

# Page Source

## Entry File — BlueprintOptIn.tsx

```tsx
// File: BlueprintOptIn.tsx
import { useRef } from "react";
import logo from "@/assets/placeholder.jpg";
import Footer from "@/components/Footer";
import BlueprintHero from "@/components/blueprint/BlueprintHero";
import BlueprintWhatsInside from "@/components/blueprint/BlueprintWhatsInside";
import BlueprintPreview from "@/components/blueprint/BlueprintPreview";
import BlueprintVideoPreview from "@/components/blueprint/BlueprintVideoPreview";
import BlueprintProblemSolution from "@/components/blueprint/BlueprintProblemSolution";
import BlueprintCredibility from "@/components/blueprint/BlueprintCredibility";
import BlueprintForm from "@/components/blueprint/BlueprintForm";
import BlueprintAboutMike from "@/components/blueprint/BlueprintAboutMike";

const BlueprintOptIn = () => {
  const formRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const scrollToVideo = () => {
    videoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-50 border-b border-border/30"
        style={{ background: "#090909" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-4 flex items-center justify-center">
          <img src={logo} alt="Freedom Builderz" className="h-8 shrink-0" />
        </div>
      </div>

      <BlueprintHero onCtaClick={scrollToForm} onVideoClick={scrollToVideo} />
      <BlueprintWhatsInside />
      <BlueprintPreview />
      <BlueprintVideoPreview ref={videoRef} />
      <BlueprintProblemSolution />
      <BlueprintCredibility />
      <BlueprintForm ref={formRef} />
      <BlueprintAboutMike onCtaClick={scrollToForm} />
      <Footer />
    </div>
  );
};

export default BlueprintOptIn;
```

## BlueprintHero.tsx

```tsx
// File: BlueprintHero.tsx
import { Play } from "lucide-react";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import pattern from "@/assets/placeholder.jpg";
import blueprintMockup from "@/assets/placeholder.jpg";

interface BlueprintHeroProps {
  onCtaClick: () => void;
  onVideoClick: () => void;
}

const BlueprintHero = ({ onCtaClick, onVideoClick }: BlueprintHeroProps) => {
  return (
    <section
      className="relative py-20 md:py-28 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[40%] -left-[30%] w-[900px] h-[900px] object-cover opacity-[0.3] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={orangeGradient}
        alt=""
        className="absolute -bottom-[40%] -right-[30%] w-[900px] h-[900px] object-cover opacity-[0.3] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={pattern}
        alt=""
        className="absolute bottom-0 left-0 w-full h-[35%] object-cover object-bottom opacity-[0.08] pointer-events-none mix-blend-overlay"
        style={{
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left: Text */}
        <div className="flex-1 text-center lg:text-left">
          <p className="text-primary font-bold text-sm tracking-[0.2em] uppercase mb-4">
            FREE RESOURCE
          </p>

          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight leading-[0.9] mb-6">
            THE BUILDERZ{" "}
            <span className="text-primary relative inline-block">
              <span className="relative z-10">BLUEPRINT</span>
              <span
                className="absolute inset-0 rounded-full blur-[30px] opacity-30"
                style={{ backgroundColor: "hsl(14, 100%, 59%)" }}
              />
            </span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-[600px] mx-auto lg:mx-0 mb-5 leading-relaxed">
            The simple framework to turn everything in your head into a real
            online program — organized, structured, and ready to build.
          </p>

          <p className="text-foreground text-base md:text-lg max-w-xl mx-auto lg:mx-0 mb-8">
            This is the exact template we use with clients who pay{" "}
            <span className="text-primary font-bold">$15,000+</span> for
            done-for-you program builds. Now it's yours —{" "}
            <span className="font-bold">free.</span>
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
            <button
              onClick={onCtaClick}
              className="inline-block bg-primary text-primary-foreground font-bold text-lg md:text-xl px-10 py-4 rounded-[20px] hover:bg-primary/90 transition-all relative"
              style={{ boxShadow: "0 0 40px rgba(255, 93, 46, 0.25)" }}
            >
              DOWNLOAD THE BLUEPRINT FREE
            </button>

            <button
              onClick={onVideoClick}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium bg-transparent border-none cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-primary ml-0.5" fill="currentColor" />
              </div>
              See how it works
            </button>
          </div>
        </div>

        {/* Right: Blueprint Mockup */}
        <div className="shrink-0 relative">
          <div
            className="absolute inset-0 blur-[60px] opacity-25 rounded-[20px]"
            style={{ background: "hsl(14, 100%, 59%)" }}
          />
          <img
            src={blueprintMockup}
            alt="The Builderz Blueprint Template"
            className="relative w-[280px] md:w-[340px] lg:w-[380px] rounded-[16px] rotate-[-3deg] hover:rotate-0 transition-transform duration-500"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          />
        </div>
      </div>
    </section>
  );
};

export default BlueprintHero;
```

## BlueprintWhatsInside.tsx

```tsx
// File: BlueprintWhatsInside.tsx
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import blueGradient from "@/assets/placeholder.jpg";

const cards = [
  {
    num: "01",
    title: "THE FRAMEWORK",
    desc: "The 5 questions that extract your course from your head onto paper in under 30 minutes",
    bg: purpleGradient,
  },
  {
    num: "02",
    title: "THE TEMPLATE",
    desc: "Plug-and-play Canva template. Drag, drop, done. No design skills needed.",
    bg: orangeGradient,
  },
  {
    num: "03",
    title: "THE WALKTHROUGH",
    desc: "Video guide where I personally take you through every section step by step",
    bg: blueGradient,
  },
];

const BlueprintWhatsInside = () => {
  return (
    <section className="relative py-16 md:py-24 px-4 overflow-hidden" style={{ background: "#090909" }}>
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[30%] -right-[45%] w-[1100px] h-[1100px] object-cover opacity-[0.15] pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase text-center mb-14 tracking-tight text-foreground">
          WHAT YOU'LL <span className="text-primary">GET</span>
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-[20px] min-h-[280px] flex flex-col justify-end group hover:-translate-y-1 transition-transform duration-300"
            >
              <img
                src={card.bg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />

              <div className="relative z-10 p-7 flex flex-col h-full">
                <span className="font-heading text-5xl font-black text-white/80 mb-4">
                  {card.num}
                </span>
                <h3 className="font-heading text-white font-bold text-lg uppercase tracking-wide mb-2">
                  {card.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {card.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Extra benefits below cards */}
        <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {[
            { title: "Complete Course Structure Map", desc: "Pillars, weeks, lessons, thumbnails — everything organized exactly how it'll look when you build it" },
            { title: "Backend Offer Framework", desc: "How to think about what comes AFTER your program so you extend the lifetime value of every client" },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-[20px] p-6"
              style={{ background: "#232526", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-primary font-bold text-xs uppercase tracking-wider mb-2">
                BONUS {i + 1}
              </p>
              <p className="font-bold text-foreground text-sm mb-1">{item.title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlueprintWhatsInside;
```

## BlueprintPreview.tsx

```tsx
// File: BlueprintPreview.tsx
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";
import blueprintPages from "@/assets/placeholder.jpg";

const BlueprintPreview = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#121212" }}
    >
      <img
        src={purpleGradient}
        alt=""
        className="absolute -bottom-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={orangeGradient}
        alt=""
        className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={patternWhite}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground mb-4 leading-[0.95]">
          HERE'S WHAT YOU'RE{" "}
          <span className="text-primary">GETTING</span>
        </h2>
        <p className="text-muted-foreground text-base md:text-lg max-w-lg mx-auto mb-12">
          A complete, visual roadmap that turns your expertise into a structured online program.
        </p>

        {/* Mockup with annotations */}
        <div className="relative max-w-3xl mx-auto">
          {/* Glow behind image */}
          <div
            className="absolute inset-0 blur-[80px] opacity-20 rounded-[20px]"
            style={{ background: "linear-gradient(135deg, hsl(270, 60%, 50%), hsl(14, 100%, 59%))" }}
          />

          <img
            src={blueprintPages}
            alt="Blueprint Template Preview"
            className="relative w-full rounded-[16px] rotate-[1deg] hover:rotate-0 transition-transform duration-500"
            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}
          />

          {/* Floating annotation labels */}
          <div className="hidden md:block">
            <div
              className="absolute top-[15%] -left-[5%] rounded-xl px-4 py-2 text-xs font-bold text-foreground"
              style={{ background: "#232526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
            >
              <span className="text-primary mr-1">→</span> Your program title
            </div>
            <div
              className="absolute top-[40%] -right-[5%] rounded-xl px-4 py-2 text-xs font-bold text-foreground"
              style={{ background: "#232526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
            >
              <span className="text-primary mr-1">→</span> Your 3 pillars
            </div>
            <div
              className="absolute bottom-[30%] -left-[5%] rounded-xl px-4 py-2 text-xs font-bold text-foreground"
              style={{ background: "#232526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
            >
              <span className="text-primary mr-1">→</span> Week-by-week breakdown
            </div>
            <div
              className="absolute bottom-[10%] -right-[5%] rounded-xl px-4 py-2 text-xs font-bold text-foreground"
              style={{ background: "#232526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}
            >
              <span className="text-primary mr-1">→</span> Lesson structure
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlueprintPreview;
```

## BlueprintVideoPreview.tsx

```tsx
// File: BlueprintVideoPreview.tsx
import { useState, useRef, useEffect, forwardRef } from "react";
import { Play, X } from "lucide-react";

const YOUTUBE_ID = "Z4RGo_8ihGw";
const THUMB_URL = `/placeholder-thumbnail.jpg

const BlueprintVideoPreview = forwardRef<HTMLDivElement>((_, ref) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section
        ref={ref}
        className="relative py-16 md:py-24 px-4 overflow-hidden"
        style={{ background: "#090909" }}
      >
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground mb-4">
            SEE HOW IT <span className="text-primary">WORKS</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto mb-10">
            Watch the walkthrough and see exactly how to fill out your blueprint.
          </p>

          {/* Video Thumbnail */}
          <div
            className="relative rounded-[20px] overflow-hidden cursor-pointer group"
            onClick={() => setShowModal(true)}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
          >
            <img
              src={THUMB_URL}
              alt="Blueprint Walkthrough Video"
              className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{
                  background: "hsl(14, 100%, 59%)",
                  boxShadow: "0 0 40px rgba(255, 93, 46, 0.4)",
                }}
              >
                <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {showModal && <VideoModal onClose={() => setShowModal(false)} />}
    </>
  );
});

BlueprintVideoPreview.displayName = "BlueprintVideoPreview";

const VideoModal = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleEsc); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-4xl rounded-[20px] overflow-hidden"
        style={{ background: "#090909" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-b-full" style={{ background: "#FF5D2E" }} />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:-top-4 md:-right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80 z-20"
          style={{ background: "#232526" }}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-3 md:p-4">
          <div className="aspect-video rounded-xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0`}
              title="Blueprint Walkthrough"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintVideoPreview;
```

## BlueprintProblemSolution.tsx

```tsx
// File: BlueprintProblemSolution.tsx
import { Check } from "lucide-react";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";
import blueprintMockup from "@/assets/placeholder.jpg";

const BlueprintProblemSolution = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={purpleGradient}
        alt=""
        className="absolute -bottom-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={orangeGradient}
        alt=""
        className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={patternWhite}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.04] pointer-events-none"
      />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
          {/* Left: Text */}
          <div className="flex-1 max-w-[700px]">
            <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-10 leading-[0.95]">
              STOP LETTING YOUR BEST IDEAS STAY{" "}
              <span className="text-primary">STUCK IN YOUR HEAD</span>
            </h2>

            <div className="space-y-5 text-muted-foreground text-base md:text-lg leading-relaxed">
              <p>You already know you have something valuable to teach.</p>

              <p>
                You've helped people get results. You've got the expertise. You've
                probably thought about turning it into a course or program a
                hundred times.
              </p>

              <p>
                But every time you sit down to actually map it out...{" "}
                <span className="text-foreground font-semibold">nothing.</span>
              </p>

              <p>
                It's all in your head — but you can't see it. You can't organize
                it. You don't know where to start.
              </p>
            </div>

            {/* Callout card */}
            <div
              className="my-8 rounded-[20px] px-8 py-6 text-center relative overflow-hidden"
              style={{
                background: "rgba(255, 93, 46, 0.08)",
                border: "1px solid rgba(255, 93, 46, 0.2)",
              }}
            >
              <div
                className="absolute inset-0 blur-[40px] opacity-20"
                style={{ background: "hsl(14, 100%, 59%)" }}
              />
              <p className="relative z-10 text-primary font-bold text-xl md:text-2xl">
                The Builderz Blueprint fixes that.
              </p>
            </div>

            <div className="space-y-5 text-muted-foreground text-base md:text-lg leading-relaxed">
              <p>
                It's a simple, visual framework that takes everything you know and
                organizes it into a real program structure — one you can actually
                see, refine, and build.
              </p>

              <p className="text-foreground font-semibold">
                By the time you're done, you'll have:
              </p>

              <ul className="space-y-3 pl-1">
                {[
                  "Your core transformation defined",
                  "Your timeline mapped out",
                  "Your pillars, modules, and lessons organized",
                  "A visual blueprint you can hand to a designer, VA, or build yourself",
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" strokeWidth={3} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-foreground font-bold text-center pt-2">
                This is the first step. And it's free.
              </p>
            </div>
          </div>

          {/* Right: Blueprint visual */}
          <div className="hidden lg:block shrink-0 sticky top-32">
            <div className="relative">
              <div
                className="absolute inset-0 blur-[60px] opacity-20 rounded-[20px]"
                style={{ background: "hsl(14, 100%, 59%)" }}
              />
              <img
                src={blueprintMockup}
                alt="Blueprint Template"
                className="relative w-[300px] rounded-[16px] rotate-[3deg]"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlueprintProblemSolution;
```

## BlueprintCredibility.tsx

```tsx
// File: BlueprintCredibility.tsx
import patternWhite from "@/assets/placeholder.jpg";

const stats = [
  { stat: "$500K+", desc: "Generated by a holistic health expert", niche: "Holistic Health" },
  { stat: "$200K", desc: "Launch for a healer's certification program", niche: "Healing & Certification" },
  { stat: "6 Weeks", desc: "Midwife's first course to six figures", niche: "Midwifery" },
  { stat: "$100K+", desc: "Wall Street trader, zero online presence — in 30 days", niche: "Finance & Trading" },
];

const BlueprintCredibility = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#121212" }}
    >
      <img
        src={patternWhite}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-14 leading-[0.95]">
          TRUSTED BY{" "}
          <span className="text-primary">150+</span>{" "}
          PROGRAM CREATORS
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-14">
          {stats.map((item, i) => (
            <div
              key={i}
              className="rounded-[20px] p-6 flex flex-col items-center gap-3 group hover:-translate-y-1 transition-transform duration-300"
              style={{
                background: "#232526",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="font-heading text-3xl md:text-4xl lg:text-5xl font-black text-primary">
                {item.stat}
              </span>
              <span className="text-muted-foreground text-xs md:text-sm leading-snug">
                {item.desc}
              </span>
              <span
                className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full"
                style={{ background: "rgba(255, 93, 46, 0.1)", color: "hsl(14, 100%, 59%)" }}
              >
                {item.niche}
              </span>
            </div>
          ))}
        </div>

        <p className="text-foreground text-base md:text-lg max-w-2xl mx-auto">
          Different niches. Different backgrounds. Same starting point:{" "}
          <span className="text-primary font-bold">The Builderz Blueprint.</span>
        </p>
      </div>
    </section>
  );
};

export default BlueprintCredibility;
```

## BlueprintForm.tsx

```tsx
// File: BlueprintForm.tsx
import { forwardRef } from "react";
import { Lock } from "lucide-react";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import blueprintMockup from "@/assets/placeholder.jpg";

const BlueprintForm = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[30%] -left-[25%] w-[800px] h-[800px] object-cover opacity-[0.35] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
        }}
      />
      <img
        src={orangeGradient}
        alt=""
        className="absolute -bottom-[30%] -right-[25%] w-[800px] h-[800px] object-cover opacity-[0.35] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
        }}
      />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground mb-3 leading-[0.95] text-center">
          GET THE BLUEPRINT —{" "}
          <span className="text-primary">FREE</span>
        </h2>

        <p className="text-muted-foreground text-base md:text-lg mb-12 max-w-md mx-auto text-center">
          Enter your info below and get instant access to the template + video
          walkthrough.
        </p>

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
          {/* Left: Form */}
          <div className="flex-1 w-full max-w-lg">
            <div
              className="rounded-[20px] p-8 md:p-10"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 80px rgba(255, 93, 46, 0.1)",
              }}
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-muted-foreground text-sm mb-2 font-medium">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    className="w-full px-4 py-3.5 rounded-xl text-foreground placeholder:text-muted-foreground/50 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#232526", border: "1px solid #333" }}
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm mb-2 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    className="w-full px-4 py-3.5 rounded-xl text-foreground placeholder:text-muted-foreground/50 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#232526", border: "1px solid #333" }}
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm mb-2 font-medium">
                    Phone{" "}
                    <span className="text-muted-foreground/50 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3.5 rounded-xl text-foreground placeholder:text-muted-foreground/50 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#232526", border: "1px solid #333" }}
                  />
                </div>

                <button
                  className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-[20px] hover:bg-primary/90 transition-all mt-2"
                  style={{ boxShadow: "0 0 40px rgba(255, 93, 46, 0.2)" }}
                >
                  SEND ME THE BLUEPRINT
                </button>

                <p className="text-muted-foreground text-xs text-center flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  No spam. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Blueprint mockup */}
          <div className="hidden lg:block shrink-0">
            <div className="relative">
              <div
                className="absolute inset-0 blur-[60px] opacity-25 rounded-[20px]"
                style={{ background: "hsl(14, 100%, 59%)" }}
              />
              <img
                src={blueprintMockup}
                alt="The Builderz Blueprint"
                className="relative w-[280px] rounded-[16px] rotate-[-2deg]"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

BlueprintForm.displayName = "BlueprintForm";

export default BlueprintForm;
```

## BlueprintAboutMike.tsx

```tsx
// File: BlueprintAboutMike.tsx
import { useState } from "react";
import { Play, Instagram, ArrowRight } from "lucide-react";
import mikeHeadshot from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import purpleGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";

const STORY_VIDEO = "/placeholder-video.mp4";

interface BlueprintAboutMikeProps {
  onCtaClick: () => void;
}

const BlueprintAboutMike = ({ onCtaClick }: BlueprintAboutMikeProps) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section
        className="relative py-16 md:py-24 px-4 overflow-hidden"
        style={{ background: "#090909" }}
      >
        <img src={purpleGradient} alt="" className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={orangeGradient} alt="" className="absolute -bottom-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={patternWhite} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-start gap-12">
          {/* Left: Photo + links */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-[20px] blur-[40px] opacity-20" style={{ background: "#FF5D2E" }} />
              <img
                src={mikeHeadshot}
                alt="Mike Gonzalez"
                className="relative w-full md:w-[280px] rounded-[20px] object-cover max-h-[380px]"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
              />
            </div>

            <div className="flex items-center gap-5">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors cursor-pointer bg-transparent border-none text-white"
              >
                <Play className="w-4 h-4 text-primary" fill="currentColor" />
                Watch Mike's Story
              </button>
              <a
                href="https://instagram.com/your-handle/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white hover:underline text-sm font-medium transition-colors"
              >
                <Instagram className="w-4 h-4 text-primary" />
                @mikegbuilds
              </a>
            </div>
          </div>

          {/* Right: Bio */}
          <div className="flex-1 max-w-[520px]">
            <h2 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-5">
              WHO'S BEHIND <span className="text-primary">THIS?</span>
            </h2>

            <div className="text-white/70 text-base leading-relaxed space-y-3.5 mb-6">
              <p>
                I'm <span className="text-white font-semibold">Mike Gonzalez</span>, founder of Freedom Builderz.
              </p>
              <p>
                We've built 150+ online programs for coaches, creators, and
                experts — and the #1 thing that holds people back isn't tech,
                time, or talent.
              </p>
              <p className="text-white font-semibold">It's clarity.</p>
              <p>
                They can't see what's in their head. So they never build it.
              </p>
              <p>
                I created The Builderz Blueprint to fix that. It's the same tool
                we use on every client build — and now it's yours.
              </p>
            </div>

            <div className="w-16 h-px mb-5" style={{ background: "rgba(255,93,46,0.3)" }} />

            <div className="space-y-0.5 mb-6">
              <p className="text-white font-bold">Michael Gonzalez</p>
              <p className="text-white/50 text-sm">Founder of Freedom Builderz</p>
              <p className="text-sm font-bold text-primary">7-Figure Program Architect</p>
            </div>

            <button
              onClick={onCtaClick}
              className="inline-flex items-center gap-2 text-primary font-bold text-base hover:gap-3 transition-all bg-transparent border-none cursor-pointer"
            >
              DOWNLOAD THE BLUEPRINT
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {showModal && <StoryModal onClose={() => setShowModal(false)} />}
    </>
  );
};

const StoryModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="relative z-10 w-[95%] md:w-[90%] rounded-[20px] p-5 md:p-8 flex flex-col items-center"
        style={{ maxWidth: 450, background: "#090909" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-b-full" style={{ background: "#FF5D2E" }} />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:-top-4 md:-right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80 z-20"
          style={{ background: "#232526" }}
        >
          ✕
        </button>
        <h3 className="font-heading text-xl font-black uppercase tracking-tight text-white mb-1 mt-2">
          MIKE'S STORY
        </h3>
        <p className="text-white/40 text-sm mb-5">How Freedom Builderz Started</p>
        <video
          className="w-full rounded-xl"
          controls
          playsInline
          preload="auto"
          autoPlay
          style={{ maxHeight: "60vh" }}
        >
          <source src={STORY_VIDEO} type="video/mp4" />
        </video>
      </div>
    </div>
  );
};

export default BlueprintAboutMike;
```
$res_lead_magnet_freedom_builders_optin_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/live-event/battista-event.md',
  $res_live_event_battista_event_md$
---
name: "Battista Academy - Event Page"
category: live-event
company: "Battista Academy"
page_type: event
description: "Live in-person event page. Fixed header with nav and ticket popup, hero with animated underlines and ticket dialog, event highlights with countdown, venue section with calendar and map, 3-tier ticket cards (GA/VIP/CEO) with animated entrance, speaker lineup with hover effects, event details grid, learning topics 2-column layout with event photos, accordion FAQ, footer with CTA, back-to-top button."
tags: [event, live, in-person, tickets, speakers, schedule, faq, countdown, calendar, ticket-tiers]
---

# Page Source

## Entry File — Index.tsx

```tsx
// File: Index.tsx

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import EventHighlights from "@/components/EventHighlights";
import VenueCalendar from "@/components/VenueCalendar";
import TicketOptions from "@/components/TicketOptions";
import SpeakerLineup from "@/components/SpeakerLineup";
import EventDetails from "@/components/EventDetails";
import EventLearning from "@/components/EventLearning";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <div id="highlights">
        <EventHighlights />
      </div>
      <div id="schedule">
        <VenueCalendar />
        <EventDetails />
      </div>
      <div id="tickets">
        <TicketOptions />
      </div>
      <div id="speakers">
        <SpeakerLineup />
      </div>
      <div id="learning">
        <EventLearning />
      </div>
      <div id="faq">
        <FAQ />
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;
```

## Header.tsx

```tsx
// File: Header.tsx

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Loader2 } from 'lucide-react';

const Header = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketsSold, setTicketsSold] = useState(73);
  const [hasClicked, setHasClicked] = useState(false);

  const handleTicketClick = () => {
    setIsLoading(true);
    setIsDialogOpen(true);
    if (!hasClicked) {
      setTicketsSold(74);
      setHasClicked(true);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const menuItems = [
    { label: "Schedule", id: "schedule" },
    { label: "Tickets", id: "tickets" },
    { label: "Speakers", id: "speakers" },
    { label: "Topics", id: "learning" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <img 
            src="/placeholder.jpg" 
            alt="Battista Academy" 
            className="h-10 md:h-12 lg:h-14"
          />
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-6">
          <NavigationMenu>
            <NavigationMenuList>
              {menuItems.map((item) => (
                <NavigationMenuItem key={item.id}>
                  <NavigationMenuLink
                    className="text-white hover:text-orange-500 cursor-pointer px-3 py-2 transition-colors duration-200"
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Ticket Button */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm"
              onClick={handleTicketClick}
              style={{ backgroundColor: '#FF9801' }}
              className="text-white hover:opacity-90 font-bold px-3 py-2 md:px-6 md:py-3 rounded-full shadow-xl transform hover:scale-105 transition-all duration-300 text-xs md:text-base"
            >
              SECURE TICKET NOW
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
            {/* Preload iframe even during loading */}
            <div className={isLoading ? 'hidden' : ''}>
              <div className="px-8 pt-8 pb-1 bg-white text-center">
                <h3 className="font-bold text-lg mb-1" style={{ color: '#FF9801' }}>
                  Step 1: Enter Your Details For Tickets
                </h3>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="h-4 w-4" style={{ color: '#FF9801' }} />
                  <span className="text-sm font-semibold" style={{ color: '#FF9801' }}>Early Bird Pricing Ends Soon!</span>
                </div>
              </div>

              <div className="px-0">
                <iframe
                  src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                  style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                  id="inline-YOUR_FORM_ID" 
                  data-layout="{'id':'INLINE'}"
                  data-trigger-type="alwaysShow"
                  data-trigger-value=""
                  data-activation-type="alwaysActivated"
                  data-activation-value=""
                  data-deactivation-type="neverDeactivate"
                  data-deactivation-value=""
                  data-form-name="July Event"
                  data-height="400"
                  data-layout-iframe-id="YOUR_FORM_ID"
                  data-form-id="YOUR_FORM_ID"
                  title="July Event"
                />
              </div>

              <div className="px-8 pb-8 bg-white">
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: '#FF9801' }}>Tickets Sold</span>
                    <span style={{ color: '#FF9801' }}>{ticketsSold}%</span>
                  </div>
                  <Progress value={ticketsSold} className="h-2" />
                </div>
                <p className="text-sm text-center animate-pulse mb-3" style={{ color: '#FF9801' }}>
                  🔥 Secure The Best Deal - Early Bird Pricing Ends Soon
                </p>
                <p className="text-xs text-gray-400 text-center leading-tight">
                  By continuing I agree to the terms & privacy policy, and agree to be contacted by this company via email & sms or other forms of communication.
                </p>
              </div>
            </div>

            {/* Loading overlay */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: '#FF9801' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#FF9801' }}>
                  Seeing if Tickets Are Still Available...
                </h3>
                <p className="text-gray-600 text-center">
                  Please wait while we check availability
                </p>
              </div>
            )}

            {/* Hidden preload iframe during loading */}
            {isLoading && (
              <div className="absolute opacity-0 pointer-events-none">
                <iframe
                  src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                  style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                  title="Preload July Event"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </header>
  );
};

export default Header;
```

## Hero.tsx

```tsx
// File: Hero.tsx
import { Button } from "@/components/ui/button";
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Loader2 } from 'lucide-react';
const Hero = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketsSold, setTicketsSold] = useState(73);
  const [hasClicked, setHasClicked] = useState(false);
  const handleTicketClick = () => {
    setIsLoading(true);
    setIsDialogOpen(true);
    if (!hasClicked) {
      setTicketsSold(74);
      setHasClicked(true);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };
  const {
    ref: ref1,
    inView: inView1
  } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });
  const {
    ref: ref2,
    inView: inView2
  } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });
  return <div className="relative bg-black text-white pt-20 pb-0">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Text Content */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              JOIN US IN SCOTTSDALE<br />
              <span style={{
              color: '#FF9801'
            }}>JULY 16TH & 17TH</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-6 leading-relaxed">
              FOR THE <span ref={ref1} className="relative inline-block">
                <span className="font-bold">#1 BUSINESS DOMINATION</span>
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 transform origin-left transition-transform duration-700 hidden md:block ${inView1 ? 'scale-x-100' : 'scale-x-0'}`}></span>
                <span className={`block md:hidden w-full h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 transition-opacity duration-700 ${inView1 ? 'opacity-100' : 'opacity-0'}`}></span>
              </span><br />
              <span ref={ref2} className="relative inline-block">
                <span className="font-bold">SEMINAR OF 2025</span>
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 transform origin-left transition-transform duration-700 delay-300 hidden md:block ${inView2 ? 'scale-x-100' : 'scale-x-0'}`}></span>
                <span className={`block md:hidden w-full h-0.5 bg-gradient-to-r from-orange-400 to-orange-600 transition-opacity duration-700 delay-300 ${inView2 ? 'opacity-100' : 'opacity-0'}`}></span>
              </span><br />
              IN SCOTTSDALE AZ
            </p>
            
            <p className="text-lg md:text-xl mb-8">
              A business event for company owners, partners, and operators
            </p>

            {/* CTA Button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" onClick={handleTicketClick} style={{
                backgroundColor: '#FF9801'
              }} className="hover:opacity-90 text-white font-bold px-8 py-4 rounded-full text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 mb-6 w-fit">
                  SECURE YOUR TICKET NOW
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
                {/* Preload iframe even during loading */}
                <div className={isLoading ? 'hidden' : ''}>
                  <div className="pt-8 pb-1 bg-white text-center px-[44px]">
                    <h3 className="font-bold text-lg mb-1" style={{
                    color: '#FF9801'
                  }}>
                      Step 1: Enter Your Details For Tickets
                    </h3>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="h-4 w-4" style={{
                      color: '#FF9801'
                    }} />
                      <span className="text-sm font-semibold" style={{
                      color: '#FF9801'
                    }}>Early Bird Pricing Ends Soon!</span>
                    </div>
                  </div>

                  <div className="px-0">
                    <iframe src="https://your-form-provider.com/embed/YOUR_FORM_ID" style={{
                    width: '100%',
                    height: '400px',
                    border: 'none',
                    borderRadius: '3px'
                  }} id="inline-YOUR_FORM_ID" data-layout="{'id':'INLINE'}" data-trigger-type="alwaysShow" data-trigger-value="" data-activation-type="alwaysActivated" data-activation-value="" data-deactivation-type="neverDeactivate" data-deactivation-value="" data-form-name="July Event" data-height="400" data-layout-iframe-id="YOUR_FORM_ID" data-form-id="YOUR_FORM_ID" title="July Event" />
                  </div>

                  <div className="px-8 pb-8 bg-white">
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{
                        color: '#FF9801'
                      }}>Tickets Sold</span>
                        <span style={{
                        color: '#FF9801'
                      }}>{ticketsSold}%</span>
                      </div>
                      <Progress value={ticketsSold} className="h-2" />
                    </div>
                    <p className="text-sm text-center animate-pulse mb-3" style={{
                    color: '#FF9801'
                  }}>
                      🔥 Secure The Best Deal - Early Bird Pricing Ends Soon
                    </p>
                    <p className="text-xs text-gray-400 text-center leading-tight">
                      By continuing I agree to the terms & privacy policy, and agree to be contacted by this company via email & sms or other forms of communication.
                    </p>
                  </div>
                </div>

                {/* Loading overlay */}
                {isLoading && <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
                    <Loader2 className="h-12 w-12 animate-spin mb-4" style={{
                  color: '#FF9801'
                }} />
                    <h3 className="text-2xl font-bold mb-2" style={{
                  color: '#FF9801'
                }}>
                      Seeing if Tickets Are Still Available...
                    </h3>
                    <p className="text-gray-600 text-center">
                      Please wait while we check availability
                    </p>
                  </div>}

                {/* Hidden preload iframe during loading */}
                {isLoading && <div className="absolute opacity-0 pointer-events-none">
                    <iframe src="https://your-form-provider.com/embed/YOUR_FORM_ID" style={{
                  width: '100%',
                  height: '400px',
                  border: 'none',
                  borderRadius: '3px'
                }} title="Preload July Event" />
                  </div>}
              </DialogContent>
            </Dialog>
          </div>

          {/* Hero Image - Made larger */}
          <div className="flex justify-center items-center lg:justify-end">
            <img src="/placeholder.jpg" alt="Speaker presenting at The Business Domination Seminar" className="w-full max-w-2xl lg:max-w-3xl rounded-2xl shadow-2xl object-cover" />
          </div>
        </div>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </div>;
};
export default Hero;```

## EventHighlights.tsx

```tsx
// File: EventHighlights.tsx

import CountdownTimer from "./CountdownTimer";

const EventHighlights = () => {
  return (
    <section className="py-8 pt-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Event Highlights */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#FF9801' }}>
            EVENT HIGHLIGHTS
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join us for an exclusive 2-day experience designed to transform your business and mindset
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-8 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF9801' }}>
              <span className="text-white text-2xl font-bold">01</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">2 Days</h3>
            <p className="text-gray-600 leading-relaxed">
              Join us for 2 full days of training, elite leadership sessions, and intensive workshops designed to accelerate your business growth.
            </p>
          </div>
          
          <div className="text-center p-8 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF9801' }}>
              <span className="text-white text-2xl font-bold">02</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Elite Speakers</h3>
            <p className="text-gray-600 leading-relaxed">
              We've curated a guest list of speakers who are on the cutting edge of business innovation and leadership excellence.
            </p>
          </div>
          
          <div className="text-center p-8 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF9801' }}>
              <span className="text-white text-2xl font-bold">03</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">High Level Networking</h3>
            <p className="text-gray-600 leading-relaxed">
              Network with an elite group of like-minded individuals who are serious about scaling their businesses to the next level.
            </p>
          </div>
        </div>

        {/* Countdown Section - Now below the cards without border */}
        <div className="text-center">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8" style={{ color: '#FF9801' }}>
              COUNTDOWN TO THE BEST EVENT OF THE YEAR
            </h2>
            <div className="bg-white rounded-3xl p-8 md:p-12">
              <CountdownTimer />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventHighlights;
```

## VenueCalendar.tsx

```tsx
// File: VenueCalendar.tsx
import { Pin, Clock, Users, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const VenueCalendar = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToTickets = () => {
    const element = document.getElementById('tickets');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTicketClick = () => {
    setIsLoading(true);
    setIsDialogOpen(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#FF9801' }}>
            EVENT SCHEDULE & VENUE
          </h2>
          <p className="text-gray-300 text-xl md:text-2xl max-w-3xl mx-auto">
            Join us for two transformative days at our premier venue in Scottsdale, Arizona
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Main Content - Single Row Layout */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Calendar Section - Compact */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-black mb-2">July 2025</h3>
                </div>
                
                {/* Custom Calendar */}
                <div className="bg-white">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                      <div key={day} className="text-center py-2 text-gray-600 font-semibold text-sm">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before July 1st (July 1st is a Tuesday) */}
                    <div></div>
                    <div></div>
                    
                    {/* July days */}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isEventDay = day === 16 || day === 17;
                      const isGA = day === 16;
                      const isVIP = day === 17;
                      
                      return (
                        <div
                          key={day}
                          className={`
                            aspect-square flex flex-col items-center justify-center text-sm rounded-lg
                            ${isEventDay 
                              ? isGA 
                                ? 'bg-blue-500 text-white font-bold' 
                                : 'bg-orange-500 text-white font-bold'
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          <span className="text-xs">{day}</span>
                          {isGA && <span className="text-xs font-bold">GA</span>}
                          {isVIP && <span className="text-xs font-bold">VIP</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <div className="flex flex-col space-y-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <button 
                          onClick={handleTicketClick}
                          className="bg-blue-500 text-white px-3 py-2 rounded-full text-sm font-bold hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          July 16th - GA Tickets
                        </button>
                      </DialogTrigger>
                      <DialogTrigger asChild>
                        <button 
                          onClick={handleTicketClick}
                          className="bg-orange-500 text-white px-3 py-2 rounded-full text-sm font-bold hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                          July 17th - Exclusive VIP and CEO
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
                          {/* Preload iframe even during loading */}
                          <div className={isLoading ? 'hidden' : ''}>
                            <div className="px-8 pt-8 pb-1 bg-white text-center">
                              <h3 className="font-bold text-lg mb-1" style={{ color: '#FF9801' }}>
                                Step 1: Enter Your Details For Tickets
                              </h3>
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <Clock className="h-4 w-4" style={{ color: '#FF9801' }} />
                                <span className="text-sm font-semibold" style={{ color: '#FF9801' }}>Early Bird Pricing Ends Soon!</span>
                              </div>
                            </div>

                            <div className="px-0">
                              <iframe
                                src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                                style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                                id="inline-YOUR_FORM_ID" 
                                data-layout="{'id':'INLINE'}"
                                data-trigger-type="alwaysShow"
                                data-trigger-value=""
                                data-activation-type="alwaysActivated"
                                data-activation-value=""
                                data-deactivation-type="neverDeactivate"
                                data-deactivation-value=""
                                data-form-name="July Event"
                                data-height="400"
                                data-layout-iframe-id="YOUR_FORM_ID"
                                data-form-id="YOUR_FORM_ID"
                                title="July Event"
                              />
                            </div>

                            <div className="px-8 pb-8 bg-white">
                              <div className="mb-3">
                                <div className="flex justify-between text-sm mb-1">
                                  <span style={{ color: '#FF9801' }}>Tickets Remaining</span>
                                  <span style={{ color: '#FF9801' }}>27% Left</span>
                                </div>
                                <Progress value={73} className="h-2" />
                              </div>
                              <p className="text-sm text-center animate-pulse mb-3" style={{ color: '#FF9801' }}>
                                🔥 Secure The Best Deal - Early Bird Pricing Ends Soon
                              </p>
                              <p className="text-xs text-gray-400 text-center leading-tight">
                                By continuing I agree to the terms & privacy policy, and agree to be contacted by this company via email & sms or other forms of communication.
                              </p>
                            </div>
                          </div>

                          {/* Loading overlay */}
                          {isLoading && (
                            <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
                              <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: '#FF9801' }} />
                              <h3 className="text-2xl font-bold mb-2" style={{ color: '#FF9801' }}>
                                Seeing if Tickets Are Still Available...
                              </h3>
                              <p className="text-gray-600 text-center">
                                Please wait while we check availability
                              </p>
                            </div>
                          )}

                          {/* Hidden preload iframe during loading */}
                          {isLoading && (
                            <div className="absolute opacity-0 pointer-events-none">
                              <iframe
                                src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                                style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                                title="Preload July Event"
                              />
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>

            {/* Venue Section - Larger */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-gray-600 h-full">
                <div className="rounded-xl overflow-hidden shadow-2xl mb-6">
                  {/* Desktop Image */}
                  <img 
                    src="/placeholder.jpg" 
                    alt="The Elliott Group building - event venue" 
                    className="w-full h-80 object-cover hidden md:block"
                  />
                  {/* Mobile Image */}
                  <img 
                    src="/placeholder.jpg" 
                    alt="The Elliott Group building with map - event venue" 
                    className="w-full h-80 object-cover block md:hidden"
                  />
                </div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  A world-class venue that has hosted countless successful business leaders and entrepreneurs. 
                  Experience two full days of elite training, networking, and breakthrough sessions in this 
                  premium facility designed for excellence.
                </p>
              </div>
            </div>
          </div>
          
          {/* Venue Address - Just title and info box */}
          <div className="text-center">
            <h4 className="text-3xl font-bold mb-6 text-white flex items-center justify-center gap-2">
              <Pin className="w-8 h-8" style={{ color: '#FF9801' }} />
              Event Location
            </h4>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 max-w-lg mx-auto">
              <h5 className="text-2xl font-bold text-white mb-2">Lions Den - Scottsdale, AZ</h5>
              <p className="text-white text-xl font-semibold">
                11010 N Saguaro Blvd #100
              </p>
              <p className="text-orange-100 text-lg">
                Fountain Hills, AZ 85268
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </section>
  );
};

export default VenueCalendar;
```

## TicketOptions.tsx

```tsx
// File: TicketOptions.tsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, Crown, Clock, Users, Loader2 } from "lucide-react";
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

const TicketOptions = () => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketsSold, setTicketsSold] = useState(73);
  const [hasClicked, setHasClicked] = useState(false);

  const handleTicketClick = () => {
    setIsLoading(true);
    setIsDialogOpen(true);
    if (!hasClicked) {
      setTicketsSold(74);
      setHasClicked(true);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const tickets = [
    {
      name: "General Admission",
      icon: <Check className="h-6 w-6" />,
      features: [
        "1 day of elite leadership training led by Joey Battista & Andy Elliott",
        "Lunch included + high-level networking opportunities"
      ],
      gradient: "from-gray-600 to-gray-700",
      buttonText: "GET GA TICKET"
    },
    {
      name: "VIP Experience",
      icon: <Star className="h-6 w-6" />,
      features: [
        "2 full days of front-row access to Joey & Andy's full leadership sessions",
        "Private VIP Lunch + Inner Circle access",
        "Exclusive After-Party with Joey & Andy Elliott"
      ],
      color: '#FF9801',
      popular: true,
      buttonText: "GET VIP TICKET"
    },
    {
      name: "CEO Experience",
      icon: <Crown className="h-6 w-6" />,
      features: [
        "All VIP perks + 1st row CEO Recliner Seating with mini desk",
        "Private mastermind access",
        "Invite-only CEO Strategy Experience"
      ],
      color: '#FF9801',
      buttonText: "GET CEO TICKET"
    }
  ];

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#FF9801' }}>
            TICKET OPTIONS
          </h2>
        </div>
        
        <div ref={ref} className={`grid md:grid-cols-3 gap-8 max-w-6xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {tickets.map((ticket, index) => (
            <Card key={index} className={`relative overflow-hidden border-2 bg-white ${ticket.popular ? 'scale-105' : ''} hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 group hover:scale-110 hover:border-orange-400`} style={{ borderColor: ticket.popular ? '#FF9801' : '#374151' }}>
              {ticket.popular && (
                <div className="absolute top-0 right-0 text-white px-4 py-1 text-sm font-bold animate-pulse" style={{ backgroundColor: '#FF9801' }}>
                  RECOMMENDED
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`text-white p-4 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${ticket.gradient ? `bg-gradient-to-r ${ticket.gradient}` : ''}`} style={ticket.color ? { backgroundColor: ticket.color } : {}}>
                  {ticket.icon}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-orange-400 transition-colors duration-300">{ticket.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  {ticket.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#FF9801' }} />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={handleTicketClick}
                      className={`w-full text-white font-bold py-3 hover:opacity-90 hover:scale-105 transition-all duration-300 ${ticket.gradient ? `bg-gradient-to-r ${ticket.gradient}` : ''}`}
                      style={ticket.color ? { backgroundColor: ticket.color } : {}}
                    >
                      {ticket.buttonText}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
                    {/* Preload iframe even during loading */}
                    <div className={isLoading ? 'hidden' : ''}>
                      <div className="px-8 pt-8 pb-1 bg-white text-center">
                        <h3 className="font-bold text-lg mb-1" style={{ color: '#FF9801' }}>
                          Step 1: Enter Your Details For Tickets
                        </h3>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Clock className="h-4 w-4" style={{ color: '#FF9801' }} />
                          <span className="text-sm font-semibold" style={{ color: '#FF9801' }}>Early Bird Pricing Ends Soon!</span>
                        </div>
                      </div>

                      <div className="px-0">
                        <iframe
                          src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                          style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                          id="inline-YOUR_FORM_ID" 
                          data-layout="{'id':'INLINE'}"
                          data-trigger-type="alwaysShow"
                          data-trigger-value=""
                          data-activation-type="alwaysActivated"
                          data-activation-value=""
                          data-deactivation-type="neverDeactivate"
                          data-deactivation-value=""
                          data-form-name="July Event"
                          data-height="400"
                          data-layout-iframe-id="YOUR_FORM_ID"
                          data-form-id="YOUR_FORM_ID"
                          title="July Event"
                        />
                      </div>

                      <div className="px-8 pb-8 bg-white">
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span style={{ color: '#FF9801' }}>Tickets Sold</span>
                            <span style={{ color: '#FF9801' }}>{ticketsSold}%</span>
                          </div>
                          <Progress value={ticketsSold} className="h-2" />
                        </div>
                        <p className="text-sm text-center animate-pulse mb-3" style={{ color: '#FF9801' }}>
                          🔥 Secure The Best Deal - Early Bird Pricing Ends Soon
                        </p>
                        <p className="text-xs text-gray-400 text-center leading-tight">
                          By continuing I agree to the terms & privacy policy, and agree to be contacted by this company via email & sms or other forms of communication.
                        </p>
                      </div>
                    </div>

                    {/* Loading overlay */}
                    {isLoading && (
                      <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
                        <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: '#FF9801' }} />
                        <h3 className="text-2xl font-bold mb-2" style={{ color: '#FF9801' }}>
                          Seeing if Tickets Are Still Available...
                        </h3>
                        <p className="text-gray-600 text-center">
                          Please wait while we check availability
                        </p>
                      </div>
                    )}

                    {/* Hidden preload iframe during loading */}
                    {isLoading && (
                      <div className="absolute opacity-0 pointer-events-none">
                        <iframe
                          src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                          style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                          title="Preload July Event"
                        />
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </section>
  );
};

export default TicketOptions;
```

## SpeakerLineup.tsx

```tsx
// File: SpeakerLineup.tsx

import { Button } from "@/components/ui/button";
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Loader2 } from 'lucide-react';

const SpeakerLineup = () => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketsSold, setTicketsSold] = useState(73);
  const [hasClicked, setHasClicked] = useState(false);

  const handleTicketClick = () => {
    setIsLoading(true);
    setIsDialogOpen(true);
    if (!hasClicked) {
      setTicketsSold(74);
      setHasClicked(true);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const speakers = [
    { name: "Joey Battista", image: "/placeholder.jpg" },
    { name: "Andy Elliott", image: "/placeholder.jpg" },
    { name: "Jacqueline Elliott", image: "/placeholder.jpg" }
  ];

  return (
    <section className="py-20 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#FF9801' }}>
            MEET THE SPEAKER LINEUP
          </h2>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Learn how to create the moving company and culture you've always dreamed of while turning your annual income into your monthly income!
          </p>
        </div>
        
        <div ref={ref} className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {speakers.map((speaker, index) => (
            <div key={index} className="text-center group hover:transform hover:scale-105 transition-all duration-300">
              <div className="relative mb-4 overflow-hidden rounded-2xl">
                <img 
                  src={speaker.image} 
                  alt={speaker.name}
                  className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orange-600/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(to top, #FF9801aa, transparent)` }}></div>
              </div>
              <h3 className="text-xl font-bold text-white transition-colors duration-300 group-hover:text-orange-400">
                {speaker.name}
              </h3>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                onClick={handleTicketClick}
                style={{ backgroundColor: '#FF9801' }}
                className="hover:opacity-90 text-white font-bold px-8 py-4 rounded-full text-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                SECURE TICKET NOW
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
              {/* Preload iframe even during loading */}
              <div className={isLoading ? 'hidden' : ''}>
                <div className="px-8 pt-8 pb-1 bg-white text-center">
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#FF9801' }}>
                    Step 1: Enter Your Details For Tickets
                  </h3>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="h-4 w-4" style={{ color: '#FF9801' }} />
                    <span className="text-sm font-semibold" style={{ color: '#FF9801' }}>Early Bird Pricing Ends Soon!</span>
                  </div>
                </div>

                <div className="px-0">
                  <iframe
                    src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                    style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                    id="inline-YOUR_FORM_ID" 
                    data-layout="{'id':'INLINE'}"
                    data-trigger-type="alwaysShow"
                    data-trigger-value=""
                    data-activation-type="alwaysActivated"
                    data-activation-value=""
                    data-deactivation-type="neverDeactivate"
                    data-deactivation-value=""
                    data-form-name="July Event"
                    data-height="400"
                    data-layout-iframe-id="YOUR_FORM_ID"
                    data-form-id="YOUR_FORM_ID"
                    title="July Event"
                  />
                </div>

                <div className="px-8 pb-8 bg-white">
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: '#FF9801' }}>Tickets Sold</span>
                      <span style={{ color: '#FF9801' }}>{ticketsSold}%</span>
                    </div>
                    <Progress value={ticketsSold} className="h-2" />
                  </div>
                  <p className="text-sm text-center animate-pulse mb-3" style={{ color: '#FF9801' }}>
                    🔥 Secure The Best Deal - Early Bird Pricing Ends Soon
                  </p>
                  <p className="text-xs text-gray-400 text-center leading-tight">
                    By continuing I agree to the terms & privacy policy, and agree to be contacted by this company via email & sms or other forms of communication.
                  </p>
                </div>
              </div>

              {/* Loading overlay */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
                  <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: '#FF9801' }} />
                  <h3 className="text-2xl font-bold mb-2" style={{ color: '#FF9801' }}>
                    Seeing if Tickets Are Still Available...
                  </h3>
                  <p className="text-gray-600 text-center">
                    Please wait while we check availability
                  </p>
                </div>
              )}

              {/* Hidden preload iframe during loading */}
              {isLoading && (
                <div className="absolute opacity-0 pointer-events-none">
                  <iframe
                    src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                    style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                    title="Preload July Event"
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </section>
  );
};

export default SpeakerLineup;
```

## EventDetails.tsx

```tsx
// File: EventDetails.tsx

import { MapPin, Calendar, Clock } from "lucide-react";

const EventDetails = () => {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#FF9801' }}>
            EVENT DETAILS
          </h2>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="text-white p-3 rounded-lg" style={{ backgroundColor: '#FF9801' }}>
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Dates</h3>
                <p className="text-gray-300">July 16th and 17th, 2025</p>
                <p className="text-sm text-gray-400 mt-1">All Day Event</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="text-white p-3 rounded-lg" style={{ backgroundColor: '#FF9801' }}>
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Location</h3>
                <p className="text-gray-300">Lions Den - Scottsdale, AZ</p>
                <p className="text-sm text-gray-400 mt-1">
                  11010 N Saguaro Blvd #100, Fountain Hills, AZ 85268
                </p>
                <p className="text-sm font-medium mt-2" style={{ color: '#FF9801' }}>
                  (VIP events at exclusive locations)
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="text-white p-3 rounded-lg" style={{ backgroundColor: '#FF9801' }}>
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Schedule</h3>
                <p className="text-gray-300">Lunch break will be an hour - plan accordingly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventDetails;
```

## EventLearning.tsx

```tsx
// File: EventLearning.tsx

import { TrendingUp, Users, Target, Lightbulb, Building, DollarSign } from 'lucide-react';

const EventLearning = () => {
  const learningTopics = [
    {
      title: "High-Performance Mindset & Leadership",
      icon: TrendingUp
    },
    {
      title: "Business Growth & Systemization", 
      icon: Users
    },
    {
      title: "Mastering Influence & Sales Strategies",
      icon: Target
    },
    {
      title: "Tactical Execution for Long-Term Success",
      icon: Lightbulb
    },
    {
      title: "Creating an Elite Company Culture",
      icon: Building
    },
    {
      title: "Scaling Your Company to 7 and 8 Figures",
      icon: DollarSign
    }
  ];

  const eventImages = [
    {
      src: "/placeholder.jpg",
      alt: "Business networking and conversation at event"
    },
    {
      src: "/placeholder.jpg", 
      alt: "Speaker presenting timeline to large audience"
    },
    {
      src: "/placeholder.jpg",
      alt: "Business presentation with audience at summit"
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#FF9801' }}>
            THEMES, TOPICS & CONCEPTS
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-black">
            DISCUSSED AT THE EVENT:
          </h3>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            What you can expect to learn at a very high level
          </p>
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* Mobile: Topics first, Desktop: Images first */}
            <div className="lg:order-1 order-2 space-y-4 h-full flex flex-col">
              {eventImages.map((image, index) => (
                <div key={index} className={`rounded-2xl overflow-hidden shadow-2xl h-32 md:h-40 ${index === 1 ? 'mt-10' : ''}`}>
                  <img 
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              ))}
            </div>
            
            {/* Mobile: Topics above images, Desktop: Topics on right */}
            <div className="lg:order-2 order-1 border-2 border-dashed border-orange-500 rounded-2xl p-4 h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                {learningTopics.map((topic, index) => {
                  const IconComponent = topic.icon;
                  return (
                    <div key={index} className="bg-gray-100 rounded-xl p-3 border border-gray-300 flex flex-col items-center text-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#FF9801' }}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">
                        {topic.title}
                      </h3>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventLearning;
```

## FAQ.tsx

```tsx
// File: FAQ.tsx

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

const FAQ = () => {
  const [openItems, setOpenItems] = useState<string[]>([]);
  
  const faqs = [
    {
      question: "Who is this event built for?",
      answer: "The Business Domination Seminar is built for ambitious entrepreneurs, owners, and sales-driven operators leading 6-, 7-, and 8-figure companies. It's not for beginners or dabblers—it's for those ready to scale aggressively."
    },
    {
      question: "Which ticket is right for you?",
      answer: "Choose from General Admission (1-day access), VIP (2 days + private lunch + front-row access), or CEO (2 days + front-row recliner seating, private mastermind, mic time + strategic session)."
    },
    {
      question: "What do VIP & CEO tickets unlock?",
      answer: "Exclusive seating, deeper access to Joey & Andy, private lunch experiences, and access to the elite-level mastermind room where real business acceleration happens."
    },
    {
      question: "How do I lock in my seat?",
      answer: "Click any \"Secure Ticket\" button on this page. Spots are limited by design and will sell out."
    },
    {
      question: "How is this different from other events?",
      answer: "This isn't theory. It's not networking fluff. This is implementation-focused with real leaders, built to collapse time between strategy and results."
    },
    {
      question: "Should I come if I'm already successful?",
      answer: "Yes—especially if you've plateaued, scaled too slowly, or want faster team duplication. The best in business don't go it alone."
    },
    {
      question: "Why is this event intentionally small?",
      answer: "To protect the value of the room. Every seat is earned. No tire-kickers. No wasted energy. Just serious operators getting sharper and richer together."
    }
  ];

  const handleValueChange = (value: string) => {
    setOpenItems(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value) 
        : [...prev, value]
    );
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-orange-100 rounded-full opacity-30 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-orange-200 rounded-full opacity-30 blur-2xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-block mb-4">
            
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-black via-gray-600 to-orange-600 bg-clip-text text-transparent leading-tight">
            Frequently Asked
            <br />
            <span style={{ color: '#FF9801' }}>Questions</span>
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about The Business Domination Seminar
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Accordion 
            type="multiple" 
            value={openItems} 
            onValueChange={(value) => {
              if (Array.isArray(value)) {
                setOpenItems(value);
              }
            }} 
            className="space-y-6"
          >
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`} 
                className="group border-0 bg-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <AccordionTrigger 
                  className="text-left px-8 py-6 hover:no-underline hover:bg-gray-100 transition-colors duration-200" 
                  onClick={() => handleValueChange(`item-${index}`)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg md:text-xl font-bold text-gray-900 pr-4 leading-relaxed">
                      {faq.question}
                    </span>
                    <div className="flex-shrink-0 ml-4">
                      {openItems.includes(`item-${index}`) ? (
                        <Minus className="h-6 w-6 text-orange-500 transition-transform duration-200" />
                      ) : (
                        <Plus className="h-6 w-6 text-orange-500 transition-transform duration-200 group-hover:scale-110" />
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6 pt-0">
                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
```

## Footer.tsx

```tsx
// File: Footer.tsx

import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Loader2 } from 'lucide-react';

const Footer = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketsSold, setTicketsSold] = useState(73);
  const [hasClicked, setHasClicked] = useState(false);

  const handleTicketClick = () => {
    setIsLoading(true);
    setIsDialogOpen(true);
    if (!hasClicked) {
      setTicketsSold(74);
      setHasClicked(true);
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  return (
    <footer className="bg-black text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-12">
          <img 
            src="/placeholder.jpg" 
            alt="Battista Academy" 
            className="h-16 mx-auto mb-8" 
          />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Get in the room with leaders who play all out and learn to 
          <span style={{ color: '#FF9801' }}> DOMINATE </span>
          as a CEO
        </h2>
        
        <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto">
          A conference to change your company forever, and your entire team is invited...
        </p>
        
        <p className="text-2xl font-bold mb-12" style={{ color: '#FF9801' }}>
          Join us in Scottsdale Arizona for The Business Domination Seminar!
        </p>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              onClick={handleTicketClick} 
              style={{ backgroundColor: '#FF9801' }} 
              className="hover:opacity-90 text-white font-bold px-12 py-6 rounded-full text-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              SECURE TICKET NOW
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
            {/* Preload iframe even during loading */}
            <div className={isLoading ? 'hidden' : ''}>
              <div className="px-8 pt-8 pb-1 bg-white text-center">
                <h3 className="font-bold text-lg mb-1" style={{ color: '#FF9801' }}>
                  Step 1: Enter Your Details For Tickets
                </h3>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="h-4 w-4" style={{ color: '#FF9801' }} />
                  <span className="text-sm font-semibold" style={{ color: '#FF9801' }}>Early Bird Pricing Ends Soon!</span>
                </div>
              </div>

              <div className="px-0">
                <iframe
                  src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                  style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                  id="inline-YOUR_FORM_ID" 
                  data-layout="{'id':'INLINE'}"
                  data-trigger-type="alwaysShow"
                  data-trigger-value=""
                  data-activation-type="alwaysActivated"
                  data-activation-value=""
                  data-deactivation-type="neverDeactivate"
                  data-deactivation-value=""
                  data-form-name="July Event"
                  data-height="400"
                  data-layout-iframe-id="YOUR_FORM_ID"
                  data-form-id="YOUR_FORM_ID"
                  title="July Event"
                />
              </div>

              <div className="px-8 pb-8 bg-white">
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: '#FF9801' }}>Tickets Sold</span>
                    <span style={{ color: '#FF9801' }}>{ticketsSold}%</span>
                  </div>
                  <Progress value={ticketsSold} className="h-2" />
                </div>
                <p className="text-sm text-center animate-pulse mb-3" style={{ color: '#FF9801' }}>
                  🔥 Secure The Best Deal - Early Bird Pricing Ends Soon
                </p>
                <p className="text-xs text-gray-400 text-center leading-tight">
                  By continuing I agree to the terms & privacy policy, and agree to be contacted by this company via email & sms or other forms of communication.
                </p>
              </div>
            </div>

            {/* Loading overlay */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
                <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: '#FF9801' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#FF9801' }}>
                  Seeing if Tickets Are Still Available...
                </h3>
                <p className="text-gray-600 text-center">
                  Please wait while we check availability
                </p>
              </div>
            )}

            {/* Hidden preload iframe during loading */}
            {isLoading && (
              <div className="absolute opacity-0 pointer-events-none">
                <iframe
                  src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                  style={{ width: '100%', height: '400px', border: 'none', borderRadius: '3px' }}
                  title="Preload July Event"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        <div className="mt-16 pt-8 border-t border-gray-700 text-gray-400 text-sm">
          <div className="flex flex-col items-center gap-4">
            <p>&copy; 2025 Battista Academy. All rights reserved.</p>
            <a 
              href="#privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors underline"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </footer>
  );
};

export default Footer;
```

## BackToTop.tsx

```tsx
// File: BackToTop.tsx

import { ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          style={{ backgroundColor: '#FF9801' }}
        >
          <ChevronUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </>
  );
};

export default BackToTop;
```
$res_live_event_battista_event_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/live-event/standard-plumbing-event.md',
  $res_live_event_standard_plumbing_event_md$
---
name: "Standard Plumbing - Event Page"
category: live-event
company: "Standard Plumbing"
page_type: event
description: "Trade event page. Fixed header with nav and ticket modal, hero with animated underlines, event highlights with countdown, venue calendar with map, 3-tier ticket cards, speaker lineup, sponsors section, event details, learning topics grid, accordion FAQ, footer with CTA, back-to-top button."
tags: [event, live, trade, tickets, speakers, sponsors, countdown, calendar, ticket-tiers]
---

# Page Source

## Entry File — Index.tsx

```tsx
// File: Index.tsx

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import EventHighlights from "@/components/EventHighlights";
import VenueCalendar from "@/components/VenueCalendar";
import TicketOptions from "@/components/TicketOptions";
import SpeakerLineup from "@/components/SpeakerLineup";
import Sponsors from "@/components/Sponsors";
import EventDetails from "@/components/EventDetails";
import EventLearning from "@/components/EventLearning";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";

const Index = () => {
  return (
    <div className="min-h-screen" key="force-rebuild-12345">
      <Header />
      <Hero />
      <div id="highlights">
        <EventHighlights />
      </div>
      <div id="schedule">
        <VenueCalendar />
        <EventDetails />
      </div>
      <div id="tickets">
        <TicketOptions />
      </div>
      <div id="speakers">
        <SpeakerLineup />
      </div>
      <Sponsors />
      <div id="learning">
        <EventLearning />
      </div>
      <div id="faq">
        <FAQ />
      </div>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;
```

## Header.tsx

```tsx
// File: Header.tsx

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useState } from 'react';
import TicketModal from './TicketModal';

interface HeaderProps {
  scrollToForm?: boolean;
}

const Header = ({ scrollToForm = false }: HeaderProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTicketClick = () => {
    if (scrollToForm) {
      const element = document.getElementById('ticket-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setIsModalOpen(true);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const menuItems = [
    { label: "Schedule", id: "schedule" },
    { label: "Tickets", id: "tickets" },
    { label: "Speakers", id: "speakers" },
    { label: "Topics", id: "learning" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div>
          <img 
            src="/placeholder.jpg" 
            alt="Standard Plumbing Supply" 
            className="h-10 md:h-12 lg:h-14"
          />
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-6">
          <NavigationMenu>
            <NavigationMenuList>
              {menuItems.map((item) => (
                <NavigationMenuItem key={item.id}>
                  <NavigationMenuLink
                    className="text-white hover:text-red-400 cursor-pointer px-3 py-2 transition-colors duration-200"
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Ticket Button */}
        <Button 
          size="sm"
          onClick={handleTicketClick}
          className="bg-primary hover:bg-primary/90 text-white font-bold px-3 py-2 md:px-6 md:py-3 rounded-full shadow-xl transform hover:scale-105 transition-all duration-300 text-xs md:text-base"
        >
          SECURE MY SEAT
        </Button>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
      
      {/* Modal Component */}
      <TicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </header>
  );
};

export default Header;
```

## Hero.tsx

```tsx
// File: Hero.tsx
import { Button } from "@/components/ui/button";
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';
import TicketModal from './TicketModal';

interface HeroProps {
  scrollToForm?: boolean;
}

const Hero = ({ scrollToForm = false }: HeroProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTicketClick = () => {
    if (scrollToForm) {
      const element = document.getElementById('ticket-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setIsModalOpen(true);
    }
  };
  const {
    ref: ref1,
    inView: inView1
  } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });
  const {
    ref: ref2,
    inView: inView2
  } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });
  return <div className="relative bg-black text-white pt-20 pb-16 min-h-screen flex items-center overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-primary/5"></div>
      
      <div className="container mx-auto px-4 py-16 md:py-20 relative z-10 w-full">
        {/* Centered Text Content */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-[fade-in_0.8s_ease-out_0.1s_backwards]">
            MASTER HOME SERVICE<br />
            <span className="text-primary relative inline-block">
              SALES
              <span className="absolute inset-0 blur-xl bg-primary/30"></span>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-6 leading-relaxed animate-[fade-in_0.8s_ease-out_0.3s_backwards]">
            JOIN US FOR AN <span ref={ref1} className="relative inline-block">
              <span className="font-bold">ELITE SALES TRAINING</span>
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-gold-500 transform origin-left transition-transform duration-700 hidden md:block ${inView1 ? 'scale-x-100' : 'scale-x-0'}`}></span>
              <span className={`block md:hidden w-full h-0.5 bg-gradient-to-r from-red-500 to-gold-500 transition-opacity duration-700 ${inView1 ? 'opacity-100' : 'opacity-0'}`}></span>
            </span><br />
            FEBRUARY 10, 2026 | 8AM-5PM
          </p>
          
          <p className="text-lg md:text-xl mb-8 animate-[fade-in_0.8s_ease-out_0.5s_backwards]">
            Jeremy Miner, Anthony Vizzari & Jacob Reese go deep into leveling up sales for Plumbing, HVAC, and Electrical professionals.
          </p>

          {/* CTA Button */}
          <div className="animate-[fade-in_0.8s_ease-out_0.7s_backwards]">
            <Button 
              size="lg" 
              onClick={handleTicketClick} 
              className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-4 rounded-full text-xl shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:shadow-[0_0_60px_rgba(239,68,68,0.6)] transform hover:scale-105 transition-all duration-300 mx-auto relative overflow-hidden group"
            >
              <span className="relative z-10">SECURE MY SEAT</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
            </Button>
          </div>
        </div>
      </div>

      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
      
      {/* Modal Component */}
      <TicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>;
};
export default Hero;```

## EventHighlights.tsx

```tsx
// File: EventHighlights.tsx

import CountdownTimer from "./CountdownTimer";

const EventHighlights = () => {
  return (
    <section className="py-8 pt-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Event Highlights */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            EVENT HIGHLIGHTS
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join us for an exclusive 1-day sales training experience with Jeremy Miner, Anthony Vizzari & Jacob Reese
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-8 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-primary">
              <span className="text-white text-2xl font-bold">01</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">1 Day of Sales Training</h3>
            <p className="text-gray-600 leading-relaxed">
              High-intensity sales training from world-class experts Jeremy Miner, Anthony Vizzari & Jacob Reese focused on closing more deals and increasing revenue.
            </p>
          </div>
          
          <div className="text-center p-8 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-black">
              <span className="text-white text-2xl font-bold">02</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">World-Class Sales Experts</h3>
            <p className="text-gray-600 leading-relaxed">
              Learn directly from Jeremy Miner (NEPQ creator), Anthony Vizzari (7th Level SVP), and Jacob Reese - leaders in sales training.
            </p>
          </div>
          
          <div className="text-center p-8 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-primary">
              <span className="text-white text-2xl font-bold">03</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Network with Top Performers</h3>
            <p className="text-gray-600 leading-relaxed">
              Connect with high-performing home service professionals who are serious about mastering sales and growing their businesses.
            </p>
          </div>
        </div>

        {/* Countdown Section - Now below the cards without border */}
        <div className="text-center">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-primary">
              COUNTDOWN TO THE BEST EVENT OF THE YEAR
            </h2>
            <div className="bg-white rounded-3xl p-8 md:p-12">
              <CountdownTimer />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventHighlights;
```

## VenueCalendar.tsx

```tsx
// File: VenueCalendar.tsx
import { Button } from "@/components/ui/button";
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import TicketModal from './TicketModal';

const VenueCalendar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToTickets = () => {
    const element = document.getElementById('tickets');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTicketClick = () => {
    setIsModalOpen(true);
  };

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-primary">
            EVENT SCHEDULE & VENUE
          </h2>
          <p className="text-gray-300 text-xl md:text-2xl max-w-3xl mx-auto">
            Join us for a transformative full-day event at the Conference Center at Miller Campus in Sandy, Utah. Start with an exclusive shop tour and Top Golf on Feb 9!
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Main Content - Single Row Layout */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Calendar Section - Compact and Aesthetically Pleasing */}
            <div className="flex">
              <div className="bg-white rounded-2xl p-6 shadow-xl w-full flex flex-col">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-black mb-1">February 2026</h3>
                </div>
                
                {/* Custom Calendar */}
                <div className="bg-white">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                      <div key={day} className="text-center py-2 text-gray-600 font-semibold text-sm">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for days before February 1st (February 1st 2026 is a Sunday) */}
                    
                    {/* February days */}
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                      const isEventDay = day === 10;
                      const isPreDay = day === 9;
                      
                      return (
                        <div
                          key={day}
                          className={`
                            aspect-square flex flex-col items-center justify-center rounded-lg
                            ${isEventDay 
                              ? 'bg-red-500 text-white font-bold'
                              : isPreDay
                              ? 'bg-red-300 text-white font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}
                          >
                            <span className="text-sm">{day}</span>
                            {isEventDay && <span className="text-[11px] font-bold">EVENT</span>}
                            {isPreDay && <span className="text-[11px] font-semibold">TOPGOLF</span>}
                          </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Red bottom bar */}
                <div className="mt-6 bg-red-500 h-1 rounded-full"></div>
                
                <div className="mt-6 text-center flex-grow flex flex-col justify-end">
                  <div className="flex flex-col space-y-2">
                    <div className="bg-red-200 text-red-800 px-4 py-2 rounded-full text-xs font-semibold">
                      Feb 9 - Shop Tour (11am-3pm)
                    </div>
                    <div className="bg-red-300 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Feb 9 - Top Golf (6pm-8pm)
                    </div>
                    <Button 
                      onClick={handleTicketClick}
                      className="bg-red-500 text-white px-4 py-4 rounded-full text-base font-bold hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      Feb 10 - Event Day (8am-5pm)
                    </Button>
                  </div>
                </div>
                </div>
              </div>

            {/* Venue Section */}
            <div className="flex">
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-gray-600 w-full flex flex-col">
                <div className="rounded-xl overflow-hidden shadow-2xl mb-6 flex-grow">
                  <img 
                    src="/placeholder.jpg" 
                    alt="Conference Center at Miller Campus - event venue" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-gray-300 text-base leading-relaxed">
                  The Conference Center at Miller Campus boasts a wide range of unique facilities for events, including large outdoor spaces, classrooms, a conference center with seating capacity up to 500 people, vendor halls, a state-of-the-art auditorium, and much more.
                </p>
              </div>
            </div>
          </div>
          
          {/* Venue Address - Just title and info box */}
          <div className="text-center">
            <h4 className="text-3xl font-bold mb-6 text-white flex items-center justify-center gap-2">
              <MapPin className="w-8 h-8 text-primary" />
              Event Location
            </h4>
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 max-w-lg mx-auto">
              <h5 className="text-2xl font-bold text-white mb-2">Conference Center at Miller Campus</h5>
              <p className="text-white text-xl font-semibold">
                9750 S 300 W
              </p>
              <p className="text-red-100 text-lg">
                Sandy, UT 84070
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
      
      {/* Modal Component */}
      <TicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </section>
  );
};

export default VenueCalendar;
```

## TicketOptions.tsx

```tsx
// File: TicketOptions.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star, X } from "lucide-react";
import { useInView } from 'react-intersection-observer';

const TicketOptions = () => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const tickets = [
    {
      name: "General Admission",
      icon: <Check className="h-6 w-6" />,
      inclusions: [
        "General Admission",
        "Event Swag",
        "Lunch, Snacks, Coffee and Complementary Drinks"
      ],
      exclusions: [
        "No VIP Swag",
        "No Dinner with the Speakers"
      ],
      gradient: "from-gray-600 to-gray-700",
      buttonText: "SOLD OUT",
      soldOut: true,
      soldPercentage: 100
    },
    {
      name: "VIP",
      icon: <Star className="h-6 w-6" />,
      inclusions: [
        "VIP Admission",
        "Priority Seating",
        "VIP Swag",
        "Lunch, Snacks, Coffee"
      ],
      exclusions: [
        "No Dinner with the Speakers"
      ],
      color: '#FF9801',
      popular: false,
      buttonText: "SOLD OUT",
      soldOut: true,
      soldPercentage: 100
    },
    {
      name: "CEO",
      icon: <Star className="h-6 w-6" />,
      inclusions: [
        "VIP Admission",
        "Priority Seating",
        "Dinner with the Speakers",
        "VIP Swag",
        "Lunch, Snacks, Coffee"
      ],
      exclusions: [],
      gradient: "from-red-600 to-red-700",
      popular: false,
      buttonText: "SOLD OUT",
      soldOut: true,
      soldPercentage: 100
    }
  ];

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        {/* Sold Out Banner */}
        <div className="mb-8 md:mb-12 px-2">
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-8 md:py-10 px-4 md:px-8 rounded-2xl text-center shadow-2xl border border-primary/30">
            {/* Animated glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 animate-pulse" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 md:gap-4 mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
                  <X className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <h3 className="text-xl md:text-3xl font-black tracking-wider text-white">
                  ALL TICKETS <span className="text-primary">SOLD OUT</span>
                </h3>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
                  <X className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
              </div>
              
              <div className="w-full max-w-xs mx-auto mb-4">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-primary to-red-400 rounded-full" />
                </div>
                <p className="text-xs md:text-sm text-gray-400 mt-2 font-semibold">100% CAPACITY REACHED</p>
              </div>
              
              <p className="text-sm md:text-base text-gray-300 max-w-md mx-auto">
                Thank you for your interest! All ticket packages have been sold.
              </p>
              <p className="text-xs md:text-sm mt-2 text-gray-500">
                Join our waitlist for future events
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            Choose Your Experience
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Select the perfect ticket option for your Home Service Sales Summit experience
          </p>
        </div>
        
        <div ref={ref} className={`grid md:grid-cols-3 gap-8 max-w-6xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {tickets.map((ticket, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden border-2 bg-white ${ticket.popular ? 'scale-105' : ''} hover:shadow-2xl hover:shadow-red-500/20 transition-all duration-300 group hover:scale-110 hover:border-red-400`} 
              style={{ borderColor: ticket.popular ? 'hsl(var(--primary))' : '#374151' }}
            >
              {ticket.popular && (
                <div className="absolute top-0 right-0 text-white px-4 py-1 text-sm font-bold animate-pulse bg-primary">
                  RECOMMENDED
                </div>
              )}
              {ticket.soldOut && (
                <div className="absolute inset-x-0 top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-4 text-center border-b-2 border-red-500">
                  <span className="text-xl font-black tracking-wider">🚫 SOLD OUT — 100% SOLD</span>
                </div>
              )}
              
              <CardHeader className={`text-center pb-4 ${ticket.soldOut ? 'pt-16' : ''}`}>
                <div 
                  className={`text-white p-4 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4 ${ticket.gradient ? `bg-gradient-to-r ${ticket.gradient}` : ''} ${ticket.soldOut ? 'opacity-40 grayscale' : 'group-hover:scale-110 transition-transform duration-300'}`} 
                  style={ticket.color ? { backgroundColor: '#9CA3AF' } : {}}
                >
                  {ticket.icon}
                </div>
                <CardTitle className={`text-2xl font-bold ${ticket.soldOut ? 'text-gray-400' : 'text-gray-900 group-hover:text-red-500 transition-colors duration-300'}`}>
                  {ticket.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase">Included:</h4>
                  <ul className="space-y-2">
                    {ticket.inclusions.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 mt-0.5 flex-shrink-0 text-green-600" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {ticket.exclusions.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase">Not Included:</h4>
                    <ul className="space-y-2">
                      {ticket.exclusions.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <X className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-400" />
                          <span className="text-gray-500">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <Button 
                  disabled={true}
                  className="w-full text-white font-bold py-3 bg-gray-400 cursor-not-allowed opacity-75"
                >
                  {ticket.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TicketOptions;```

## SpeakerLineup.tsx

```tsx
// File: SpeakerLineup.tsx

import { Button } from "@/components/ui/button";
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';
import TicketModal from './TicketModal';
import { Instagram, Linkedin, Facebook } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SpeakerLineupProps {
  scrollToForm?: boolean;
}

const SpeakerLineup = ({ scrollToForm = false }: SpeakerLineupProps) => {
  const { ref, inView } = useInView({
    threshold: 0.2,
    triggerOnce: true,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState<number | null>(null);

  const handleTicketClick = () => {
    if (scrollToForm) {
      const element = document.getElementById('ticket-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setIsModalOpen(true);
    }
  };

  const speakers = [
    { 
      name: "Jeremy Miner", 
      title: "Founder of 7th Level | NEPQ Creator", 
      image: "/placeholder.jpg", 
      featured: true,
      keynote: true,
      bio: "Jeremy Miner is the Founder of 7th Level and creator of the NEPQ (Neuro-Emotional Persuasion Questioning) sales methodology. During his 17-year sales career, he was recognized as the #45th highest earning producer out of more than 108 million salespeople worldwide, earning multiple 7-figures annually as a commission-only sales rep.\n\nHis company, 7th Level, was ranked the #1 fastest-growing sales training company in the US by INC magazine's INC 5000 list for two consecutive years and was also ranked as one of the TOP 10 Sales training companies in the world in 2022 by Selling Power Magazine.\n\nJeremy's unique brand of sales training pioneers the use of behavioral science and human psychology within the sales process. 7th Level has helped over 459,000 salespeople in 158 different industries to 3x, 5x, and even 10x their sales results.\n\nHe is a contributor for INC magazine and has been featured in Forbes, USA Today, Entrepreneur magazine, and the Wall Street Journal on the topics of sales, persuasion, and the role of psychology in the buying process.",
      social: {
        instagram: "https://instagram.com/your-handle/",
        linkedin: "https://www.linkedin.com/in/jeremyleeminer/"
      }
    },
    { 
      name: "Anthony Vizzari", 
      title: "Sales Leader | Growth Strategist | SVP at 7th Level", 
      image: "/placeholder.jpg",
      featured: true,
      bio: "Anthony Vizzari is a globally recognized sales strategist and Senior Vice President at 7th Level — the world's leading authority in behavior-based sales training. Through his leadership, Anthony has helped drive 7th Level to over $100 million in revenue as the largest sales training company on the planet, training more than 100,000 sales professionals and equipping thousands of companies across 161 industries with the NEPQ methodology — a revolutionary framework rooted in human behavior and emotional intelligence.",
      social: {
        instagram: "https://instagram.com/your-handle/DJMITvpTTaN/",
        linkedin: "https://www.linkedin.com/in/anthony-vizzari/"
      }
    },
    { 
      name: "Jacob Reese", 
      title: "Vice President Standard Plumbing Supply", 
      image: "/placeholder.jpg?v=2",
      featured: true,
      bio: "Jacob Reese is the Vice President of Standard Plumbing Supply and a third-generation leader in his family's business.\n\nThe grandson of founder Dale Lee Reese, Jacob started working at Standard at just eight years old, sweeping warehouses and learning the business from the ground up.\n\nOver the years, he has held nearly every role in the company and led the expansion of Standard's Vendor Managed Inventory program to over 52 locations.\n\nJacob has a deep passion for the industry and a strong commitment to his customers. He served a two-year LDS mission in Hamilton, New Zealand, and earned a degree in Business Management from Brigham Young University.\n\nAbove all, Jacob is a dedicated husband and father of four children under the age of five, celebrating nine years of marriage.",
      social: {
        instagram: "https://instagram.com/your-handle/",
        linkedin: "https://www.linkedin.com/in/jacobnreese/"
      }
    },
    { 
      name: "Victor Rancour", 
      title: "CEO-Rocket Group Holdings | Co-Founder of RP-1 | Home Service Business Investor", 
      image: "/placeholder.jpg",
      featured: false,
      bio: "Victor Rancour is CEO of Rocket Group. He began his career in HVAC in 2015 as a technician, where he developed a passion for sales and earned the title of AirTime 500's top-selling technician multiple times. In 2018, he established Absolute Airflow in Southern California. He is also the author of: Brick by Brick",
      social: {
        linkedin: "https://www.linkedin.com/in/victor-rancour-51605a48/",
        instagram: "https://instagram.com/your-handle/?hl=en"
      }
    },
    { 
      name: "Trent Lowenstein", 
      title: "Master Trainer & Coach | Head of Coaching & President at Next Level Pros", 
      image: "/placeholder.jpg",
      featured: false,
      bio: "I'm a builder...\n\nOf people, partnerships, and performance. With more than a decade in the trades and business leadership, I've built, coached, and scaled companies from the ground up. At Next Level Pros, I help entrepreneurs in the home service space become high-performance leaders who build businesses that actually work without them.\n\n• Strategy and Execution: strategic planning, quarterly operating cadence, forecasting, operational scaling, VFO facilitation\n• Partnerships and Growth: business development, JV and channel partnerships, negotiation, deal structuring, market expansion\n• Product and Delivery: offer design, service packaging, light manufacturing and distribution oversight, quality and fulfillment\n• Revenue Systems: consultative selling, solution design, pipeline management, pricing and margin control\n• Leadership and Coaching: team leadership, manager development, culture building, change management, high-accountability coaching\n• Performance and Financials: KPI dashboards, capacity planning, P&L ownership, cash conversion cycle, unit economics\n• Communication: public speaking, workshop facilitation, client presentations, stakeholder alignment\n• Values and Judgment: broad perspective, practical judgment, ethical and social responsibility",
      social: {
        linkedin: "https://www.linkedin.com/in/trentlowenstein/",
        instagram: "https://instagram.com/your-handle/?hl=en"
      }
    },
    { 
      name: "Brigham Dickinson", 
      title: "President and Founder at Power Selling Pros", 
      image: "/placeholder.jpg",
      featured: false,
      bio: "Brigham Dickinson is president of Power Selling Pros. His firm is dedicated to teaching companies how to create \"WOW Culture\" inside their organization. With their proven call-handling certification program and high customer satisfaction, Brigham's company works with hundreds of home service companies in the United States, Canada & Australia.",
      social: {
        linkedin: "https://www.linkedin.com/in/brigham-dickinson",
        instagram: "https://instagram.com/your-handle/?hl=en"
      }
    },
    { 
      name: "Bill Rossell", 
      title: "Home Service Industry Leader", 
      image: "/placeholder.jpg",
      featured: false,
      bio: "Bill Rossell is a respected leader in the home service industry, bringing decades of hands-on experience and proven strategies for growing and scaling service businesses.",
      social: {}
    },
    { 
      name: "Thomas Howard", 
      title: "VP Customer Experience at ServiceTitan", 
      image: "/placeholder.jpg",
      featured: false,
      bio: "Experienced President and Serial Entrepreneur with a demonstrated history of working in the consumer services industry. Skilled in Business Forecasting and Planning, Marketing Strategy, Excel VBA, Lean Management, Leadership, and Business Management Training.",
      social: {
        linkedin: "https://www.linkedin.com/in/thomas-howard-80567417/"
      }
    }
  ];

  return (
    <section className="py-20 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            FEATURED SPEAKERS
          </h2>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Learn from home service industry leaders and business growth experts who will provide actionable insights and strategies to elevate your business.
          </p>
        </div>
        
        {/* All speakers - 2 columns on desktop */}
        <div ref={ref} className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {speakers.map((speaker, index) => (
            <div 
              key={index} 
              className="text-center group hover:transform hover:scale-105 transition-all duration-300 cursor-pointer"
              onMouseEnter={() => speaker.bio && setIsHovering(index)}
              onMouseLeave={() => setIsHovering(null)}
              onClick={() => speaker.bio && setSelectedSpeaker(index)}
            >
              <div className="relative mb-4 overflow-hidden rounded-2xl">
                <img 
                  src={speaker.image} 
                  alt={speaker.name}
                  className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {(speaker as any).keynote && (
                  <div className="absolute top-2 right-2 bg-primary text-white px-3 py-1.5 text-xs font-bold rounded-full">
                    KEYNOTE SPEAKER
                  </div>
                )}
                {speaker.featured && !(speaker as any).keynote && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">
                    HEADLINE
                  </div>
                )}
                {speaker.bio && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60">
                    <p className="text-white font-bold text-sm">Click for Bio</p>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white transition-colors duration-300 group-hover:text-red-400">
                {speaker.name}
              </h3>
              <p className="text-gray-300 text-sm mt-1">
                {speaker.title}
              </p>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <Button 
            size="lg" 
            onClick={handleTicketClick}
            className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-4 rounded-full text-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            SECURE MY SEAT
          </Button>
        </div>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
      
      {/* Ticket Modal */}
      <TicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {/* Speaker Bio Dialog */}
      <Dialog open={selectedSpeaker !== null} onOpenChange={() => setSelectedSpeaker(null)}>
        <DialogContent className="max-w-2xl bg-gray-900 border-primary/30">
          {selectedSpeaker !== null && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-primary">
                  {speakers[selectedSpeaker].name}
                </DialogTitle>
                <DialogDescription className="text-gray-300 text-base">
                  {speakers[selectedSpeaker].title}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <p className="text-gray-200 whitespace-pre-line leading-relaxed">
                  {speakers[selectedSpeaker].bio}
                </p>
                {speakers[selectedSpeaker].social && (
                  <div className="flex gap-4 mt-6 justify-center">
                    {speakers[selectedSpeaker].social?.instagram && (
                      <a
                        href={speakers[selectedSpeaker].social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
                      >
                        <Instagram className="w-5 h-5" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {speakers[selectedSpeaker].social?.linkedin && (
                      <a
                        href={speakers[selectedSpeaker].social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
                      >
                        <Linkedin className="w-5 h-5" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {speakers[selectedSpeaker].social && 'facebook' in speakers[selectedSpeaker].social && (
                      <a
                        href={(speakers[selectedSpeaker].social as any).facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
                      >
                        <Facebook className="w-5 h-5" />
                        <span>Facebook</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default SpeakerLineup;
```

## Sponsors.tsx

```tsx
// File: Sponsors.tsx
const Sponsors = () => {
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        {/* Event Sponsor */}
        <div className="text-center mb-12">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-6 font-semibold">Event Sponsor</p>
          <a 
            href="https://www.gosameday.com/standard-plumbing-leads" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white rounded-xl px-10 py-6 inline-block shadow-lg hover:shadow-xl transition-shadow duration-300"
          >
            <img 
              src="/placeholder.svg" 
              alt="Sameday" 
              className="h-16 md:h-20 mx-auto"
            />
          </a>
        </div>
        
        {/* Top Golf Sponsor */}
        <div className="text-center">
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-6 font-semibold">Top Golf Sponsor</p>
          <div className="bg-black border border-gray-700 rounded-xl px-10 py-6 inline-block">
            <img 
              src="/placeholder.jpg" 
              alt="Lokal Media House" 
              className="h-16 md:h-20 mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Sponsors;
```

## EventDetails.tsx

```tsx
// File: EventDetails.tsx

import { MapPin, Calendar, Clock } from "lucide-react";

const EventDetails = () => {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            EVENT DETAILS
          </h2>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 justify-center mb-12">
            <div className="flex flex-col items-center text-center">
              <div className="text-white p-3 rounded-lg bg-primary mb-4">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Location</h3>
                <p className="text-gray-300">Conference Center at Miller Campus</p>
                <p className="text-sm text-gray-400 mt-1">
                  9750 S 300 W, Sandy, UT 84070
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="text-white p-3 rounded-lg bg-primary mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Event Date & Time</h3>
                <p className="text-gray-300">February 10, 2026</p>
                <p className="text-sm text-gray-400 mt-1">8:00 AM - 5:00 PM</p>
              </div>
            </div>
          </div>
          
          {/* Pre-Event Activities */}
          <div className="space-y-6">
            {/* Shop Tour */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-2xl p-8">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <img 
                    src="/placeholder.jpg" 
                    alt="Any Hour Services Logo" 
                    className="w-40 md:w-48 h-auto"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-block bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">EXCLUSIVE PRE-EVENT</span>
                    <span className="inline-block bg-white text-black text-xs font-bold px-3 py-1 rounded-full">INCLUDED WITH ANY TICKET</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Shop Tour & Training at Any Hour</h3>
                  <p className="text-lg text-gray-300 mb-2">February 9, 2026 | 11:00 AM - 3:00 PM</p>
                  <p className="text-gray-400 mb-4">Orem, UT (~45 min from airport)</p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Tour one of the largest home service operations in Utah</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Operational walk-through & elite systems training</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Prime rib lunch included</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>See Standard Operating Procedures in action</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Top Golf */}
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Sponsor Logo */}
                <div className="flex-shrink-0 text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Sponsored by:</p>
                  <img 
                    src="/placeholder.jpg" 
                    alt="Lokal Media House" 
                    className="h-16 md:h-20 mx-auto"
                  />
                </div>
                {/* Event Details */}
                <div className="flex-1 text-center">
                  <h3 className="text-2xl font-bold text-white mb-3">Pre-Event Networking</h3>
                  <p className="text-xl text-gray-200 mb-2">Top Golf</p>
                  <p className="text-lg text-gray-300">February 9, 2026 | 6:00 PM - 8:00 PM</p>
                  <p className="text-sm text-gray-400 mt-3">Kick off the evening with networking and fun!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventDetails;
```

## EventLearning.tsx

```tsx
// File: EventLearning.tsx

import { TrendingUp, Users, Target, Lightbulb, Building, DollarSign } from 'lucide-react';

const EventLearning = () => {
  const learningTopics = [
    {
      title: "NEPQ Sales Framework:",
      description: "Master Jeremy Miner's revolutionary NEPQ methodology to close more deals with ease and authenticity.",
      icon: TrendingUp
    },
    {
      title: "Advanced Closing Strategies:",
      description: "Learn proven techniques to handle objections, build trust, and close high-ticket sales consistently.", 
      icon: Target
    },
    {
      title: "Sales Psychology Mastery:",
      description: "Understand the buyer's mindset and learn how to influence decisions through emotional intelligence.",
      icon: Users
    },
    {
      title: "Pricing & Value Presentation:",
      description: "Master the art of presenting premium pricing and communicating value that justifies your rates.",
      icon: DollarSign
    },
    {
      title: "Building Sales Systems:",
      description: "Create repeatable sales processes that scale your business and train your team for success.",
      icon: Building
    },
    {
      title: "Customer Retention:",
      description: "Turn one-time customers into lifelong clients who refer others and drive recurring revenue.",
      icon: Lightbulb
    }
  ];

  const eventImages = [
    {
      src: "/placeholder.jpg",
      alt: "Jeremy Miner presenting to engaged audience at sales training summit"
    },
    {
      src: "/placeholder.jpg", 
      alt: "Anthony Vizzari leading Q&A session at business event"
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            WHAT TO EXPECT
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-black">
            Learn from World-Class Sales Experts
          </h3>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Jeremy Miner, Anthony Vizzari & Jacob Reese deliver actionable sales strategies to close more deals and increase your revenue.
          </p>
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* Mobile: Topics first, Desktop: Images first */}
            <div className="lg:order-1 order-2 space-y-4 h-full flex flex-col">
              {eventImages.map((image, index) => (
                <div key={index} className="rounded-2xl overflow-hidden shadow-2xl flex-1">
                  <img 
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            
            {/* Mobile: Topics above images, Desktop: Topics on right */}
            <div className="lg:order-2 order-1 border-2 border-dashed border-primary rounded-2xl p-4 h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                {learningTopics.map((topic, index) => {
                  const IconComponent = topic.icon;
                  return (
                    <div key={index} className="bg-gray-100 rounded-xl p-4 border border-gray-300 flex flex-col text-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 mx-auto bg-primary">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {topic.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventLearning;
```

## FAQ.tsx

```tsx
// File: FAQ.tsx

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

const FAQ = () => {
  const [openItems, setOpenItems] = useState<string[]>([]);
  
  const faqs = [
    {
      question: "Who is this sales training designed for?",
      answer: "This elite sales training is specifically for Plumbing, HVAC, and Electrical professionals who are serious about mastering sales. Whether you're a technician looking to close more on every call, a sales professional wanting to level up, or a business owner scaling your team's performance, this intensive 1-day training delivers proven techniques to dramatically increase your close rates and revenue."
    },
    {
      question: "What ticket option is right for me?",
      answer: "General Admission includes full event access, event swag, lunch, snacks, coffee and drinks. VIP adds priority seating and access to speaker events. CEO includes everything in VIP plus an intimate dinner with the speakers and enhanced networking opportunities. Choose based on how deep you want to dive into sales mastery and networking."
    },
    {
      question: "What will I learn from Jeremy Miner, Anthony Vizzari, and Jacob Reese?",
      answer: "Master the complete NEPQ sales framework from Jeremy Miner, learn advanced closing psychology from Anthony Vizzari, and implement proven sales systems from Jacob Reese. This is intensive, focused sales training—not surface-level theory. You'll walk away with actionable frameworks, scripts, and psychology techniques to close high-ticket home service sales consistently."
    },
    {
      question: "What's included with my ticket?",
      answer: "All tickets include lunch, snacks, coffee and complementary drinks. General Admission gets you full event access and event swag. VIP adds priority seating and access to speaker events with VIP swag. CEO includes everything in VIP plus an exclusive dinner with the speakers where you can ask questions and network directly with the masters."
    },
    {
      question: "Why is this sales training different?",
      answer: "This isn't a generic business conference or networking event. It's a high-intensity day of deep-dive sales training from Jeremy Miner (creator of NEPQ methodology), Anthony Vizzari (master closer), and Jacob Reese (sales system architect). You'll learn the exact frameworks, scripts, and psychology used to close high-ticket home service sales consistently. Hosted by Standard Plumbing Supply, this is real sales mastery for the trades."
    },
    {
      question: "When and where is the sales training?",
      answer: "February 10, 2026, 8am-5pm at the Conference Center at Miller Campus in Sandy, Utah. This high-intensity sales training features Jeremy Miner, Anthony Vizzari, and Jacob Reese. Hosted by Standard Plumbing Supply."
    },
    {
      question: "How do I secure my spot?",
      answer: "Click any 'SECURE MY SEAT' button on this page to choose your ticket level and reserve your spot. Seats are limited because this is an intensive training environment, not a massive conference. This is for serious home service professionals ready to master sales and dramatically increase their close rates."
    }
  ];

  const handleValueChange = (value: string) => {
    setOpenItems(prev => 
      prev.includes(value) 
        ? prev.filter(item => item !== value) 
        : [...prev, value]
    );
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-red-100 rounded-full opacity-30 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-red-200 rounded-full opacity-30 blur-2xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-block mb-4">
            
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-black via-gray-600 to-red-600 bg-clip-text text-transparent leading-tight">
            Frequently Asked
            <br />
            <span className="text-primary">Questions</span>
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about The Home Service Sales Summit
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Accordion 
            type="multiple" 
            value={openItems} 
            onValueChange={(value) => {
              if (Array.isArray(value)) {
                setOpenItems(value);
              }
            }} 
            className="space-y-6"
          >
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`} 
                className="group border-0 bg-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <AccordionTrigger 
                  className="text-left px-8 py-6 hover:no-underline hover:bg-gray-100 transition-colors duration-200" 
                  onClick={() => handleValueChange(`item-${index}`)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg md:text-xl font-bold text-gray-900 pr-4 leading-relaxed">
                      {faq.question}
                    </span>
                    <div className="flex-shrink-0 ml-4">
                      {openItems.includes(`item-${index}`) ? (
                        <Minus className="h-6 w-6 text-red-500 transition-transform duration-200" />
                      ) : (
                        <Plus className="h-6 w-6 text-red-500 transition-transform duration-200 group-hover:scale-110" />
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-6 pt-0">
                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-gray-700 text-lg leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
```

## Footer.tsx

```tsx
// File: Footer.tsx

import { Button } from "@/components/ui/button";
import { useState } from 'react';
import TicketModal from './TicketModal';

interface FooterProps {
  scrollToForm?: boolean;
}

const Footer = ({ scrollToForm = false }: FooterProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTicketClick = () => {
    if (scrollToForm) {
      const element = document.getElementById('ticket-form');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <footer className="bg-black text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-12">
          <img 
            src="/placeholder.jpg" 
            alt="Standard Plumbing Supply" 
            className="h-20 mx-auto mb-8" 
          />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Don't miss this chance to learn, grow, and 
          <span className="text-primary"> DOMINATE </span>
          your industry!
        </h2>
        
        <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto">
          Join Jeremy Miner, Anthony Vizzari & Jacob Reese for an unforgettable day of elite sales training at the Home Service Sales Summit!
        </p>
        
        <p className="text-2xl font-bold mb-12 text-accent">
          February 10, 2026 - Sandy, UT
        </p>
        
        <Button 
          size="lg" 
          onClick={handleTicketClick} 
          className="bg-primary hover:bg-primary/90 text-white font-bold px-12 py-6 rounded-full text-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          SECURE MY SEAT
        </Button>
        
        {/* Sponsors */}
        <div className="mt-16 pt-12 border-t border-gray-800">
          {/* Event Sponsor */}
          <div className="mb-10">
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-6">Event Sponsor</p>
            <a 
              href="https://www.gosameday.com/standard-plumbing-leads" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white rounded-lg px-6 py-4 inline-block hover:shadow-lg transition-shadow duration-300"
            >
              <img 
                src="/placeholder.svg" 
                alt="Sameday" 
                className="h-10 mx-auto"
              />
            </a>
          </div>
          
          {/* Top Golf Sponsor */}
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-6">Top Golf Sponsor</p>
            <img 
              src="/placeholder.jpg" 
              alt="Lokal Media House" 
              className="h-16 mx-auto"
            />
          </div>
        </div>
        
        {/* White background section */}
        <div className="bg-white py-8 mt-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <a 
                href="/privacy-policy"
                className="text-gray-600 hover:text-gray-800 transition-colors underline text-lg font-semibold"
              >
                Privacy Policy
              </a>
            </div>
            
            {/* Copyright */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm">&copy; 2025 Standard Plumbing. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
      
      {/* Modal Component */}
      <TicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </footer>
  );
};

export default Footer;
```

## BackToTop.tsx

```tsx
// File: BackToTop.tsx

import { ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-primary hover:bg-primary/90"
        >
          <ChevronUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </>
  );
};

export default BackToTop;
```
$res_live_event_standard_plumbing_event_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/vsl-call-booking/anson-park-call-booking.md',
  $res_vsl_call_booking_anson_park_call_booking_md$
---
name: "Anson Park - Call Booking"
category: vsl-call-booking
company: "Anson Park Investing"
page_type: detail-booking
description: "Full investment detail page with booking. Investment deck, quick nav links, deal summary, overview, tax benefits, gallery with video, map, team, embedded booking calendar."
tags: [investment, detail, booking, deck, gallery, map, team]
---

# Page Source

```tsx
// File: Detail.tsx
import { useEffect, useState } from "react";
import { DetailExitIntentDialog } from "@/components/DetailExitIntentDialog";
import { PropertyVideoPlayer } from "@/components/PropertyVideoPlayer";
import { PropertyGallerySection } from "@/components/PropertyGallerySection";
import { WhyAbilene } from "@/components/WhyAbilene";
import { StargateSection } from "@/components/StargateSection";
import { TeamSection } from "@/components/TeamSection";
import { PropertyMapSection } from "@/components/PropertyMapSection";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Shield, CheckCircle2, FileText, Percent } from "lucide-react";

import exterior1 from "@/assets/placeholder.jpg";
import exterior2 from "@/assets/placeholder.jpg";
import pool from "@/assets/placeholder.jpg";
import poolArea from "@/assets/placeholder.jpg";
import clubhouse from "@/assets/placeholder.jpg";
import fitness from "@/assets/placeholder.jpg";
import courtyard from "@/assets/placeholder.jpg";
import volleyball from "@/assets/placeholder.jpg";
import leasingCenter from "@/assets/placeholder.jpg";
import sign from "@/assets/placeholder.jpg";
import kitchenDining from "@/assets/placeholder.jpg";
import bedroom from "@/assets/placeholder.jpg";
import bathroom from "@/assets/placeholder.jpg";
import kitchenLaundry from "@/assets/placeholder.jpg";
import mailroom from "@/assets/placeholder.jpg";

const Detail = () => {
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://your-form-provider.com/embed.js";
    script.async = true;
    if (!document.querySelector(`script[src="${script.src}"]`)) {
      document.body.appendChild(script);
    }
  }, []);

  // Progress bar animation for urgency
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 33) {
          clearInterval(interval);
          return 33;
        }
        return prev + 0.5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownExitIntent) {
        setExitIntentOpen(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitIntent]);

  const scrollToBooking = () => {
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const propertyImages = [
    { src: exterior1, alt: "Anson Park Exterior" },
    { src: exterior2, alt: "Anson Park Building" },
    { src: leasingCenter, alt: "Leasing Center" },
    { src: pool, alt: "Swimming Pool" },
    { src: poolArea, alt: "Pool Area" },
    { src: clubhouse, alt: "Clubhouse" },
    { src: fitness, alt: "Fitness Center" },
    { src: courtyard, alt: "Courtyard" },
    { src: volleyball, alt: "Volleyball Court" },
    { src: kitchenDining, alt: "Kitchen & Dining Area" },
    { src: kitchenLaundry, alt: "Kitchen & Living Room" },
    { src: bedroom, alt: "Bedroom" },
    { src: bathroom, alt: "Bathroom" },
    { src: mailroom, alt: "Mailroom" },
    { src: sign, alt: "Property Sign" },
  ];

  return (
    <main className="min-h-screen">
      <Navigation 
        variant="project"
        onProjectClick={scrollToBooking}
      />
      
      {/* Investment Deck Hero */}
      <section className="relative pt-32 pb-16 bg-gradient-to-b from-primary-dark to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              {/* Urgency Progress Bar */}
              <div className="max-w-2xl mx-auto mb-8 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-serif font-semibold text-foreground">Investment Interest</span>
                  <span className="font-semibold text-accent">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Gathering initial interest
                </p>
              </div>

              <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-primary mb-6 tracking-tight leading-tight">
                Complete Investment Details For<br />Anson Park Apartments
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium mb-6 max-w-3xl mx-auto">
                Explore comprehensive financials, property analysis, and investment terms for this 144-unit multifamily opportunity in Abilene, TX
              </p>
              
              {/* Quick Navigation Links */}
              <div className="mb-8 max-w-4xl mx-auto">
                <p className="text-sm font-semibold text-foreground mb-3">Quick Navigate To:</p>
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  {[
                    { label: "Deal Summary", id: "deal-summary" },
                    { label: "Investment Terms", id: "deal-overview" },
                    { label: "Tax Benefits", id: "tax-benefits" },
                    { label: "Property Gallery", id: "gallery" },
                    { label: "Location", id: "site-map" },
                    { label: "Why Abilene", id: "why-abilene" },
                    { label: "Team", id: "team" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium bg-white/10 hover:bg-accent hover:text-primary-dark text-foreground border border-border hover:border-accent rounded-lg transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button 
                size="lg"
                onClick={scrollToBooking}
                className="bg-accent hover:bg-accent-light text-primary-dark font-bold text-lg px-10 py-6 shadow-xl hover:shadow-2xl rounded-xl hover:scale-105 transition-all duration-300 border-0 mb-4"
              >
                Ready to Go? Lets Chat
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <div className="w-full bg-accent/10 border border-accent/20 rounded-t-2xl px-6 py-3 border-b-0">
              <p className="text-sm font-semibold text-accent text-center">Investment Deck - Click to Toggle Between Slides</p>
            </div>
            
            <Card className="overflow-hidden shadow-2xl border-2 border-border rounded-t-none rounded-b-2xl border-t-0">
              <div className="aspect-video w-full">
                <iframe
                  src="https://www.canva.com/design/DAGzWkDRl1M/oVjqWP4jf_0w4DuOJAPnvw/view?embed"
                  allowFullScreen
                  allow="fullscreen"
                  className="w-full h-full"
                  title="Anson Park Investment Deck"
                />
              </div>
            </Card>
          </div>
        </div>
        
        {/* Accredited Investor Info - Compact */}
        <div className="bg-muted/30 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold mb-3 text-primary text-center">Accredited Investor Requirements</h3>
                <p className="text-sm text-muted-foreground text-center">
                  This offering is exclusively for accredited investors. You must meet one of the following criteria: <span className="font-semibold text-foreground">Income:</span> $200,000+ annually ($300,000+ jointly) for the last two years, or <span className="font-semibold text-foreground">Net Worth:</span> $1,000,000+ excluding primary residence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="container mx-auto px-4 py-16 space-y-20">
        {/* Deal Summary */}
        <section id="deal-summary" className="max-w-6xl mx-auto scroll-mt-24">
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-block">
              <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight">Deal Summary</h2>
              <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full" />
            </div>
            <p className="text-xl text-muted-foreground font-medium mt-6">
              A compelling investment opportunity with exceptional returns
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 animate-slide-up">
            <Card className="p-12 bg-white border-2 border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                Investment Terms
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Minimum Investment", value: "$100,000" },
                  { label: "Hold Period", value: "5 Years" },
                  { label: "Preferred Return", value: "6%", highlight: true },
                  { label: "Equity Split", value: "70/30" },
                  { label: "Distribution Timing", value: "Quarterly" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className={`font-bold text-2xl ${item.highlight ? 'text-accent' : 'text-foreground'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-12 bg-gradient-to-br from-accent/10 to-accent/20 border-2 border-accent/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-accent/30 rounded-xl">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                Projected Returns
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Total ROI", value: "2.3X" },
                  { label: "Average Annual Return", value: "27%" },
                  { label: "IRR", value: "21%+" },
                  { label: "Cash-on-Cash Return", value: "8-10%" },
                  { label: "Exit Cap Rate", value: "6.5%" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-bold text-2xl text-accent">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>



        {/* Deal Overview */}
        <section id="deal-overview" className="max-w-6xl mx-auto">
          <Card className="p-10 bg-white border-2 border-border shadow-xl">
            <h2 className="font-serif text-4xl font-bold mb-8 text-primary">Deal Overview</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Acquisition Price</div>
                <div className="text-2xl font-bold">$8.5M</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Total Units</div>
                <div className="text-2xl font-bold">144 Units</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Year Built</div>
                <div className="text-2xl font-bold">2006</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Location</div>
                <div className="text-2xl font-bold">Abilene, TX</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Asset Class</div>
                <div className="text-2xl font-bold">B+ / LIHTC</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Strategy</div>
                <div className="text-2xl font-bold">Long-Term Hold</div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-primary">
                <FileText className="h-5 w-5 text-primary" />
                Qualified Contract Strategy
              </h3>
              <p className="text-muted-foreground mb-4">
                This is a currently stabilized asset with a LURA (Land Use Restriction Agreement) in place restricting income. We are using a <strong>"Qualified Contract"</strong> to exit this program early in the next few years.
              </p>
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/30">
                <p className="font-semibold text-foreground">
                  This will remove all rental restrictions and massively increase the value of the property.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Tax Benefits & Special Programs */}
        <section id="tax-benefits" className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-10 bg-white border-2 border-border shadow-xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-primary">
                <Percent className="h-5 w-5 text-success" />
                50% Property Tax Reduction
              </h3>
              <p className="text-muted-foreground mb-4">
                We partner with a CHDO (Community Housing Development Organization) to receive a tax abatement for <strong>50% property tax reduction</strong>.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Reinvestment Commitment:</strong> In exchange, we are required to reinvest $5,000 per unit every 3 years for a <strong>$720,000 renovation budget</strong> that continually enhances the property.
                </p>
              </div>
            </Card>

            <Card className="p-10 bg-white border-2 border-border shadow-xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-primary">
                <TrendingUp className="h-5 w-5 text-success" />
                Tax Benefits for Investors
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Standard Depreciation</strong> for 144-unit residential asset</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Option to accelerate depreciation</strong> via Cost Segregation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Distributions are passive income</strong> often offset by depreciation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Long-term Capital Gains</strong> on sale</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Option for 1031 Exchange</strong> on exit</span>
                </li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Full Property Gallery */}
        <section id="gallery" className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 md:auto-rows-min gap-4">
            {/* Video Reel - First column, spans 2 rows */}
            <div className="md:row-span-2 aspect-[9/16] md:aspect-auto rounded-xl overflow-hidden md:self-stretch">
              <PropertyVideoPlayer />
            </div>
            
            {/* Header above first row of images */}
            <div className="md:col-span-2">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-primary">Complete Property Gallery</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {propertyImages.slice(0, 2).map((image, index) => (
                  <div key={index} className="aspect-[4/3] overflow-hidden rounded-xl shadow-lg bg-muted">
                    <img 
                      src={image.src} 
                      alt={image.alt}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Remaining images in second row */}
            {propertyImages.slice(2, 4).map((image, index) => (
              <div key={index + 2} className="aspect-[4/3] overflow-hidden rounded-xl shadow-lg bg-muted">
                <img 
                  src={image.src} 
                  alt={image.alt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
            
            {/* Rest of the images in a standard 3-column grid */}
            {propertyImages.slice(4).map((image, index) => (
              <div key={index + 4} className="aspect-[4/3] overflow-hidden rounded-xl shadow-lg bg-muted">
                <img 
                  src={image.src} 
                  alt={image.alt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
            
            {/* CTA Card */}
            <Card className="aspect-[4/3] p-6 bg-gradient-to-br from-accent/20 to-accent/10 border-2 border-accent/40 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-primary">Ready to Add This to Your Portfolio?</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Let's connect and discuss this opportunity
                </p>
              </div>
              <Button 
                onClick={scrollToBooking}
                size="lg"
                className="bg-accent hover:bg-accent-light text-primary-dark font-bold text-sm md:text-base px-6 py-4 shadow-xl hover:shadow-2xl rounded-xl hover:scale-105 transition-all duration-300 border-0 w-full mt-4"
              >
                Let's Connect
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>
        </section>

        <PropertyMapSection />

        <WhyAbilene onConnect={scrollToBooking} />
        
        <StargateSection />

        <div id="team">
          <TeamSection />
        </div>


        {/* CTA Section with Embedded Calendar */}
        <section id="booking" className="max-w-5xl mx-auto scroll-mt-24 animate-fade-in">
          <div className="p-6 sm:p-10 md:p-16 lg:p-20 text-white shadow-luxury rounded-3xl relative overflow-hidden border-2 border-accent/30" style={{ background: 'linear-gradient(135deg, hsl(200 50% 12%) 0%, hsl(200 45% 20%) 100%)' }}>
            <div className="relative z-10">
              <div className="text-center mb-8 md:mb-10">
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                  Ready to Discuss This Opportunity?
                </h2>
                <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full max-w-md mx-auto" />
              </div>
              <p className="text-base sm:text-lg md:text-xl mb-8 md:mb-10 text-white leading-relaxed text-center max-w-3xl mx-auto px-4">
                Schedule a consultation with our investment team to learn more about becoming a partner on Anson Park. We'll walk you through the complete offering memorandum, pro formas, and answer all your questions.
              </p>
              
              {/* Embedded Calendar */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="w-full h-[800px] overflow-auto">
                  <iframe
                    src="https://your-booking-provider.com/embed/YOUR_CALENDAR_ID"
                    className="w-full h-full pointer-events-auto"
                    style={{ minHeight: '800px' }}
                    frameBorder="0"
                    title="Book a Consultation"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <DetailExitIntentDialog open={exitIntentOpen} onOpenChange={setExitIntentOpen} />
    </main>
  );
};

export default Detail;

```

$res_vsl_call_booking_anson_park_call_booking_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/vsl-call-booking/anson-park-lead-magnet.md',
  $res_vsl_call_booking_anson_park_lead_magnet_md$
---
name: "Anson Park - Info Request"
category: vsl-call-booking
company: "Anson Park Investing"
page_type: lead-magnet
description: "Investment info request page. Two-column: left has headline, metrics (some locked/blurred), photos; right has GHL form with accredited investor toggle. Exit intent."
tags: [lead-magnet, info-request, two-column, metrics, locked-content]
---

# Page Source

```tsx
// File: Info.tsx
import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { MetricCard } from "@/components/MetricCard";
import { ExitIntentDialog } from "@/components/ExitIntentDialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Lock } from "lucide-react";
import exterior1 from "@/assets/placeholder.jpg";
import pool from "@/assets/placeholder.jpg";
import courtyard from "@/assets/placeholder.jpg";

const InfoPage = () => {
  const [isAccredited, setIsAccredited] = useState(true);
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const [formHighlight, setFormHighlight] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the embed script if it hasn't been loaded yet
    if (!document.querySelector('script[src="https://your-form-provider.com/embed.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://your-form-provider.com/embed.js';
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }

    // Exit intent detection
    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when mouse leaves from top of viewport
      if (e.clientY <= 0 && !hasShownExitIntent) {
        setExitIntentOpen(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitIntent]);

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Trigger gentle highlight animation
      setTimeout(() => {
        setFormHighlight(true);
        setTimeout(() => setFormHighlight(false), 2000);
      }, 500);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-[var(--gradient-subtle)]">
        <Navigation variant="info" onInfoClick={scrollToForm} />
        
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-6xl mx-auto">
            {/* 2-Column Layout */}
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left Column - Headlines & Metrics */}
              <div className="space-y-8">

                <div>
                  <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 tracking-tight">
                    Exclusive Access to Anson Park Investment
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    144-unit multifamily property in Abilene, TX with institutional-grade returns for accredited investors
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard 
                    label="Preferred Returns"
                    value="6%"
                    highlight
                  />
                  <MetricCard 
                    label="Projected IRR"
                    value="21%+"
                  />
                  <MetricCard 
                    label="Avg Annual Returns"
                    value="27%"
                    locked
                  />
                  <MetricCard 
                    label="Total ROI (5yr)"
                    value="2.3X"
                    locked
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="aspect-square rounded-lg overflow-hidden">
                      <img 
                        src={exterior1}
                        alt="Anson Park Exterior"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden">
                      <img 
                        src={pool}
                        alt="Pool Area"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer">
                      <img 
                        src={courtyard}
                        alt="Courtyard"
                        className="w-full h-full object-cover blur-md"
                      />
                      <div className="absolute inset-0 bg-primary-dark/70 flex flex-col items-center justify-center">
                        <Lock className="h-6 w-6 text-accent mb-1" />
                        <span className="text-xs font-semibold text-white text-center px-2">Submit Form to Unlock</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form */}
              <div className="space-y-6">
                <div 
                  ref={formRef}
                  className={`bg-card border border-border rounded-2xl p-6 shadow-xl transition-all duration-500 ${
                    formHighlight ? 'ring-4 ring-accent/50 shadow-2xl shadow-accent/20 animate-[gentle-highlight_1s_ease-in-out_2]' : ''
                  }`}
                  style={formHighlight ? { animation: 'gentle-highlight 1s ease-in-out 2' } : undefined}
                >
                  <h2 className="font-serif text-2xl font-bold mb-4">Request Full Details</h2>
                  <p className="text-muted-foreground mb-6">
                    Get complete financials, property analysis, and investment memorandum
                  </p>

                  {/* Accredited Investor Toggle */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="accredited-toggle" className="text-sm font-semibold cursor-pointer">
                          I'm an accredited investor
                        </Label>
                        <Tooltip defaultOpen={false}>
                          <TooltipTrigger asChild>
                            <button 
                              type="button" 
                              className="inline-flex" 
                              aria-label="Accredited investor information"
                              onFocus={(e) => e.currentTarget.blur()}
                              tabIndex={-1}
                            >
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-4 z-[100]" side="bottom" sideOffset={8} align="center">
                            <div className="space-y-3 text-sm">
                              <p className="font-semibold">Option A - Income Test:</p>
                              <p>Earned $200,000 or more per year (or $300,000 jointly with a spouse or spousal equivalent) in each of the last two years, AND reasonably expects to earn the same this year.</p>
                              <p className="font-semibold pt-2">Option B - Net Worth Test:</p>
                              <p>Has a net worth over $1,000,000, excluding the value of their primary residence.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch 
                        id="accredited-toggle"
                        checked={isAccredited}
                        onCheckedChange={setIsAccredited}
                      />
                    </div>
                  </div>

                  {!isAccredited ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        We apologize, but this investment opportunity is only available to accredited investors 
                        as required by SEC regulations.
                      </p>
                    </div>
                  ) : (
                    <div key={isAccredited ? "accredited-form" : "form-hidden"}>
                      <iframe
                        key="accredited-investor-form"
                        src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                        style={{ width: '100%', height: '520px', border: 'none', borderRadius: '8px' }}
                        id="inline-YOUR_FORM_ID"
                        data-layout="{'id':'INLINE'}"
                        data-trigger-type="alwaysShow"
                        data-trigger-value=""
                        data-activation-type="alwaysActivated"
                        data-activation-value=""
                        data-deactivation-type="neverDeactivate"
                        data-deactivation-value=""
                        data-form-name="Capital Raising V1 - Request Info Form"
                        data-height="490"
                        data-layout-iframe-id="YOUR_FORM_ID"
                        data-form-id="YOUR_FORM_ID"
                        title="Capital Raising V1 - Request Info Form"
                      />
                      <p className="text-xs text-muted-foreground text-center mt-4 mb-6 leading-relaxed px-2">
                        By submitting this form, you agree to be contacted by phone, email, SMS, or other forms of communication regarding this investment opportunity. You also agree to our{" "}
                        <a href="/privacy" className="text-accent hover:text-accent-light underline" target="_blank" rel="noopener noreferrer">
                          Privacy Policy
                        </a>
                        {" "}and{" "}
                        <a href="/terms" className="text-accent hover:text-accent-light underline" target="_blank" rel="noopener noreferrer">
                          Terms of Service
                        </a>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
        
        <ExitIntentDialog 
          open={exitIntentOpen}
          onOpenChange={setExitIntentOpen}
        />
      </div>
    </TooltipProvider>
  );
};

export default InfoPage;

```

$res_vsl_call_booking_anson_park_lead_magnet_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/vsl-call-booking/anson-park-pre-call.md',
  $res_vsl_call_booking_anson_park_pre_call_md$
---
name: "Anson Park - Pre-Call"
category: vsl-call-booking
company: "Anson Park Investing"
page_type: pre-call
description: "Investment pre-call page. 4 steps: check email, review details, prepare questions, meet team. Team photos with social links. Call expectations with agenda."
tags: [pre-call, confirmation, steps, team, checklist]
---

# Page Source

```tsx
// File: PreCall.tsx
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Mail, Calendar, FileText, Users, Instagram, Linkedin } from "lucide-react";
import calendarInvite from "@/assets/placeholder.jpg";
import toddRobinson from "@/assets/placeholder.jpg";
import calebHommell from "@/assets/placeholder.jpg";
import christianOsgood from "@/assets/placeholder.jpg";

const PreCall = () => {
  return (
    <main className="min-h-screen">
      <Navigation variant="pre-call" />
      
      <div className="container mx-auto px-4 py-32">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/20 rounded-full mb-6">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              You're All Set!
            </h1>
            <p className="text-xl text-muted-foreground">
              Your consultation is scheduled. Here's what to expect next.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-8 mb-16">
            {/* Step 1 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">1</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <Mail className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Check Your Email</h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-center md:text-left">
                    A calendar invite has been sent to your email address. Look for an invitation that looks like this:
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <img 
                      src={calendarInvite} 
                      alt="Calendar Invite Example" 
                      className="w-full rounded-lg shadow-md"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    <strong>Important:</strong> Accept the calendar invite to add it to your schedule and receive the Google Meet link.
                  </p>
                </div>
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">2</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Review the Investment Details</h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-center md:text-left">
                    Before the call, we recommend reviewing the key investment details:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Property location and specifications (144 units in Abilene, TX)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Investment terms (6% preferred return, 5-year hold period)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Projected returns (21%+ IRR, 2.3X total ROI)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Tax benefits and LIHTC/Qualified Contract strategy</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">3</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <Calendar className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Prepare Your Questions</h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-center md:text-left">
                    We'll cover everything in detail, but feel free to prepare any specific questions about:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Investment process and timeline</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Distribution schedule and reporting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Property management and operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Exit strategy and market outlook</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Step 4 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">4</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <Users className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Meet Your Investment Team</h2>
                  </div>
                  <p className="text-muted-foreground mb-6 text-center md:text-left">
                    You'll be speaking with our experienced team who will guide you through this opportunity:
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-2 border-accent/30">
                        <img src={christianOsgood} alt="Todd Robinson" className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold text-primary mb-2">Todd Robinson</h3>
                      <div className="flex gap-3 justify-center">
                        <a 
                          href="https://instagram.com/your-handle"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Todd Robinson's Instagram"
                        >
                          <Instagram size={20} />
                        </a>
                        <a 
                          href="https://www.linkedin.com/in/toddnrobinson/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Todd Robinson's LinkedIn"
                        >
                          <Linkedin size={20} />
                        </a>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-2 border-accent/30">
                        <img src={toddRobinson} alt="Caleb Hommell" className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold text-primary mb-2">Caleb Hommell</h3>
                      <div className="flex gap-3 justify-center">
                        <a 
                          href="https://instagram.com/your-handle"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Caleb Hommell's Instagram"
                        >
                          <Instagram size={20} />
                        </a>
                        <a 
                          href="https://www.linkedin.com/in/caleb-hommel-4b220421a/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Caleb Hommell's LinkedIn"
                        >
                          <Linkedin size={20} />
                        </a>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-2 border-accent/30">
                        <img src={calebHommell} alt="Christian Osgood" className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold text-primary mb-2">Christian Osgood</h3>
                      <div className="flex gap-3 justify-center">
                        <a 
                          href="https://instagram.com/your-handle"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Christian Osgood's Instagram"
                        >
                          <Instagram size={20} />
                        </a>
                        <a 
                          href="https://www.linkedin.com/in/christian-osgood-10a95b71"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Christian Osgood's LinkedIn"
                        >
                          <Linkedin size={20} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* What to Expect Section */}
          <Card className="p-10 bg-gradient-to-br from-accent/10 to-accent/20 border-2 border-accent/30">
            <h2 className="text-3xl font-bold text-primary mb-6 text-center">What to Expect on the Call</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">Duration:</strong> Approximately 30-45 minutes
              </p>
              <p>
                <strong className="text-foreground">Format:</strong> Video call via Zoom (link in calendar invite)
              </p>
              <p>
                <strong className="text-foreground">Agenda:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Introduction and overview of the Anson Park opportunity</li>
                <li>Detailed walkthrough of financials and projections</li>
                <li>Discussion of the LIHTC program and Qualified Contract strategy</li>
                <li>Q&A session for your specific questions</li>
                <li>Next steps and investment process overview</li>
              </ul>
              <div className="mt-6 p-4 bg-white/50 rounded-lg">
                <p className="text-sm">
                  <strong className="text-foreground">Need to reschedule?</strong> Simply reply to the calendar invite or email us directly. We're flexible and happy to find a time that works for you.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default PreCall;

```

$res_vsl_call_booking_anson_park_pre_call_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/vsl-call-booking/brrr-guys-application.md',
  $res_vsl_call_booking_brrr_guys_application_md$
---
name: "BRR Guys - Application Page"
category: vsl-call-booking
company: "The BRR Guys"
page_type: application
description: "Multi-step application questionnaire before call booking. 8 qualifying questions with auto-advance, progress bar, data persistence, then embedded GHL calendar."
tags: [application, questionnaire, multi-step, qualifying, calendar-embed]
---

# Page Source

```tsx
// File: Book.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import logo from "@/assets/placeholder.jpg";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { ExitIntentPopupApp } from "@/components/ExitIntentPopupApp";
import { useUtmParams } from "@/hooks/useUtmParams";
import { usePageTracking } from "@/hooks/usePageTracking";
import { trackApplicationEvent } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  workSituation: string;
  experience: string;
  financial: string;
  familiarity: string;
  obstacle: string;
  goal: string;
  action: string;
  why: string;
}

const Book = () => {
  const { utmQueryString } = useUtmParams();
  console.log('📄 Book.tsx - UTM Query String:', utmQueryString);
  console.log('📄 Book.tsx - localStorage:', localStorage.getItem('brrrr_utm_params'));
  const sessionId = usePageTracking(); // Track page view and get unified session ID
  const [step, setStep] = useState(1);
  const totalSteps = 9;
  const isAdvancing = useRef(false);
  const hasTrackedStart = useRef(false);
  const [formData, setFormData] = useState<FormData>({
    workSituation: "",
    experience: "",
    financial: "",
    familiarity: "",
    obstacle: "",
    goal: "",
    action: "",
    why: "",
  });

  const trackedSteps = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Track application started on first render
    if (!hasTrackedStart.current) {
      trackApplicationEvent(0, { event: 'application_started' });
      hasTrackedStart.current = true;
    }

    // Load the calendar embed script
    const script = document.createElement('script');
    script.src = 'https://your-form-provider.com/embed.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Track when user views each question step
  useEffect(() => {
    if (!trackedSteps.current.has(step)) {
      trackedSteps.current.add(step);
      trackApplicationEvent(step, { event: `question_${step}_view` });
    }
  }, [step]);


  // Save partial progress to database
  const savePartialProgress = async (field: keyof FormData, value: string) => {
    if (!sessionId) return;
    
    // Map form field to database column
    const fieldMapping: Record<keyof FormData, string> = {
      workSituation: 'work_situation',
      experience: 'experience',
      financial: 'financial',
      familiarity: 'familiarity',
      obstacle: 'obstacle',
      goal: 'goal',
      action: 'action',
      why: 'why',
    };
    
    const dbField = fieldMapping[field];
    if (!dbField) return;
    
    // Get UTM params for initial save
    const storedUtms = localStorage.getItem('brrrr_utm_params');
    let utmData: Record<string, string> = {};
    if (storedUtms) {
      try {
        utmData = JSON.parse(storedUtms);
      } catch (e) {
        console.error('Error parsing stored UTMs:', e);
      }
    }
    
    // Get preserved lead info
    const preservedLeadInfo = {
      first_name: localStorage.getItem('brrrr_first_name') || null,
      last_name: localStorage.getItem('brrrr_last_name') || null,
      email: localStorage.getItem('brrrr_email') || null,
      phone: localStorage.getItem('brrrr_phone') || null,
    };
    
    try {
      const { error } = await supabase.from('questionnaire_responses').upsert({
        session_id: sessionId,
        [dbField]: value,
        // Include UTM params and lead info on every update
        ...(preservedLeadInfo.first_name && { first_name: preservedLeadInfo.first_name }),
        ...(preservedLeadInfo.last_name && { last_name: preservedLeadInfo.last_name }),
        ...(preservedLeadInfo.email && { email: preservedLeadInfo.email }),
        ...(preservedLeadInfo.phone && { phone: preservedLeadInfo.phone }),
        utm_source: utmData.utm_source || null,
        utm_medium: utmData.utm_medium || null,
        utm_campaign: utmData.utm_campaign || null,
        utm_content: utmData.utm_content || null,
        utm_term: utmData.utm_term || null,
        referrer: document.referrer || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_id' });
      
      if (error) {
        console.error('Error saving partial progress:', error);
      } else {
        console.log(`📝 Saved partial progress: ${field} = ${value}`);
      }
    } catch (err) {
      console.error('Error saving partial progress:', err);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Track step completion
    trackApplicationEvent(step, { field, value });
    
    // Save partial progress to database immediately
    savePartialProgress(field, value);
    
    // Auto-advance to next step after selection for radio options (except textarea)
    // Use ref to prevent multiple advances if user clicks quickly or events fire twice
    if (field !== 'why' && step < totalSteps && !isAdvancing.current) {
      isAdvancing.current = true;
      setTimeout(() => {
        setStep((prev) => prev + 1);
        isAdvancing.current = false;
      }, 400);
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.workSituation) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 2:
        if (!formData.experience) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 3:
        if (!formData.financial) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 4:
        if (!formData.familiarity) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 5:
        if (!formData.obstacle) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 6:
        if (!formData.goal) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 7:
        if (!formData.action) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 8:
        if (!formData.why || formData.why.trim().length < 10) {
          toast.error("Please provide a detailed answer (at least 10 characters)");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    
    // Save form data to localStorage and database at step 8
    if (step === 8) {
      const formNotes = `Work Situation: ${formData.workSituation}\n\nReal Estate Experience: ${formData.experience}\n\nFinancial Readiness: ${formData.financial}\n\nBRRRR Familiarity: ${formData.familiarity}\n\nBiggest Obstacle: ${formData.obstacle}\n\nPrimary Goal: ${formData.goal}\n\nTimeline: ${formData.action}\n\nWhy Real Estate Matters:\n${formData.why}`;
      
      localStorage.setItem('brrrr_form_responses', formNotes);
      localStorage.setItem('brrrr_form_data', JSON.stringify(formData));
      console.log('📋 Form data saved to localStorage');

      // Save to database with session_id
      if (sessionId) {
        console.log('💾 Saving questionnaire to database with session_id:', sessionId);
        console.log('📊 Form data to save:', formData);
        
        // Get UTM params from localStorage
        const storedUtms = localStorage.getItem('brrrr_utm_params');
        let utmData: Record<string, string> = {};
        if (storedUtms) {
          try {
            utmData = JSON.parse(storedUtms);
            console.log('📊 UTM data to save:', utmData);
          } catch (e) {
            console.error('❌ Error parsing stored UTMs:', e);
          }
        }

        // Get preserved lead info from localStorage (captured from /info page redirect)
        const preservedLeadInfo = {
          first_name: localStorage.getItem('brrrr_first_name') || null,
          last_name: localStorage.getItem('brrrr_last_name') || null,
          email: localStorage.getItem('brrrr_email') || null,
          phone: localStorage.getItem('brrrr_phone') || null,
        };
        console.log('📊 Preserved lead info:', preservedLeadInfo);
        
        try {
          const { error } = await supabase.from('questionnaire_responses').upsert({
            session_id: sessionId,
            // Survey responses
            work_situation: formData.workSituation,
            experience: formData.experience,
            financial: formData.financial,
            familiarity: formData.familiarity,
            obstacle: formData.obstacle,
            goal: formData.goal,
            action: formData.action,
            why: formData.why,
            // Preserve lead contact info (don't overwrite with null if already exists)
            ...(preservedLeadInfo.first_name && { first_name: preservedLeadInfo.first_name }),
            ...(preservedLeadInfo.last_name && { last_name: preservedLeadInfo.last_name }),
            ...(preservedLeadInfo.email && { email: preservedLeadInfo.email }),
            ...(preservedLeadInfo.phone && { phone: preservedLeadInfo.phone }),
            // UTM params
            utm_source: utmData.utm_source || null,
            utm_medium: utmData.utm_medium || null,
            utm_campaign: utmData.utm_campaign || null,
            utm_content: utmData.utm_content || null,
            utm_term: utmData.utm_term || null,
            referrer: document.referrer || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id'
          });

          if (error) {
            console.error('❌ Database error:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            toast.error(`Failed to save: ${error.message}`);
            return; // Don't advance to next step if save fails
          } else {
            console.log('✅ Questionnaire saved successfully');
            // Track survey completed (even if they don't book a call, we have their data)
            trackApplicationEvent(8, { event: 'survey_completed' });
            trackApplicationEvent(8, { event: 'application_completed' });
          }
        } catch (err) {
          console.error('❌ Unexpected error:', err);
          toast.error('An unexpected error occurred');
          return;
        }
      } else {
        console.error('❌ No session ID found!');
        toast.error('Session error - please refresh the page');
        return;
      }
    }
    
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const getStepTitle = () => {
    if (step === totalSteps) return "Schedule Your Call";
    return `Question ${step} of ${totalSteps - 1}`;
  };

  const getProgressPercentage = () => {
    return ((step - 1) / (totalSteps - 1)) * 100;
  };

  return (
    <div className="min-h-screen bg-background">
      <ExitIntentPopupApp />
      <div className="bg-background py-4">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="bg-background rounded-lg px-6 py-2">
            <img src={logo} alt="BRRRR in 90" className="h-12 md:h-14" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Headline */}
        <div className="text-center mb-8 md:mb-12 space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            Ready To Close Your First (Or Next) BRRRR Deal In{" "}
            <span className="text-primary">The Next 90 Days?</span>
          </h1>
          <p className="text-xl md:text-2xl font-bold text-foreground">
            Complete This Quick Assessment To See If You Qualify For A Strategy Call
          </p>
        </div>

        <div className="mb-6 md:mb-8">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        <Card className="p-6 md:p-8 animate-fade-in">
          {step === 1 && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">What best describes your current work situation?</h2>
                <p className="text-xs md:text-sm text-muted-foreground">This helps us understand your availability and resources</p>
              </div>

              <RadioGroup value={formData.workSituation}>
                {["Full-time employee", "Self-employed / business owner", "Real estate agent", "Part-time / side-hustle income", "Not currently working"].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-3 md:p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("workSituation", option)}
                  >
                    <RadioGroupItem value={option} id={`work-${option}`} />
                    <Label htmlFor={`work-${option}`} className="font-normal cursor-pointer flex-1 text-sm md:text-base">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">How much real estate investing experience do you have?</h2>
                <p className="text-sm text-muted-foreground">Be honest - we work with investors at all levels</p>
              </div>

              <RadioGroup value={formData.experience}>
                {["I've never done a deal before", "I've analyzed deals but haven't bought anything yet", "I've bought 1–2 rentals", "I've bought 3–5 rentals", "I own 6+ rental properties"].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("experience", option)}
                  >
                    <RadioGroupItem value={option} id={`exp-${option}`} />
                    <Label htmlFor={`exp-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">What best describes your current financial readiness to invest in a BRRRR deal?</h2>
                <p className="text-sm text-muted-foreground">This helps us tailor our guidance to your situation</p>
              </div>

              <RadioGroup value={formData.financial}>
                {[
                  "I have $50k+ saved and ready to invest",
                  "I have $20k–$50k available",
                  "I have under $20k but I'm working on saving more",
                  "I don't have much saved yet, but I have strong income or credit",
                  "I'm still learning and want to understand funding options"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("financial", option)}
                  >
                    <RadioGroupItem value={option} id={`fin-${option}`} />
                    <Label htmlFor={`fin-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">How familiar are you with the BRRRR strategy?</h2>
                <p className="text-sm text-muted-foreground">Be honest - we'll meet you where you are</p>
              </div>

              <RadioGroup value={formData.familiarity}>
                {[
                  "I understand it well and I'm ready to start doing deals",
                  "I know the basics but need help with the execution",
                  "I've heard of it but don't fully understand how it works",
                  "This is brand new to me"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("familiarity", option)}
                  >
                    <RadioGroupItem value={option} id={`fam-${option}`} />
                    <Label htmlFor={`fam-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">What's the biggest obstacle keeping you from closing your next (or first) BRRRR deal?</h2>
                <p className="text-sm text-muted-foreground">Understanding your challenge helps us help you</p>
              </div>

              <RadioGroup value={formData.obstacle}>
                {[
                  "Finding the right property / deal analysis",
                  "Securing financing / funding the deal",
                  "Managing the rehab / finding contractors",
                  "Understanding the refinance process",
                  "Not sure where to start / need a clear roadmap"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("obstacle", option)}
                  >
                    <RadioGroupItem value={option} id={`obs-${option}`} />
                    <Label htmlFor={`obs-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">What's your primary goal with BRRRR investing?</h2>
                <p className="text-sm text-muted-foreground">This helps us understand what success looks like for you</p>
              </div>

              <RadioGroup value={formData.goal}>
                {[
                  "Build long-term passive income / cash flow",
                  "Grow a rental portfolio quickly",
                  "Build wealth / equity to retire early",
                  "Replace my W-2 income with real estate",
                  "Learn a strategy I can repeat over and over"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("goal", option)}
                  >
                    <RadioGroupItem value={option} id={`goal-${option}`} />
                    <Label htmlFor={`goal-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">If we could help you close a BRRRR deal in the next 90 days, how quickly would you take action?</h2>
                <p className="text-sm text-muted-foreground">Understanding your timeline helps us prioritize your success</p>
              </div>

              <RadioGroup value={formData.action}>
                {[
                  "I'd start immediately—I'm all in",
                  "I'd start within a few weeks once I line everything up",
                  "I'd need a month or two to prepare",
                  "I'm still exploring, but I want to learn more"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("action", option)}
                  >
                    <RadioGroupItem value={option} id={`action-${option}`} />
                    <Label htmlFor={`action-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Why is building financial freedom through real estate important to you right now?</h2>
                <p className="text-sm text-muted-foreground">Share your story - this helps us understand your motivation</p>
              </div>

              <Textarea
                value={formData.why}
                onChange={(e) => updateFormData("why", e.target.value)}
                placeholder="Tell us about your goals, dreams, and why this matters to you..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">{formData.why.length} characters</p>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Last Step: Schedule a 15-Minute Call to Learn More</h2>
                <p className="text-muted-foreground">Based on your answers, you could be a strong candidate for our program. Let's discuss your goals and how we can help.</p>
              </div>

              {(() => {
                const redirectUrl = `https://brrrrin90.lovable.app/pre-call${utmQueryString ? `?${utmQueryString}` : ''}`;
                const baseUrl = "https://your-booking-provider.com/embed/YOUR_CALENDAR_ID";
                const params = new URLSearchParams();
                
                // Add redirect URL
                params.append('redirect', redirectUrl);
                
                // Add form data as custom parameters
                if (formData.workSituation) params.append('q1_work_situation', formData.workSituation);
                if (formData.experience) params.append('q2_experience', formData.experience);
                if (formData.financial) params.append('q3_financial', formData.financial);
                if (formData.familiarity) params.append('q4_familiarity', formData.familiarity);
                if (formData.obstacle) params.append('q5_obstacle', formData.obstacle);
                if (formData.goal) params.append('q6_goal', formData.goal);
                if (formData.action) params.append('q7_action', formData.action);
                if (formData.why) params.append('q8_why', formData.why);
                
                // Add UTM parameters
                if (utmQueryString) {
                  const utmParams = new URLSearchParams(utmQueryString);
                  utmParams.forEach((value, key) => {
                    params.append(key, value);
                  });
                }
                
                const iframeUrl = `${baseUrl}?${params.toString()}`;
                
                console.log('📅 GHL Calendar iframe URL being generated');
                console.log('🧪 Questionnaire parameters being passed:', {
                  q1_work_situation: formData.workSituation,
                  q2_experience: formData.experience,
                  q3_financial: formData.financial,
                  q4_familiarity: formData.familiarity,
                  q5_obstacle: formData.obstacle,
                  q6_goal: formData.goal,
                  q7_action: formData.action,
                  q8_why: formData.why?.substring(0, 50) + '...'
                });
                console.log('📅 Redirect URL:', redirectUrl);
                console.log('📅 UTM params from hook:', utmQueryString || 'none');
                console.log('📅 All iframe params:', params.toString());
                console.log('📅 Full iframe URL:', iframeUrl);
                
                return (
                  <div className="w-full overflow-auto -mx-2 px-2" style={{ maxHeight: '80vh' }}>
                    <iframe
                      src={iframeUrl}
                      style={{ width: '100%', border: 'none', overflow: 'auto', minHeight: '1100px' }}
                      scrolling="yes"
                      id="gzO6aWgjPxb6225lKIUj_1763487062586"
                      title="Schedule Your Call"
                      onLoad={() => console.log('📅 GHL Calendar iframe loaded successfully')}
                      onError={() => console.error('❌ GHL Calendar iframe failed to load')}
                    />
                  </div>
                );
              })()}
            </div>
          )}

          {step < 9 && (
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          )}
        </Card>

        <div className="text-center mt-8">
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            We only work with serious, action-oriented investors. Answer 8 quick questions so we can customize your roadmap to success.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Book;

```

$res_vsl_call_booking_brrr_guys_application_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/vsl-call-booking/brrr-guys-pre-call.md',
  $res_vsl_call_booking_brrr_guys_pre_call_md$
---
name: "BRR Guys - Pre-Call Page"
category: vsl-call-booking
company: "The BRR Guys"
page_type: pre-call
description: "Pre-call confirmation with 7 guided steps. Confetti, video welcome, prep tips, calendar confirmation, FAQ videos, program overview, testimonial carousel, community CTA."
tags: [pre-call, confirmation, steps, confetti, testimonials, carousel]
---

# Page Source

```tsx
// File: Confirmed.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logo from "@/assets/placeholder.jpg";
import calendarInvite from "@/assets/placeholder.jpg";
import { CheckCircle2, UserCheck, Brain, HelpCircle, Star, Users, BookOpen, Video as VideoIcon, Award, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import Footer from "@/components/Footer";
import { useEffect, useRef } from "react";
import confetti from 'canvas-confetti';
import { ProgressTracker } from "@/components/ProgressTracker";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import LiveDealCaseStudy from "@/components/LiveDealCaseStudy";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";
import { trackFunnelEvent } from "@/lib/tracking";
import { StepCompletionButton } from "@/components/StepCompletionButton";

const testimonialVideos = [
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4"
];

const Confirmed = () => {
  usePageTracking(); // Track page view
  const topRowRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    
    const scrollAmount = 300;
    const container = ref.current;
    const itemWidth = 272; // 256px width + 16px gap
    const halfWidth = (container.scrollWidth / 4); // Since we have 4 copies
    
    if (direction === 'left') {
      const newScroll = container.scrollLeft - scrollAmount;
      
      // If we're at or near the start, jump to the equivalent position in the third set
      if (newScroll <= 0) {
        container.scrollLeft = halfWidth * 2 + scrollAmount;
        setTimeout(() => {
          container.scrollTo({ left: halfWidth * 2, behavior: 'smooth' });
        }, 10);
      } else {
        container.scrollTo({ left: newScroll, behavior: 'smooth' });
      }
    } else {
      const newScroll = container.scrollLeft + scrollAmount;
      
      // If we're at or near the end, jump to the equivalent position in the second set
      if (newScroll >= halfWidth * 3) {
        container.scrollLeft = halfWidth - scrollAmount;
        setTimeout(() => {
          container.scrollTo({ left: halfWidth, behavior: 'smooth' });
        }, 10);
      } else {
        container.scrollTo({ left: newScroll, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    // Initialize scroll position to middle of carousel for infinite scrolling
    if (topRowRef.current) {
      const halfWidth = topRowRef.current.scrollWidth / 4;
      topRowRef.current.scrollLeft = halfWidth * 2;
    }
    if (bottomRowRef.current) {
      const halfWidth = bottomRowRef.current.scrollWidth / 4;
      bottomRowRef.current.scrollLeft = halfWidth * 2;
    }
  }, []);

  useEffect(() => {
    // Capture email from GHL redirect and link to questionnaire
    const syncEmailToDatabase = async () => {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const firstName = params.get('first_name');
      const lastName = params.get('last_name');
      const phone = params.get('phone');
      const sessionId = localStorage.getItem('brrrr_session_id');
      
      console.log('📧 Email from GHL redirect:', email);
      console.log('👤 Name:', firstName, lastName);
      console.log('📞 Phone:', phone);
      console.log('🔑 Session ID from localStorage:', sessionId);
      console.log('🔍 Current URL:', window.location.href);
      console.log('📋 All URL params:', Array.from(params.entries()));
      
      if (email && sessionId) {
        console.log('💾 Attempting UPDATE for session_id:', sessionId, 'with email:', email);
        
        // First check if a record exists with this session_id
        const { data: existingRecords, error: queryError } = await supabase
          .from('questionnaire_responses')
          .select('*')
          .eq('session_id', sessionId);
        
        console.log('🔍 Records found with this session_id:', existingRecords);
        
        if (queryError) {
          console.error('❌ Error querying records:', queryError);
        } else if (!existingRecords || existingRecords.length === 0) {
          console.warn('⚠️ NO RECORDS FOUND with session_id:', sessionId);
          console.warn('⚠️ The questionnaire was never submitted, or session_id was cleared');
        } else {
          // Record exists, now update it
          const { data, error } = await supabase
            .from('questionnaire_responses')
            .update({ 
              email: email,
              first_name: firstName || null,
              last_name: lastName || null,
              phone: phone || null
            })
            .eq('session_id', sessionId)
            .select();
          
          if (error) {
            console.error('❌ Error updating email:', error);
          } else if (!data || data.length === 0) {
            console.error('❌ UPDATE succeeded but matched 0 rows!');
          } else {
            console.log('✅ Successfully linked email to questionnaire. Updated rows:', data);
            // Track call booked event
            trackFunnelEvent('call_booked', { email, firstName, lastName, phone });
            
            // Sync lead data to Google Sheets
            let leadData = data[0];
            console.log('📊 Preparing to sync lead to Google Sheets...');
            
            try {
              // Check if AI messages exist, if not generate them first
              if (!leadData.ai_pitch || !leadData.intro_sms) {
                console.log('🤖 AI messages missing, generating now...');
                
                const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-sales-pitch', {
                  body: {
                    email: email,
                    work_situation: leadData.work_situation,
                    experience: leadData.experience,
                    financial: leadData.financial,
                    familiarity: leadData.familiarity,
                    obstacle: leadData.obstacle,
                    goal: leadData.goal,
                    action: leadData.action,
                    why: leadData.why,
                  }
                });
                
                if (aiError) {
                  console.error('❌ Error generating AI messages:', aiError);
                } else if (aiData) {
                  console.log('✅ AI messages generated successfully');
                  // Update leadData with the newly generated AI messages
                  leadData = {
                    ...leadData,
                    ai_pitch: aiData.ai_pitch,
                    intro_sms: aiData.intro_sms
                  };
                }
              }
              
              // Now sync to Google Sheets with AI messages included
              const { error: syncError } = await supabase.functions.invoke('sync-google-sheet', {
                body: {
                  email: email,
                  first_name: firstName || '',
                  last_name: lastName || '',
                  phone: phone || '',
                  work_situation: leadData.work_situation,
                  experience: leadData.experience,
                  financial: leadData.financial,
                  familiarity: leadData.familiarity,
                  obstacle: leadData.obstacle,
                  goal: leadData.goal,
                  action: leadData.action,
                  why: leadData.why,
                  ai_pitch: leadData.ai_pitch,
                  intro_sms: leadData.intro_sms,
                  submitted_at: leadData.created_at,
                  utm_source: leadData.utm_source,
                  utm_medium: leadData.utm_medium,
                  utm_campaign: leadData.utm_campaign,
                  utm_content: leadData.utm_content,
                  utm_term: leadData.utm_term,
                  referrer: leadData.referrer,
                  session_id: sessionId,
                }
              });
              
              if (syncError) {
                console.error('❌ Error syncing to Google Sheets:', syncError);
              } else {
                console.log('✅ Successfully synced lead to Google Sheets with AI messages');
              }
            } catch (syncError) {
              console.error('❌ Failed to sync to Google Sheets:', syncError);
            }
            
            // Clear session_id from localStorage after successful sync
            localStorage.removeItem('brrrr_session_id');
          }
        }
      } else if (!sessionId) {
        console.log('⚠️ No session_id found - user may have skipped questionnaire');
      } else if (!email) {
        console.log('⚠️ No email parameter in URL');
      }
    };
    
    syncEmailToDatabase();

    // Trigger confetti animation on page load
    const triggerConfetti = () => {
      const count = 200;
      const defaults = {
        origin: { y: 1.1 }, // Shoot from bottom
        colors: ['#2f7a4f', '#1c4d6b', '#3d8b5e', '#244d73'], // Brand greens and navies
        spread: 100,
        startVelocity: 45,
      };

      confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.5),
        angle: 60,
        origin: { x: 0, y: 1.1 }
      });
      
      confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.5),
        angle: 120,
        origin: { x: 1, y: 1.1 }
      });
    };
    
    // Trigger confetti after a short delay
    setTimeout(triggerConfetti, 300);

    // Load Vidalytics embed script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      (function (v, i, d, a, l, y, t, c, s) {
        y='_'+d.toLowerCase();c=d+'L';if(!v[d]){v[d]={};}if(!v[c]){v[c]={};}if(!v[y]){v[y]={};}var vl='Loader',vli=v[y][vl],vsl=v[c][vl + 'Script'],vlf=v[c][vl + 'Loaded'],ve='Embed';
        if (!vsl){vsl=function(u,cb){
          if(t){cb();return;}s=i.createElement("script");s.type="text/javascript";s.async=1;s.src=u;
          if(s.readyState){s.onreadystatechange=function(){if(s.readyState==="loaded"||s.readyState=="complete"){s.onreadystatechange=null;vlf=1;cb();}};}else{s.onload=function(){vlf=1;cb();};}
          i.getElementsByTagName("head")[0].appendChild(s);
        };}
        vsl(l+'loader.min.js',function(){if(!vli){var vlc=v[c][vl];vli=new vlc();}vli.loadScript(l+'player.min.js',function(){var vec=v[d][ve];t=new vec();t.run(a);});});
      })(window, document, 'Vidalytics', 'vidalytics_embed_xeTPIHChb_HJiC55', 'https://example.com/placeholder-video-embed/');
    `;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEFEC' }}>
      <div className="sticky top-0 z-50 py-4 border-b border-border px-6 md:px-8" style={{ backgroundColor: '#EFEFEC' }}>
        <div className="container mx-auto px-4 flex justify-center">
          <img src={logo} alt="BRRRR in 90" className="h-16 md:h-20" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-4 px-2">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
              <span className="italic">You've Made a Great Decision!</span>
            </h1>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl text-foreground font-bold mb-3 md:mb-4 px-2">
            Your Session is <span className="text-primary underline decoration-2 underline-offset-4">Confirmed</span>...
          </p>
          <p className="text-base sm:text-lg md:text-xl text-foreground font-semibold px-4">
            Follow the Below Steps to Confirm Everything Before Your Appointment
          </p>
        </div>

        <div className="space-y-6 md:space-y-8 lg:space-y-12">
          {/* Step 1 - Video */}
          <div className="relative pt-6 md:pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-4 md:px-6 lg:px-8 py-2 md:py-3 rounded-full font-bold text-lg md:text-xl lg:text-2xl shadow-lg">
                Step 1
              </div>
            </div>
            <Card className="p-4 md:p-6 lg:p-8 shadow-lg">
            <div className="mb-4 md:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-2 md:mb-3 text-center px-2">
                Watch the video below in full before moving on to the rest of the page
              </h2>
            </div>
            
            <div className="w-full max-w-4xl mx-auto mb-6">
              <div className="relative w-full rounded-lg overflow-hidden bg-black shadow-md aspect-video">
                <div 
                  id="vidalytics_embed_VIDEO_ID" 
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
            </div>

            <div className="bg-green-light/30 border-l-4 border-primary p-6 md:p-8 rounded-r-lg shadow-sm">
              <p className="text-base md:text-lg text-foreground leading-relaxed">
                You've just taken the first step towards understanding how <span className="font-bold">BRRRR investing</span> could change your financial future. This call is your opportunity to ask <span className="font-bold text-primary">ALL your questions</span> and see if our approach to building cash-flowing rental properties makes sense for you.
              </p>
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-1" />
            </div>
          </Card>
          </div>

          {/* Step 2 - Quick Prep Tips */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 2
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-6 text-center">
              Quick Prep Tips
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Be Ready</h3>
                  <p className="text-foreground">Be ready to share your current situation</p>
                </div>
              </div>

              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Think</h3>
                  <p className="text-foreground">Think about what's blocking your real estate goals</p>
                </div>
              </div>

              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Questions</h3>
                  <p className="text-foreground">Prepare some questions you really want answered</p>
                </div>
              </div>

              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Be Honest</h3>
                  <p className="text-foreground">Be open and honest</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-2" />
            </div>
          </Card>

          {/* What to Expect */}
          <Card className="p-6 md:p-8 shadow-lg bg-green-light/20">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-6 text-center">
              What to Expect
            </h2>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold text-xl mt-1">✓</span>
                <p className="text-lg text-foreground font-semibold">Ask anything you want to know</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold text-xl mt-1">✓</span>
                <p className="text-lg text-foreground font-semibold">No pressure, just pure information</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold text-xl mt-1">✓</span>
                <p className="text-lg text-foreground font-semibold">Find out if this could be your path to financial freedom</p>
              </div>
            </div>
          </Card>
          </div>

          {/* Step 3 - Calendar Confirmation */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 3
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-4 text-center">
                Confirm Your Calendar Invite
              </h2>
            </div>

            <div className="space-y-6">
              <p className="text-lg text-foreground leading-relaxed">
                You will receive a <span className="font-bold text-primary">calendar invite via email</span> (Google, Apple, or Outlook). It will look just like the one shown below:
              </p>

              <div className="bg-white p-4 rounded-lg shadow-md border border-border">
                <img 
                  src={calendarInvite} 
                  alt="Calendar Invite Example" 
                  className="w-full h-auto rounded"
                />
              </div>

              <div className="bg-green-light/30 border-l-4 border-primary p-6 rounded-r-lg space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-xl flex-shrink-0">1.</span>
                  <p className="text-foreground leading-relaxed">
                    <span className="font-bold">Accept the Invite</span> and add it to your calendar so you don't forget. Set a reminder 10 minutes before.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-xl flex-shrink-0">2.</span>
                  <p className="text-foreground leading-relaxed">
                    Your email will include a clickable <span className="font-bold">Zoom or Google Meet link</span>. Keep that email saved so you can access the call at the right time.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-xl flex-shrink-0">3.</span>
                  <p className="text-foreground leading-relaxed">
                    This call could be <span className="font-bold text-primary">step #1 toward completely changing your life</span>. If you see the invite, reply "I'll be there!" to lock it in.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <StepCompletionButton stepId="step-3" />
              </div>
            </div>
          </Card>
          </div>

          {/* Step 4 - FAQ Video Section */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 4
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-4 text-center">
              Do Your Research / <span className="italic text-primary">Due Diligence</span>
            </h2>
            <p className="text-lg text-center text-foreground mb-8">
              Watch these videos to get answers to common questions
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: "What is the BRRRR method?", url: "https://example.com/placeholder-video.mp4" },
                { title: "I'm not ready yet but I'll be ready soon", url: "https://example.com/placeholder-video.mp4" },
                { title: "I'm too busy to invest in real estate", url: "https://example.com/placeholder-video.mp4" },
                { title: "How we help reduce your risk", url: "https://example.com/placeholder-video.mp4" },
                { title: "The cost of waiting another year", url: "https://example.com/placeholder-video.mp4" },
                { title: "What if I buy at the wrong time?", url: "https://example.com/placeholder-video.mp4" },
                { title: "Do I need $100,000 or more in order to get started investing?", url: "https://example.com/placeholder-video.mp4" },
                { title: "Why do you guys like Memphis market so much?", url: "https://example.com/placeholder-video.mp4" },
                { title: "Can I just get the same information for free online?", url: "https://example.com/placeholder-video.mp4" },
                { title: "What if my friends and family don't approve of this?", url: "https://example.com/placeholder-video.mp4" }
              ].map((video, index) => (
                <div key={index} className="group relative">
                  <div className="relative bg-black rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300" style={{ aspectRatio: '9/16' }}>
                    <video 
                      className="w-full h-full object-cover"
                      preload="metadata"
                      onClick={(e) => {
                        const video = e.currentTarget;
                        if (video.paused) {
                          video.play();
                          video.setAttribute('controls', 'true');
                        }
                      }}
                    >
                      <source src={video.url} type="video/mp4" />
                    </video>
                    
                    {/* Custom Play Button Overlay with Title */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/80 via-black/50 to-black/30 group-hover:from-black/90 group-hover:via-black/60 group-hover:to-black/40 transition-all duration-300 cursor-pointer p-6"
                         onClick={(e) => {
                           const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
                           if (video && video.paused) {
                             video.play();
                             video.setAttribute('controls', 'true');
                             e.currentTarget.classList.add('opacity-0', 'pointer-events-none');
                           }
                         }}>
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg mb-4">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                      </div>
                      <h3 className="font-bold text-white text-center text-base md:text-lg leading-tight">
                        {video.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-4" />
            </div>
          </Card>
          </div>

          {/* Step 5 - If We're a Match Section */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 5
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg bg-primary/5">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-6 text-center">
              If We're a Match, Here's <span className="italic text-primary">What Happens</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">15 In-Depth Courses</h3>
                  <p className="text-foreground text-sm">Comprehensive training on every aspect of BRRRR investing</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <VideoIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Three Weekly Live Calls</h3>
                  <p className="text-foreground text-sm">Direct access to mentors and expert guidance</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Accountability Partnership</h3>
                  <p className="text-foreground text-sm">Stay on track with dedicated support</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Supportive Investor Community</h3>
                  <p className="text-foreground text-sm">Network with like-minded investors</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Lifetime Course Access</h3>
                  <p className="text-foreground text-sm">Learn at your own pace, forever</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Exclusive Bonuses</h3>
                  <p className="text-foreground text-sm">Additional resources and templates</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
              <p className="text-sm text-foreground italic">
                <span className="font-semibold">Note:</span> Ask about our Done-For-You Program if You Are Interested in Learning How That Works
              </p>
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-5" />
            </div>
          </Card>
          </div>

          {/* Live BRRRR Case Study */}
          <LiveDealCaseStudy />

          {/* Step 6 - Testimonials Section */}
          <div className="relative pt-6 md:pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-4 md:px-6 lg:px-8 py-2 md:py-3 rounded-full font-bold text-lg md:text-xl lg:text-2xl shadow-lg">
                Step 6
              </div>
            </div>
            <Card className="p-4 md:p-6 lg:p-8 shadow-lg text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-3 md:mb-4 px-2">
              Meanwhile, If you Want <span className="italic text-primary">Inspiration</span>…
            </h2>
            <p className="text-base md:text-lg text-foreground mb-4 md:mb-6 px-2">
              Go through these success stories of our students who were once excited about this call just as you are!
            </p>
            
            {/* Top Row - Scrollable */}
            <div className="mb-4 md:mb-6 relative">
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(topRowRef, 'left')}
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(topRowRef, 'right')}
              >
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <div ref={topRowRef} className="overflow-x-auto pb-4 scroll-smooth px-8 md:px-12" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex gap-3 md:gap-4 min-w-min">
                  {[...testimonialVideos.slice(0, 6), ...testimonialVideos.slice(0, 6), ...testimonialVideos.slice(0, 6), ...testimonialVideos.slice(0, 6)].map((videoUrl, index) => (
                    <div key={index} className="group relative flex-shrink-0 w-48 md:w-56 lg:w-64">
                      <div className="relative bg-black rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300" style={{ aspectRatio: '9/16' }}>
                        <video 
                          className="w-full h-full object-cover"
                          preload="metadata"
                          onClick={(e) => {
                            const video = e.currentTarget;
                            if (video.paused) {
                              video.play();
                              video.setAttribute('controls', 'true');
                            }
                          }}
                        >
                          <source src={videoUrl} type="video/mp4" />
                        </video>
                        
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all duration-300 cursor-pointer"
                             onClick={(e) => {
                               const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
                               if (video && video.paused) {
                                 video.play();
                                 video.setAttribute('controls', 'true');
                                 e.currentTarget.classList.add('opacity-0', 'pointer-events-none');
                               }
                             }}>
                          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Bottom Row - Scrollable */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(bottomRowRef, 'left')}
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(bottomRowRef, 'right')}
              >
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <div ref={bottomRowRef} className="overflow-x-auto pb-4 scroll-smooth px-8 md:px-12" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex gap-3 md:gap-4 min-w-min">
                  {[...testimonialVideos.slice(6), ...testimonialVideos.slice(6), ...testimonialVideos.slice(6), ...testimonialVideos.slice(6)].map((videoUrl, index) => (
                    <div key={index + 6} className="group relative flex-shrink-0 w-48 md:w-56 lg:w-64">
                      <div className="relative bg-black rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300" style={{ aspectRatio: '9/16' }}>
                        <video 
                          className="w-full h-full object-cover"
                          preload="metadata"
                          onClick={(e) => {
                            const video = e.currentTarget;
                            if (video.paused) {
                              video.play();
                              video.setAttribute('controls', 'true');
                            }
                          }}
                        >
                          <source src={videoUrl} type="video/mp4" />
                        </video>
                        
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all duration-300 cursor-pointer"
                             onClick={(e) => {
                               const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
                               if (video && video.paused) {
                                 video.play();
                                 video.setAttribute('controls', 'true');
                                 e.currentTarget.classList.add('opacity-0', 'pointer-events-none');
                               }
                             }}>
                          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <StepCompletionButton stepId="step-6" />
            </div>
          </Card>
          </div>

          {/* Step 7 - Skool Community CTA with Confetti */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-4 sm:px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-base sm:text-lg md:text-xl lg:text-2xl shadow-lg whitespace-nowrap">
                Step 7
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg text-center bg-gradient-to-br from-primary/10 via-background to-primary/5 border-2 border-primary/20">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-4">
              Want Even More <span className="italic text-primary">Free Value</span>?
            </h2>
            <p className="text-lg text-foreground mb-6">
              Join our free Real Estate Investor Network community on Skool to learn more, connect with other investors, and get exclusive content!
            </p>
            <button
              onClick={() => {
                // Trigger confetti
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 }
                });
                // Delay navigation slightly to see confetti
                setTimeout(() => {
                  window.open('https://www.skool.com/section8guys/about', '_blank');
                }, 300);
              }}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 sm:px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold text-sm sm:text-base md:text-lg shadow-lg hover:bg-primary/90 hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              <Users className="w-6 h-6" />
              Join Free Community
            </button>
            
            <div className="mt-4">
              <StepCompletionButton stepId="step-7" />
            </div>
          </Card>
          </div>
        </div>
      </div>
      
      <Footer />
      <ProgressTracker />
      <ExitIntentPopup />
    </div>
  );
};

export default Confirmed;

```

$res_vsl_call_booking_brrr_guys_pre_call_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/vsl-call-booking/brrr-guys-vsl.md',
  $res_vsl_call_booking_brrr_guys_vsl_md$
---
name: "BRR Guys - VSL Page"
category: vsl-call-booking
company: "The BRR Guys"
page_type: vsl
description: "VSL page with timed content unlocking. Vidalytics video, two countdown timers, progressive content unlock, value bullets, social proof bar, sticky bottom bar, exit intent."
tags: [vsl, video, countdown, progressive-unlock, social-proof, sticky-bar]
---

# Page Source

```tsx
// File: VSL.tsx
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUtmParams } from "@/hooks/useUtmParams";
import { usePageTracking } from "@/hooks/usePageTracking";
import { trackVideoEvent, trackFacebookPixelEvent, trackFunnelEvent } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/placeholder.jpg";
import FooterMinimal from "@/components/FooterMinimal";
import { ExitIntentPopupVSL } from "@/components/ExitIntentPopupVSL";
import { StickyBottomBar } from "@/components/StickyBottomBar";
import { ValueBullets } from "@/components/ValueBullets";
import { SocialProofBar } from "@/components/SocialProofBar";
import { TestimonialMini } from "@/components/TestimonialMini";
import { UnlockCountdown } from "@/components/UnlockCountdown";
import { VideoCountdown } from "@/components/VideoCountdown";

const VSL = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isUnlocked, setIsUnlocked] = useState(() => {
    // Check localStorage on mount
    return localStorage.getItem("vsl_countdown_unlocked") === "true";
  });
  const [isSecondUnlocked, setIsSecondUnlocked] = useState(() => {
    // Check localStorage on mount for second countdown
    return localStorage.getItem("vsl_video_countdown_unlocked") === "true";
  });
  useUtmParams(); // Capture UTM parameters on page load
  usePageTracking(); // Track page view

  // Capture lead info from URL params (from GHL redirect)
  useEffect(() => {
    const firstName = searchParams.get('first_name') || searchParams.get('firstName');
    const lastName = searchParams.get('last_name') || searchParams.get('lastName');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    
    // If we have lead info from GHL, save to localStorage for later use
    if (firstName || email || phone) {
      const leadInfo = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
      };
      localStorage.setItem('brrrr_lead_info', JSON.stringify(leadInfo));
      console.log('📧 Lead info captured from URL:', leadInfo);
      
      // Track this as a lead from /info page
      trackFunnelEvent('lead_captured_from_info', leadInfo);
      
      // Also save to questionnaire_responses immediately so we don't lose them
      const sessionId = localStorage.getItem('brrrr_session_id') || localStorage.getItem('analytics_session_id');
      if (sessionId) {
        supabase.from('questionnaire_responses').upsert({
          session_id: sessionId,
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          phone: phone || null,
          referrer: localStorage.getItem('brrrr_source_page') || null,
        }, { onConflict: 'session_id' }).then(({ error }) => {
          if (error) {
            console.error('Error saving lead info:', error);
          } else {
            console.log('✅ Lead info saved to database');
          }
        });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Load Vidalytics embed script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      (function (v, i, d, a, l, y, t, c, s) {
        y='_'+d.toLowerCase();c=d+'L';if(!v[d]){v[d]={};}if(!v[c]){v[c]={};}if(!v[y]){v[y]={};}var vl='Loader',vli=v[y][vl],vsl=v[c][vl + 'Script'],vlf=v[c][vl + 'Loaded'],ve='Embed';
        if (!vsl){vsl=function(u,cb){
          if(t){cb();return;}s=i.createElement("script");s.type="text/javascript";s.async=1;s.src=u;
          if(s.readyState){s.onreadystatechange=function(){if(s.readyState==="loaded"||s.readyState=="complete"){s.onreadystatechange=null;vlf=1;cb();}};}else{s.onload=function(){vlf=1;cb();};}
          i.getElementsByTagName("head")[0].appendChild(s);
        };}
        vsl(l+'loader.min.js',function(){if(!vli){var vlc=v[c][vl];vli=new vlc();}vli.loadScript(l+'player.min.js',function(){var vec=v[d][ve];t=new vec();t.run(a);});});
      })(window, document, 'Vidalytics', 'vidalytics_embed_Riih9VrTW2zKG4ZC', 'https://example.com/placeholder-video-embed/');
    `;
    document.body.appendChild(script);

    // Track video events via global callbacks
    (window as any).vidalyticsCallback = function(action: string, percentage?: number) {
      if (action === 'video_start') {
        trackVideoEvent('started');
      } else if (action === 'video_progress') {
        if (percentage === 25 || percentage === 50 || percentage === 75 || percentage === 100) {
          trackVideoEvent(`${percentage}`, percentage);
        }
      }
    };

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any).vidalyticsCallback;
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEFEC' }}>
      <ExitIntentPopupVSL />
      {isUnlocked && <StickyBottomBar isSecondUnlocked={isSecondUnlocked} />}
      
      {/* Simplified Header */}
      <div className="py-3 md:py-4 px-4 md:px-6 lg:px-8" style={{ backgroundColor: '#EFEFEC' }}>
        <div className="container mx-auto px-2 md:px-4 flex justify-center">
          <img src={logo} alt="BRRRR in 90" className="h-12 md:h-14 lg:h-16" />
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4 pb-12 md:pb-16 max-w-5xl">
        <div className="space-y-6 md:space-y-8">
          {/* Simplified Tagline */}
          <div className="text-center pt-2 px-4">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground font-bold leading-relaxed tracking-wide">
              Discover The Exact System <span className="text-primary">500+ Investors</span> Used To Build Cash-Flowing Portfolios
            </p>
          </div>

          <div className="text-center px-2 md:px-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold text-foreground leading-tight mb-8 md:mb-10 tracking-tight">
              Close Your First (or Next) Cash-Flowing Rental in the Next <span className="underline decoration-primary decoration-2 underline-offset-4 md:underline-offset-8">90 Days</span>… <span className="text-primary italic">And Pull Your Capital Back Out to Do It Again</span>
            </h1>
          </div>

          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-primary py-4 px-6 text-center shadow-md">
              <div className="flex items-center justify-center gap-3">
                <p className="text-lg md:text-xl font-extrabold text-white tracking-wider uppercase">
                  Watch This Free Training Now
                </p>
                <svg className="w-6 h-6 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            <div className="relative w-full rounded-b-lg overflow-hidden bg-black aspect-video">
              <div 
                id="vidalytics_embed_VIDEO_ID"
                className="absolute top-0 left-0 w-full h-full"
                style={{ aspectRatio: '16/9' }}
              />
            </div>
          </div>

          {/* Countdown Timer */}
          {!isUnlocked && (
            <UnlockCountdown onComplete={async () => {
              setIsUnlocked(true);
              trackFunnelEvent('vsl_countdown_complete');
              trackFacebookPixelEvent('ViewContent', { 
                content_name: 'VSL_Engaged_2m45s',
                content_category: 'Video Engagement'
              });
              
              // Save video milestone to questionnaire_responses
              const sessionId = localStorage.getItem('brrrr_session_id') || localStorage.getItem('analytics_session_id');
              if (sessionId) {
                // Check if record exists first
                const { data: existing } = await supabase
                  .from('questionnaire_responses')
                  .select('id')
                  .eq('session_id', sessionId)
                  .maybeSingle();
                
                if (existing) {
                  await supabase.from('questionnaire_responses').update({
                    watched_past_2m30s: true,
                    last_video_milestone: '2m30s',
                  }).eq('session_id', sessionId);
                } else {
                  await supabase.from('questionnaire_responses').insert({
                    session_id: sessionId,
                    watched_past_2m30s: true,
                    last_video_milestone: '2m30s',
                  });
                }
              }
            }} />
          )}

          {/* Second Countdown Timer */}
          {isUnlocked && !isSecondUnlocked && (
            <VideoCountdown onComplete={async () => {
              setIsSecondUnlocked(true);
              trackFunnelEvent('vsl_video_countdown_complete');
              trackFacebookPixelEvent('ViewContent', { 
                content_name: 'VSL_Engaged_11m35s',
                content_category: 'Video Engagement'
              });
              
              // Save video milestone to questionnaire_responses
              const sessionId = localStorage.getItem('brrrr_session_id') || localStorage.getItem('analytics_session_id');
              if (sessionId) {
                // Check if record exists first
                const { data: existing } = await supabase
                  .from('questionnaire_responses')
                  .select('id')
                  .eq('session_id', sessionId)
                  .maybeSingle();
                
                if (existing) {
                  await supabase.from('questionnaire_responses').update({
                    watched_past_11m30s: true,
                    last_video_milestone: '11m30s',
                  }).eq('session_id', sessionId);
                } else {
                  await supabase.from('questionnaire_responses').insert({
                    session_id: sessionId,
                    watched_past_11m30s: true,
                    last_video_milestone: '11m30s',
                  });
                }
              }
            }} />
          )}

          {/* Content that unlocks after countdown */}
          {isUnlocked && (
            <>
              {/* Phase 1: Value Bullets - Shows after 2:35 */}
              <ValueBullets isSecondUnlocked={isSecondUnlocked} />

              {/* Phase 3: Main CTA - Shows after 2:35 under ValueBullets */}
              <div className="pt-2">
                <Button
                  size="lg" 
                  className="w-full h-auto py-4 md:py-6 text-sm sm:text-base md:text-lg lg:text-xl font-extrabold shadow-lg hover:shadow-xl transition-all hover:scale-105 tracking-wide uppercase bg-cta hover:bg-cta/90 text-cta-foreground flex flex-col gap-1"
                  onClick={() => {
                    // Get stored UTMs and append to navigation URL
                    const storedUtms = localStorage.getItem('brrrr_utm_params');
                    let url = '/call';
                    if (storedUtms) {
                      try {
                        const utms = JSON.parse(storedUtms);
                        const queryString = new URLSearchParams(utms).toString();
                        if (queryString) {
                          url = `/call?${queryString}`;
                        }
                      } catch (error) {
                        console.error('Error parsing UTMs:', error);
                      }
                    }
                    navigate(url);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span>I'M READY TO TAKE ACTION</span>
                  <span className="text-xs md:text-sm font-semibold normal-case opacity-90">
                    Click Here to Apply To Work With Us Now
                  </span>
                </Button>
              </div>

              {/* Phase 2: Social Proof Bar - Hidden until second countdown */}
              {isSecondUnlocked && <SocialProofBar />}

              {/* Phase 2: Mini Testimonials - Hidden until second countdown */}
              {isSecondUnlocked && <TestimonialMini />}
            </>
          )}

        </div>
      </div>
      
      {/* Phase 4: Minimal Footer */}
      <FooterMinimal />
    </div>
  );
};

export default VSL;

```

$res_vsl_call_booking_brrr_guys_vsl_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/freedom-builders-confirmation.md',
  $res_webinar_freedom_builders_confirmation_md$
---
name: "Freedom Builders - Webinar Confirmation"
category: webinar
company: "Freedom Builders"
page_type: webinar-confirmation
description: "Webinar confirmation page. Confetti on load, sticky header with confirmation text, video welcome with click-to-unmute, calendar add buttons, 3-step prep cards with gradient backgrounds, meet your coach with video modal, 8 case study video grid with modal player, 'what it's like' video section, podcast appearances grid, split FAQ with photo, free blueprint CTA."
tags: [webinar, confirmation, confetti, case-studies, podcast, video-modal, calendar, prep-steps]
---

# Page Source

## Entry File — ThankYou.tsx

```tsx
// File: ThankYou.tsx
import { useEffect } from "react";
import confetti from "canvas-confetti";
import ConfirmationHero from "@/components/thankyou/ConfirmationHero";
import PreparationSteps from "@/components/thankyou/PreparationSteps";
import MeetYourCoach from "@/components/thankyou/MeetYourCoach";
import CaseStudyVideos from "@/components/thankyou/CaseStudyVideos";

import WhatItsLike from "@/components/thankyou/WhatItsLike";
import PodcastAppearances from "@/components/thankyou/PodcastAppearances";
import ThankYouFAQ from "@/components/thankyou/ThankYouFAQ";
import Footer from "@/components/Footer";

const ThankYou = () => {
  useEffect(() => {
    const end = Date.now() + 1500;
    const colors = ["#FF5D2E", "#ffffff", "#a855f7"];
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <ConfirmationHero />
        <PreparationSteps />
        <MeetYourCoach />
        <CaseStudyVideos />
        
        <WhatItsLike />
        <PodcastAppearances />
        <ThankYouFAQ />

        {/* Free Blueprint CTA */}
        <section className="py-16 md:py-20 px-4 text-center" style={{ background: "#090909" }}>
          <div className="max-w-2xl mx-auto">
            <p className="text-white/60 text-lg md:text-xl mb-2">Oh, and one more thing…</p>
            <h2 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-4">
              Grab Your Free{" "}
              <span className="text-primary">Builderz Blueprint</span>
            </h2>
            <p className="text-white/50 text-base mb-8 max-w-lg mx-auto">
              Map out, structure, and launch your online program with this step-by-step blueprint — no opt-in required.
            </p>
            <a
              href="http://themessagingblueprint.com/blueprint"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white text-base font-bold transition-all hover:brightness-110"
              style={{ background: "#FF5D2E" }}
            >
              Get the Free Blueprint →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ThankYou;
```

## ConfirmationHero.tsx

```tsx
// File: ConfirmationHero.tsx
import { useRef, useState } from "react";
import { Play } from "lucide-react";
import logo from "@/assets/placeholder.jpg";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";

const VIDEO_SRC = "/placeholder-video.mp4";

const calendarButtons = [
  { label: "Apple", href: "#add-to-calendar" },
  { label: "Google", href: "#add-to-calendar" },
  { label: "Outlook", href: "#add-to-calendar" },
  { label: "Outlook.com", href: "#add-to-calendar" },
  { label: "Office 365", href: "#add-to-calendar" },
  { label: "Yahoo", href: "#add-to-calendar" },
];

const ConfirmationHero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.controls = true;
    video.play();
    setIsPlaying(true);
  };

  return (
    <>
      {/* Sticky header banner */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: "#090909" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-16 py-3 md:py-4 flex items-center justify-between gap-3">
          <img src={logo} alt="Freedom Builderz" className="h-6 md:h-8 shrink-0" />
          <p className="text-right text-xs md:text-base text-white font-bold leading-tight">
            Registration Confirmed — See You on Feb 17th
          </p>
        </div>
      </div>

      {/* Hero section */}
      <section className="relative py-14 md:py-20 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <img src={purpleGradient} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={orangeGradient} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={patternWhite} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Date/time reminder */}
          <p className="text-white font-bold text-sm md:text-lg mb-4 md:mb-6">
            📅 Tuesday, February 24th at 2:00 PM EST{" "}
            <span className="text-white/60 font-normal">(11:00 AM PST)</span>
          </p>

          {/* Headline */}
          <h1 className="font-heading text-2xl md:text-5xl font-black uppercase tracking-tight text-white mb-3 md:mb-4">
            HERE'S EVERYTHING YOU NEED{" "}
            <span style={{ color: "#FF5D2E" }}>BEFORE THE TRAINING</span>
          </h1>

          {/* Subhead */}
          <p className="text-white/60 text-sm md:text-lg mb-8 md:mb-10 max-w-xl mx-auto">
            Follow the steps below so you're fully prepared when we go live.
          </p>

          {/* Video */}
          <div
            className="relative w-full max-w-[800px] mx-auto mb-12 rounded-[20px] overflow-hidden group cursor-pointer"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}
            onClick={!isPlaying ? handlePlay : undefined}
          >
            <video
              ref={videoRef}
              className="w-full rounded-[20px]"
              playsInline
              muted
              autoPlay
              loop
              preload="auto"
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-all duration-300 group-hover:bg-black/40">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/30 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Calendar section */}
          <div className="mb-4">
            <h2 className="font-heading text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-2">
              🗓️ ADD THIS TO YOUR CALENDAR
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Click below so you don't forget — set a reminder 10 minutes before.
            </p>

            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {calendarButtons.map((btn) => (
                <a
                  key={btn.label}
                  href={btn.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-white text-xs md:text-sm font-medium transition-colors hover:brightness-125"
                  style={{ background: "#232526" }}
                >
                  {btn.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ConfirmationHero;
```

## PreparationSteps.tsx

```tsx
// File: PreparationSteps.tsx
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import blueGradient from "@/assets/placeholder.jpg";
import pattern from "@/assets/placeholder.jpg";

const steps = [
  {
    num: "01",
    title: "ACCEPT THE CALENDAR INVITE",
    desc: "Set a reminder 10 minutes before. Find a quiet setting to make the most of your time.",
    bg: purpleGradient,
  },
  {
    num: "02",
    title: "SAVE YOUR EMAIL",
    desc: "Your email contains the Zoom link. Keep it saved so you can access the training.",
    bg: orangeGradient,
  },
  {
    num: "03",
    title: "PREPARE YOUR QUESTIONS",
    desc: "This training could change everything. Come ready with questions for Mike and the team.",
    bg: blueGradient,
  },
];

const PreparationSteps = () => {
  return (
    <section
      className="relative py-16 md:py-20 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      {/* Purple gradient orb top-left */}
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[30%] -left-[20%] w-[600px] h-[600px] object-cover opacity-[0.25] pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      {/* Orange gradient orb bottom-right */}
      <img
        src={orangeGradient}
        alt=""
        className="absolute -bottom-[30%] -right-[20%] w-[600px] h-[600px] object-cover opacity-[0.2] pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      {/* Pattern overlay */}
      <img
        src={pattern}
        alt=""
        className="absolute top-0 left-0 w-full h-[30%] object-cover opacity-[0.07] pointer-events-none"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        <h2
          className="font-heading text-xl md:text-4xl font-black uppercase tracking-tight text-center mb-8 md:mb-10 text-white"
        >
          BEFORE THE TRAINING, DO THIS:
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.title}
              className="relative overflow-hidden rounded-[16px] md:rounded-[20px] min-h-[220px] md:min-h-[280px] flex flex-col justify-end"
            >
              <img
                src={step.bg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />

              <div className="relative z-10 p-7 flex flex-col h-full">
                <span className="font-heading text-5xl font-black text-white/80 mb-4">
                  {step.num}
                </span>
                <h3 className="font-heading text-white font-bold text-lg uppercase tracking-wide mb-2">
                  {step.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PreparationSteps;
```

## MeetYourCoach.tsx

```tsx
// File: MeetYourCoach.tsx
import { useState, useRef, useEffect } from "react";
import { Play, X, Instagram } from "lucide-react";
import mikeHeadshot from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import purpleGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";

const STORY_VIDEO = "/placeholder-video.mp4";

const MeetYourCoach = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section
        className="relative py-16 md:py-24 px-4 overflow-hidden"
        style={{ background: "#090909" }}
      >
        <img src={purpleGradient} alt="" className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={orangeGradient} alt="" className="absolute -bottom-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={patternWhite} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          {/* Left: Photo + links */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-[20px] blur-[40px] opacity-20" style={{ background: "#FF5D2E" }} />
              <img
                src={mikeHeadshot}
                alt="Mike Gonzalez"
                className="relative w-full md:w-[280px] rounded-[20px] object-cover max-h-[380px]"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
              />
            </div>

            {/* Links below photo */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors cursor-pointer bg-transparent border-none text-white"
              >
                <Play className="w-4 h-4" style={{ color: "#FF5D2E" }} fill="#FF5D2E" />
                Watch Mike's Story
              </button>
              <a
                href="https://instagram.com/your-handle/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white hover:underline text-sm font-medium transition-colors"
              >
                <Instagram className="w-4 h-4" style={{ color: "#FF5D2E" }} />
                @mikegbuilds
              </a>
            </div>
          </div>

          {/* Right: Bio + Credentials */}
          <div className="flex-1 max-w-[520px] text-center md:text-left">
            <h2 className="font-heading text-2xl md:text-4xl font-black uppercase tracking-tight text-white mb-5">
              MEET YOUR <span style={{ color: "#FF5D2E" }}>COACH</span>
            </h2>

            <div className="text-white/70 text-base leading-relaxed space-y-3.5 mb-6">
              <p>Mike Gonzalez spent years in the corporate world before walking away to go all-in on coaching. He built a real practice and got real results for real people. But he hit the same wall every great coach hits — his income was chained to his calendar and there were only so many hours in the day.</p>
              <p>So he figured out how to take everything he knew and package it into a digital program that could reach people without him being in the room. It worked. Then other coaches started asking him to do it for them. That's how Freedom Builderz was born.</p>
              <p>Today Mike and his team have built over 150 online programs for creators, coaches, and experts. They don't teach you how to build it — they build it for you. Branding, copy, tech, sales pages, email sequences, everything. Their clients have generated over a million dollars from programs that never would have existed without this team.</p>
            </div>

            <div className="w-16 h-px mb-5" style={{ background: "rgba(255,93,46,0.3)" }} />

            <div className="space-y-0.5">
              <p className="text-white font-bold">Michael Gonzalez</p>
              <p className="text-white/50 text-sm">Founder of Freedom Builderz</p>
              <p className="text-sm font-bold" style={{ color: "#FF5D2E" }}>7-Figure Success Coach</p>
            </div>
          </div>
        </div>
      </section>

      {showModal && <StoryModal onClose={() => setShowModal(false)} />}
    </>
  );
};

const StoryModal = ({ onClose }: { onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    videoRef.current?.play().catch(() => {});
    return () => { document.removeEventListener("keydown", handleEsc); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="relative z-10 w-[95%] md:w-[90%] rounded-[20px] p-5 md:p-8 flex flex-col items-center"
        style={{ maxWidth: 450, background: "#090909" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Orange accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-b-full" style={{ background: "#FF5D2E" }} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:-top-4 md:-right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80 z-20"
          style={{ background: "#232526" }}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Title */}
        <h3 className="font-heading text-xl font-black uppercase tracking-tight text-white mb-1 mt-2">
          MIKE'S STORY
        </h3>
        <p className="text-white/40 text-sm mb-5">How Freedom Builderz Started</p>

        {/* Video */}
        <video
          ref={videoRef}
          className="w-full rounded-xl"
          controls
          playsInline
          preload="auto"
          style={{ maxHeight: "60vh" }}
        >
          <source src={STORY_VIDEO} type="video/mp4" />
        </video>

        {/* Instagram link */}
        <a
          href="https://instagram.com/your-handle/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-5 text-sm font-medium transition-colors hover:underline"
        >
          <Instagram className="w-4 h-4" style={{ color: "#FF5D2E" }} />
          <span className="text-white">@mikegbuilds</span>
        </a>
      </div>
    </div>
  );
};

export default MeetYourCoach;
```

## CaseStudyVideos.tsx

```tsx
// File: CaseStudyVideos.tsx
import { useState, useRef, useEffect } from "react";
import { Play, X } from "lucide-react";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import blueGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";
import testimonial1 from "@/assets/placeholder.jpg";
import testimonial2 from "@/assets/placeholder.jpg";
import testimonial3 from "@/assets/placeholder.jpg";
import testimonial4 from "@/assets/placeholder.jpg";
import testimonial5 from "@/assets/placeholder.jpg";

interface CaseStudy {
  thumb: string | null;
  name: string;
  tagline: string;
  result: string;
  videoUrl: string;
  copy: string;
}

const caseStudies = [
  {
    thumb: testimonial1,
    name: "Paul Chek",
    tagline: "Holistic Health Expert",
    result: "$500,000+ Generated Organically",
    videoUrl: "/placeholder-video.mp4",
    copy: "World-renowned holistic health expert with 40+ years of experience. Came to us to bring his Spirit Gym methods online. We built the full brand, platform, and launch strategy.\n\nGenerated over $500,000 organically after launching. Called it \"the site of my dreams\" and \"more beautiful than I imagined possible.\" Said we were \"unbeatable — a team that actually does what they say, exceptionally well.\"",
  },
  {
    thumb: testimonial2,
    name: "Jason Pickard",
    tagline: "Former Wall Street Trader",
    result: "$100K+ in First 30 Days",
    videoUrl: "/placeholder-video.mp4",
    copy: "Former Wall Street trader with zero brand or online presence. Came to us with just a powerful personal transformation. We built his brand, offer, and launch strategy from the ground up.\n\nGenerated $100K+ in the first 30 days of launch. Hit 4X ROI in under a year — now runs evergreen, profit-producing product.",
  },
  {
    thumb: null,
    name: "Christian Van Camp",
    tagline: "Retreat Leader & Health Coach",
    result: "Clarity & Structure to Launch",
    videoUrl: "/placeholder-video.mp4",
    copy: "Retreat leader and health coach with a brick-and-mortar practice who struggled to pull his online offer together. He was trying to do the branding and outline on his own but didn't know where to start.\n\nPartnering with Freedom Builderz gave him the clarity and structure he needed — we made the process simple and delivered exactly what to do at every step.",
  },
  {
    thumb: null,
    name: "Mary Buckingham",
    tagline: "Energy Worker",
    result: "Lifelong Business Partner",
    videoUrl: "/placeholder-video.mp4",
    copy: "Energy worker with a studio in California who didn't know how to translate her in-person practice into an online income stream. She came to Freedom Builderz looking for a trusted partner who valued relationship as much as results.\n\nMary shared, \"Mike has turned into a lifelong friend and business guide. His work ethic is incredible and anything that you need, he is there for you.\"",
  },
  {
    thumb: testimonial5,
    name: "Sarah Rosser",
    tagline: "Midwife",
    result: "Six Figures in 6 Weeks",
    videoUrl: "/placeholder-video.mp4",
    copy: "Midwife with a powerful vision, but no tech, system, or marketing plan. Partnered with Freedom Builderz to bring her course to life.\n\nLaunched and profited over six figures organically in just 6 weeks. Focused on her mission while we handled everything behind the scenes.",
  },
  {
    thumb: testimonial4,
    name: "Hamilton Souther",
    tagline: "Healer & Certification Creator",
    result: "$200K+ Generated Organically",
    videoUrl: "/placeholder-video.mp4",
    copy: "Globally respected healer with a mission but no digital infrastructure for this offer. Turned to Freedom Builderz to bring his certification program online.\n\nWe handled branding, copy, design, course creation, automation, and launch execution. Launch doubled expectations — generating over $200K organically.",
  },
  {
    thumb: testimonial3,
    name: "Meagan \"Mimi\" Lindquist",
    tagline: "Wellness Coach",
    result: "On Track to Six Figures",
    videoUrl: "/placeholder-video.mp4",
    copy: "Wellness coach who tried to launch her course solo but ran into burnout and roadblocks with tech and strategy. Turned to Freedom Builderz to fully relaunch Clear and Free.\n\nWe handled branding, design, backend systems, and launch execution. Her course is now well on its way toward a six-figure milestone.",
  },
  {
    thumb: null,
    name: "Stacie Rae",
    tagline: "Medical Tattoo Artist",
    result: "Exceeded $25K Goal on First Launch",
    videoUrl: "/placeholder-video.mp4",
    copy: "Medical tattoo artist with multiple brick-and-mortar studios who wanted to turn her proprietary techniques into an online academy and certification program. Partnered with Freedom Builderz to bring her vision online.\n\nHer first launch surpassed goals of 10 students and $25K in sales — exceeding expectations right out of the gate. Said we \"changed her life\" and gave her the kind of reach and income stream she would have never had before.",
  },
];

interface ModalProps {
  study: typeof caseStudies[number];
  onClose: () => void;
}

const CaseStudyModal = ({ study, onClose }: ModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[800px] max-h-[90vh] overflow-y-auto rounded-[20px] z-10"
        style={{ background: "#131415" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient orbs */}
        <img
          src={purpleGradient}
          alt=""
          className="absolute -top-[30%] -left-[30%] w-[500px] h-[500px] object-cover opacity-[0.2] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <img
          src={orangeGradient}
          alt=""
          className="absolute -bottom-[30%] -right-[30%] w-[500px] h-[500px] object-cover opacity-[0.2] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 md:w-8 md:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Video */}
        <div className="relative z-10 p-4 pb-0">
          <video
            ref={videoRef}
            className="w-full rounded-xl"
            controls
            playsInline
            preload="auto"
          >
            <source src={study.videoUrl} type="video/mp4" />
          </video>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8">
          <h3 className="font-heading text-2xl md:text-3xl font-black uppercase text-white mb-1">
            {study.name}
          </h3>
          <p className="font-bold text-lg mb-4" style={{ color: "#FF5D2E" }}>
            {study.result}
          </p>
          <div className="text-white/70 text-base leading-relaxed whitespace-pre-line">
            {study.copy}
          </div>
        </div>
      </div>
    </div>
  );
};

const CaseStudyVideos = () => {
  const [activeStudy, setActiveStudy] = useState<typeof caseStudies[number] | null>(null);
  const [showMore, setShowMore] = useState(false);

  const withThumb = caseStudies.filter((s) => s.thumb !== null);
  const initialCards = withThumb.slice(0, 4);
  const remainingCards = [...withThumb.slice(4), ...caseStudies.filter((s) => s.thumb === null)];

  const renderCard = (study: CaseStudy) => (
    <div
      key={study.name}
      onClick={() => setActiveStudy(study)}
      className="cursor-pointer rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:brightness-110 transition-all duration-300"
      style={{ background: "#232526", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
    >
      <div className="relative aspect-video overflow-hidden">
        {study.thumb ? (
          <img
            src={study.thumb}
            alt={study.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            loop
            preload="metadata"
          >
            <source src={study.videoUrl} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-heading text-lg font-bold uppercase text-white mb-1">
          {study.name}
        </h3>
        <p className="text-white/50 text-sm mb-2">{study.tagline}</p>
        <p className="font-bold text-sm" style={{ color: "#FF5D2E" }}>
          {study.result}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <section className="relative py-16 md:py-24 px-4 overflow-hidden bg-background">
        {/* Gradient orbs */}
        <img
          src={purpleGradient}
          alt=""
          className="absolute -top-[20%] -right-[15%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <img
          src={blueGradient}
          alt=""
          className="absolute -bottom-[20%] -left-[15%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <img
          src={patternWhite}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
        />

        <div className="relative z-10 max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-center text-foreground mb-3">
            🔓 YOUR <span className="text-primary">8 SUCCESS STORIES</span> — UNLOCKED
          </h2>
          <p className="text-muted-foreground text-base md:text-lg text-center max-w-xl mx-auto mb-12">
            Real creators. Real results. Watch how they did it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {initialCards.map(renderCard)}
          </div>

          {remainingCards.length > 0 && !showMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => setShowMore(true)}
                className="px-8 py-3.5 rounded-xl text-white text-sm font-bold transition-all hover:brightness-125"
                style={{ background: "#232526", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Show More Success Stories →
              </button>
            </div>
          )}

          {showMore && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {remainingCards.map(renderCard)}
            </div>
          )}
        </div>
      </section>

      {activeStudy && (
        <CaseStudyModal study={activeStudy} onClose={() => setActiveStudy(null)} />
      )}
    </>
  );
};

export default CaseStudyVideos;
```

## WhatItsLike.tsx

```tsx
// File: WhatItsLike.tsx
import { useRef, useState } from "react";
import { Play } from "lucide-react";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";

const VIDEO_SRC = "/placeholder-video.mp4";

const WhatItsLike = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.controls = true;
    video.play();
    setIsPlaying(true);
  };

  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.25] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={orangeGradient}
        alt=""
        className="absolute -bottom-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={patternWhite}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-10">
          WHAT IT'S LIKE TO WORK WITH{" "}
          <span style={{ color: "#FF5D2E" }}>FREEDOM BUILDERZ</span>
        </h2>

        <div
          className="relative w-full max-w-[800px] mx-auto rounded-[20px] overflow-hidden group cursor-pointer"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}
          onClick={!isPlaying ? handlePlay : undefined}
        >
          <video
            ref={videoRef}
            className="w-full rounded-[20px]"
            playsInline
            muted
            autoPlay
            loop
            preload="auto"
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>

          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-all duration-300 group-hover:bg-black/40">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/30 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WhatItsLike;
```

## PodcastAppearances.tsx

```tsx
// File: PodcastAppearances.tsx
import { ExternalLink } from "lucide-react";
import patternWhite from "@/assets/placeholder.jpg";

const podcasts = [
  {
    name: "Paul Chek's Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "Tips to Creating Amazing Content",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "The Medicin Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "The Be Extraordinary Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "The Captain's Lifestyle Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
];

const PodcastAppearances = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={patternWhite}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-10">
          HEAR MORE FROM <span style={{ color: "#FF5D2E" }}>MIKE</span>
        </h2>

        {/* 3 + 2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 mb-4 md:mb-5">
          {podcasts.slice(0, 3).map((pod) => (
            <PodcastCard key={pod.name} podcast={pod} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-w-full sm:max-w-[66%] md:max-w-[440px] mx-auto">
          {podcasts.slice(3).map((pod) => (
            <PodcastCard key={pod.name} podcast={pod} />
          ))}
        </div>
      </div>
    </section>
  );
};

const PodcastCard = ({ podcast }: { podcast: { name: string; link: string; thumb: string } }) => (
  <a
    href={podcast.link}
    target="_blank"
    rel="noopener noreferrer"
    className="group cursor-pointer rounded-[20px] overflow-hidden hover:-translate-y-1 hover:brightness-110 transition-all duration-300"
    style={{ background: "#232526", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
  >
    <div className="relative aspect-video overflow-hidden">
      <img
        src={podcast.thumb}
        alt={podcast.name}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="p-4 flex items-center justify-between gap-2">
      <p className="text-white text-sm font-bold leading-tight text-left">
        {podcast.name}
      </p>
      <ExternalLink className="w-4 h-4 text-white/40 shrink-0 group-hover:text-white/70 transition-colors" />
    </div>
  </a>
);

export default PodcastAppearances;
```

## ThankYouFAQ.tsx

```tsx
// File: ThankYouFAQ.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import mikeCouch from "@/assets/placeholder.jpg";

const faqs = [
  {
    q: "How long is this training?",
    a: "This training will run for about an hour, with extra time for Q&A at the end to get all your questions answered about everything you've just learned.",
  },
  {
    q: "Who does this training apply to?",
    a: "This training is for creators, influencers, and experts with a following who want to turn what they know into an offer that actually sells. We've used this framework across 50+ niches — from fitness coaches to psychic mediums to NFL athletes to documentary filmmakers to OBGYNs. If you have an audience and knowledge that helps people, this is for you.",
  },
  {
    q: "What else are we learning other than messaging?",
    a: "Mike will also teach you how to package your message into a digital product and launch it the right way. He'll break down why creators in \"unique\" or niche categories actually have an advantage — and how some of our best results have come from niches nobody thought would work.",
  },
  {
    q: "Where will this training take place?",
    a: "The training is hosted on Zoom. If you scroll up to the \"Add to Calendar\" section, the Zoom link will be included. We'll also send friendly reminders leading up to the event with the link. In the meantime, check out Mike's podcast appearances above for more helpful content.",
  },
];

const ThankYouFAQ = () => {
  return (
    <section className="w-full flex flex-col md:flex-row" style={{ minHeight: "700px" }}>
      {/* Left — Quote + FAQ */}
      <div
        className="w-full md:w-[57%] flex flex-col justify-center px-6 py-16 md:px-16 lg:px-24"
        style={{ background: "#090909" }}
      >
        {/* Quote */}
        <blockquote className="relative mb-6">
          <span
            className="absolute -top-8 -left-4 font-heading text-[120px] md:text-[160px] leading-none select-none pointer-events-none opacity-[0.1]"
            style={{ color: "#FF5D2E" }}
          >
            &ldquo;
          </span>
          <p className="relative font-heading text-2xl md:text-3xl lg:text-[34px] font-black uppercase tracking-tight text-white leading-snug mb-6">
            Freedom Builderz exists for one reason: to help creators{" "}
            <span style={{ color: "#FF5D2E" }}>stop renting their audience</span>
            {" "}— and start{" "}
            <span style={{ color: "#FF5D2E" }}>owning their income.</span>
          </p>
          <footer className="text-white/50 text-base">— Mike Gonzalez</footer>
        </blockquote>

        {/* Separator */}
        <div className="w-12 h-px my-10" style={{ background: "rgba(255,93,46,0.3)" }} />

        {/* FAQ */}
        <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white mb-7">
          COMMON <span style={{ color: "#FF5D2E" }}>QUESTIONS</span>
        </h2>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border-none px-5 overflow-hidden"
              style={{ background: "#232526" }}
            >
              <AccordionTrigger className="text-white font-bold text-left text-base hover:no-underline py-5 [&>svg]:text-[#FF5D2E]">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-white/60 text-sm leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Right — Photo */}
      <div className="w-full md:w-[43%] overflow-hidden">
        <img
          src={mikeCouch}
          alt="Mike Gonzalez"
          className="w-full h-auto md:h-full object-cover object-top"
          style={{ marginTop: "-15px", marginBottom: "-15px" }}
        />
      </div>
    </section>
  );
};

export default ThankYouFAQ;
```
$res_webinar_freedom_builders_confirmation_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/freedom-builders-cta.md',
  $res_webinar_freedom_builders_cta_md$
---
name: "Freedom Builders - Webinar CTA"
category: webinar
company: "Freedom Builders"
page_type: webinar-cta
description: "Post-webinar call booking. Urgency banner, two-column with coach intro and booking calendar. Dark theme."
tags: [webinar, cta, call-booking, urgency, calendar-embed]
---

# Page Source

```tsx
// File: Join.tsx
import logo from "@/assets/placeholder.jpg";
import mikeHeadshot from "@/assets/placeholder.jpg";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";
import Footer from "@/components/Footer";

const Join = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: "#090909" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-4 flex items-center justify-center">
          <img src={logo} alt="Freedom Builderz" className="h-8 shrink-0" />
        </div>
      </div>

      {/* Urgency Banner */}
      <div className="w-full py-3 px-4 text-center" style={{ background: "linear-gradient(90deg, #FF5D2E, #FF8A5C)" }}>
        <p className="text-sm md:text-base font-heading font-black uppercase tracking-wide text-white">
          🔥 Only 10 Calls Available — First Come, First Served
        </p>
      </div>

      {/* Calendar Booking Section */}
      <section className="relative py-14 md:py-20 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <img src={purpleGradient} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={orangeGradient} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={patternWhite} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 lg:gap-14 items-center lg:items-start">
          {/* Left: Mike intro */}
          <div className="lg:w-[340px] shrink-0 text-center lg:text-left lg:sticky lg:top-28">
            <img
              src={mikeHeadshot}
              alt="Mike G."
              className="w-36 h-36 rounded-full object-cover mx-auto lg:mx-0 mb-6 border-2 border-[#FF5D2E]/30"
            />
            <h2 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-3">
              LET'S <span style={{ color: "#FF5D2E" }}>BUILD IT</span> TOGETHER
            </h2>
            <p className="text-white/60 text-base md:text-lg mb-4">
              Schedule your call to discuss how we'll plug in and set up your turnkey system — built and ready to launch.
            </p>
            <p className="text-white/40 text-sm leading-relaxed">
              You can try to take this on yourself and spend months figuring it out — or you can pay for speed and have someone do it for you.{" "}
              <span className="text-white/70 font-medium">How much money are you leaving on the table by waiting?</span>
            </p>
          </div>

          {/* Right: Booking calendar */}
          <div className="flex-1 min-w-0 rounded-[20px] overflow-hidden" style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.08)" }}>
            <iframe
              src="https://your-form-provider.com/embed/YOUR_FORM_ID"
              style={{ width: "100%", minHeight: "1200px", border: "none" }}
              scrolling="yes"
              id="join_booking"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Join;

```

$res_webinar_freedom_builders_cta_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/freedom-builders-optin.md',
  $res_webinar_freedom_builders_optin_md$
---
name: "Freedom Builders - Webinar Opt-In"
category: webinar
company: "Freedom Builders"
page_type: webinar-optin
description: "Dark theme webinar opt-in. Sticky desktop header with banner + CTA, hero with gradient orbs and countdown, about the coach section with animated count-up stats, what you'll learn with numbered card grid, mobile sticky bar, form modal with countdown and embedded GHL form."
tags: [webinar, optin, dark-theme, sticky-bar, coach-bio, count-up-stats, gradient-orbs, form-modal]
---

# Page Source

## Entry File — Broad.tsx

```tsx
// File: Broad.tsx
import { useState } from "react";
import StickyTopBar from "@/components/StickyTopBar";
import BroadHero from "@/components/broad/BroadHero";
import AboutMike from "@/components/AboutMike";
import WhatYoullLearn from "@/components/WhatYoullLearn";
import Footer from "@/components/Footer";
import MobileStickyBar from "@/components/MobileStickyBar";
import FormModal from "@/components/FormModal";

const Broad = () => {
  const [formOpen, setFormOpen] = useState(false);
  const openForm = () => setFormOpen(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StickyTopBar
        onCtaClick={openForm}
        bannerText="For Anyone Ready to Turn What They Know Into Online Income"
      />
      <main>
        <BroadHero onCtaClick={openForm} />
        <AboutMike />
        <WhatYoullLearn onCtaClick={openForm} />
      </main>
      <Footer />
      <MobileStickyBar onCtaClick={openForm} />
      <FormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
};

export default Broad;
```

## BroadHero.tsx

```tsx
// File: BroadHero.tsx
import CountdownTimer from "../CountdownTimer";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import pattern from "@/assets/placeholder.jpg";

const BroadHero = ({ onCtaClick }: { onCtaClick: () => void }) => {
  return (
    <section
      id="register"
      className="relative min-h-screen flex items-center pt-16 pb-16 overflow-hidden"
    >
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[50%] -left-[40%] w-[1200px] h-[1200px] object-cover opacity-35 pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      <img
        src={orangeGradient}
        alt=""
        className="absolute -bottom-[50%] -right-[40%] w-[1200px] h-[1200px] object-cover opacity-35 pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      <img
        src={pattern}
        alt=""
        className="absolute bottom-0 left-0 w-full h-[35%] object-cover object-bottom opacity-[0.10] pointer-events-none mix-blend-overlay"
        style={{
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 md:px-8 w-full text-center">
        <p className="text-primary font-bold text-sm md:text-base tracking-[0.2em] uppercase mb-2">
          FREE LIVE TRAINING
        </p>
        <p className="text-foreground font-semibold text-base md:text-lg mb-8">
          Tuesday, February 24th at 2:00 PM EST (11:00 AM PST)
        </p>

        <h1 className="font-heading text-4xl md:text-5xl lg:text-7xl font-black uppercase leading-[0.95] mb-6 tracking-normal">
          TURN WHAT YOU ALREADY KNOW INTO
          <br />
          <span className="text-primary relative inline-block">
            <span className="relative z-10">A MESSAGE THAT SELLS,</span>
            <span
              className="absolute inset-0 rounded-full blur-[24px] opacity-30"
              style={{ backgroundColor: "hsl(14, 100%, 59%)" }}
            />
          </span>
          <br />
          AN OFFER PEOPLE WANT,
          <br />
          AND A{" "}
          <span className="text-primary relative inline-block">
            <span className="relative z-10">BUSINESS</span>
            <span
              className="absolute inset-0 rounded-full blur-[24px] opacity-30"
              style={{ backgroundColor: "hsl(14, 100%, 59%)" }}
            />
          </span>{" "}
          THAT RUNS WITHOUT YOU.
        </h1>

        <p className="text-muted-foreground text-base md:text-lg max-w-xl mb-10 leading-relaxed mx-auto">
          In this free training, I'm breaking down the exact framework behind
          150+ online program launches — for coaches and experts who were
          world-class at their craft but couldn't figure out how to sell and
          market it.
        </p>

        <button
          onClick={onCtaClick}
          className="inline-block bg-primary text-primary-foreground font-bold text-lg md:text-xl px-10 py-4 rounded-[20px] hover:bg-primary/90 transition-colors mb-3"
        >
          SAVE MY SPOT
        </button>
        <p className="text-muted-foreground text-sm mb-8">
          Register now to get your private Zoom link + free bonus
        </p>

        <div className="flex justify-center">
          <CountdownTimer />
        </div>
      </div>
    </section>
  );
};

export default BroadHero;
```

## StickyTopBar.tsx

```tsx
// File: StickyTopBar.tsx
import logo from "@/assets/placeholder.jpg";

const StickyTopBar = ({ onCtaClick, bannerText }: { onCtaClick: () => void; bannerText?: string }) => {
  return (
    <>
      {/* Desktop: sticky fixed header */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center">
          <img src={logo} alt="Freedom Builderz" className="h-8 shrink-0" />
          <p className="text-sm md:text-base text-foreground font-medium hidden lg:block flex-1 text-center">
            {bannerText || "For Creators & Experts With a Following — But No Offer That Sells"}
          </p>
          <button
            onClick={onCtaClick}
            className="ml-auto lg:ml-0 shrink-0 bg-primary text-primary-foreground font-bold text-sm px-5 py-2 rounded-[20px] hover:bg-primary/90 transition-colors"
          >
            SAVE MY SPOT
          </button>
        </div>
      </div>

      {/* Mobile: static header that scrolls away */}
      <div className="sm:hidden bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <img src={logo} alt="Freedom Builderz" className="h-8 shrink-0" />
          <button
            onClick={onCtaClick}
            className="shrink-0 bg-primary text-primary-foreground font-bold text-sm px-5 py-2 rounded-[20px] hover:bg-primary/90 transition-colors"
          >
            SAVE MY SPOT
          </button>
        </div>
      </div>
    </>
  );
};

export default StickyTopBar;
```

## AboutMike.tsx

```tsx
// File: AboutMike.tsx
import { useEffect, useRef, useState } from "react";
import mikePhoto from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import purpleGradient from "@/assets/placeholder.jpg";
import pattern from "@/assets/placeholder.jpg";

const useCountUp = (target: number, duration = 2000, prefix = "", suffix = "") => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  const display = `${prefix}${value.toLocaleString()}${suffix}`;
  return { ref, display };
};

const stats = [
  { target: 46, suffix: "", label: "Six-Figure Brands Built" },
  { target: 1000000, prefix: "$", suffix: "+", label: "Client Revenue Generated" },
  { target: 100, suffix: "+", label: "Online Programs Launched" },
];

const AboutMike = () => {
  const stat0 = useCountUp(stats[0].target, 2000, stats[0].prefix || "", stats[0].suffix);
  const stat1 = useCountUp(stats[1].target, 2500, stats[1].prefix || "", stats[1].suffix);
  const stat2 = useCountUp(stats[2].target, 2000, stats[2].prefix || "", stats[2].suffix);
  const statRefs = [stat0, stat1, stat2];

  return (
    <section
      className="relative py-14 px-4 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #F8F6F6 0%, #F0EDEB 100%)",
      }}
    >
      {/* Purple gradient — top left */}
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      {/* Orange gradient — bottom right */}
      <img
        src={orangeGradient}
        alt=""
        className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      {/* Brand pattern at top edge, fading down */}
      <img
        src={pattern}
        alt=""
        className="absolute top-0 left-0 w-full h-[35%] object-cover opacity-[0.06] pointer-events-none"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10">
          {/* Photo with subtle glow */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: "radial-gradient(circle at center, rgba(255,93,46,0.10) 0%, transparent 70%)",
                transform: "scale(1.2)",
              }}
            />
            <img
              src={mikePhoto}
              alt="Mike — Freedom Builderz"
              className="relative w-full md:w-auto rounded-lg object-cover max-h-[380px]"
              style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}
            />
          </div>

          <div className="max-w-[420px]">
            <h2
              className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight mb-3"
              style={{ color: "#090909" }}
            >
              MEET YOUR HOST
            </h2>
            <p className="text-base md:text-lg leading-relaxed mb-4" style={{ color: "#232526" }}>
              I used to train clients in a gym for $50/hour. Now I've helped
              creators and experts across every niche imaginable turn what they
              know into six and seven-figure online businesses — from psychic
              mediums to NFL athletes to OBGYNs. If you have knowledge that
              helps people, I can help you package and sell it.
            </p>
            <p
              className="text-sm md:text-base leading-relaxed font-bold italic"
              style={{ color: "#FF5D2E" }}
            >
              "This system has worked for creators in 50+ niches — from fitness
              coaches to documentary filmmakers to yoga teachers."
            </p>
          </div>
        </div>

        {/* Stats — open, no container */}
        <div className="flex flex-col md:flex-row items-center justify-around gap-8 pt-6 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          {statRefs.map((stat, i) => (
            <div key={i} ref={stat.ref} className="flex flex-col items-center text-center">
              <span className="font-heading text-4xl md:text-5xl font-black tabular-nums" style={{ color: "#090909" }}>
                {stat.display}
              </span>
              <span className="text-xs md:text-sm mt-1 uppercase tracking-wider" style={{ color: "#888" }}>
                {stats[i].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutMike;
```

## WhatYoullLearn.tsx

```tsx
// File: WhatYoullLearn.tsx
import CountdownTimer from "./CountdownTimer";
import CaseStudyTeaser from "./CaseStudyTeaser";
import purpleGradient from "@/assets/placeholder.jpg";

import orangeGradient from "@/assets/placeholder.jpg";
import blueGradient from "@/assets/placeholder.jpg";

const points = [
  {
    num: "01",
    title: "THE MESSAGING FRAMEWORK",
    desc: "How to clarify your message so your audience instantly gets what you do and wants to buy.",
    bg: purpleGradient,
  },
  {
    num: "02",
    title: "THE OFFER BLUEPRINT",
    desc: "How to package what you already know into something people actually want to pay for.",
    bg: orangeGradient,
  },
  {
    num: "03",
    title: "THE LAUNCH SYSTEM",
    desc: "The exact process behind launches from $10K to $500K+ — even in niches nobody thought would work.",
    bg: blueGradient,
  },
];

const WhatYoullLearn = ({ onCtaClick }: { onCtaClick: () => void }) => {
  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Ambient purple gradient */}
      <img
        src={purpleGradient}
        alt=""
        className="absolute -top-[30%] -right-[45%] w-[1100px] h-[1100px] object-cover opacity-25 pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{ maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)', WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)' }}
      />

      <div className="relative z-10 max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase text-center mb-12 tracking-tight">
          WHAT YOU'LL LEARN
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {points.map((p, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-[20px] min-h-[280px] flex flex-col justify-end"
            >
              {/* Gradient background */}
              <img
                src={p.bg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-black/20" />

              {/* Content */}
              <div className="relative z-10 p-7 flex flex-col h-full">
                <span className="font-heading text-5xl font-black text-white/80 mb-4">
                  {p.num}
                </span>
                <h3 className="font-heading text-white font-bold text-lg uppercase tracking-wide mb-2">
                  {p.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Case Study Teaser */}
        <CaseStudyTeaser />

        {/* Timer */}
        <div className="flex justify-center mb-8">
          <CountdownTimer />
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onCtaClick}
            className="inline-block bg-primary text-primary-foreground font-bold text-lg md:text-xl px-10 py-4 rounded-[20px] hover:bg-primary/90 transition-colors mb-3"
          >
            SAVE MY SPOT — IT'S FREE
          </button>
          <p className="text-foreground/80 text-sm md:text-base mb-2">
            Tuesday, February 24th at 2:00 PM EST (11:00 AM PST)
          </p>
          <p className="text-muted-foreground text-sm">
            Live attendance only. Replays not guaranteed.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhatYoullLearn;
```

## MobileStickyBar.tsx

```tsx
// File: MobileStickyBar.tsx
import { useState, useEffect } from "react";
import CountdownTimer from "./CountdownTimer";

const MobileStickyBar = ({ onCtaClick }: { onCtaClick: () => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollThreshold = document.documentElement.scrollHeight / 3;
      setVisible(window.scrollY >= scrollThreshold);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border px-4 py-3 sm:hidden transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex justify-center mb-2 scale-[0.65] origin-center">
        <CountdownTimer />
      </div>
      <button
        onClick={onCtaClick}
        className="block w-full bg-primary text-primary-foreground font-bold text-center py-3 rounded-[20px] hover:bg-primary/90 transition-colors"
      >
        SAVE MY SPOT
      </button>
      <p className="text-center text-[11px] text-white/60 mt-1.5">
        Live attendance only. Replays not guaranteed.
      </p>
    </div>
  );
};

export default MobileStickyBar;
```

## FormModal.tsx

```tsx
// File: FormModal.tsx
import { useEffect, useMemo } from "react";
import CountdownTimer from "./CountdownTimer";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
}

const FormModal = ({ open, onClose }: FormModalProps) => {
  const iframeSrc = useMemo(() => {
    const base = "https://your-form-provider.com/embed/YOUR_FORM_ID";
    const params = window.location.search;
    return params ? `${base}${params}` : base;
  }, []);
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative overflow-hidden w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: "#0d0d0d",
          borderRadius: "20px",
          boxShadow: "0 0 60px rgba(255, 93, 46, 0.15), 0 25px 50px rgba(0,0,0,0.6)",
          padding: "36px 36px 20px 36px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Purple gradient — top left */}
        <img
          src={purpleGradient}
          alt=""
          className="absolute -top-[40%] -left-[40%] w-[600px] h-[600px] object-cover opacity-25 pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        {/* Orange gradient — bottom right */}
        <img
          src={orangeGradient}
          alt=""
          className="absolute -bottom-[40%] -right-[40%] w-[600px] h-[600px] object-cover opacity-25 pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        {/* Subtle brand pattern */}
        <img
          src={patternWhite}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.04] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 80%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 80%)",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Headline */}
          <h2 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-2">
            YOU'RE IN. SAVE YOUR{" "}
            <span className="text-primary">SPOT.</span>
          </h2>

          {/* Subhead */}
          <p className="text-muted-foreground text-sm md:text-base mb-4 max-w-sm">
            Enter your details below to reserve your seat for the free training.
          </p>

          {/* Countdown */}
          <div className="mb-4 flex flex-col items-center gap-1.5">
            <span className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] font-semibold">
              Training starts in:
            </span>
            <div className="scale-[0.75] origin-center">
              <CountdownTimer />
            </div>
          </div>

          {/* Embedded form */}
          <div className="w-full" style={{ height: "300px" }}>
            <iframe
              src={iframeSrc}
              style={{ width: "100%", height: "100%", border: "none", borderRadius: "3px" }}
              id="inline-YOUR_FORM_ID"
              data-layout="{'id':'INLINE'}"
              data-trigger-type="alwaysShow"
              data-activation-type="alwaysActivated"
              data-deactivation-type="neverDeactivate"
              data-form-name="Webinar Optin Form"
              data-height="490"
              data-layout-iframe-id="YOUR_FORM_ID"
              data-form-id="YOUR_FORM_ID"
              title="Webinar Optin Form"
            />
          </div>

          {/* Bonus reminder */}
          <p className="text-primary text-xs md:text-sm mt-2 mb-1">
            🔓 8 success stories unlocked on the next page
          </p>

          {/* Scarcity line */}
          <p className="text-muted-foreground text-xs mb-0">
            Live attendance only. Limited spots available.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormModal;
```

## Footer.tsx

```tsx
// File: Footer.tsx
import logoDark from "@/assets/placeholder.jpg";

const Footer = () => {
  return (
    <footer className="bg-white py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-center gap-8">
        {/* Logo — left column */}
        <div className="shrink-0">
          <img
            src={logoDark}
            alt="Freedom Builderz"
            className="h-20 md:h-28 w-auto"
          />
        </div>

        {/* Disclaimer — center column */}
        <div className="flex-1 text-center">
          <p className="text-gray-500 text-xs leading-relaxed">
            Disclaimer: Results vary based on individual effort, market conditions, and business experience. Freedom Builderz does not guarantee specific income outcomes. Testimonials represent individual experiences and are not typical results.
          </p>
        </div>

        {/* Links — right column */}
        <div className="shrink-0 flex flex-col items-center md:items-end gap-2 text-xs">
          <a
            href="#privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900 transition-colors underline"
          >
            Privacy Policy
          </a>
          <a
            href="#privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-900 transition-colors underline"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
```
$res_webinar_freedom_builders_optin_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/freedom-builders-replay.md',
  $res_webinar_freedom_builders_replay_md$
---
name: "Freedom Builders - Webinar Replay"
category: webinar
company: "Freedom Builders"
page_type: webinar-replay
description: "Webinar replay with countdown to expiry. Wistia video, key takeaways, urgency, sticky bottom CTA."
tags: [webinar, replay, countdown, urgency, wistia, sticky-cta]
---

# Page Source

```tsx
// File: Replay.tsx
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/placeholder.jpg";
import purpleGradient from "@/assets/placeholder.jpg";
import orangeGradient from "@/assets/placeholder.jpg";
import patternWhite from "@/assets/placeholder.jpg";
import ReplayCountdown from "@/components/replay/ReplayCountdown";
import Footer from "@/components/Footer";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "wistia-player": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { "media-id"?: string; aspect?: string }, HTMLElement>;
    }
  }
}


const BOOKING_URL = "https://themessagingblueprint.com/join";

const Replay = () => {
  // Replay is hidden until Wednesday Feb 25, 2026 at 8:00 AM EST
  const REPLAY_AVAILABLE = new Date("2026-02-25T08:00:00-05:00").getTime();
  const isAvailable = Date.now() >= REPLAY_AVAILABLE;

  useEffect(() => {
    if (!isAvailable) return;
    // Load Wistia scripts
    const playerScript = document.createElement("script");
    playerScript.src = "https://example.com/placeholder-player.js";
    playerScript.async = true;
    document.head.appendChild(playerScript);

    const embedScript = document.createElement("script");
    embedScript.src = "https://example.com/placeholder-embed.js";
    embedScript.async = true;
    embedScript.type = "module";
    document.head.appendChild(embedScript);

    return () => {
      document.head.removeChild(playerScript);
      document.head.removeChild(embedScript);
    };
  }, [isAvailable]);

  if (!isAvailable) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4" style={{ background: "#090909" }}>
        <div className="text-center max-w-md">
          <img src={logo} alt="Freedom Builderz" className="h-8 mx-auto mb-8" />
          <h1 className="font-heading text-2xl md:text-4xl font-black uppercase tracking-tight text-white mb-4">
            REPLAY <span style={{ color: "#FF5D2E" }}>CLOSED</span>
          </h1>
          <p className="text-white/50 text-base mb-8">
            If you want to learn more about Freedom Builders, schedule a call with our team using the calendar below.
          </p>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white text-base font-bold transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "#FF5D2E" }}
          >
            Schedule a Call <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <div className="border-b border-white/10" style={{ background: "#090909" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-16 py-3 md:py-4 flex items-center justify-between gap-3">
          <img src={logo} alt="Freedom Builderz" className="h-6 md:h-8 shrink-0" />
          <p className="text-right text-xs md:text-base text-white font-bold leading-tight">
            ⏰ Replay Expires Friday at Midnight
          </p>
        </div>
      </div>

      {/* Urgency banner */}
      <div className="w-full py-2.5 px-4 text-center" style={{ background: "linear-gradient(90deg, #FF5D2E, #FF8A5C)" }}>
        <p className="text-sm md:text-base font-heading font-black uppercase tracking-wide text-white">
          🔥 This Replay Will Be Taken Down In:
        </p>
      </div>

      {/* Countdown */}
      <div className="py-4 flex justify-center" style={{ background: "#090909" }}>
        <ReplayCountdown />
      </div>

      {/* Hero / Video Section */}
      <section className="relative py-10 md:py-16 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <img src={purpleGradient} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={orangeGradient} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={patternWhite} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h1 className="font-heading text-2xl md:text-5xl font-black uppercase tracking-tight text-white mb-3 md:mb-4">
            WATCH THE{" "}
            <span style={{ color: "#FF5D2E" }}>FULL REPLAY</span>
          </h1>
          <p className="text-white/60 text-sm md:text-lg mb-8 md:mb-10 max-w-xl mx-auto">
            You missed the live training — but the replay is here for a limited time. Watch it now before it's gone.
          </p>

          {/* Wistia Video */}
          <div
            className="relative w-full max-w-[800px] mx-auto mb-10 rounded-[20px] overflow-hidden"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}
          >
            <style>{`wistia-player[media-id='VIDEO_ID']:not(:defined) { background: center / contain no-repeat url('/placeholder.jpg'); display: block; filter: blur(5px); padding-top:56.25%; }`}</style>
            <wistia-player media-id="VIDEO_ID" aspect="1.7777777777777777"></wistia-player>
          </div>

          {/* Mid-page CTA */}
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white text-base md:text-lg font-bold transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "#FF5D2E" }}
          >
            Book Your Free Strategy Call <ArrowRight className="w-5 h-5" />
          </a>
          <p className="text-white/40 text-sm mt-3">
            Only 10 spots available — first come, first served.
          </p>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="py-16 md:py-20 px-4" style={{ background: "#0d0d0d" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-xl md:text-3xl font-black uppercase tracking-tight text-white text-center mb-10">
            WHAT YOU'LL LEARN IN{" "}
            <span style={{ color: "#FF5D2E" }}>THIS TRAINING</span>
          </h2>

          <div className="space-y-4">
            {[
              "How to turn your existing audience into a real, revenue-generating business",
              "The exact framework to package your knowledge into an offer people actually buy",
              "Why most creators stay stuck — and the simple shift that changes everything",
              "The done-for-you system that lets you launch in days, not months",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 md:p-5 rounded-xl"
                style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-primary font-heading font-black text-lg mt-0.5">✓</span>
                <p className="text-white/80 text-sm md:text-base">{item}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white text-base font-bold transition-all hover:brightness-110"
              style={{ background: "#FF5D2E" }}
            >
              Ready? Book Your Free Call <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* Final urgency section */}
      <section className="py-16 md:py-20 px-4 text-center" style={{ background: "#090909" }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-white/50 text-base mb-2">⏰ Don't wait</p>
          <h2 className="font-heading text-2xl md:text-4xl font-black uppercase tracking-tight text-white mb-4">
            THIS REPLAY EXPIRES{" "}
            <span style={{ color: "#FF5D2E" }}>FRIDAY AT MIDNIGHT</span>
          </h2>
          <p className="text-white/50 text-base mb-6 max-w-lg mx-auto">
            Once it's gone, it's gone. If what you saw resonated, take the next step now.
          </p>
          <div className="flex justify-center mb-8">
            <ReplayCountdown />
          </div>
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white text-lg font-bold transition-all hover:brightness-110 hover:scale-[1.02]"
            style={{ background: "#FF5D2E" }}
          >
            Book Your Free Strategy Call <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Sticky bottom CTA (mobile + desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 backdrop-blur-md" style={{ background: "rgba(9,9,9,0.95)" }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-white text-sm font-bold">Ready to launch your program?</p>
            <p className="text-white/50 text-xs">Only 10 spots available</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="hidden md:flex scale-[0.6] origin-right shrink-0">
              <ReplayCountdown />
            </div>
            <a
              href={BOOKING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none text-center px-6 py-3 rounded-xl text-white text-sm font-bold transition-all hover:brightness-110"
              style={{ background: "#FF5D2E" }}
            >
              Book Your Free Call →
            </a>
          </div>
        </div>
      </div>

      {/* Spacer for sticky bar */}
      <div className="h-16" />

      <Footer />
    </div>
  );
};

export default Replay;

```

$res_webinar_freedom_builders_replay_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/insurance-creators-confirmation.md',
  $res_webinar_insurance_creators_confirmation_md$
---
name: "Insurance Creators - Confirmation"
category: webinar
company: "Insurance Creators"
page_type: webinar-confirmation
description: "Premium webinar confirmation. Gold/black theme, 3 action steps, optional video, what to expect bullets, exit intent."
tags: [webinar, confirmation, premium, gold-theme, calendar, steps]
---

# Page Source

```tsx
// File: PreLaunch.tsx
import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Check,
  Play,
  Calendar,
  Mail,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/webinar/SEO";
import logo from "@/assets/placeholder.jpg";

// Webinar date - January 21, 2026 at 10:30am PST
const WEBINAR_DATE = new Date("2026-01-21T10:30:00-08:00");
const WEBINAR_TITLE = "The 3-Part System to Generate Inbound Leads on Autopilot";

const PreLaunch = () => {
  const [showExitIntent, setShowExitIntent] = useState(false);

  // Fire confetti on mount from both sides (once only)
  const confettiFired = useRef(false);
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    
    const timer = setTimeout(() => {
      // Left side confetti
      confetti({
        particleCount: 80,
        spread: 60,
        angle: 60,
        origin: { x: 0, y: 0.6 },
        colors: ["#D4A500", "#FFD700", "#ffffff"],
      });
      // Right side confetti
      confetti({
        particleCount: 80,
        spread: 60,
        angle: 120,
        origin: { x: 1, y: 0.6 },
        colors: ["#D4A500", "#FFD700", "#ffffff"],
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !showExitIntent) {
        setShowExitIntent(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [showExitIntent]);

  const formatWebinarDate = () => {
    return WEBINAR_DATE.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const generateCalendarLinks = () => {
    const event = {
      title: WEBINAR_TITLE,
      start: "20260121T183000Z", // 10:30am PST = 6:30pm UTC
      end: "20260121T200000Z",   // ~90 min training
      details: "Join us for the live training on generating inbound leads on autopilot.",
      location: "Online - Link will be sent via email"
    };
    
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.start}/${event.end}&details=${encodeURIComponent(event.details)}&location=${encodeURIComponent(event.location)}`;
    
    return { googleCalUrl };
  };

  const { googleCalUrl } = generateCalendarLinks();

  const whatToExpect = [
    'Why "more content" isn\'t the answer — and what actually builds trust in 2026',
    "The 3-part Visibility → Trust → AI framework you can implement the same week",
    "The exact Google Reviews system Nick uses to turn happy clients into a lead-generating asset",
    "Where AI fits (and where it doesn't) so you can stay authentic while saving hours every week",
    "A live Q&A where Nick answers your specific questions"
  ];

  return (
    <>
      <SEO
        title="You're In! | Training Confirmation"
        description="Your seat is confirmed. Here's what to do next to get the most out of the training."
      />

      <div className="min-h-screen bg-black">
        {/* Header with Logo */}
        <header className="py-6 border-b border-gray-900">
          <div className="container mx-auto px-4">
            <div className="flex justify-center">
              <img src={logo} alt="The Insurance Creators" className="h-12 md:h-14 w-auto" />
            </div>
          </div>
        </header>

        {/* Congratulations Header */}
        <section className="py-12 md:py-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-1/4 w-64 h-64 bg-webinar-gold/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-webinar-gold/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Large Congratulations with checkmarks */}
            <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-webinar-gold bg-webinar-gold/20 flex items-center justify-center">
                <Check className="w-6 h-6 md:w-8 md:h-8 text-webinar-gold" />
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
                You're In!
              </h1>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-webinar-gold bg-webinar-gold/20 flex items-center justify-center">
                <Check className="w-6 h-6 md:w-8 md:h-8 text-webinar-gold" />
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl text-white font-bold mb-4">
              Here's What To Do Next...
            </h2>

            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
              Your seat is confirmed for <span className="text-webinar-gold font-semibold">{WEBINAR_TITLE}</span> on <span className="text-white">{formatWebinarDate()}</span>.
            </p>
          </div>
        </section>

        {/* Steps Container */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-8">
              
              {/* Step #1 - Add to Calendar */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-6 py-2 rounded-full bg-webinar-gold text-black font-bold text-sm uppercase tracking-wider shadow-lg">
                    Step #1
                  </div>
                </div>
                
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 md:p-10 pt-10">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Calendar className="w-8 h-8 text-webinar-gold" />
                    <h3 className="text-white font-bold text-xl md:text-2xl">Add It To Your Calendar</h3>
                  </div>

                  <p className="text-gray-400 text-center mb-6 max-w-xl mx-auto">
                    This is a live training — and the best insights come from showing up live and asking questions.
                  </p>

                  {/* Calendar Buttons */}
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button
                      onClick={() => window.open(googleCalUrl, '_blank')}
                      className="bg-webinar-gold hover:bg-webinar-gold-dark text-black font-bold"
                    >
                      Add to Google Calendar
                    </Button>
                    <Button
                      variant="outline"
                      className="border-gray-600 text-white hover:bg-gray-800"
                      onClick={() => window.open(googleCalUrl, '_blank')}
                    >
                      Add to iCal
                    </Button>
                    <Button
                      variant="outline"
                      className="border-gray-600 text-white hover:bg-gray-800"
                      onClick={() => window.open(googleCalUrl, '_blank')}
                    >
                      Add to Outlook
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step #2 - Check Your Email */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-6 py-2 rounded-full bg-webinar-gold text-black font-bold text-sm uppercase tracking-wider shadow-lg">
                    Step #2
                  </div>
                </div>
                
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 md:p-10 pt-10">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Mail className="w-8 h-8 text-webinar-gold" />
                    <h3 className="text-white font-bold text-xl md:text-2xl">Check Your Email</h3>
                  </div>

                  <p className="text-gray-400 text-center max-w-xl mx-auto">
                    We just sent you a confirmation email with your unique access link. If you don't see it in the next few minutes, check your spam/promotions folder and mark us as "not spam" so you don't miss the reminders.
                  </p>
                </div>
              </div>

              {/* Step #3 - Block The Time */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-6 py-2 rounded-full bg-webinar-gold text-black font-bold text-sm uppercase tracking-wider shadow-lg">
                    Step #3
                  </div>
                </div>
                
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 md:p-10 pt-10">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Clock className="w-8 h-8 text-webinar-gold" />
                    <h3 className="text-white font-bold text-xl md:text-2xl">Block The Time — Seriously</h3>
                  </div>

                  <div className="text-gray-400 text-center max-w-xl mx-auto space-y-4">
                    <p className="font-medium text-white">Here's the truth most people won't tell you:</p>
                    <p>
                      The agencies that are growing right now aren't smarter than you. They just actually block the time to work <span className="text-webinar-gold font-semibold">ON</span> their business instead of only <span className="text-webinar-gold font-semibold">IN</span> it.
                    </p>
                    <p>
                      This training is 60-90 minutes that could change how you generate leads for the rest of your career.
                    </p>
                    <p className="text-white font-semibold">
                      Don't let a "busy day" steal that from you.
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Video Section */}
              <div className="relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="px-6 py-2 rounded-full bg-gray-700 text-white font-bold text-sm uppercase tracking-wider shadow-lg">
                    Optional
                  </div>
                </div>
                
                <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 md:p-10 pt-10">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Play className="w-8 h-8 text-webinar-gold" />
                    <h3 className="text-white font-bold text-xl md:text-2xl">Watch This Short Video</h3>
                  </div>

                  <p className="text-gray-400 text-center mb-6 max-w-xl mx-auto">
                    Quick message from Nick on what to expect and how to get the most out of this training...
                  </p>

                  {/* Video Placeholder */}
                  <div className="max-w-2xl mx-auto">
                    <div className="aspect-video rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-gray-700 overflow-hidden">
                      <div className="text-center">
                        <button className="w-20 h-20 rounded-full bg-webinar-gold/90 hover:bg-webinar-gold flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl group">
                          <Play className="w-8 h-8 text-black ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* What To Expect Section */}
              <div className="bg-gray-950 border border-webinar-gold/30 rounded-2xl p-6 md:p-10">
                <h3 className="text-white font-bold text-xl md:text-2xl text-center mb-8">
                  On the Training, We'll Cover:
                </h3>

                <div className="space-y-4 max-w-2xl mx-auto">
                  {whatToExpect.map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-webinar-gold/20 flex items-center justify-center mt-0.5">
                        <span className="text-webinar-gold text-sm">🔹</span>
                      </div>
                      <p className="text-gray-300 text-base">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Note */}
              <div className="bg-gradient-to-br from-gray-950 to-black border border-gray-800 rounded-2xl p-6 md:p-10">
                <h3 className="text-webinar-gold font-bold text-xl md:text-2xl text-center mb-6">
                  One Last Thing...
                </h3>

                <div className="text-gray-400 text-center max-w-xl mx-auto space-y-4">
                  <p>
                    Nick's going to be direct with you on this training. No fluff, no hype — just the honest playbook that's working for agency owners who are actually doing the work.
                  </p>
                  <p className="text-white font-semibold">
                    If you want the results, you have to follow the playbook.
                  </p>
                  <p className="text-webinar-gold font-bold text-lg mt-6">
                    See you on {formatWebinarDate()}.
                  </p>
                  <p className="text-gray-500 italic">
                    — The Insurance Creators Team
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black py-12 border-t border-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img src={logo} alt="The Insurance Creators" className="h-10 w-auto opacity-60" />
              </div>
              
              <p className="text-gray-500 text-sm">
                © 2025 The Insurance Creators. All rights reserved.
              </p>
              
              <div className="flex justify-center gap-6">
                <a href="#" className="text-gray-500 hover:text-webinar-gold text-sm transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-webinar-gold text-sm transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-500 hover:text-webinar-gold text-sm transition-colors">
                  Contact
                </a>
              </div>

              <div className="pt-6 border-t border-gray-800 space-y-4">
                <p className="text-gray-600 text-xs leading-relaxed">
                  This site is not a part of the Facebook website or Facebook Inc. Additionally, this site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of FACEBOOK, Inc.
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  The results and testimonials shared on this page are not typical, nor are they a guarantee of future earnings or success. Individual results will vary and depend on many factors including but not limited to background, experience, and work ethic.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Exit Intent Popup */}
        {showExitIntent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-gradient-to-br from-gray-950 to-black border border-webinar-gold/30 rounded-2xl p-8 max-w-md mx-4 relative">
              <button
                onClick={() => setShowExitIntent(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-bold text-white mb-4 text-center">
                Don't Forget to Add It to Your Calendar! 📅
              </h3>
              <p className="text-gray-400 mb-6 text-center">
                The best insights come from showing up live. Block the time now so you don't miss it.
              </p>
              <Button
                onClick={() => {
                  window.open(googleCalUrl, '_blank');
                  setShowExitIntent(false);
                }}
                className="w-full bg-webinar-gold hover:bg-webinar-gold-dark text-black font-bold"
              >
                Add to Calendar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PreLaunch;

```

$res_webinar_insurance_creators_confirmation_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/insurance-creators-optin.md',
  $res_webinar_insurance_creators_optin_md$
---
name: "Insurance Creators - Opt-In"
category: webinar
company: "Insurance Creators"
page_type: webinar-optin
description: "Premium gold/black webinar opt-in. Logo header, animated hero with countdown, what you'll learn with locked case studies, registration modal, sticky bottom bar. Gold theme variant of the ROAS template."
tags: [webinar, optin, gold-theme, insurance, countdown, locked-content, sticky-bar, registration-modal]
---

# Page Source

## Entry File — Launch.tsx

```tsx
// File: Launch.tsx
import { useState } from "react";
import { Check, Lock, ArrowRight, Eye, Shield, Sparkles, TrendingUp, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/webinar/SEO";
import CountdownTimer from "@/components/webinar/CountdownTimer";
import CaseStudyCard from "@/components/webinar/CaseStudyCard";
import RegistrationModal from "@/components/webinar/RegistrationModal";
import StickyBottomBar from "@/components/webinar/StickyBottomBar";
import logo from "@/assets/placeholder.jpg";

// Webinar date - January 21, 2026 at 10:30am PST
const WEBINAR_DATE = new Date("2026-01-21T10:30:00-08:00");

const Launch = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const benefits = [
    {
      icon: <Eye className="w-5 h-5" />,
      title: 'The "Trust Recession" Reality',
      description: "Why it now takes 30+ touchpoints (not 7) before someone does business with you, and how to compress those touchpoints into days instead of months"
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "The Visibility → Trust → AI Stack",
      description: "The simple 3-part framework that lets busy agency owners build a consistent online presence without hiring a marketing team or filming content all day"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "The Proof Machine",
      description: "How one agency owner built a system that generates Google reviews on autopilot (and why this single asset outperforms most paid lead sources)"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "The Agent Ladder",
      description: "Where you actually sit today vs. where you want to be, and the honest conversation about what it takes to move up"
    },
    {
      icon: <Bot className="w-5 h-5" />,
      title: "AI as Your Amplifier",
      description: "The specific ways AI can cut your content creation time by 80% without making you sound like a robot or losing your authentic voice"
    }
  ];

  const caseStudies = [
    {
      name: "Sarah Mitchell",
      result: "127 Google Reviews in 90 Days",
      description: "Went from struggling to get reviews to having a fully automated system that brings in new reviews weekly."
    },
    {
      name: "Marcus Chen",
      result: "3x Inbound Leads",
      description: "Built a content system that generates warm inbound leads without spending hours on social media."
    },
    {
      name: "Emily Rodriguez",
      result: "80% Less Content Time",
      description: "Used AI to cut her content creation time dramatically while actually increasing engagement."
    }
  ];

  return (
    <>
      <SEO 
        title="Free Training: Generate Inbound Leads on Autopilot | Insurance Creators" 
        description="Discover how to build visibility, earn trust, and leverage AI so prospects come to YOU pre-sold — even if you're too busy to post on social media consistently." 
      />

      <div className="min-h-screen bg-black">
        {/* Top Banner */}
        <div className="bg-webinar-gold py-3 px-4">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="w-full flex items-center justify-center gap-2 text-black font-bold text-sm md:text-base hover:opacity-90 transition-opacity"
          >
            <ArrowRight className="w-4 h-4" />
            FREE LIVE TRAINING FOR INSURANCE AGENCY OWNERS - REGISTER NOW
          </button>
        </div>

        {/* Hero Section */}
        <section className="relative py-12 md:py-20 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-webinar-gold/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-webinar-gold/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Logo */}
            <div className="flex justify-center mb-8 animate-fade-in-up">
              <img src={logo} alt="The Insurance Creators" className="h-16 md:h-20 w-auto" />
            </div>

            {/* Pre-headline */}
            <p className="text-center text-webinar-gold font-semibold text-sm md:text-base tracking-widest mb-6 animate-fade-in-up uppercase">
              Free Live Training for Insurance Agency Owners
            </p>

            {/* Main Headline */}
            <div className="text-center max-w-5xl mx-auto mb-8">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-8 leading-[1.15] tracking-tight animate-fade-in-up">
                The 3-Part System Top Insurance Agencies Are Using to Generate{" "}
                <span className="text-webinar-gold">Inbound Leads on Autopilot</span>{" "}
                <span className="block mt-2 text-2xl md:text-4xl lg:text-5xl font-bold text-gray-300">
                  (Without Becoming a Full-Time Content Creator)
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                Discover how to build visibility, earn trust, and leverage AI so prospects come to YOU pre-sold — 
                even if you're "too busy" to post on social media consistently.
              </p>
            </div>

            {/* Webinar Date/Time */}
            <p className="text-center text-gray-400 text-base md:text-lg mb-8 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              📅 Wed, Jan 21 • 10:30am PST / 1:30pm EST
            </p>

            {/* Main CTA */}
            <div className="flex justify-center mb-6 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Button 
                onClick={() => setIsModalOpen(true)} 
                size="lg" 
                className="h-14 md:h-16 px-12 md:px-16 text-lg md:text-xl font-bold bg-webinar-gold hover:bg-webinar-gold-dark text-black rounded-lg shadow-xl shadow-webinar-gold/30 transition-all duration-300 hover:scale-105 group"
              >
                Save My Seat
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Countdown Timer */}
            <div className="flex flex-col items-center mb-10 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              <CountdownTimer targetDate={WEBINAR_DATE} size="md" variant="dark" />
            </div>
          </div>
        </section>

        {/* What You'll Learn */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-black to-gray-950">
          <div className="container mx-auto px-4">
            <div className="max-w-[90%] lg:max-w-[85%] mx-auto bg-white/5 rounded-2xl p-8 md:p-12 border border-webinar-gold/20">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-4">
                  In This <span className="text-webinar-gold">Free Training</span>, You'll Learn:
                </h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Left - Bullet Points */}
                <div className="space-y-6">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-webinar-gold/20 border-2 border-webinar-gold flex items-center justify-center">
                        <Check className="w-4 h-4 text-webinar-gold" />
                      </div>
                      <div>
                        <p className="text-white text-base md:text-lg">
                          <span className="font-bold text-webinar-gold">{benefit.title}</span> — {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right - Unlock Case Studies Card */}
                <div 
                  className={`relative rounded-2xl overflow-hidden ${!isUnlocked ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (!isUnlocked) {
                      setIsModalOpen(true);
                    }
                  }}
                >
                  {/* Blurred case studies background */}
                  <div className={`grid grid-cols-1 gap-3 p-4 max-h-[380px] overflow-hidden ${!isUnlocked ? "blur-sm opacity-50" : ""}`}>
                    {caseStudies.map((study, index) => (
                      <CaseStudyCard 
                        key={index} 
                        name={study.name} 
                        result={study.result} 
                        description={study.description} 
                      />
                    ))}
                  </div>
                  
                  {/* Unlock overlay */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-6 rounded-2xl bg-black/90 backdrop-blur-sm border border-webinar-gold/30 max-w-sm">
                        <Lock className="w-10 h-10 text-webinar-gold mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">
                          Unlock Case Studies
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Register for the free training to see detailed case studies and results
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mid-page CTA Section */}
        <section className="py-12 md:py-16 bg-gray-950">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center">
              <Button 
                onClick={() => setIsModalOpen(true)} 
                size="lg" 
                className="h-14 md:h-16 px-12 md:px-16 text-lg md:text-xl font-bold bg-webinar-gold hover:bg-webinar-gold-dark text-black rounded-lg shadow-xl shadow-webinar-gold/30 transition-all duration-300 hover:scale-105 group mb-4"
              >
                Save My Seat
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <p className="text-gray-400 text-sm md:text-base mb-4">
                Spots are limited — Register now to save your seat
              </p>
              
              <CountdownTimer targetDate={WEBINAR_DATE} size="md" variant="dark" />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black py-12 pb-32 border-t border-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img src={logo} alt="The Insurance Creators" className="h-12 w-auto opacity-60" />
              </div>
              
              <p className="text-gray-500 text-sm">
                © 2025 The Insurance Creators. All rights reserved.
              </p>
              
              <div className="flex justify-center gap-6">
                <a href="#" className="text-gray-500 hover:text-webinar-gold text-sm transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-webinar-gold text-sm transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-500 hover:text-webinar-gold text-sm transition-colors">
                  Contact
                </a>
              </div>

              <div className="pt-6 border-t border-gray-800 space-y-4">
                <p className="text-gray-600 text-xs leading-relaxed">
                  This site is not a part of the Facebook website or Facebook Inc. Additionally, this site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of FACEBOOK, Inc.
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  The results and testimonials shared on this page are not typical, nor are they a guarantee of future earnings or success. Individual results will vary and depend on many factors including but not limited to background, experience, and work ethic.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Registration Modal */}
        <RegistrationModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => setIsUnlocked(true)}
        />

        {/* Sticky Bottom Bar */}
        <StickyBottomBar onCtaClick={() => setIsModalOpen(true)} />
      </div>
    </>
  );
};

export default Launch;
```

## RegistrationModal.tsx

```tsx
// File: RegistrationModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

const countries = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
];

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  includeBlackCard?: boolean;
}

const RegistrationModal = ({
  isOpen,
  onClose,
  onSuccess,
  includeBlackCard = false,
}: RegistrationModalProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    countryCode: "US",
    phone: "",
    wantBlackCard: includeBlackCard,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = countries.find(c => c.code === formData.countryCode) || countries[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store registration data in localStorage for demo purposes
    localStorage.setItem("webinarRegistration", JSON.stringify(formData));
    
    setIsSubmitting(false);
    onSuccess?.();
    onClose();
    
    // Navigate to confirmation page
    navigate("/pre-launch");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-950 to-black border-webinar-gold/30 text-white [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl md:text-4xl font-bold text-center">
            <span className="text-webinar-gold">Register</span> to Save Your Spot
          </DialogTitle>
          <p className="text-gray-400 text-center text-sm mt-2">
            + access bonus case study details on the next page
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-300">
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">
              Phone Number
            </Label>
            <div className="flex gap-2">
              <Select
                value={formData.countryCode}
                onValueChange={(value) =>
                  setFormData({ ...formData, countryCode: value })
                }
              >
                <SelectTrigger className="w-[100px] bg-white/10 border-white/20 text-white">
                  <SelectValue>
                    <span className="flex items-center gap-1">
                      <span>{selectedCountry.flag}</span>
                      <span className="text-xs">{selectedCountry.dialCode}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-white/20 max-h-[200px]">
                  {countries.map((country) => (
                    <SelectItem
                      key={country.code}
                      value={country.code}
                      className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                        <span className="text-gray-400 text-xs">{country.dialCode}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-webinar-gold to-webinar-gold-dark hover:from-webinar-gold-dark hover:to-webinar-gold text-black shadow-lg shadow-webinar-gold/30 transition-all duration-300 hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Reserving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Reserve My Free Seat
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-gray-500 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-gray-400">Terms of Service</a> and{" "}
            <a href="#" className="underline hover:text-gray-400">Privacy Policy</a>.
            You may receive communications via text, call, or email.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal;
```

## StickyBottomBar.tsx

```tsx
// File: StickyBottomBar.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface StickyBottomBarProps {
  onCtaClick: () => void;
  ctaText?: string;
  showAfterScroll?: number;
}

const StickyBottomBar = ({
  onCtaClick,
  ctaText = "Reserve My Free Seat",
}: StickyBottomBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-black/95 backdrop-blur-sm border-t border-webinar-gold/30 shadow-2xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left side - event info */}
            <div className="text-white text-center sm:text-left">
              <p className="text-xs uppercase tracking-wider text-webinar-gold font-semibold">FREE LIVE TRAINING</p>
              <p className="text-sm md:text-base font-medium">
                For Insurance Agency Owners
              </p>
            </div>

            {/* CTA Button */}
            <Button
              onClick={onCtaClick}
              className="bg-webinar-gold hover:bg-webinar-gold-dark text-black font-bold px-8 py-2 h-11 md:h-12 rounded-lg shadow-lg shadow-webinar-gold/30 transition-all duration-300 hover:scale-105 group"
            >
              SAVE MY SEAT
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyBottomBar;
```

## LogoBar.tsx

```tsx
// File: LogoBar.tsx
interface LogoBarProps {
  className?: string;
}

const LogoBar = ({ className = "" }: LogoBarProps) => {
  // Placeholder company names for the "As Seen On" section
  const companies = [
    "Forbes",
    "Inc.",
    "Entrepreneur",
    "Business Insider",
    "TechCrunch",
    "Fast Company",
  ];

  return (
    <div className={`pt-4 pb-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {companies.map((company, index) => (
          <div
            key={index}
            className="text-gray-400 hover:text-gray-300 transition-colors duration-300"
          >
            <div className="flex items-center justify-center h-8 md:h-10 px-4 border border-gray-700/50 rounded-lg bg-gray-800/30">
              <span className="text-sm md:text-base font-semibold tracking-wide">
                {company}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogoBar;
```

## TrustIndicators.tsx

```tsx
// File: TrustIndicators.tsx
import { Users, Star, Trophy, TrendingUp } from "lucide-react";

interface TrustIndicator {
  icon: React.ReactNode;
  value: string;
  label: string;
}

interface TrustIndicatorsProps {
  className?: string;
}

const TrustIndicators = ({ className = "" }: TrustIndicatorsProps) => {
  const indicators: TrustIndicator[] = [
    {
      icon: <Users className="w-6 h-6" />,
      value: "50,000+",
      label: "Students Trained",
    },
    {
      icon: <Star className="w-6 h-6" />,
      value: "4.9/5",
      label: "Average Rating",
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      value: "$100M+",
      label: "Revenue Generated",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      value: "12x",
      label: "Average ROI",
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ${className}`}>
      {indicators.map((indicator, index) => (
        <div
          key={index}
          className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group"
        >
          <div className="text-webinar-blue mb-2 group-hover:scale-110 transition-transform">
            {indicator.icon}
          </div>
          <span className="text-2xl md:text-3xl font-bold text-white mb-1">
            {indicator.value}
          </span>
          <span className="text-xs md:text-sm text-gray-400">
            {indicator.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TrustIndicators;
```

## CountdownTimer.tsx

```tsx
// File: CountdownTimer.tsx
import { useState, useEffect, useCallback } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  onExpire?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({
  targetDate,
  onExpire,
  className = "",
  size = "md",
  variant = "dark",
}: CountdownTimerProps) => {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const difference = targetDate.getTime() - new Date().getTime();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0 &&
        !isExpired
      ) {
        setIsExpired(true);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, onExpire, isExpired]);

  const sizeClasses = {
    sm: {
      container: "gap-1.5",
      box: "w-10 h-10 md:w-11 md:h-11",
      number: "text-lg md:text-xl",
      label: "text-[9px] mt-1",
    },
    md: {
      container: "gap-2",
      box: "w-11 h-11 md:w-12 md:h-12",
      number: "text-xl md:text-2xl",
      label: "text-[10px] mt-1",
    },
    lg: {
      container: "gap-2.5",
      box: "w-12 h-12 md:w-14 md:h-14",
      number: "text-2xl md:text-3xl",
      label: "text-xs mt-1",
    },
  };

  const sizes = sizeClasses[size];

  const timeUnits = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Mins" },
    { value: timeLeft.seconds, label: "Secs" },
  ];

  return (
    <div className={`flex ${sizes.container} ${className}`}>
      {timeUnits.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <div
            className={`${sizes.box} bg-webinar-gold rounded-2xl flex items-center justify-center`}
          >
            <span className={`${sizes.number} font-bold text-black tabular-nums`}>
              {unit.value}
            </span>
          </div>
          <span className={`${sizes.label} text-gray-400`}>
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
```

## SEO.tsx

```tsx
// File: SEO.tsx
import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

const SEO = ({ title, description, image, url }: SEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute("content", content);
    };

    // Standard meta tags
    updateMetaTag("description", description);

    // Open Graph tags
    updateMetaTag("og:title", title, true);
    updateMetaTag("og:description", description, true);
    updateMetaTag("og:type", "website", true);
    
    if (image) {
      updateMetaTag("og:image", image, true);
    }
    
    if (url) {
      updateMetaTag("og:url", url, true);
    }

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    
    if (image) {
      updateMetaTag("twitter:image", image);
    }
  }, [title, description, image, url]);

  return null;
};

export default SEO;
```

## CaseStudyCard.tsx

```tsx
// File: CaseStudyCard.tsx
import { cn } from "@/lib/utils";

interface CaseStudyCardProps {
  name: string;
  result: string;
  description: string;
  imageSrc?: string;
  className?: string;
  isLocked?: boolean;
}

const CaseStudyCard = ({
  name,
  result,
  description,
  imageSrc,
  className,
  isLocked = false,
}: CaseStudyCardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
        isLocked && "blur-locked",
        className
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-webinar-gold/10 via-black to-webinar-gold/5" />
      
      {/* Card content */}
      <div className="relative p-6 md:p-8">
        {/* Avatar/Image */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-webinar-gold to-webinar-gold-dark flex items-center justify-center text-black text-2xl font-bold shadow-lg">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-bold text-white mb-1">
              {name}
            </h3>
            <div className="inline-block px-3 py-1 rounded-full bg-webinar-gold/20 border border-webinar-gold/40">
              <span className="text-webinar-gold font-semibold text-sm">
                {result}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm md:text-base leading-relaxed">
          {description}
        </p>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-webinar-gold/10 rounded-full blur-2xl" />
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-webinar-gold/10 rounded-full blur-xl" />
      </div>

      {/* Bottom accent bar */}
      <div className="h-1 bg-gradient-to-r from-webinar-gold via-white to-webinar-gold" />
    </div>
  );
};

export default CaseStudyCard;
```
$res_webinar_insurance_creators_optin_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/leveraged-va-optin.md',
  $res_webinar_leveraged_va_optin_md$
---
name: "Leveraged VA - Webinar Opt-In"
category: webinar
company: "Leveraged VA"
page_type: webinar-optin
description: "Webinar registration page. Light theme, hero with countdown timer and trust badges, 3-card benefits grid, target audience checklist, host bio with stats, bonus section with countdown, registration popup modal with loading state."
tags: [webinar, optin, registration, benefits, host, countdown, bonuses, light-theme]
---

# Page Source

## Entry File — Index.tsx

```tsx
// File: Index.tsx

import Hero from "@/components/Hero";
import Benefits from "@/components/Benefits";
import TargetAudience from "@/components/TargetAudience";
import Host from "@/components/Host";
import Bonus from "@/components/Bonus";
import RegistrationPopup from "@/components/RegistrationPopup";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Benefits />
      <TargetAudience />
      <Host />
      <Bonus />
      <footer className="py-8 bg-muted/30 text-center border-t border-border">
        <div className="container mx-auto">
          <img 
            src="/placeholder.jpg" 
            alt="LeveragedCRE" 
            className="h-12 mx-auto opacity-60"
          />
        </div>
      </footer>
      <RegistrationPopup />
    </div>
  );
};

export default Index;
```

## Hero.tsx

```tsx
// File: Hero.tsx

import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, TrendingUp, ArrowLeft, ArrowRight } from "lucide-react";
import CountdownBanner from "./CountdownBanner";
import CountdownTimer from "./CountdownTimer";

const Hero = () => {
  const openRegistrationPopup = () => {
    (window as any).openRegistrationPopup?.();
  };

  return (
    <>
      <CountdownBanner />
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-6 sm:py-12 lg:py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 sm:mb-10 lg:mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-3 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 rounded-full mb-3 sm:mb-4 lg:mb-6">
              <TrendingUp className="w-4 sm:w-6 lg:w-8 h-4 sm:h-6 lg:h-8 text-primary" />
              <span className="text-sm sm:text-lg lg:text-xl font-bold text-primary">For CRE Brokers</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-3 sm:mb-4 lg:mb-6 leading-tight px-2">
              <span className="block leading-tight">Get Back 15+ Hours a Week</span>
              <span className="block leading-tight">in 21 Days With Our Proven Method</span>
            </h1>
            
            <p className="text-base sm:text-xl lg:text-3xl xl:text-4xl text-foreground mb-4 sm:mb-6 lg:mb-10 max-w-4xl mx-auto leading-relaxed font-semibold px-2">
              Discover the exact system top CRE brokers are using to delegate 80% of their workload, 
              scale their business, and reclaim their life.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 lg:mb-8 px-2">
              <ArrowRight className="w-4 h-4 text-primary animate-pulse hidden sm:block" />
              
              <Button 
                size="lg" 
                className="text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-3 sm:py-4 lg:py-6 bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 w-full sm:w-auto min-h-[44px] rounded-lg font-semibold"
                onClick={openRegistrationPopup}
              >
                Save My Seat Now - It's FREE
              </Button>
              
              <ArrowLeft className="w-4 h-4 text-primary animate-pulse hidden sm:block" />
            </div>

            <div className="mb-6 sm:mb-8 lg:mb-12 px-2">
              <CountdownTimer />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4 text-primary flex-shrink-0" />
                <span>Live Training</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4 text-primary flex-shrink-0" />
                <span>Free Bonuses</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-primary flex-shrink-0" />
                <span>Limited Spots</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
```

## Benefits.tsx

```tsx
// File: Benefits.tsx

import { Rocket, ShieldCheck, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";

const Benefits = () => {
  const openRegistrationPopup = () => {
    (window as any).openRegistrationPopup?.();
  };

  return (
    <section className="py-6 sm:py-12 lg:py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 sm:mb-10 lg:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Live Virtual Training Reveals...
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-2">
            How the Leveraged VA System can transform your CRE brokerage, giving you more time, 
            more freedom, and more success.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-10 lg:mb-12">
          <div className="space-y-3 sm:space-y-4 p-4 sm:p-5 lg:p-6 bg-background rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <Rocket className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-primary" />
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Skyrocket Productivity</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Delegate time-consuming tasks and focus on high-value activities that drive revenue.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4 p-4 sm:p-5 lg:p-6 bg-background rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300">
            <ShieldCheck className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-primary" />
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Reduce Burnout</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Reclaim your work-life balance by offloading tasks that drain your energy and passion.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4 p-4 sm:p-5 lg:p-6 bg-background rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 sm:col-span-2 lg:col-span-1">
            <PiggyBank className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-primary" />
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Increase Profitability</h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Scale your business without increasing your workload, leading to higher profits and greater success.
            </p>
          </div>
        </div>

        <div className="text-center px-2">
          <Button 
            size="lg" 
            className="text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-3 sm:py-4 lg:py-6 bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 w-full sm:w-auto min-h-[44px] rounded-lg font-semibold"
            onClick={openRegistrationPopup}
          >
            Register and Get the Details
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
```

## TargetAudience.tsx

```tsx
// File: TargetAudience.tsx

import { AlertTriangle, Zap, Target, Rocket } from "lucide-react";

const TargetAudience = () => {
  const audiences = [
    {
      icon: <AlertTriangle className="w-5 sm:w-6 h-5 sm:h-6 text-orange-500 flex-shrink-0" />,
      text: "You're a CRE broker buried in busywork"
    },
    {
      icon: <Zap className="w-5 sm:w-6 h-5 sm:h-6 text-red-500 flex-shrink-0" />,
      text: "You're stuck doing everything yourself (and burning out)"
    },
    {
      icon: <Target className="w-5 sm:w-6 h-5 sm:h-6 text-blue-500 flex-shrink-0" />,
      text: "You want more listings, leads, and freedom"
    },
    {
      icon: <Rocket className="w-5 sm:w-6 h-5 sm:h-6 text-green-500 flex-shrink-0" />,
      text: "You're ready to build a scalable brokerage and a life outside of it"
    }
  ];

  return (
    <section className="py-6 sm:py-12 lg:py-16 px-4 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-6 sm:mb-10 lg:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-4 sm:mb-6 lg:mb-8">
            This Is for You If…
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10 lg:mb-12">
          {audiences.map((audience, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 lg:p-6 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0">
                {audience.icon}
              </div>
              <p className="text-sm sm:text-base lg:text-lg text-foreground leading-relaxed">{audience.text}</p>
            </div>
          ))}
        </div>

        <div className="text-center px-2">
          <p className="text-base sm:text-lg text-muted-foreground">
            Does this sound like your current situation?
          </p>
        </div>
      </div>
    </section>
  );
};

export default TargetAudience;
```

## Host.tsx

```tsx
// File: Host.tsx

import { Award, Building, Users, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

const Host = () => {
  const openRegistrationPopup = () => {
    (window as any).openRegistrationPopup?.();
  };

  return (
    <section className="py-6 sm:py-12 lg:py-16 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 sm:mb-10 lg:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            About Your Host
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-6 sm:mb-10 lg:mb-12">
          {/* Phil's Photo - Left Side */}
          <div className="flex flex-col items-center justify-center order-1 lg:order-1">
            <div className="mb-4 sm:mb-6">
              <img 
                src="/placeholder.jpg" 
                alt="Phill Tomlinson - CRE Broker & VA System Founder" 
                className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 object-cover rounded-lg shadow-xl border-4 border-primary/20"
              />
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Phill Tomlinson</h3>
          </div>

          {/* Phil's Results - Right Side */}
          <div className="flex items-center order-2 lg:order-2">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 sm:p-6 lg:p-8 rounded-xl w-full">
              <h4 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-4 sm:mb-6">Phill's Results</h4>
              <div className="space-y-3 sm:space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-muted-foreground">From 7-day work weeks to freedom</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-muted-foreground">Built scalable VA system</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-muted-foreground">Launched coaching business</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-muted-foreground">Takes 8+ vacations annually</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-sm sm:text-base text-muted-foreground">Helps brokers reclaim their time</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Icon Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10 lg:mb-12">
          <div className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-6 bg-muted/50 rounded-lg text-center">
            <Award className="w-6 sm:w-7 lg:w-8 h-6 sm:h-7 lg:h-8 text-primary" />
            <div>
              <p className="font-semibold text-sm sm:text-base lg:text-lg">Top Producer</p>
              <p className="text-xs sm:text-sm text-muted-foreground">CRE Broker</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-6 bg-muted/50 rounded-lg text-center">
            <Building className="w-6 sm:w-7 lg:w-8 h-6 sm:h-7 lg:h-8 text-primary" />
            <div>
              <p className="font-semibold text-sm sm:text-base lg:text-lg">Scaled Business</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Multiple Ventures</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-6 bg-muted/50 rounded-lg text-center">
            <Plane className="w-6 sm:w-7 lg:w-8 h-6 sm:h-7 lg:h-8 text-primary" />
            <div>
              <p className="font-semibold text-sm sm:text-base lg:text-lg">8+ Vacations</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Per Year</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 lg:p-6 bg-muted/50 rounded-lg text-center">
            <Users className="w-6 sm:w-7 lg:w-8 h-6 sm:h-7 lg:h-8 text-primary" />
            <div>
              <p className="font-semibold text-sm sm:text-base lg:text-lg">VA Program</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Founder</p>
            </div>
          </div>
        </div>

        <div className="text-center px-2">
          <Button 
            size="lg" 
            className="text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-3 sm:py-4 lg:py-6 bg-primary hover:bg-primary/90 transform hover:scale-105 transition-all duration-300 w-full sm:w-auto min-h-[44px] rounded-lg font-semibold"
            onClick={openRegistrationPopup}
          >
            Learn Phill's System
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Host;
```

## Bonus.tsx

```tsx
// File: Bonus.tsx

import { Gift, FileText, Users, CheckCircle, Star, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CountdownTimer from "./CountdownTimer";

const Bonus = () => {
  const openRegistrationPopup = () => {
    (window as any).openRegistrationPopup?.();
  };

  const bonuses = [
    {
      icon: <FileText className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-primary" />,
      title: "Cold Call Scripts",
      description: "Proven scripts for landlords, investors & tenants"
    },
    {
      icon: <FileText className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-primary" />,
      title: "Email Templates", 
      description: "Delegation templates for seamless communication"
    },
    {
      icon: <Users className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-primary" />,
      title: "VA Scorecard",
      description: "Assessment tool to find the perfect virtual assistant"
    },
    {
      icon: <Star className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-primary" />,
      title: "Bonus Materials",
      description: "Additional resources and tools"
    }
  ];

  return (
    <section className="py-6 sm:py-12 lg:py-16 px-4 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-6 sm:mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/20 px-3 sm:px-4 py-2 rounded-full mb-3 sm:mb-4 lg:mb-6">
            <Gift className="w-3 sm:w-4 lg:w-5 h-3 sm:h-4 lg:h-5 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">Exclusive Live Attendee Bonuses</span>
          </div>
          
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Get These FREE Bonuses Worth $500+
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Show up live and get instant access to these game-changing resources
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10 lg:mb-12">
          {bonuses.map((bonus, index) => (
            <Card key={index} className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-3 sm:p-4 lg:p-6 text-center">
                <div className="flex justify-center mb-2 sm:mb-3 lg:mb-4">
                  <div className="p-2 sm:p-2.5 lg:p-3 bg-primary/10 rounded-full">
                    {bonus.icon}
                  </div>
                </div>
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-foreground mb-1 sm:mb-2">{bonus.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{bonus.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mb-6 sm:mb-10 lg:mb-12 px-2">
          <Button 
            size="lg" 
            className="text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-3 sm:py-4 lg:py-6 bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300 w-full sm:w-auto min-h-[44px] rounded-lg font-semibold"
            onClick={openRegistrationPopup}
          >
            Register Your Spot to Unlock Bonuses
          </Button>
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-3 sm:space-y-4 lg:space-y-6 px-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Calendar className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-primary flex-shrink-0" />
              <span className="text-sm sm:text-base lg:text-lg font-semibold text-foreground">October 1st, 2025 • 9:00 AM PST</span>
            </div>
          </div>
          
          <CountdownTimer />
        </div>
      </div>
    </section>
  );
};

export default Bonus;
```

## RegistrationPopup.tsx

```tsx
// File: RegistrationPopup.tsx

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RegistrationForm from "./RegistrationForm";
import EventDetails from "./EventDetails";

const RegistrationPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleRegistrationSuccess = () => {
    setIsOpen(false);
  };

  // Create a global trigger function
  React.useEffect(() => {
    (window as any).openRegistrationPopup = () => {
      setIsOpen(true);
      setIsLoading(true);
      // Give the form time to properly load
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Registration Form</DialogTitle>
        <DialogDescription className="sr-only">
          Register for the CRE Brokers webinar training
        </DialogDescription>
        
        {!isLoading && (
          <DialogHeader>
            <div className="text-2xl text-center mb-2 font-semibold">
              Limited Spots Remaining <span className="text-primary">For CRE Brokers Only</span>
            </div>
            <p className="text-center text-muted-foreground font-semibold">
              Enter Your Information Now to Secure Your Spot
            </p>
          </DialogHeader>
        )}
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-xl font-semibold text-primary">
              Seeing If Spots Are Still Available...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 pb-4">
            {/* Event Details */}
            <div className="lg:col-span-2">
              <EventDetails />
            </div>

            {/* Registration Form */}
            <div className="lg:col-span-3">
              <RegistrationForm onSuccess={handleRegistrationSuccess} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationPopup;
```
$res_webinar_leveraged_va_optin_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/sample-webinar-confirmation.md',
  $res_webinar_sample_webinar_confirmation_md$
---
name: "Sample Webinar - Confirmation"
category: webinar
company: "Sample Webinar (ROAS)"
page_type: webinar-confirmation
description: "Gamified webinar confirmation. Confetti, 4 completion steps, progress popup, share-to-unlock, case studies, exit intent."
tags: [webinar, confirmation, gamified, steps, confetti, social-proof]
---

# Page Source

```tsx
// File: PreLaunch.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import {
  Check,
  Play,
  Calendar,
  Users,
  Share2,
  Gift,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/webinar/SEO";
import CountdownTimer from "@/components/webinar/CountdownTimer";
import CaseStudyCard from "@/components/webinar/CaseStudyCard";

// Webinar date - December 10, 2025 at 3pm ET
const WEBINAR_DATE = new Date("2025-12-10T15:00:00-05:00");

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

const PreLaunch = () => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      title: "Watch Welcome Video",
      description: "Get a sneak peek of what's coming",
      icon: <Play className="w-5 h-5" />,
      completed: false,
    },
    {
      id: 2,
      title: "Add to Calendar",
      description: "Don't miss the live event",
      icon: <Calendar className="w-5 h-5" />,
      completed: false,
    },
    {
      id: 3,
      title: "Join the Community",
      description: "Connect with other attendees",
      icon: <Users className="w-5 h-5" />,
      completed: false,
    },
    {
      id: 4,
      title: "Share with Friends",
      description: "Invite 3 friends to unlock bonuses",
      icon: <Share2 className="w-5 h-5" />,
      completed: false,
    },
  ]);

  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showProgressPopup, setShowProgressPopup] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(window.innerWidth < 768);
  const [showExitIntent, setShowExitIntent] = useState(false);

  const completedSteps = steps.filter((s) => s.completed).length;
  const progressPercent = (completedSteps / steps.length) * 100;

  // Fire confetti on mount from both sides (once only)
  const confettiFired = useRef(false);
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    
    const timer = setTimeout(() => {
      // Left side confetti
      confetti({
        particleCount: 80,
        spread: 60,
        angle: 60,
        origin: { x: 0, y: 0.6 },
        colors: ["#3b82f6", "#60a5fa", "#ffffff"],
      });
      // Right side confetti
      confetti({
        particleCount: 80,
        spread: 60,
        angle: 120,
        origin: { x: 1, y: 0.6 },
        colors: ["#3b82f6", "#60a5fa", "#ffffff"],
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Show progress popup after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (completedSteps < steps.length) {
        setShowProgressPopup(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [completedSteps, steps.length]);

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !showExitIntent && completedSteps < 3) {
        setShowExitIntent(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [showExitIntent, completedSteps]);

  const markStepComplete = (stepId: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s))
    );

    // Fire mini confetti for each completed step
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ["#3b82f6", "#60a5fa"],
    });
  };

  const caseStudies = [
    {
      name: "Sarah Mitchell",
      result: "$127K in 60 Minutes",
      description:
        "Went from struggling consultant to generating six figures from a single webinar.",
    },
    {
      name: "Marcus Chen",
      result: "12x ROI First Webinar",
      description:
        "Built a $2M/year coaching business by implementing these strategies.",
    },
    {
      name: "Emily Rodriguez",
      result: "500% Revenue Increase",
      description:
        "Transformed her course business from $50K to $300K annually.",
    },
  ];

  const socialLinks = [
    { icon: <FaFacebookF className="w-4 h-4" />, name: "Facebook", color: "bg-blue-600" },
    { icon: <FaXTwitter className="w-4 h-4" />, name: "X", color: "bg-black" },
    { icon: <FaLinkedinIn className="w-4 h-4" />, name: "LinkedIn", color: "bg-blue-700" },
    { icon: <FaInstagram className="w-4 h-4" />, name: "Instagram", color: "bg-gradient-to-br from-purple-600 to-pink-500" },
  ];

  return (
    <>
      <SEO
        title="You're Registered! | Webinar Confirmation"
        description="Congratulations! You're registered for the webinar. Complete the steps below to maximize your experience."
      />

      <div className="min-h-screen webinar-gradient-dark">
        {/* Congratulations Header */}
        <section className="py-12 md:py-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-1/4 w-64 h-64 bg-webinar-blue/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-webinar-blue/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Large Congratulations with checkmarks */}
            <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-[#3C83F5] flex items-center justify-center">
                <Check className="w-6 h-6 md:w-8 md:h-8 text-[#3C83F5]" />
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight">
                Congratulations
              </h1>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-[#3C83F5] flex items-center justify-center">
                <Check className="w-6 h-6 md:w-8 md:h-8 text-[#3C83F5]" />
              </div>
            </div>

            <p className="text-xl md:text-2xl text-white font-medium mb-3">
              Your Virtual Seat is Saved for the Live Training!
            </p>

            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-10">
              Follow the Steps on This Page to Complete Your Registration and Discover How to Claim Your Bonus!
            </p>

            {/* White container for Step #1 */}
            <div className="max-w-3xl mx-auto relative">
              {/* Step #1 Badge - positioned above container */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                <div className="px-6 py-2 rounded-full bg-[#3C83F5] text-white font-bold text-sm uppercase tracking-wider shadow-lg">
                  Step #1
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 md:p-10 pt-10">

              {/* Video instruction */}
              <p className="text-gray-900 font-bold text-lg md:text-xl mb-6 flex items-center justify-center gap-2">
                <span>👇</span> CLICK PLAY TO WATCH THIS SHORT VIDEO
              </p>

              {/* Video placeholder */}
              <div className="max-w-2xl mx-auto">
                <div className="aspect-video rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-gray-200 overflow-hidden">
                  <div className="text-center">
                    <button
                      onClick={() => markStepComplete(1)}
                      className="w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl group"
                    >
                      <Play className="w-8 h-8 text-gray-900 ml-1" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 1 Completion Checkbox */}
              <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => markStepComplete(1)}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ${steps[0].completed ? 'bg-green-50 text-green-600 shadow-sm' : 'hover:bg-gray-50 text-gray-500 hover:shadow-sm'}`}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${steps[0].completed ? 'bg-green-500 border-green-500 scale-110' : 'border-gray-300 bg-white'}`}>
                    {steps[0].completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-semibold">
                    {steps[0].completed ? '✓ Completed!' : 'Mark Completed'}
                  </span>
                </button>
              </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step #2 - Workshop Details */}
        <section className="py-8 md:py-12 text-center">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto relative">
              {/* Step #2 Badge - positioned above container */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                <div className="px-6 py-2 rounded-full bg-[#3C83F5] text-white font-bold text-sm uppercase tracking-wider shadow-lg">
                  Step #2
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 md:p-10 pt-10">
                {/* Workshop Details Header */}
                <p className="text-gray-900 font-bold text-lg md:text-xl mb-8 flex items-center justify-center gap-2">
                  <span>📅</span> Here are Your Workshop Details...
                </p>

                <div className="space-y-6 text-left max-w-xl mx-auto">
                  {/* Workshop Date */}
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">Your Workshop Is On:</p>
                    <p className="text-gray-900 font-bold text-lg">
                      Wednesday, December 10th at 3:00pm ET / 12:00pm PT
                    </p>
                  </div>

                  {/* How To Join */}
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">How To Join:</p>
                    <a 
                      href="https://roas.co/live" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#3C83F5] font-bold text-lg hover:underline"
                    >
                      https://roas.co/live
                    </a>
                  </div>

                  {/* Email Reminders */}
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-1">We'll Send Reminders To:</p>
                    <p className="text-gray-900 font-bold text-lg">
                      The email you registered with
                    </p>
                  </div>
                </div>

                {/* Add to Calendar Button */}
                <div className="mt-8">
                  <Button
                    onClick={() => {
                      markStepComplete(2);
                      // Google Calendar link
                      const event = {
                        title: "Live Workshop - Selling at Scale",
                        start: "20251210T200000Z",
                        end: "20251210T213000Z",
                        details: "Join us for the live workshop at https://roas.co/live",
                        location: "https://roas.co/live"
                      };
                      const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${event.start}/${event.end}&details=${encodeURIComponent(event.details)}&location=${encodeURIComponent(event.location)}`;
                      window.open(googleCalUrl, '_blank');
                    }}
                    className="bg-[#3C83F5] hover:bg-[#2b6cd9] text-white font-bold px-8 py-3 h-auto text-base"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Add to Calendar
                  </Button>
                </div>

                {/* Step 2 Completion Checkbox */}
                <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => markStepComplete(2)}
                    className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ${steps[1].completed ? 'bg-green-50 text-green-600 shadow-sm' : 'hover:bg-gray-50 text-gray-500 hover:shadow-sm'}`}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${steps[1].completed ? 'bg-green-500 border-green-500 scale-110' : 'border-gray-300 bg-white'}`}>
                      {steps[1].completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-semibold">
                      {steps[1].completed ? '✓ Completed!' : 'Mark Completed'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step #3 - Share with Friends */}
        <section className="py-8 md:py-12 text-center">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto relative">
              {/* Step #3 Badge - positioned above container */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                <div className="px-6 py-2 rounded-full bg-[#3C83F5] text-white font-bold text-sm uppercase tracking-wider shadow-lg">
                  Step #3
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 md:p-10 pt-10">
                {/* Share Header */}
                <p className="text-gray-900 font-bold text-xl md:text-2xl mb-4 uppercase tracking-wide">
                  Share with 3 Friends
                </p>

                <p className="text-gray-600 text-base mb-4 max-w-xl mx-auto">
                  We know you want to stay ahead of the competition and this will certainly do it. But the only thing better than succeeding in business is succeeding with people you love.
                </p>

                <p className="text-gray-600 text-base mb-6 max-w-xl mx-auto">
                  Share this link with 3 people and help our team that's been working hard on this for 9 months be happy.
                </p>

                {/* Copy Message Section */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left max-w-xl mx-auto">
                  <p className="text-gray-500 text-sm font-medium mb-3">Copy & send this message:</p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
                    "Hey! Just found something valuable and wanted to share. It's a free live training on how to use webinars to sell more of your product in less time. They're going live on Dec 10th at 3:00pm ET / 12:00pm PT. Thought you might want to check it out: roas.co/launch"
                  </p>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText("Hey! Just found something valuable and wanted to share. It's a free live training on how to use webinars to sell more of your product in less time. They're going live on Dec 10th at 3:00pm ET / 12:00pm PT. Thought you might want to check it out: roas.co/launch");
                      markStepComplete(3);
                    }}
                    className="w-full bg-[#3C83F5] hover:bg-[#2b6cd9] text-white font-bold py-3 h-auto text-sm uppercase tracking-wide"
                  >
                    Click Here to Copy and Paste This Message
                  </Button>
                </div>

                {/* Or Share Link Section */}
                <div className="max-w-xl mx-auto">
                  <p className="text-gray-500 text-sm font-medium mb-3">Or share just the link:</p>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-[#3C83F5] font-bold text-lg">roas.co/launch</span>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText("https://roas.co/launch");
                      markStepComplete(3);
                    }}
                    variant="outline"
                    className="border-[#3C83F5] text-[#3C83F5] hover:bg-[#3C83F5] hover:text-white font-bold px-8 py-3 h-auto text-base"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Copy Link to Share
                  </Button>
                </div>

                {/* Step 3 Completion Checkbox */}
                <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => markStepComplete(3)}
                    className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ${steps[2].completed ? 'bg-green-50 text-green-600 shadow-sm' : 'hover:bg-gray-50 text-gray-500 hover:shadow-sm'}`}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${steps[2].completed ? 'bg-green-500 border-green-500 scale-110' : 'border-gray-300 bg-white'}`}>
                      {steps[2].completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-semibold">
                      {steps[2].completed ? '✓ Completed!' : 'Mark Completed'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step #4 - Case Studies & Success Stories */}
        <section className="py-8 md:py-12 text-center">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto relative">
              {/* Step #4 Badge - positioned above container */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                <div className="px-6 py-2 rounded-full bg-[#3C83F5] text-white font-bold text-sm uppercase tracking-wider shadow-lg">
                  Step #4
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 md:p-10 pt-10">
                {/* Header */}
                <p className="text-gray-900 font-bold text-xl md:text-2xl mb-2 uppercase tracking-wide">
                  Case Studies & Success Stories
                </p>
                <p className="text-gray-600 text-base mb-8 max-w-xl mx-auto">
                  See what others have achieved using the strategies you'll learn in this workshop
                </p>

                {/* Case Studies Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  {caseStudies.map((study, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-6 text-left">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#3C83F5] flex items-center justify-center text-white font-bold text-lg">
                          {study.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-gray-900 font-bold">{study.name}</p>
                          <p className="text-[#3C83F5] font-semibold text-sm">{study.result}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">{study.description}</p>
                    </div>
                  ))}
                </div>

                {/* Step 4 Completion Checkbox */}
                <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-gray-100">
                  <button
                    onClick={() => markStepComplete(4)}
                    className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ${steps[3].completed ? 'bg-green-50 text-green-600 shadow-sm' : 'hover:bg-gray-50 text-gray-500 hover:shadow-sm'}`}
                  >
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${steps[3].completed ? 'bg-green-500 border-green-500 scale-110' : 'border-gray-300 bg-white'}`}>
                      {steps[3].completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-semibold">
                      {steps[3].completed ? '✓ Completed!' : 'Mark Completed'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Footer */}
        <footer className="bg-black py-12 pb-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <p className="text-gray-500 text-sm">
                © 2025 Your Company. All rights reserved.
              </p>
              
              <div className="flex justify-center gap-6">
                <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
                  Contact
                </a>
              </div>

              <div className="pt-6 border-t border-gray-800 space-y-4">
                <p className="text-gray-600 text-xs leading-relaxed">
                  This company is not affiliated with, endorsed by, or sponsored by Facebook, Inc. or any of its subsidiaries or affiliates. All trademarks and service marks are the property of their respective owners.
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  This site is not a part of the Facebook website or Facebook Inc. Additionally, this site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of FACEBOOK, Inc.
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  The results and testimonials shared on this page are not typical, nor are they a guarantee of future earnings or success. Individual results will vary and depend on many factors including but not limited to background, experience, and work ethic. All business entails risk as well as massive and consistent effort and action.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Progress Popup */}
        {showProgressPopup && (
          <div className="fixed bottom-4 right-4 z-50 animate-scale-in">
            {isProgressCollapsed ? (
              <button
                onClick={() => setIsProgressCollapsed(false)}
                className="bg-white border border-gray-200 rounded-full p-3 shadow-2xl hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <Gift className="w-6 h-6 text-[#3C83F5]" />
                  <span className="absolute -top-1 -right-1 bg-[#3C83F5] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {completedSteps}
                  </span>
                </div>
              </button>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xl max-w-xs relative">
                <button
                  onClick={() => setIsProgressCollapsed(true)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <h4 className="text-gray-900 font-semibold mb-3">
                  Complete Your Setup!
                </h4>
                
                {/* 4 Step Checkboxes */}
                <div className="space-y-3 mb-4">
                  {steps.map((step, index) => (
                    <div key={step.id} className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${step.completed ? 'bg-green-50' : ''}`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 shadow-sm ${step.completed ? 'bg-green-500 border-green-500 scale-110' : 'border-gray-300 bg-white'}`}>
                        {step.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <span className={`text-xs font-medium ${step.completed ? 'text-green-600' : 'text-gray-500'}`}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
                
                <p className="text-gray-500 text-xs">
                  {completedSteps === steps.length ? '🎉 All done!' : `${completedSteps} of ${steps.length} completed`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Exit Intent Popup */}
        {showExitIntent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-gradient-to-br from-webinar-slate to-webinar-blue-dark border border-webinar-blue/30 rounded-2xl p-8 max-w-md mx-4 relative">
              <button
                onClick={() => setShowExitIntent(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-3xl font-bold text-white mb-4 text-center">
                We Can't Wait to See You on the Training! 🎉
              </h3>
              <p className="text-gray-400 mb-6">
                Did you get a chance to watch the video, save to calendar and share this with a couple people?
              </p>
              <Button
                onClick={() => setShowExitIntent(false)}
                className="w-full bg-webinar-blue hover:bg-webinar-blue-dark text-white"
              >
                Go and Finish the Steps
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Step Card Component
interface StepCardProps {
  step: Step;
  onComplete: () => void;
  children: React.ReactNode;
}

const StepCard = ({ step, onComplete, children }: StepCardProps) => {
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        step.completed
          ? "border-webinar-success/50 bg-webinar-success/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-4 md:p-6 border-b border-white/5">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            step.completed
              ? "bg-webinar-success text-white"
              : "bg-webinar-blue/20 text-webinar-blue"
          }`}
        >
          {step.completed ? <Check className="w-5 h-5" /> : step.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{step.title}</h3>
          <p className="text-gray-500 text-sm">{step.description}</p>
        </div>
        <div className="text-sm">
          {step.completed ? (
            <span className="text-webinar-success font-medium">✓ Complete</span>
          ) : (
            <span className="text-gray-500">Step {step.id}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
};

export default PreLaunch;

```

$res_webinar_sample_webinar_confirmation_md$,
  NULL,
  NULL
);

INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
VALUES (
  '*',
  'funnel-builder',
  'references/examples/webinar/sample-webinar-optin.md',
  $res_webinar_sample_webinar_optin_md$
---
name: "Sample Webinar - Opt-In"
category: webinar
company: "Sample Webinar (ROAS)"
page_type: webinar-optin
description: "Full webinar opt-in page. Dark theme, animated hero with trust badges, what you'll learn section with locked case studies, countdown timer, registration modal with phone country picker, sticky bottom bar."
tags: [webinar, optin, dark-theme, countdown, case-studies, locked-content, sticky-bar, registration-modal]
---

# Page Source

## Entry File — Launch.tsx

```tsx
// File: Launch.tsx
import { useState } from "react";
import { Check, Lock, Play, ArrowRight, Zap, Target, Users, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/webinar/SEO";
import CountdownTimer from "@/components/webinar/CountdownTimer";
import CaseStudyCard from "@/components/webinar/CaseStudyCard";
import RegistrationModal from "@/components/webinar/RegistrationModal";
import StickyBottomBar from "@/components/webinar/StickyBottomBar";
import TrustIndicators from "@/components/webinar/TrustIndicators";
import LogoBar from "@/components/webinar/LogoBar";

// Webinar date - December 10, 2025 at 3pm ET
const WEBINAR_DATE = new Date("2025-12-10T15:00:00-05:00");
const Launch = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleRegistrationSuccess = () => {
    setIsUnlocked(true);
  };
  const benefits = [{
    icon: <Target className="w-5 h-5" />,
    title: "The Webinar Framework",
    description: "Discover the exact 3-step system that generates $100K+ per webinar"
  }, {
    icon: <Users className="w-5 h-5" />,
    title: "Audience Building Secrets",
    description: "How to build a hungry audience that's ready to buy before you even pitch"
  }, {
    icon: <DollarSign className="w-5 h-5" />,
    title: "High-Ticket Closing",
    description: "The psychology behind closing $3K-$25K deals without being pushy"
  }, {
    icon: <Zap className="w-5 h-5" />,
    title: "Automation Mastery",
    description: "Set up evergreen webinars that sell 24/7 while you sleep"
  }, {
    icon: <Clock className="w-5 h-5" />,
    title: "Time Leverage",
    description: "How to sell to thousands at once instead of 1-on-1 calls"
  }];
  const caseStudies = [{
    name: "Sarah Mitchell",
    result: "$127K in 60 Minutes",
    description: "Went from struggling consultant to generating six figures from a single webinar using this exact framework."
  }, {
    name: "Marcus Chen",
    result: "12x ROI First Webinar",
    description: "Built a $2M/year coaching business by implementing these strategies in his very first live event."
  }, {
    name: "Emily Rodriguez",
    result: "500% Revenue Increase",
    description: "Transformed her course business from $50K to $300K annually by switching to webinar-based selling."
  }];
  return <>
      <SEO title="Free Webinar: Sell More in Less Time | Live Training" description="Join our free live training to discover how to use webinars to sell more in less time. Learn the exact framework used to generate $100M+ in sales." />

      <div className="min-h-screen webinar-gradient-dark">
        {/* Top Banner */}
        <div className="bg-webinar-blue py-3 px-4">
          <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm md:text-base hover:opacity-90 transition-opacity">
            <ArrowRight className="w-4 h-4" />
            FREE ONLINE ZOOM TRAINING - REGISTER NOW
          </button>
        </div>

        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 w-72 h-72 bg-webinar-blue/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-webinar-blue-dark/30 rounded-full blur-3xl animate-float" style={{
            animationDelay: "1s"
          }} />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Tagline */}
            <p className="text-center text-gray-300 text-base md:text-lg mb-6 animate-fade-in-up">
              For Experts, Coaches, Consultants, And Online Service Providers...
            </p>

            {/* Headline */}
            <div className="text-center max-w-5xl mx-auto mb-8">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-[1.1] tracking-tight animate-fade-in-up uppercase">
                THE <span className="text-webinar-blue">CORRECT WAY</span> TO USE WEBINARS TO{" "}
                <span className="text-webinar-blue">SELL MORE IN LESS TIME</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto animate-fade-in-up" style={{
              animationDelay: "0.2s"
            }}>
                Unlock the <span className="underline decoration-webinar-blue font-semibold">exact one to many framework</span> we use to fill rooms of{" "}
                <span className="underline decoration-webinar-blue font-semibold">1,000+ people</span> for live events,{" "}
                <span className="font-semibold">sell thousands</span> in coaching programs, and{" "}
                <span className="font-semibold">scale any business</span>.
              </p>
            </div>

            {/* Main CTA */}
            <div className="flex justify-center mb-6 animate-fade-in-up" style={{
            animationDelay: "0.3s"
          }}>
              <Button onClick={() => setIsModalOpen(true)} size="lg" className="h-14 md:h-16 px-12 md:px-16 text-lg md:text-xl font-bold bg-webinar-blue hover:bg-webinar-blue-dark text-white rounded-lg border border-white shadow-xl shadow-webinar-blue/30 transition-all duration-300 hover:scale-105 group">
                SAVE MY SEAT
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Date/Time */}
            <p className="text-center text-gray-400 text-sm md:text-base mb-6 animate-fade-in-up" style={{
            animationDelay: "0.35s"
          }}>
              Wednesday, December 10th at 3:00pm ET / 12:00pm PT
            </p>

            {/* Countdown Timer */}
            <div className="flex flex-col items-center mb-10 animate-fade-in-up" style={{
            animationDelay: "0.4s"
          }}>
              <CountdownTimer targetDate={WEBINAR_DATE} size="md" variant="dark" />
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up" style={{
            animationDelay: "0.5s"
          }}>
              {["1,000+ Webinars", "95%+ Success", "$30M+ From Webinars"].map((badge, index) => <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                  <Check className="w-4 h-4 text-webinar-blue" />
                  <span className="text-white text-sm font-medium">{badge}</span>
                </div>)}
            </div>
          </div>
        </section>

        {/* What You'll Learn */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-[85%] mx-auto bg-white/5 rounded-2xl p-8 md:p-12 border border-white/10">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-4 uppercase">
                  In This <span className="text-webinar-blue">100% Free</span> Live Training,{" "}
                  <span className="block">You'll Discover...</span>
                </h2>
              </div>

              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left - Bullet Points */}
                <div className="space-y-6">
                  {benefits.map((benefit, index) => <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-webinar-blue flex items-center justify-center">
                        <Check className="w-4 h-4 text-webinar-blue" />
                      </div>
                      <div>
                        <p className="text-white text-lg">
                          <span className="font-bold">{benefit.title}</span> – {benefit.description}
                        </p>
                      </div>
                    </div>)}
                </div>

                {/* Right - Unlock Case Studies Card with blurred background */}
                <div 
                  className={`relative rounded-2xl overflow-hidden ${!isUnlocked ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (!isUnlocked) {
                      setIsModalOpen(true);
                    }
                  }}
                >
                  {/* Blurred case studies background */}
                  <div className={`grid grid-cols-1 gap-3 p-4 max-h-[320px] overflow-hidden ${!isUnlocked ? "blur-sm opacity-50" : ""}`}>
                    {caseStudies.map((study, index) => <CaseStudyCard key={index} name={study.name} result={study.result} description={study.description} />)}
                  </div>
                  
                  {/* Unlock overlay */}
                  {!isUnlocked && <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center p-6 rounded-2xl bg-webinar-slate/90 backdrop-blur-sm border border-webinar-blue/30 max-w-sm">
                        <Lock className="w-10 h-10 text-webinar-blue mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">
                          Unlock Case Studies
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Register for the free webinar to see detailed case studies and results
                        </p>
                      </div>
                    </div>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mid-page CTA Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center">
              <Button onClick={() => setIsModalOpen(true)} size="lg" className="h-14 md:h-16 px-12 md:px-16 text-lg md:text-xl font-bold bg-webinar-blue hover:bg-webinar-blue-dark text-white rounded-lg border border-white shadow-xl shadow-webinar-blue/30 transition-all duration-300 hover:scale-105 group mb-4">
                SAVE MY SEAT
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <p className="text-gray-400 text-sm md:text-base mb-4">
                Wednesday, December 10th at 3:00pm ET / 12:00pm PT
              </p>
              
              <CountdownTimer targetDate={WEBINAR_DATE} size="md" variant="dark" />
            </div>
          </div>
        </section>



        <section className="bg-[#0d1117] py-12">
          <div className="container mx-auto px-4">
            <LogoBar />
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black py-12 pb-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <p className="text-gray-500 text-sm">
                © 2025 Your Company. All rights reserved.
              </p>
              
              <div className="flex justify-center gap-6">
                <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
                  Contact
                </a>
              </div>

              <div className="pt-6 border-t border-gray-800 space-y-4">
                <p className="text-gray-600 text-xs leading-relaxed">
                  This company is not affiliated with, endorsed by, or sponsored by Facebook, Inc. or any of its subsidiaries or affiliates. All trademarks and service marks are the property of their respective owners.
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  This site is not a part of the Facebook website or Facebook Inc. Additionally, this site is NOT endorsed by Facebook in any way. FACEBOOK is a trademark of FACEBOOK, Inc.
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  The results and testimonials shared on this page are not typical, nor are they a guarantee of future earnings or success. Individual results will vary and depend on many factors including but not limited to background, experience, and work ethic. All business entails risk as well as massive and consistent effort and action.
                </p>
              </div>
            </div>
          </div>
        </footer>

        {/* Registration Modal */}
        <RegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleRegistrationSuccess} />

        {/* Sticky Bottom Bar */}
        <StickyBottomBar onCtaClick={() => setIsModalOpen(true)} />
      </div>
    </>;
};
export default Launch;```

## RegistrationModal.tsx

```tsx
// File: RegistrationModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

const countries = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
];

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  includeBlackCard?: boolean;
  onSuccess?: () => void;
}

const RegistrationModal = ({
  isOpen,
  onClose,
  includeBlackCard = false,
  onSuccess,
}: RegistrationModalProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    countryCode: "US",
    phone: "",
    wantBlackCard: includeBlackCard,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = countries.find(c => c.code === formData.countryCode) || countries[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store registration data in localStorage for demo purposes
    localStorage.setItem("webinarRegistration", JSON.stringify(formData));
    
    setIsSubmitting(false);
    onSuccess?.();
    onClose();
    
    // Navigate to confirmation page
    navigate("/pre-launch");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-webinar-slate to-webinar-slate-light border-webinar-blue/30 text-white [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-3xl md:text-4xl font-bold text-center">
            <span className="text-webinar-blue">Register</span> to Save Your Spot
          </DialogTitle>
          <p className="text-gray-400 text-center text-sm mt-2">
            + access bonus case study details on the next page
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-gray-300">
              Full Name
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">
              Phone Number
            </Label>
            <div className="flex gap-2">
              <Select
                value={formData.countryCode}
                onValueChange={(value) =>
                  setFormData({ ...formData, countryCode: value })
                }
              >
                <SelectTrigger className="w-[100px] bg-white/10 border-white/20 text-white">
                  <SelectValue>
                    <span className="flex items-center gap-1">
                      <span>{selectedCountry.flag}</span>
                      <span className="text-xs">{selectedCountry.dialCode}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-webinar-slate border-white/20 max-h-[200px]">
                  {countries.map((country) => (
                    <SelectItem
                      key={country.code}
                      value={country.code}
                      className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                        <span className="text-gray-400 text-xs">{country.dialCode}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 000-0000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-webinar-blue to-webinar-blue-dark hover:from-webinar-blue-dark hover:to-webinar-blue text-white shadow-lg shadow-webinar-blue/30 transition-all duration-300 hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Reserving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Reserve My Free Seat
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-gray-500 leading-relaxed">
            By continuing, you agree to our{" "}
            <a href="#" className="underline hover:text-gray-400">Terms of Service</a> and{" "}
            <a href="#" className="underline hover:text-gray-400">Privacy Policy</a>.
            You may receive communications via text, call, or email.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal;
```

## StickyBottomBar.tsx

```tsx
// File: StickyBottomBar.tsx
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface StickyBottomBarProps {
  onCtaClick: () => void;
  ctaText?: string;
  showAfterScroll?: number;
}

const StickyBottomBar = ({
  onCtaClick,
  ctaText = "Reserve My Free Seat",
}: StickyBottomBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-webinar-slate/95 backdrop-blur-sm border-t border-white/20 shadow-2xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left side - event info */}
            <div className="text-white text-center sm:text-left">
              <p className="text-xs uppercase tracking-wider text-gray-400">FREE LIVE TRAINING</p>
              <p className="text-sm md:text-base font-medium">
                Wednesday, December 10th at 3:00pm ET / 12:00pm PT
              </p>
            </div>

            {/* CTA Button */}
            <Button
              onClick={onCtaClick}
              className="bg-webinar-blue hover:bg-webinar-blue-dark text-white font-bold px-8 py-2 h-11 md:h-12 rounded-lg shadow-lg shadow-webinar-blue/30 transition-all duration-300 hover:scale-105 group"
            >
              REGISTER NOW
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyBottomBar;
```

## LogoBar.tsx

```tsx
// File: LogoBar.tsx
interface LogoBarProps {
  className?: string;
}

const LogoBar = ({ className = "" }: LogoBarProps) => {
  // Placeholder company names for the "As Seen On" section
  const companies = [
    "Forbes",
    "Inc.",
    "Entrepreneur",
    "Business Insider",
    "TechCrunch",
    "Fast Company",
  ];

  return (
    <div className={`pt-4 pb-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {companies.map((company, index) => (
          <div
            key={index}
            className="text-gray-400 hover:text-gray-300 transition-colors duration-300"
          >
            <div className="flex items-center justify-center h-8 md:h-10 px-4 border border-gray-700/50 rounded-lg bg-gray-800/30">
              <span className="text-sm md:text-base font-semibold tracking-wide">
                {company}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogoBar;
```

## TrustIndicators.tsx

```tsx
// File: TrustIndicators.tsx
import { Users, Star, Trophy, TrendingUp } from "lucide-react";

interface TrustIndicator {
  icon: React.ReactNode;
  value: string;
  label: string;
}

interface TrustIndicatorsProps {
  className?: string;
}

const TrustIndicators = ({ className = "" }: TrustIndicatorsProps) => {
  const indicators: TrustIndicator[] = [
    {
      icon: <Users className="w-6 h-6" />,
      value: "50,000+",
      label: "Students Trained",
    },
    {
      icon: <Star className="w-6 h-6" />,
      value: "4.9/5",
      label: "Average Rating",
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      value: "$100M+",
      label: "Revenue Generated",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      value: "12x",
      label: "Average ROI",
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ${className}`}>
      {indicators.map((indicator, index) => (
        <div
          key={index}
          className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group"
        >
          <div className="text-webinar-blue mb-2 group-hover:scale-110 transition-transform">
            {indicator.icon}
          </div>
          <span className="text-2xl md:text-3xl font-bold text-white mb-1">
            {indicator.value}
          </span>
          <span className="text-xs md:text-sm text-gray-400">
            {indicator.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default TrustIndicators;
```

## CountdownTimer.tsx

```tsx
// File: CountdownTimer.tsx
import { useState, useEffect, useCallback } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  onExpire?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CountdownTimer = ({
  targetDate,
  onExpire,
  className = "",
  size = "md",
  variant = "dark",
}: CountdownTimerProps) => {
  const calculateTimeLeft = useCallback((): TimeLeft => {
    const difference = targetDate.getTime() - new Date().getTime();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0 &&
        !isExpired
      ) {
        setIsExpired(true);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, onExpire, isExpired]);

  const sizeClasses = {
    sm: {
      container: "gap-1.5",
      box: "w-10 h-10 md:w-11 md:h-11",
      number: "text-lg md:text-xl",
      label: "text-[9px] mt-1",
    },
    md: {
      container: "gap-2",
      box: "w-11 h-11 md:w-12 md:h-12",
      number: "text-xl md:text-2xl",
      label: "text-[10px] mt-1",
    },
    lg: {
      container: "gap-2.5",
      box: "w-12 h-12 md:w-14 md:h-14",
      number: "text-2xl md:text-3xl",
      label: "text-xs mt-1",
    },
  };

  const sizes = sizeClasses[size];

  const timeUnits = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hours" },
    { value: timeLeft.minutes, label: "Mins" },
    { value: timeLeft.seconds, label: "Secs" },
  ];

  return (
    <div className={`flex ${sizes.container} ${className}`}>
      {timeUnits.map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <div
            className={`${sizes.box} bg-webinar-blue rounded-2xl flex items-center justify-center`}
          >
            <span className={`${sizes.number} font-bold text-white tabular-nums`}>
              {unit.value}
            </span>
          </div>
          <span className={`${sizes.label} text-gray-400`}>
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;
```

## SEO.tsx

```tsx
// File: SEO.tsx
import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

const SEO = ({ title, description, image, url }: SEOProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? "property" : "name";
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute("content", content);
    };

    // Standard meta tags
    updateMetaTag("description", description);

    // Open Graph tags
    updateMetaTag("og:title", title, true);
    updateMetaTag("og:description", description, true);
    updateMetaTag("og:type", "website", true);
    
    if (image) {
      updateMetaTag("og:image", image, true);
    }
    
    if (url) {
      updateMetaTag("og:url", url, true);
    }

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image");
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    
    if (image) {
      updateMetaTag("twitter:image", image);
    }
  }, [title, description, image, url]);

  return null;
};

export default SEO;
```

## CaseStudyCard.tsx

```tsx
// File: CaseStudyCard.tsx
import { cn } from "@/lib/utils";

interface CaseStudyCardProps {
  name: string;
  result: string;
  description: string;
  imageSrc?: string;
  className?: string;
  isLocked?: boolean;
}

const CaseStudyCard = ({
  name,
  result,
  description,
  imageSrc,
  className,
  isLocked = false,
}: CaseStudyCardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
        isLocked && "blur-locked",
        className
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-webinar-blue/20 via-webinar-slate to-webinar-blue-dark/30" />
      
      {/* Card content */}
      <div className="relative p-6 md:p-8">
        {/* Avatar/Image */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-webinar-blue to-webinar-blue-dark flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              name.charAt(0).toUpperCase()
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-bold text-white mb-1">
              {name}
            </h3>
            <div className="inline-block px-3 py-1 rounded-full bg-webinar-blue/20 border border-webinar-blue/40">
              <span className="text-webinar-blue font-semibold text-sm">
                {result}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm md:text-base leading-relaxed">
          {description}
        </p>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-webinar-blue/10 rounded-full blur-2xl" />
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-webinar-blue/10 rounded-full blur-xl" />
      </div>

      {/* Bottom accent bar */}
      <div className="h-1 bg-gradient-to-r from-webinar-blue via-white to-webinar-blue" />
    </div>
  );
};

export default CaseStudyCard;
```
$res_webinar_sample_webinar_optin_md$,
  NULL,
  NULL
);


-- Copy the 11 design-library component files from website-builder into funnel-builder.
-- Heroes, CTAs, pricing, testimonials, FAQ, stats, etc. — same patterns apply to funnels.
INSERT INTO agent_skill_resources (agent_key, skill_key, file_path, content, user_id, org_id)
SELECT
  '*',
  'funnel-builder',
  file_path,
  content,
  NULL,
  NULL
FROM agent_skill_resources
WHERE skill_key = 'website-builder'
  AND file_path LIKE 'references/design-library/%';

-- Update funnel-builder skill: fix example paths + rewrite Gate 3 to use design-library
UPDATE agent_skills
SET markdown_content = REPLACE(
  REPLACE(
    markdown_content,
    '../../examples/funnels/',
    'references/examples/'
  ),
  E'Read the visual effects library: `../../data/visual-effects.md`\n\nThis file contains 8 premium animation patterns with full TSX code. These effects are the premium layer — the difference between a page that feels like a template and one that feels like a $10,000 custom build. Incorporate at least 2 patterns: 1 background/ambient effect and 1 interaction/motion effect. Study the TSX code, understand the technique, adapt to the user''s theme colors.',
  E'Read the design library components under `references/design-library/` — especially `heroes.md`, `cta-sections.md`, `testimonials.md`, `stats.md`, and `features.md`.\n\nThese contain production-ready TSX patterns with premium visual effects built in: radial gradients, ambient glow, IntersectionObserver scroll reveals, keyframe animations, backdrop-filter glass effects, hover state transitions, and layered depth techniques. Pick components relevant to the funnel page type and adapt them to the user''s theme colors. Incorporate at least 2 premium patterns: 1 background/ambient effect and 1 interaction/motion effect.'
)
WHERE skill_key = 'funnel-builder';

-- Make awareness-evaluator description user-friendly
UPDATE agent_skills
SET description = 'Monitors what''s happening across your campaigns and decides what needs attention — whether to notify you, take action, or wait. Keeps things moving without you having to check.'
WHERE skill_key = 'awareness-evaluator';

-- Make manager skill descriptions user-friendly (replacing internal jargon)
UPDATE agent_skills
SET description = 'Turns your request into a clear plan — breaks it into steps, assigns the right people, and sets expectations so nothing falls through the cracks.'
WHERE skill_key = 'delegation';

UPDATE agent_skills
SET description = 'Figures out who on the team is best suited for each piece of work based on what needs to get done and who''s available. Makes sure the right person handles the right task.'
WHERE skill_key = 'routing';

UPDATE agent_skills
SET description = 'Looks at your campaign from a high level — what''s working, what''s missing, and what to focus on next. Helps you prioritize so you''re always working on the highest-impact thing.'
WHERE skill_key = 'strategy';

UPDATE agent_skills
SET description = 'Spots gaps and opportunities you might miss — suggests next steps, flags missing pieces, and creates tasks automatically so momentum never stalls.'
WHERE skill_key = 'proactive-tasking';

-- Update funnel-page-design skill: fix example paths + rewrite visual-effects reference
UPDATE agent_skills
SET markdown_content = REPLACE(
  markdown_content,
  '../../examples/funnels/',
  'references/examples/'
)
WHERE skill_key = 'funnel-page-design';
