INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_59_slug$webinar-freedom-builders-confirmation-thankyou$fb_59_slug$,
  $fb_59_name$ThankYou$fb_59_name$,
  $fb_59_description$Freedom Builders ThankYou extracted from webinar/freedom-builders-confirmation.md$fb_59_description$,
  $fb_59_category$hero$fb_59_category$,
  ARRAY[$fb_59_page_types_0$webinar-confirmation$fb_59_page_types_0$, $fb_59_page_types_1$thank-you$fb_59_page_types_1$, $fb_59_page_types_2$webinar$fb_59_page_types_2$]::text[],
  ARRAY[$fb_59_funnel_types_0$webinar$fb_59_funnel_types_0$]::text[],
  $fb_59_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_59_slot_schema$::jsonb,
  ARRAY[$fb_59_theme_tokens_0$colors$fb_59_theme_tokens_0$, $fb_59_theme_tokens_1$font_heading$fb_59_theme_tokens_1$, $fb_59_theme_tokens_2$font_body$fb_59_theme_tokens_2$]::text[],
  $fb_59_asset_slots${}$fb_59_asset_slots$::jsonb,
  $fb_59_tsx$// __FB_SHIM_START__
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

// File: ThankYou.tsx
import { useEffect } from "react";











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
$fb_59_tsx$,
  $fb_59_default_props${"headline":"Grab Your Free Builderz Blueprint","subheadline":"Oh, and one more thing…","cta_label":"","bullets":[],"image_url":""}$fb_59_default_props$::jsonb,
  $fb_59_layout_signature$centered-stack$fb_59_layout_signature$,
  $fb_59_source_type$extracted$fb_59_source_type$,
  $fb_59_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"Entry File — ThankYou.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_59_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_60_slug$webinar-freedom-builders-confirmation-thankyoufaq$fb_60_slug$,
  $fb_60_name$ThankYouFAQ$fb_60_name$,
  $fb_60_description$Freedom Builders ThankYouFAQ extracted from webinar/freedom-builders-confirmation.md$fb_60_description$,
  $fb_60_category$footer$fb_60_category$,
  ARRAY[$fb_60_page_types_0$webinar-confirmation$fb_60_page_types_0$, $fb_60_page_types_1$thank-you$fb_60_page_types_1$, $fb_60_page_types_2$webinar$fb_60_page_types_2$]::text[],
  ARRAY[$fb_60_funnel_types_0$webinar$fb_60_funnel_types_0$]::text[],
  $fb_60_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_60_slot_schema$::jsonb,
  ARRAY[$fb_60_theme_tokens_0$colors$fb_60_theme_tokens_0$, $fb_60_theme_tokens_1$font_heading$fb_60_theme_tokens_1$, $fb_60_theme_tokens_2$font_body$fb_60_theme_tokens_2$]::text[],
  $fb_60_asset_slots${}$fb_60_asset_slots$::jsonb,
  $fb_60_tsx$// __FB_SHIM_START__
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

// File: ThankYouFAQ.tsx



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
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt="Mike Gonzalez"
          className="w-full h-auto md:h-full object-cover object-top"
          style={{ marginTop: "-15px", marginBottom: "-15px" }}
        />
      </div>
    </section>
  );
};

export default ThankYouFAQ;
$fb_60_tsx$,
  $fb_60_default_props${"headline":"COMMON QUESTIONS","subheadline":"Freedom Builderz exists for one reason: to help creators stop renting their audience — and start owning their income.","cta_label":"","bullets":[],"image_url":""}$fb_60_default_props$::jsonb,
  $fb_60_layout_signature$section$fb_60_layout_signature$,
  $fb_60_source_type$extracted$fb_60_source_type$,
  $fb_60_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"ThankYouFAQ.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_60_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_61_slug$webinar-freedom-builders-confirmation-whatitslike$fb_61_slug$,
  $fb_61_name$WhatItsLike$fb_61_name$,
  $fb_61_description$Freedom Builders WhatItsLike extracted from webinar/freedom-builders-confirmation.md$fb_61_description$,
  $fb_61_category$stats$fb_61_category$,
  ARRAY[$fb_61_page_types_0$webinar-confirmation$fb_61_page_types_0$, $fb_61_page_types_1$thank-you$fb_61_page_types_1$, $fb_61_page_types_2$webinar$fb_61_page_types_2$]::text[],
  ARRAY[$fb_61_funnel_types_0$webinar$fb_61_funnel_types_0$]::text[],
  $fb_61_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_61_slot_schema$::jsonb,
  ARRAY[$fb_61_theme_tokens_0$colors$fb_61_theme_tokens_0$, $fb_61_theme_tokens_1$font_heading$fb_61_theme_tokens_1$, $fb_61_theme_tokens_2$font_body$fb_61_theme_tokens_2$]::text[],
  $fb_61_asset_slots${}$fb_61_asset_slots$::jsonb,
  $fb_61_tsx$// __FB_SHIM_START__
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

