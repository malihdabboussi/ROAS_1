INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_20_slug$lead-magnet-freedom-builders-optin-blueprinthero$fb_20_slug$,
  $fb_20_name$BlueprintHero$fb_20_name$,
  $fb_20_description$Freedom Builders BlueprintHero extracted from lead-magnet/freedom-builders-optin.md$fb_20_description$,
  $fb_20_category$hero$fb_20_category$,
  ARRAY[$fb_20_page_types_0$lead-magnet-optin$fb_20_page_types_0$, $fb_20_page_types_1$opt-in$fb_20_page_types_1$, $fb_20_page_types_2$lead-magnet$fb_20_page_types_2$]::text[],
  ARRAY[$fb_20_funnel_types_0$lead-magnet$fb_20_funnel_types_0$]::text[],
  $fb_20_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_20_slot_schema$::jsonb,
  ARRAY[$fb_20_theme_tokens_0$colors$fb_20_theme_tokens_0$, $fb_20_theme_tokens_1$font_heading$fb_20_theme_tokens_1$, $fb_20_theme_tokens_2$font_body$fb_20_theme_tokens_2$]::text[],
  $fb_20_asset_slots${}$fb_20_asset_slots$::jsonb,
  $fb_20_tsx$// __FB_SHIM_START__
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

// File: BlueprintHero.tsx
import { Play } from "lucide-react";





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
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[40%] -left-[30%] w-[900px] h-[900px] object-cover opacity-[0.3] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[40%] -right-[30%] w-[900px] h-[900px] object-cover opacity-[0.3] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
            src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_20_tsx$,
  $fb_20_default_props${"headline":"THE BUILDERZ BLUEPRINT","subheadline":"FREE RESOURCE","cta_label":"DOWNLOAD THE BLUEPRINT FREE","bullets":[],"image_url":""}$fb_20_default_props$::jsonb,
  $fb_20_layout_signature$centered-stack$fb_20_layout_signature$,
  $fb_20_source_type$extracted$fb_20_source_type$,
  $fb_20_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintHero.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_20_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_21_slug$lead-magnet-freedom-builders-optin-blueprintoptin$fb_21_slug$,
  $fb_21_name$BlueprintOptIn$fb_21_name$,
  $fb_21_description$Freedom Builders BlueprintOptIn extracted from lead-magnet/freedom-builders-optin.md$fb_21_description$,
  $fb_21_category$hero$fb_21_category$,
  ARRAY[$fb_21_page_types_0$lead-magnet-optin$fb_21_page_types_0$, $fb_21_page_types_1$opt-in$fb_21_page_types_1$, $fb_21_page_types_2$lead-magnet$fb_21_page_types_2$]::text[],
  ARRAY[$fb_21_funnel_types_0$lead-magnet$fb_21_funnel_types_0$]::text[],
  $fb_21_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_21_slot_schema$::jsonb,
  ARRAY[$fb_21_theme_tokens_0$colors$fb_21_theme_tokens_0$, $fb_21_theme_tokens_1$font_heading$fb_21_theme_tokens_1$, $fb_21_theme_tokens_2$font_body$fb_21_theme_tokens_2$]::text[],
  $fb_21_asset_slots${}$fb_21_asset_slots$::jsonb,
  $fb_21_tsx$// __FB_SHIM_START__
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

