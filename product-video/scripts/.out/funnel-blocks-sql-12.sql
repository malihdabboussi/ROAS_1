INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_68_slug$webinar-freedom-builders-optin-mobilestickybar$fb_68_slug$,
  $fb_68_name$MobileStickyBar$fb_68_name$,
  $fb_68_description$Freedom Builders MobileStickyBar extracted from webinar/freedom-builders-optin.md$fb_68_description$,
  $fb_68_category$urgency$fb_68_category$,
  ARRAY[$fb_68_page_types_0$webinar-optin$fb_68_page_types_0$, $fb_68_page_types_1$opt-in$fb_68_page_types_1$, $fb_68_page_types_2$webinar$fb_68_page_types_2$]::text[],
  ARRAY[$fb_68_funnel_types_0$webinar$fb_68_funnel_types_0$]::text[],
  $fb_68_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_68_slot_schema$::jsonb,
  ARRAY[$fb_68_theme_tokens_0$colors$fb_68_theme_tokens_0$, $fb_68_theme_tokens_1$font_heading$fb_68_theme_tokens_1$, $fb_68_theme_tokens_2$font_body$fb_68_theme_tokens_2$]::text[],
  $fb_68_asset_slots${}$fb_68_asset_slots$::jsonb,
  $fb_68_tsx$// __FB_SHIM_START__
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
$fb_68_tsx$,
  $fb_68_default_props${"headline":"Replace this headline","subheadline":"Live attendance only. Replays not guaranteed.","cta_label":"SAVE MY SPOT","bullets":[],"image_url":""}$fb_68_default_props$::jsonb,
  $fb_68_layout_signature$centered-stack$fb_68_layout_signature$,
  $fb_68_source_type$extracted$fb_68_source_type$,
  $fb_68_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"MobileStickyBar.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_68_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_69_slug$webinar-freedom-builders-optin-stickytopbar$fb_69_slug$,
  $fb_69_name$StickyTopBar$fb_69_name$,
  $fb_69_description$Freedom Builders StickyTopBar extracted from webinar/freedom-builders-optin.md$fb_69_description$,
  $fb_69_category$navigation$fb_69_category$,
  ARRAY[$fb_69_page_types_0$webinar-optin$fb_69_page_types_0$, $fb_69_page_types_1$opt-in$fb_69_page_types_1$, $fb_69_page_types_2$webinar$fb_69_page_types_2$]::text[],
  ARRAY[$fb_69_funnel_types_0$webinar$fb_69_funnel_types_0$]::text[],
  $fb_69_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_69_slot_schema$::jsonb,
  ARRAY[$fb_69_theme_tokens_0$colors$fb_69_theme_tokens_0$, $fb_69_theme_tokens_1$font_heading$fb_69_theme_tokens_1$, $fb_69_theme_tokens_2$font_body$fb_69_theme_tokens_2$]::text[],
  $fb_69_asset_slots${}$fb_69_asset_slots$::jsonb,
  $fb_69_tsx$// __FB_SHIM_START__
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

// File: StickyTopBar.tsx


