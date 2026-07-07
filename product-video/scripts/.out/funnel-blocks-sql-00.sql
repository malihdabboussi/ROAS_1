INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_0_slug$cart-krista-mashore-cart-checkoutpage$fb_0_slug$,
  $fb_0_name$CheckoutPage$fb_0_name$,
  $fb_0_description$Krista Mashore CheckoutPage extracted from cart/krista-mashore-cart.md$fb_0_description$,
  $fb_0_category$hero$fb_0_category$,
  ARRAY[$fb_0_page_types_0$checkout$fb_0_page_types_0$, $fb_0_page_types_1$cart$fb_0_page_types_1$]::text[],
  ARRAY[$fb_0_funnel_types_0$cart$fb_0_funnel_types_0$]::text[],
  $fb_0_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_0_slot_schema$::jsonb,
  ARRAY[$fb_0_theme_tokens_0$colors$fb_0_theme_tokens_0$, $fb_0_theme_tokens_1$font_heading$fb_0_theme_tokens_1$, $fb_0_theme_tokens_2$font_body$fb_0_theme_tokens_2$]::text[],
  $fb_0_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_0_asset_slots$::jsonb,
  $fb_0_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: Checkout.tsx
import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Ticket, Check, Gift, ShieldCheck, Video, BookOpen, Users, TicketPlus, BookMarked, GraduationCap, Bot, Sparkles } from "lucide-react";










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
                src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
            <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="h-full w-full object-cover" style={{ mixBlendMode: "luminosity", minHeight: "200px" }} />
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
$fb_0_tsx$,
  $fb_0_default_props${"headline":"The Sell 100 Homes","subheadline":", , , ].map((item) => ( STEP : ))} Ticket price discount for )} On This Page, You Can Register For...","cta_label":"Secure My Ticket Now Includes free invite for a friend","bullets":[],"image_url":"https://success.kristamashore.com/checkout/v3"}$fb_0_default_props$::jsonb,
  $fb_0_layout_signature$grid-3$fb_0_layout_signature$,
  $fb_0_source_type$extracted$fb_0_source_type$,
  $fb_0_source_reference${"file_path":"cart/krista-mashore-cart.md","heading":"","page_name":"Krista Mashore - Cart Page","company":"Krista Mashore"}$fb_0_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_1_slug$ecommerce-product-ae1-product-page-benefits$fb_1_slug$,
  $fb_1_name$Benefits$fb_1_name$,
  $fb_1_description$AE1 Benefits extracted from ecommerce-product/ae1-product-page.md$fb_1_description$,
  $fb_1_category$benefits$fb_1_category$,
  ARRAY[$fb_1_page_types_0$product$fb_1_page_types_0$, $fb_1_page_types_1$ecommerce-product$fb_1_page_types_1$]::text[],
  ARRAY[$fb_1_funnel_types_0$ecommerce-product$fb_1_funnel_types_0$]::text[],
  $fb_1_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_1_slot_schema$::jsonb,
  ARRAY[$fb_1_theme_tokens_0$colors$fb_1_theme_tokens_0$, $fb_1_theme_tokens_1$font_heading$fb_1_theme_tokens_1$, $fb_1_theme_tokens_2$font_body$fb_1_theme_tokens_2$]::text[],
  $fb_1_asset_slots${}$fb_1_asset_slots$::jsonb,
  $fb_1_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

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
$fb_1_tsx$,
  $fb_1_default_props${"headline":"BENEFITS OF DAILY USE","subheadline":"WHAT YOU'LL EXPERIENCE","cta_label":"","bullets":[],"image_url":""}$fb_1_default_props$::jsonb,
  $fb_1_layout_signature$grid-3$fb_1_layout_signature$,
  $fb_1_source_type$extracted$fb_1_source_type$,
  $fb_1_source_reference${"file_path":"ecommerce-product/ae1-product-page.md","heading":"","page_name":"AE1 - Product Page","company":"AE1"}$fb_1_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_2_slug$ecommerce-product-ae1-product-page-comparisontable$fb_2_slug$,
  $fb_2_name$ComparisonTable$fb_2_name$,
  $fb_2_description$AE1 ComparisonTable extracted from ecommerce-product/ae1-product-page.md$fb_2_description$,
  $fb_2_category$navigation$fb_2_category$,
  ARRAY[$fb_2_page_types_0$product$fb_2_page_types_0$, $fb_2_page_types_1$ecommerce-product$fb_2_page_types_1$]::text[],
  ARRAY[$fb_2_funnel_types_0$ecommerce-product$fb_2_funnel_types_0$]::text[],
  $fb_2_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_2_slot_schema$::jsonb,
  ARRAY[$fb_2_theme_tokens_0$colors$fb_2_theme_tokens_0$, $fb_2_theme_tokens_1$font_heading$fb_2_theme_tokens_1$, $fb_2_theme_tokens_2$font_body$fb_2_theme_tokens_2$]::text[],
  $fb_2_asset_slots${}$fb_2_asset_slots$::jsonb,
  $fb_2_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

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
$fb_2_tsx$,
  $fb_2_default_props${"headline":"AE1 IS A MORE-IN-ONE SOLUTION","subheadline":"AE1 Rocket Fuel","cta_label":"","bullets":[],"image_url":""}$fb_2_default_props$::jsonb,
  $fb_2_layout_signature$centered-stack$fb_2_layout_signature$,
  $fb_2_source_type$extracted$fb_2_source_type$,
  $fb_2_source_reference${"file_path":"ecommerce-product/ae1-product-page.md","heading":"","page_name":"AE1 - Product Page","company":"AE1"}$fb_2_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_3_slug$ecommerce-product-ae1-product-page-faq$fb_3_slug$,
  $fb_3_name$FAQ$fb_3_name$,
  $fb_3_description$AE1 FAQ extracted from ecommerce-product/ae1-product-page.md$fb_3_description$,
  $fb_3_category$faq$fb_3_category$,
  ARRAY[$fb_3_page_types_0$product$fb_3_page_types_0$, $fb_3_page_types_1$ecommerce-product$fb_3_page_types_1$]::text[],
  ARRAY[$fb_3_funnel_types_0$ecommerce-product$fb_3_funnel_types_0$]::text[],
  $fb_3_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_3_slot_schema$::jsonb,
  ARRAY[$fb_3_theme_tokens_0$colors$fb_3_theme_tokens_0$, $fb_3_theme_tokens_1$font_heading$fb_3_theme_tokens_1$, $fb_3_theme_tokens_2$font_body$fb_3_theme_tokens_2$]::text[],
  $fb_3_asset_slots${}$fb_3_asset_slots$::jsonb,
  $fb_3_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: FAQ.tsx
import { motion } from "framer-motion";


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
$fb_3_tsx$,
  $fb_3_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_3_default_props$::jsonb,
  $fb_3_layout_signature$centered-stack$fb_3_layout_signature$,
  $fb_3_source_type$extracted$fb_3_source_type$,
  $fb_3_source_reference${"file_path":"ecommerce-product/ae1-product-page.md","heading":"","page_name":"AE1 - Product Page","company":"AE1"}$fb_3_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