// File: BlueprintOptIn.tsx
import { useRef } from "react";











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
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-8 shrink-0" />
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
$fb_21_tsx$,
  $fb_21_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_21_default_props$::jsonb,
  $fb_21_layout_signature$section$fb_21_layout_signature$,
  $fb_21_source_type$extracted$fb_21_source_type$,
  $fb_21_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"Entry File — BlueprintOptIn.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_21_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_22_slug$lead-magnet-freedom-builders-optin-blueprintpreview$fb_22_slug$,
  $fb_22_name$BlueprintPreview$fb_22_name$,
  $fb_22_description$Freedom Builders BlueprintPreview extracted from lead-magnet/freedom-builders-optin.md$fb_22_description$,
  $fb_22_category$social-proof$fb_22_category$,
  ARRAY[$fb_22_page_types_0$lead-magnet-optin$fb_22_page_types_0$, $fb_22_page_types_1$opt-in$fb_22_page_types_1$, $fb_22_page_types_2$lead-magnet$fb_22_page_types_2$]::text[],
  ARRAY[$fb_22_funnel_types_0$lead-magnet$fb_22_funnel_types_0$]::text[],
  $fb_22_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_22_slot_schema$::jsonb,
  ARRAY[$fb_22_theme_tokens_0$colors$fb_22_theme_tokens_0$, $fb_22_theme_tokens_1$font_heading$fb_22_theme_tokens_1$, $fb_22_theme_tokens_2$font_body$fb_22_theme_tokens_2$]::text[],
  $fb_22_asset_slots${}$fb_22_asset_slots$::jsonb,
  $fb_22_tsx$// __FB_SHIM_START__
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

// File: BlueprintPreview.tsx





const BlueprintPreview = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#121212" }}
    >
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none"
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
            src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_22_tsx$,
  $fb_22_default_props${"headline":"HERE'S WHAT YOU'RE GETTING","subheadline":"A complete, visual roadmap that turns your expertise into a structured online program.","cta_label":"","bullets":[],"image_url":""}$fb_22_default_props$::jsonb,
  $fb_22_layout_signature$centered-stack$fb_22_layout_signature$,
  $fb_22_source_type$extracted$fb_22_source_type$,
  $fb_22_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintPreview.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_22_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_23_slug$lead-magnet-freedom-builders-optin-blueprintproblemsolution$fb_23_slug$,
  $fb_23_name$BlueprintProblemSolution$fb_23_name$,
  $fb_23_description$Freedom Builders BlueprintProblemSolution extracted from lead-magnet/freedom-builders-optin.md$fb_23_description$,
  $fb_23_category$gallery$fb_23_category$,
  ARRAY[$fb_23_page_types_0$lead-magnet-optin$fb_23_page_types_0$, $fb_23_page_types_1$opt-in$fb_23_page_types_1$, $fb_23_page_types_2$lead-magnet$fb_23_page_types_2$]::text[],
  ARRAY[$fb_23_funnel_types_0$lead-magnet$fb_23_funnel_types_0$]::text[],
  $fb_23_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_23_slot_schema$::jsonb,
  ARRAY[$fb_23_theme_tokens_0$colors$fb_23_theme_tokens_0$, $fb_23_theme_tokens_1$font_heading$fb_23_theme_tokens_1$, $fb_23_theme_tokens_2$font_body$fb_23_theme_tokens_2$]::text[],
  $fb_23_asset_slots${}$fb_23_asset_slots$::jsonb,
  $fb_23_tsx$// __FB_SHIM_START__
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

// File: BlueprintProblemSolution.tsx
import { Check } from "lucide-react";