const StickyTopBar = ({ onCtaClick, bannerText }: { onCtaClick: () => void; bannerText?: string }) => {
  return (
    <>
      {/* Desktop: sticky fixed header */}
      <div className="hidden sm:block fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center">
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-8 shrink-0" />
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
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-8 shrink-0" />
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
$fb_69_tsx$,
  $fb_69_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"SAVE MY SPOT","bullets":[],"image_url":""}$fb_69_default_props$::jsonb,
  $fb_69_layout_signature$centered-stack$fb_69_layout_signature$,
  $fb_69_source_type$extracted$fb_69_source_type$,
  $fb_69_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"StickyTopBar.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_69_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_70_slug$webinar-freedom-builders-optin-whatyoulllearn$fb_70_slug$,
  $fb_70_name$WhatYoullLearn$fb_70_name$,
  $fb_70_description$Freedom Builders WhatYoullLearn extracted from webinar/freedom-builders-optin.md$fb_70_description$,
  $fb_70_category$urgency$fb_70_category$,
  ARRAY[$fb_70_page_types_0$webinar-optin$fb_70_page_types_0$, $fb_70_page_types_1$opt-in$fb_70_page_types_1$, $fb_70_page_types_2$webinar$fb_70_page_types_2$]::text[],
  ARRAY[$fb_70_funnel_types_0$webinar$fb_70_funnel_types_0$]::text[],
  $fb_70_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_70_slot_schema$::jsonb,
  ARRAY[$fb_70_theme_tokens_0$colors$fb_70_theme_tokens_0$, $fb_70_theme_tokens_1$font_heading$fb_70_theme_tokens_1$, $fb_70_theme_tokens_2$font_body$fb_70_theme_tokens_2$]::text[],
  $fb_70_asset_slots${}$fb_70_asset_slots$::jsonb,
  $fb_70_tsx$// __FB_SHIM_START__
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

// File: WhatYoullLearn.tsx
import CountdownTimer from "./CountdownTimer";
import CaseStudyTeaser from "./CaseStudyTeaser";





const points = [
  {
    num: "01",
    title: "THE MESSAGING FRAMEWORK",
    desc: "How to clarify your message so your audience instantly gets what you do and wants to buy.",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
  {
    num: "02",
    title: "THE OFFER BLUEPRINT",
    desc: "How to package what you already know into something people actually want to pay for.",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
  {
    num: "03",
    title: "THE LAUNCH SYSTEM",
    desc: "The exact process behind launches from $10K to $500K+ — even in niches nobody thought would work.",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
];

const WhatYoullLearn = ({ onCtaClick }: { onCtaClick: () => void }) => {
  return (
    <section className="relative py-20 px-4 overflow-hidden">
      {/* Ambient purple gradient */}
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_70_tsx$,
  $fb_70_default_props${"headline":"WHAT YOU'LL LEARN","subheadline":"Tuesday, February 24th at 2:00 PM EST (11:00 AM PST)","cta_label":"SAVE MY SPOT — IT'S FREE","bullets":[],"image_url":""}$fb_70_default_props$::jsonb,
  $fb_70_layout_signature$grid-3$fb_70_layout_signature$,
  $fb_70_source_type$extracted$fb_70_source_type$,
  $fb_70_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"WhatYoullLearn.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_70_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_71_slug$webinar-freedom-builders-replay-replay$fb_71_slug$,
  $fb_71_name$Replay$fb_71_name$,
  $fb_71_description$Freedom Builders Replay extracted from webinar/freedom-builders-replay.md$fb_71_description$,
  $fb_71_category$hero$fb_71_category$,
  ARRAY[$fb_71_page_types_0$webinar-replay$fb_71_page_types_0$, $fb_71_page_types_1$replay$fb_71_page_types_1$, $fb_71_page_types_2$webinar$fb_71_page_types_2$]::text[],
  ARRAY[$fb_71_funnel_types_0$webinar$fb_71_funnel_types_0$]::text[],
  $fb_71_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_71_slot_schema$::jsonb,
  ARRAY[$fb_71_theme_tokens_0$colors$fb_71_theme_tokens_0$, $fb_71_theme_tokens_1$font_heading$fb_71_theme_tokens_1$, $fb_71_theme_tokens_2$font_body$fb_71_theme_tokens_2$]::text[],
  $fb_71_asset_slots${}$fb_71_asset_slots$::jsonb,
  $fb_71_tsx$// __FB_SHIM_START__
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

// File: Replay.tsx
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";







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
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-8 mx-auto mb-8" />
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
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-6 md:h-8 shrink-0" />
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
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

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
$fb_71_tsx$,
  $fb_71_default_props${"headline":"REPLAY CLOSED","subheadline":"If you want to learn more about Freedom Builders, schedule a call with our team using the calendar below.","cta_label":"","bullets":[],"image_url":""}$fb_71_default_props$::jsonb,
  $fb_71_layout_signature$centered-stack$fb_71_layout_signature$,
  $fb_71_source_type$extracted$fb_71_source_type$,
  $fb_71_source_reference${"file_path":"webinar/freedom-builders-replay.md","heading":"","page_name":"Freedom Builders - Webinar Replay","company":"Freedom Builders"}$fb_71_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_72_slug$webinar-insurance-creators-confirmation-prelaunch$fb_72_slug$,
  $fb_72_name$PreLaunch$fb_72_name$,
  $fb_72_description$Insurance Creators PreLaunch extracted from webinar/insurance-creators-confirmation.md$fb_72_description$,
  $fb_72_category$navigation$fb_72_category$,
  ARRAY[$fb_72_page_types_0$webinar-confirmation$fb_72_page_types_0$, $fb_72_page_types_1$thank-you$fb_72_page_types_1$, $fb_72_page_types_2$webinar$fb_72_page_types_2$]::text[],
  ARRAY[$fb_72_funnel_types_0$webinar$fb_72_funnel_types_0$]::text[],
  $fb_72_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_72_slot_schema$::jsonb,
  ARRAY[$fb_72_theme_tokens_0$colors$fb_72_theme_tokens_0$, $fb_72_theme_tokens_1$font_heading$fb_72_theme_tokens_1$, $fb_72_theme_tokens_2$font_body$fb_72_theme_tokens_2$]::text[],
  $fb_72_asset_slots${}$fb_72_asset_slots$::jsonb,
  $fb_72_tsx$// __FB_SHIM_START__
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

// File: PreLaunch.tsx
import { useState, useEffect, useRef } from "react";

import {
  Check,
  Play,
  Calendar,
  Mail,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";




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
              <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="The Insurance Creators" className="h-12 md:h-14 w-auto" />
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
                <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="The Insurance Creators" className="h-10 w-auto opacity-60" />
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
$fb_72_tsx$,
  $fb_72_default_props${"headline":"You're In!","subheadline":"Your seat is confirmed for on .","cta_label":"window.open(googleCalUrl, '_blank')} className=\"bg-webinar-gold hover:bg-webinar-gold-dark text-black font-bold\" > Add to Google Calendar","bullets":[],"image_url":""}$fb_72_default_props$::jsonb,
  $fb_72_layout_signature$centered-stack$fb_72_layout_signature$,
  $fb_72_source_type$extracted$fb_72_source_type$,
  $fb_72_source_reference${"file_path":"webinar/insurance-creators-confirmation.md","heading":"","page_name":"Insurance Creators - Confirmation","company":"Insurance Creators"}$fb_72_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_73_slug$webinar-insurance-creators-optin-casestudycard$fb_73_slug$,
  $fb_73_name$CaseStudyCard$fb_73_name$,
  $fb_73_description$Insurance Creators CaseStudyCard extracted from webinar/insurance-creators-optin.md$fb_73_description$,
  $fb_73_category$gallery$fb_73_category$,
  ARRAY[$fb_73_page_types_0$webinar-optin$fb_73_page_types_0$, $fb_73_page_types_1$opt-in$fb_73_page_types_1$, $fb_73_page_types_2$webinar$fb_73_page_types_2$]::text[],
  ARRAY[$fb_73_funnel_types_0$webinar$fb_73_funnel_types_0$]::text[],
  $fb_73_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_73_slot_schema$::jsonb,
  ARRAY[$fb_73_theme_tokens_0$colors$fb_73_theme_tokens_0$, $fb_73_theme_tokens_1$font_heading$fb_73_theme_tokens_1$, $fb_73_theme_tokens_2$font_body$fb_73_theme_tokens_2$]::text[],
  $fb_73_asset_slots${}$fb_73_asset_slots$::jsonb,
  $fb_73_tsx$// __FB_SHIM_START__
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

// File: CaseStudyCard.tsx


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
$fb_73_tsx$,
  $fb_73_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_73_default_props$::jsonb,
  $fb_73_layout_signature$section$fb_73_layout_signature$,
  $fb_73_source_type$extracted$fb_73_source_type$,
  $fb_73_source_reference${"file_path":"webinar/insurance-creators-optin.md","heading":"CaseStudyCard.tsx","page_name":"Insurance Creators - Opt-In","company":"Insurance Creators"}$fb_73_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_74_slug$webinar-insurance-creators-optin-countdowntimer$fb_74_slug$,
  $fb_74_name$CountdownTimer$fb_74_name$,
  $fb_74_description$Insurance Creators CountdownTimer extracted from webinar/insurance-creators-optin.md$fb_74_description$,
  $fb_74_category$urgency$fb_74_category$,
  ARRAY[$fb_74_page_types_0$webinar-optin$fb_74_page_types_0$, $fb_74_page_types_1$opt-in$fb_74_page_types_1$, $fb_74_page_types_2$webinar$fb_74_page_types_2$]::text[],
  ARRAY[$fb_74_funnel_types_0$webinar$fb_74_funnel_types_0$]::text[],
  $fb_74_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_74_slot_schema$::jsonb,
  ARRAY[$fb_74_theme_tokens_0$colors$fb_74_theme_tokens_0$, $fb_74_theme_tokens_1$font_heading$fb_74_theme_tokens_1$, $fb_74_theme_tokens_2$font_body$fb_74_theme_tokens_2$]::text[],
  $fb_74_asset_slots${}$fb_74_asset_slots$::jsonb,
  $fb_74_tsx$// __FB_SHIM_START__
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
$fb_74_tsx$,
  $fb_74_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_74_default_props$::jsonb,
  $fb_74_layout_signature$section$fb_74_layout_signature$,
  $fb_74_source_type$extracted$fb_74_source_type$,
  $fb_74_source_reference${"file_path":"webinar/insurance-creators-optin.md","heading":"CountdownTimer.tsx","page_name":"Insurance Creators - Opt-In","company":"Insurance Creators"}$fb_74_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
