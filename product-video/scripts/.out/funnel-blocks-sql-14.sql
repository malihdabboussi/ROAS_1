INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_83_slug$webinar-leveraged-va-optin-host$fb_83_slug$,
  $fb_83_name$Host$fb_83_name$,
  $fb_83_description$Leveraged VA Host extracted from webinar/leveraged-va-optin.md$fb_83_description$,
  $fb_83_category$features$fb_83_category$,
  ARRAY[$fb_83_page_types_0$webinar-optin$fb_83_page_types_0$, $fb_83_page_types_1$opt-in$fb_83_page_types_1$, $fb_83_page_types_2$webinar$fb_83_page_types_2$]::text[],
  ARRAY[$fb_83_funnel_types_0$webinar$fb_83_funnel_types_0$]::text[],
  $fb_83_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_83_slot_schema$::jsonb,
  ARRAY[$fb_83_theme_tokens_0$colors$fb_83_theme_tokens_0$, $fb_83_theme_tokens_1$font_heading$fb_83_theme_tokens_1$, $fb_83_theme_tokens_2$font_body$fb_83_theme_tokens_2$]::text[],
  $fb_83_asset_slots${}$fb_83_asset_slots$::jsonb,
  $fb_83_tsx$// __FB_SHIM_START__
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

// File: Host.tsx

import { Award, Building, Users, Plane } from "lucide-react";


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
$fb_83_tsx$,
  $fb_83_default_props${"headline":"About Your Host","subheadline":"Top Producer","cta_label":"Learn Phill's System","bullets":[],"image_url":""}$fb_83_default_props$::jsonb,
  $fb_83_layout_signature$split-2$fb_83_layout_signature$,
  $fb_83_source_type$extracted$fb_83_source_type$,
  $fb_83_source_reference${"file_path":"webinar/leveraged-va-optin.md","heading":"Host.tsx","page_name":"Leveraged VA - Webinar Opt-In","company":"Leveraged VA"}$fb_83_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_84_slug$webinar-leveraged-va-optin-index$fb_84_slug$,
  $fb_84_name$Index$fb_84_name$,
  $fb_84_description$Leveraged VA Index extracted from webinar/leveraged-va-optin.md$fb_84_description$,
  $fb_84_category$hero$fb_84_category$,
  ARRAY[$fb_84_page_types_0$webinar-optin$fb_84_page_types_0$, $fb_84_page_types_1$opt-in$fb_84_page_types_1$, $fb_84_page_types_2$webinar$fb_84_page_types_2$]::text[],
  ARRAY[$fb_84_funnel_types_0$webinar$fb_84_funnel_types_0$]::text[],
  $fb_84_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_84_slot_schema$::jsonb,
  ARRAY[$fb_84_theme_tokens_0$colors$fb_84_theme_tokens_0$, $fb_84_theme_tokens_1$font_heading$fb_84_theme_tokens_1$, $fb_84_theme_tokens_2$font_body$fb_84_theme_tokens_2$]::text[],
  $fb_84_asset_slots${}$fb_84_asset_slots$::jsonb,
  $fb_84_tsx$// __FB_SHIM_START__
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

// File: Index.tsx








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
$fb_84_tsx$,
  $fb_84_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_84_default_props$::jsonb,
  $fb_84_layout_signature$centered-stack$fb_84_layout_signature$,
  $fb_84_source_type$extracted$fb_84_source_type$,
  $fb_84_source_reference${"file_path":"webinar/leveraged-va-optin.md","heading":"Entry File — Index.tsx","page_name":"Leveraged VA - Webinar Opt-In","company":"Leveraged VA"}$fb_84_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_85_slug$webinar-leveraged-va-optin-registrationpopup$fb_85_slug$,
  $fb_85_name$RegistrationPopup$fb_85_name$,
  $fb_85_description$Leveraged VA RegistrationPopup extracted from webinar/leveraged-va-optin.md$fb_85_description$,
  $fb_85_category$navigation$fb_85_category$,
  ARRAY[$fb_85_page_types_0$webinar-optin$fb_85_page_types_0$, $fb_85_page_types_1$opt-in$fb_85_page_types_1$, $fb_85_page_types_2$webinar$fb_85_page_types_2$]::text[],
  ARRAY[$fb_85_funnel_types_0$webinar$fb_85_funnel_types_0$]::text[],
  $fb_85_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_85_slot_schema$::jsonb,
  ARRAY[$fb_85_theme_tokens_0$colors$fb_85_theme_tokens_0$, $fb_85_theme_tokens_1$font_heading$fb_85_theme_tokens_1$, $fb_85_theme_tokens_2$font_body$fb_85_theme_tokens_2$]::text[],
  $fb_85_asset_slots${}$fb_85_asset_slots$::jsonb,
  $fb_85_tsx$// __FB_SHIM_START__
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