// File: WhatItsLike.tsx
import { useRef, useState } from "react";
import { Play } from "lucide-react";




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
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.25] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_61_tsx$,
  $fb_61_default_props${"headline":"WHAT IT'S LIKE TO WORK WITH FREEDOM BUILDERZ","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_61_default_props$::jsonb,
  $fb_61_layout_signature$centered-stack$fb_61_layout_signature$,
  $fb_61_source_type$extracted$fb_61_source_type$,
  $fb_61_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"WhatItsLike.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_61_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_62_slug$webinar-freedom-builders-cta-join$fb_62_slug$,
  $fb_62_name$Join$fb_62_name$,
  $fb_62_description$Freedom Builders Join extracted from webinar/freedom-builders-cta.md$fb_62_description$,
  $fb_62_category$navigation$fb_62_category$,
  ARRAY[$fb_62_page_types_0$webinar-cta$fb_62_page_types_0$, $fb_62_page_types_1$webinar$fb_62_page_types_1$]::text[],
  ARRAY[$fb_62_funnel_types_0$webinar$fb_62_funnel_types_0$]::text[],
  $fb_62_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_62_slot_schema$::jsonb,
  ARRAY[$fb_62_theme_tokens_0$colors$fb_62_theme_tokens_0$, $fb_62_theme_tokens_1$font_heading$fb_62_theme_tokens_1$, $fb_62_theme_tokens_2$font_body$fb_62_theme_tokens_2$]::text[],
  $fb_62_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_62_asset_slots$::jsonb,
  $fb_62_tsx$// __FB_SHIM_START__
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

// File: Join.tsx







const Join = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: "#090909" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-4 flex items-center justify-center">
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-8 shrink-0" />
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
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 lg:gap-14 items-center lg:items-start">
          {/* Left: Mike intro */}
          <div className="lg:w-[340px] shrink-0 text-center lg:text-left lg:sticky lg:top-28">
            <img
              src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_62_tsx$,
  $fb_62_default_props${"headline":"LET'S BUILD IT TOGETHER","subheadline":"🔥 Only 10 Calls Available — First Come, First Served","cta_label":"","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_62_default_props$::jsonb,
  $fb_62_layout_signature$centered-stack$fb_62_layout_signature$,
  $fb_62_source_type$extracted$fb_62_source_type$,
  $fb_62_source_reference${"file_path":"webinar/freedom-builders-cta.md","heading":"","page_name":"Freedom Builders - Webinar CTA","company":"Freedom Builders"}$fb_62_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_63_slug$webinar-freedom-builders-optin-aboutmike$fb_63_slug$,
  $fb_63_name$AboutMike$fb_63_name$,
  $fb_63_description$Freedom Builders AboutMike extracted from webinar/freedom-builders-optin.md$fb_63_description$,
  $fb_63_category$stats$fb_63_category$,
  ARRAY[$fb_63_page_types_0$webinar-optin$fb_63_page_types_0$, $fb_63_page_types_1$opt-in$fb_63_page_types_1$, $fb_63_page_types_2$webinar$fb_63_page_types_2$]::text[],
  ARRAY[$fb_63_funnel_types_0$webinar$fb_63_funnel_types_0$]::text[],
  $fb_63_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_63_slot_schema$::jsonb,
  ARRAY[$fb_63_theme_tokens_0$colors$fb_63_theme_tokens_0$, $fb_63_theme_tokens_1$font_heading$fb_63_theme_tokens_1$, $fb_63_theme_tokens_2$font_body$fb_63_theme_tokens_2$]::text[],
  $fb_63_asset_slots${}$fb_63_asset_slots$::jsonb,
  $fb_63_tsx$// __FB_SHIM_START__
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

// File: AboutMike.tsx
import { useEffect, useRef, useState } from "react";





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
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      {/* Orange gradient — bottom right */}
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.15] pointer-events-none mix-blend-multiply"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      {/* Brand 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset' at top edge, fading down */}
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
              src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_63_tsx$,
  $fb_63_default_props${"headline":"MEET YOUR HOST","subheadline":"I used to train clients in a gym for $50/hour. Now I've helped creators and experts across every niche imaginable turn what they know into six and seven-figure online businesses — from psychic mediums to NFL athletes to OBGYNs. If you have knowledge that helps people, I can help you package and sell it.","cta_label":"","bullets":[],"image_url":""}$fb_63_default_props$::jsonb,
  $fb_63_layout_signature$centered-stack$fb_63_layout_signature$,
  $fb_63_source_type$extracted$fb_63_source_type$,
  $fb_63_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"AboutMike.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_63_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_64_slug$webinar-freedom-builders-optin-broad$fb_64_slug$,
  $fb_64_name$Broad$fb_64_name$,
  $fb_64_description$Freedom Builders Broad extracted from webinar/freedom-builders-optin.md$fb_64_description$,
  $fb_64_category$hero$fb_64_category$,
  ARRAY[$fb_64_page_types_0$webinar-optin$fb_64_page_types_0$, $fb_64_page_types_1$opt-in$fb_64_page_types_1$, $fb_64_page_types_2$webinar$fb_64_page_types_2$]::text[],
  ARRAY[$fb_64_funnel_types_0$webinar$fb_64_funnel_types_0$]::text[],
  $fb_64_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_64_slot_schema$::jsonb,
  ARRAY[$fb_64_theme_tokens_0$colors$fb_64_theme_tokens_0$, $fb_64_theme_tokens_1$font_heading$fb_64_theme_tokens_1$, $fb_64_theme_tokens_2$font_body$fb_64_theme_tokens_2$]::text[],
  $fb_64_asset_slots${}$fb_64_asset_slots$::jsonb,
  $fb_64_tsx$// __FB_SHIM_START__
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

// File: Broad.tsx
import { useState } from "react";








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
$fb_64_tsx$,
  $fb_64_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_64_default_props$::jsonb,
  $fb_64_layout_signature$modal$fb_64_layout_signature$,
  $fb_64_source_type$extracted$fb_64_source_type$,
  $fb_64_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"Entry File — Broad.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_64_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_65_slug$webinar-freedom-builders-optin-broadhero$fb_65_slug$,
  $fb_65_name$BroadHero$fb_65_name$,
  $fb_65_description$Freedom Builders BroadHero extracted from webinar/freedom-builders-optin.md$fb_65_description$,
  $fb_65_category$hero$fb_65_category$,
  ARRAY[$fb_65_page_types_0$webinar-optin$fb_65_page_types_0$, $fb_65_page_types_1$opt-in$fb_65_page_types_1$, $fb_65_page_types_2$webinar$fb_65_page_types_2$]::text[],
  ARRAY[$fb_65_funnel_types_0$webinar$fb_65_funnel_types_0$]::text[],
  $fb_65_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_65_slot_schema$::jsonb,
  ARRAY[$fb_65_theme_tokens_0$colors$fb_65_theme_tokens_0$, $fb_65_theme_tokens_1$font_heading$fb_65_theme_tokens_1$, $fb_65_theme_tokens_2$font_body$fb_65_theme_tokens_2$]::text[],
  $fb_65_asset_slots${}$fb_65_asset_slots$::jsonb,
  $fb_65_tsx$// __FB_SHIM_START__
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

// File: BroadHero.tsx
import CountdownTimer from "../CountdownTimer";




const BroadHero = ({ onCtaClick }: { onCtaClick: () => void }) => {
  return (
    <section
      id="register"
      className="relative min-h-screen flex items-center pt-16 pb-16 overflow-hidden"
    >
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[50%] -left-[40%] w-[1200px] h-[1200px] object-cover opacity-35 pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[50%] -right-[40%] w-[1200px] h-[1200px] object-cover opacity-35 pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_65_tsx$,
  $fb_65_default_props${"headline":"TURN WHAT YOU ALREADY KNOW INTO A MESSAGE THAT SELLS, AN OFFER PEOPLE WANT, AND A BUSINESS THAT RUNS WITHOUT YOU.","subheadline":"FREE LIVE TRAINING","cta_label":"SAVE MY SPOT","bullets":[],"image_url":""}$fb_65_default_props$::jsonb,
  $fb_65_layout_signature$centered-stack$fb_65_layout_signature$,
  $fb_65_source_type$extracted$fb_65_source_type$,
  $fb_65_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"BroadHero.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_65_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_66_slug$webinar-freedom-builders-optin-footer$fb_66_slug$,
  $fb_66_name$Footer$fb_66_name$,
  $fb_66_description$Freedom Builders Footer extracted from webinar/freedom-builders-optin.md$fb_66_description$,
  $fb_66_category$footer$fb_66_category$,
  ARRAY[$fb_66_page_types_0$webinar-optin$fb_66_page_types_0$, $fb_66_page_types_1$opt-in$fb_66_page_types_1$, $fb_66_page_types_2$webinar$fb_66_page_types_2$]::text[],
  ARRAY[$fb_66_funnel_types_0$webinar$fb_66_funnel_types_0$]::text[],
  $fb_66_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_66_slot_schema$::jsonb,
  ARRAY[$fb_66_theme_tokens_0$colors$fb_66_theme_tokens_0$, $fb_66_theme_tokens_1$font_heading$fb_66_theme_tokens_1$, $fb_66_theme_tokens_2$font_body$fb_66_theme_tokens_2$]::text[],
  $fb_66_asset_slots${}$fb_66_asset_slots$::jsonb,
  $fb_66_tsx$// __FB_SHIM_START__
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

// File: Footer.tsx


const Footer = () => {
  return (
    <footer className="bg-white py-10 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-center gap-8">
        {/* Logo — left column */}
        <div className="shrink-0">
          <img
            src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_66_tsx$,
  $fb_66_default_props${"headline":"Replace this headline","subheadline":"Disclaimer: Results vary based on individual effort, market conditions, and business experience. Freedom Builderz does not guarantee specific income outcomes. Testimonials represent individual experiences and are not typical results.","cta_label":"","bullets":[],"image_url":""}$fb_66_default_props$::jsonb,
  $fb_66_layout_signature$centered-stack$fb_66_layout_signature$,
  $fb_66_source_type$extracted$fb_66_source_type$,
  $fb_66_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"Footer.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_66_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_67_slug$webinar-freedom-builders-optin-formmodal$fb_67_slug$,
  $fb_67_name$FormModal$fb_67_name$,
  $fb_67_description$Freedom Builders FormModal extracted from webinar/freedom-builders-optin.md$fb_67_description$,
  $fb_67_category$urgency$fb_67_category$,
  ARRAY[$fb_67_page_types_0$webinar-optin$fb_67_page_types_0$, $fb_67_page_types_1$opt-in$fb_67_page_types_1$, $fb_67_page_types_2$webinar$fb_67_page_types_2$]::text[],
  ARRAY[$fb_67_funnel_types_0$webinar$fb_67_funnel_types_0$]::text[],
  $fb_67_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_67_slot_schema$::jsonb,
  ARRAY[$fb_67_theme_tokens_0$colors$fb_67_theme_tokens_0$, $fb_67_theme_tokens_1$font_heading$fb_67_theme_tokens_1$, $fb_67_theme_tokens_2$font_body$fb_67_theme_tokens_2$]::text[],
  $fb_67_asset_slots${}$fb_67_asset_slots$::jsonb,
  $fb_67_tsx$// __FB_SHIM_START__
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

// File: FormModal.tsx
import { useEffect, useMemo } from "react";
import CountdownTimer from "./CountdownTimer";




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
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt=""
          className="absolute -top-[40%] -left-[40%] w-[600px] h-[600px] object-cover opacity-25 pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        {/* Orange gradient — bottom right */}
        <img
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt=""
          className="absolute -bottom-[40%] -right-[40%] w-[600px] h-[600px] object-cover opacity-25 pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        {/* Subtle brand pattern */}
        <img
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_67_tsx$,
  $fb_67_default_props${"headline":"YOU'RE IN. SAVE YOUR SPOT.","subheadline":"Enter your details below to reserve your seat for the free training.","cta_label":"✕","bullets":[],"image_url":""}$fb_67_default_props$::jsonb,
  $fb_67_layout_signature$centered-stack$fb_67_layout_signature$,
  $fb_67_source_type$extracted$fb_67_source_type$,
  $fb_67_source_reference${"file_path":"webinar/freedom-builders-optin.md","heading":"FormModal.tsx","page_name":"Freedom Builders - Webinar Opt-In","company":"Freedom Builders"}$fb_67_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