const BlueprintProblemSolution = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
                src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_23_tsx$,
  $fb_23_default_props${"headline":"STOP LETTING YOUR BEST IDEAS STAY STUCK IN YOUR HEAD","subheadline":"You already know you have something valuable to teach.","cta_label":"","bullets":[],"image_url":""}$fb_23_default_props$::jsonb,
  $fb_23_layout_signature$centered-stack$fb_23_layout_signature$,
  $fb_23_source_type$extracted$fb_23_source_type$,
  $fb_23_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintProblemSolution.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_23_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_24_slug$lead-magnet-freedom-builders-optin-blueprintvideopreview$fb_24_slug$,
  $fb_24_name$BlueprintVideoPreview$fb_24_name$,
  $fb_24_description$Freedom Builders BlueprintVideoPreview extracted from lead-magnet/freedom-builders-optin.md$fb_24_description$,
  $fb_24_category$social-proof$fb_24_category$,
  ARRAY[$fb_24_page_types_0$lead-magnet-optin$fb_24_page_types_0$, $fb_24_page_types_1$opt-in$fb_24_page_types_1$, $fb_24_page_types_2$lead-magnet$fb_24_page_types_2$]::text[],
  ARRAY[$fb_24_funnel_types_0$lead-magnet$fb_24_funnel_types_0$]::text[],
  $fb_24_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_24_slot_schema$::jsonb,
  ARRAY[$fb_24_theme_tokens_0$colors$fb_24_theme_tokens_0$, $fb_24_theme_tokens_1$font_heading$fb_24_theme_tokens_1$, $fb_24_theme_tokens_2$font_body$fb_24_theme_tokens_2$]::text[],
  $fb_24_asset_slots${}$fb_24_asset_slots$::jsonb,
  $fb_24_tsx$// __FB_SHIM_START__
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
$fb_24_tsx$,
  $fb_24_default_props${"headline":"SEE HOW IT WORKS","subheadline":"Watch the walkthrough and see exactly how to fill out your blueprint.","cta_label":"","bullets":[],"image_url":""}$fb_24_default_props$::jsonb,
  $fb_24_layout_signature$centered-stack$fb_24_layout_signature$,
  $fb_24_source_type$extracted$fb_24_source_type$,
  $fb_24_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintVideoPreview.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_24_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_25_slug$lead-magnet-freedom-builders-optin-blueprintwhatsinside$fb_25_slug$,
  $fb_25_name$BlueprintWhatsInside$fb_25_name$,
  $fb_25_description$Freedom Builders BlueprintWhatsInside extracted from lead-magnet/freedom-builders-optin.md$fb_25_description$,
  $fb_25_category$benefits$fb_25_category$,
  ARRAY[$fb_25_page_types_0$lead-magnet-optin$fb_25_page_types_0$, $fb_25_page_types_1$opt-in$fb_25_page_types_1$, $fb_25_page_types_2$lead-magnet$fb_25_page_types_2$]::text[],
  ARRAY[$fb_25_funnel_types_0$lead-magnet$fb_25_funnel_types_0$]::text[],
  $fb_25_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_25_slot_schema$::jsonb,
  ARRAY[$fb_25_theme_tokens_0$colors$fb_25_theme_tokens_0$, $fb_25_theme_tokens_1$font_heading$fb_25_theme_tokens_1$, $fb_25_theme_tokens_2$font_body$fb_25_theme_tokens_2$]::text[],
  $fb_25_asset_slots${}$fb_25_asset_slots$::jsonb,
  $fb_25_tsx$// __FB_SHIM_START__
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

// File: BlueprintWhatsInside.tsx