// File: RegistrationPopup.tsx

import React, { useState } from "react";

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
$fb_85_tsx$,
  $fb_85_default_props${"headline":"Replace this headline","subheadline":"Enter Your Information Now to Secure Your Spot","cta_label":"","bullets":[],"image_url":""}$fb_85_default_props$::jsonb,
  $fb_85_layout_signature$centered-stack$fb_85_layout_signature$,
  $fb_85_source_type$extracted$fb_85_source_type$,
  $fb_85_source_reference${"file_path":"webinar/leveraged-va-optin.md","heading":"RegistrationPopup.tsx","page_name":"Leveraged VA - Webinar Opt-In","company":"Leveraged VA"}$fb_85_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_86_slug$webinar-leveraged-va-optin-targetaudience$fb_86_slug$,
  $fb_86_name$TargetAudience$fb_86_name$,
  $fb_86_description$Leveraged VA TargetAudience extracted from webinar/leveraged-va-optin.md$fb_86_description$,
  $fb_86_category$unique$fb_86_category$,
  ARRAY[$fb_86_page_types_0$webinar-optin$fb_86_page_types_0$, $fb_86_page_types_1$opt-in$fb_86_page_types_1$, $fb_86_page_types_2$webinar$fb_86_page_types_2$]::text[],
  ARRAY[$fb_86_funnel_types_0$webinar$fb_86_funnel_types_0$]::text[],
  $fb_86_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_86_slot_schema$::jsonb,
  ARRAY[$fb_86_theme_tokens_0$colors$fb_86_theme_tokens_0$, $fb_86_theme_tokens_1$font_heading$fb_86_theme_tokens_1$, $fb_86_theme_tokens_2$font_body$fb_86_theme_tokens_2$]::text[],
  $fb_86_asset_slots${}$fb_86_asset_slots$::jsonb,
  $fb_86_tsx$// __FB_SHIM_START__
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
$fb_86_tsx$,
  $fb_86_default_props${"headline":"This Is for You If…","subheadline":"Does this sound like your current situation?","cta_label":"","bullets":[],"image_url":""}$fb_86_default_props$::jsonb,
  $fb_86_layout_signature$split-2$fb_86_layout_signature$,
  $fb_86_source_type$extracted$fb_86_source_type$,
  $fb_86_source_reference${"file_path":"webinar/leveraged-va-optin.md","heading":"TargetAudience.tsx","page_name":"Leveraged VA - Webinar Opt-In","company":"Leveraged VA"}$fb_86_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_87_slug$webinar-sample-webinar-confirmation-prelaunch$fb_87_slug$,
  $fb_87_name$PreLaunch$fb_87_name$,
  $fb_87_description$Sample Webinar (ROAS) PreLaunch extracted from webinar/sample-webinar-confirmation.md$fb_87_description$,
  $fb_87_category$navigation$fb_87_category$,
  ARRAY[$fb_87_page_types_0$webinar-confirmation$fb_87_page_types_0$, $fb_87_page_types_1$thank-you$fb_87_page_types_1$, $fb_87_page_types_2$webinar$fb_87_page_types_2$]::text[],
  ARRAY[$fb_87_funnel_types_0$webinar$fb_87_funnel_types_0$]::text[],
  $fb_87_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_87_slot_schema$::jsonb,
  ARRAY[$fb_87_theme_tokens_0$colors$fb_87_theme_tokens_0$, $fb_87_theme_tokens_1$font_heading$fb_87_theme_tokens_1$, $fb_87_theme_tokens_2$font_body$fb_87_theme_tokens_2$]::text[],
  $fb_87_asset_slots${}$fb_87_asset_slots$::jsonb,
  $fb_87_tsx$// __FB_SHIM_START__
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
  Users,
  Share2,
  Gift,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";








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
$fb_87_tsx$,
  $fb_87_default_props${"headline":"Congratulations","subheadline":", completed: false, }, , , , ]); const [isCardFlipped, setIsCardFlipped] = useState(false); const [showProgressPopup, setShowProgressPopup] = useState(false); const [isProgressCollapsed, setIsProgressCollapsed] = useState(window.innerWidth s.completed).length; const progressPercent = (completedSteps / steps.length) * 100; // Fire confetti on mount from both sides (once only) const confettiFired = useRef(false); useEffect(() => , colors: [\"#3b82f6\", \"#60a5fa\", \"#ffffff\"], }); // Right side confetti confetti( , colors: [\"#3b82f6\", \"#60a5fa\", \"#ffffff\"], }); }, 500); return () => clearTimeout(timer); }, []); // Show progress popup after a delay useEffect(() => , [completedSteps, steps.length]); // Exit intent detection useEffect(() => , [showExitIntent, completedSteps]); const markStepComplete = (stepId: number) => : s)) ); // Fire mini confetti for each completed step confetti( , colors: [\"#3b82f6\", \"#60a5fa\"], }); }; const caseStudies = [ , , , ]; const socialLinks = [ , , , , ]; return ( <> Congratulations Your Virtual Seat is Saved for the Live Training!","cta_label":"markStepComplete(1)} className=\"w-20 h-20 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl group\" >","bullets":[],"image_url":""}$fb_87_default_props$::jsonb,
  $fb_87_layout_signature$grid-3$fb_87_layout_signature$,
  $fb_87_source_type$extracted$fb_87_source_type$,
  $fb_87_source_reference${"file_path":"webinar/sample-webinar-confirmation.md","heading":"","page_name":"Sample Webinar - Confirmation","company":"Sample Webinar (ROAS)"}$fb_87_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_88_slug$webinar-sample-webinar-optin-casestudycard$fb_88_slug$,
  $fb_88_name$CaseStudyCard$fb_88_name$,
  $fb_88_description$Sample Webinar (ROAS) CaseStudyCard extracted from webinar/sample-webinar-optin.md$fb_88_description$,
  $fb_88_category$gallery$fb_88_category$,
  ARRAY[$fb_88_page_types_0$webinar-optin$fb_88_page_types_0$, $fb_88_page_types_1$opt-in$fb_88_page_types_1$, $fb_88_page_types_2$webinar$fb_88_page_types_2$]::text[],
  ARRAY[$fb_88_funnel_types_0$webinar$fb_88_funnel_types_0$]::text[],
  $fb_88_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_88_slot_schema$::jsonb,
  ARRAY[$fb_88_theme_tokens_0$colors$fb_88_theme_tokens_0$, $fb_88_theme_tokens_1$font_heading$fb_88_theme_tokens_1$, $fb_88_theme_tokens_2$font_body$fb_88_theme_tokens_2$]::text[],
  $fb_88_asset_slots${}$fb_88_asset_slots$::jsonb,
  $fb_88_tsx$// __FB_SHIM_START__
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
$fb_88_tsx$,
  $fb_88_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_88_default_props$::jsonb,
  $fb_88_layout_signature$section$fb_88_layout_signature$,
  $fb_88_source_type$extracted$fb_88_source_type$,
  $fb_88_source_reference${"file_path":"webinar/sample-webinar-optin.md","heading":"CaseStudyCard.tsx","page_name":"Sample Webinar - Opt-In","company":"Sample Webinar (ROAS)"}$fb_88_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