const cards = [
  {
    num: "01",
    title: "THE FRAMEWORK",
    desc: "The 5 questions that extract your course from your head onto paper in under 30 minutes",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
  {
    num: "02",
    title: "THE TEMPLATE",
    desc: "Plug-and-play Canva template. Drag, drop, done. No design skills needed.",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
  {
    num: "03",
    title: "THE WALKTHROUGH",
    desc: "Video guide where I personally take you through every section step by step",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
];

const BlueprintWhatsInside = () => {
  return (
    <section className="relative py-16 md:py-24 px-4 overflow-hidden" style={{ background: "#090909" }}>
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
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
$fb_25_tsx$,
  $fb_25_default_props${"headline":"WHAT YOU'LL GET","subheadline":"BONUS","cta_label":"","bullets":[],"image_url":""}$fb_25_default_props$::jsonb,
  $fb_25_layout_signature$grid-3$fb_25_layout_signature$,
  $fb_25_source_type$extracted$fb_25_source_type$,
  $fb_25_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintWhatsInside.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_25_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_26_slug$live-event-battista-event-backtotop$fb_26_slug$,
  $fb_26_name$BackToTop$fb_26_name$,
  $fb_26_description$Battista Academy BackToTop extracted from live-event/battista-event.md$fb_26_description$,
  $fb_26_category$stats$fb_26_category$,
  ARRAY[$fb_26_page_types_0$event$fb_26_page_types_0$, $fb_26_page_types_1$landing$fb_26_page_types_1$, $fb_26_page_types_2$live-event$fb_26_page_types_2$]::text[],
  ARRAY[$fb_26_funnel_types_0$live-event$fb_26_funnel_types_0$]::text[],
  $fb_26_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_26_slot_schema$::jsonb,
  ARRAY[$fb_26_theme_tokens_0$colors$fb_26_theme_tokens_0$, $fb_26_theme_tokens_1$font_heading$fb_26_theme_tokens_1$, $fb_26_theme_tokens_2$font_body$fb_26_theme_tokens_2$]::text[],
  $fb_26_asset_slots${}$fb_26_asset_slots$::jsonb,
  $fb_26_tsx$// __FB_SHIM_START__
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

// File: BackToTop.tsx

import { ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";


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
$fb_26_tsx$,
  $fb_26_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_26_default_props$::jsonb,
  $fb_26_layout_signature$sticky-bar$fb_26_layout_signature$,
  $fb_26_source_type$extracted$fb_26_source_type$,
  $fb_26_source_reference${"file_path":"live-event/battista-event.md","heading":"BackToTop.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_26_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_27_slug$live-event-battista-event-eventdetails$fb_27_slug$,
  $fb_27_name$EventDetails$fb_27_name$,
  $fb_27_description$Battista Academy EventDetails extracted from live-event/battista-event.md$fb_27_description$,
  $fb_27_category$unique$fb_27_category$,
  ARRAY[$fb_27_page_types_0$event$fb_27_page_types_0$, $fb_27_page_types_1$landing$fb_27_page_types_1$, $fb_27_page_types_2$live-event$fb_27_page_types_2$]::text[],
  ARRAY[$fb_27_funnel_types_0$live-event$fb_27_funnel_types_0$]::text[],
  $fb_27_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_27_slot_schema$::jsonb,
  ARRAY[$fb_27_theme_tokens_0$colors$fb_27_theme_tokens_0$, $fb_27_theme_tokens_1$font_heading$fb_27_theme_tokens_1$, $fb_27_theme_tokens_2$font_body$fb_27_theme_tokens_2$]::text[],
  $fb_27_asset_slots${}$fb_27_asset_slots$::jsonb,
  $fb_27_tsx$// __FB_SHIM_START__
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
$fb_27_tsx$,
  $fb_27_default_props${"headline":"EVENT DETAILS","subheadline":"July 16th and 17th, 2025","cta_label":"","bullets":[],"image_url":""}$fb_27_default_props$::jsonb,
  $fb_27_layout_signature$grid-3$fb_27_layout_signature$,
  $fb_27_source_type$extracted$fb_27_source_type$,
  $fb_27_source_reference${"file_path":"live-event/battista-event.md","heading":"EventDetails.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_27_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_28_slug$live-event-battista-event-eventlearning$fb_28_slug$,
  $fb_28_name$EventLearning$fb_28_name$,
  $fb_28_description$Battista Academy EventLearning extracted from live-event/battista-event.md$fb_28_description$,
  $fb_28_category$features$fb_28_category$,
  ARRAY[$fb_28_page_types_0$event$fb_28_page_types_0$, $fb_28_page_types_1$landing$fb_28_page_types_1$, $fb_28_page_types_2$live-event$fb_28_page_types_2$]::text[],
  ARRAY[$fb_28_funnel_types_0$live-event$fb_28_funnel_types_0$]::text[],
  $fb_28_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_28_slot_schema$::jsonb,
  ARRAY[$fb_28_theme_tokens_0$colors$fb_28_theme_tokens_0$, $fb_28_theme_tokens_1$font_heading$fb_28_theme_tokens_1$, $fb_28_theme_tokens_2$font_body$fb_28_theme_tokens_2$]::text[],
  $fb_28_asset_slots${}$fb_28_asset_slots$::jsonb,
  $fb_28_tsx$// __FB_SHIM_START__
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
$fb_28_tsx$,
  $fb_28_default_props${"headline":"THEMES, TOPICS & CONCEPTS","subheadline":"What you can expect to learn at a very high level","cta_label":"","bullets":[],"image_url":""}$fb_28_default_props$::jsonb,
  $fb_28_layout_signature$split-2$fb_28_layout_signature$,
  $fb_28_source_type$extracted$fb_28_source_type$,
  $fb_28_source_reference${"file_path":"live-event/battista-event.md","heading":"EventLearning.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_28_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
