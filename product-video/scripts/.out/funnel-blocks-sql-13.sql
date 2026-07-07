INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_75_slug$webinar-insurance-creators-optin-launch$fb_75_slug$,
  $fb_75_name$Launch$fb_75_name$,
  $fb_75_description$Insurance Creators Launch extracted from webinar/insurance-creators-optin.md$fb_75_description$,
  $fb_75_category$hero$fb_75_category$,
  ARRAY[$fb_75_page_types_0$webinar-optin$fb_75_page_types_0$, $fb_75_page_types_1$opt-in$fb_75_page_types_1$, $fb_75_page_types_2$webinar$fb_75_page_types_2$]::text[],
  ARRAY[$fb_75_funnel_types_0$webinar$fb_75_funnel_types_0$]::text[],
  $fb_75_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_75_slot_schema$::jsonb,
  ARRAY[$fb_75_theme_tokens_0$colors$fb_75_theme_tokens_0$, $fb_75_theme_tokens_1$font_heading$fb_75_theme_tokens_1$, $fb_75_theme_tokens_2$font_body$fb_75_theme_tokens_2$]::text[],
  $fb_75_asset_slots${}$fb_75_asset_slots$::jsonb,
  $fb_75_tsx$// __FB_SHIM_START__
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

// File: Launch.tsx
import { useState } from "react";
import { Check, Lock, ArrowRight, Eye, Shield, Sparkles, TrendingUp, Bot } from "lucide-react";








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
              <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="The Insurance Creators" className="h-16 md:h-20 w-auto" />
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
                <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="The Insurance Creators" className="h-12 w-auto opacity-60" />
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
$fb_75_tsx$,
  $fb_75_default_props${"headline":"The 3-Part System Top Insurance Agencies Are Using to Generate Inbound Leads on Autopilot (Without Becoming a Full-Time Content Creator)","subheadline":"Free Live Training for Insurance Agency Owners","cta_label":"setIsModalOpen(true)} className=\"w-full flex items-center justify-center gap-2 text-black font-bold text-sm md:text-base hover:opacity-90 transition-opacity\" > FREE LIVE TRAINING FOR INSURANCE AGENCY OWNERS - REGISTER NOW","bullets":[],"image_url":""}$fb_75_default_props$::jsonb,
  $fb_75_layout_signature$split-2$fb_75_layout_signature$,
  $fb_75_source_type$extracted$fb_75_source_type$,
  $fb_75_source_reference${"file_path":"webinar/insurance-creators-optin.md","heading":"Entry File — Launch.tsx","page_name":"Insurance Creators - Opt-In","company":"Insurance Creators"}$fb_75_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_76_slug$webinar-insurance-creators-optin-logobar$fb_76_slug$,
  $fb_76_name$LogoBar$fb_76_name$,
  $fb_76_description$Insurance Creators LogoBar extracted from webinar/insurance-creators-optin.md$fb_76_description$,
  $fb_76_category$features$fb_76_category$,
  ARRAY[$fb_76_page_types_0$webinar-optin$fb_76_page_types_0$, $fb_76_page_types_1$opt-in$fb_76_page_types_1$, $fb_76_page_types_2$webinar$fb_76_page_types_2$]::text[],
  ARRAY[$fb_76_funnel_types_0$webinar$fb_76_funnel_types_0$]::text[],
  $fb_76_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_76_slot_schema$::jsonb,
  ARRAY[$fb_76_theme_tokens_0$colors$fb_76_theme_tokens_0$, $fb_76_theme_tokens_1$font_heading$fb_76_theme_tokens_1$, $fb_76_theme_tokens_2$font_body$fb_76_theme_tokens_2$]::text[],
  $fb_76_asset_slots${}$fb_76_asset_slots$::jsonb,
  $fb_76_tsx$// __FB_SHIM_START__
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
$fb_76_tsx$,
  $fb_76_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_76_default_props$::jsonb,
  $fb_76_layout_signature$section$fb_76_layout_signature$,
  $fb_76_source_type$extracted$fb_76_source_type$,
  $fb_76_source_reference${"file_path":"webinar/insurance-creators-optin.md","heading":"LogoBar.tsx","page_name":"Insurance Creators - Opt-In","company":"Insurance Creators"}$fb_76_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_77_slug$webinar-insurance-creators-optin-registrationmodal$fb_77_slug$,
  $fb_77_name$RegistrationModal$fb_77_name$,
  $fb_77_description$Insurance Creators RegistrationModal extracted from webinar/insurance-creators-optin.md$fb_77_description$,
  $fb_77_category$navigation$fb_77_category$,
  ARRAY[$fb_77_page_types_0$webinar-optin$fb_77_page_types_0$, $fb_77_page_types_1$opt-in$fb_77_page_types_1$, $fb_77_page_types_2$webinar$fb_77_page_types_2$]::text[],
  ARRAY[$fb_77_funnel_types_0$webinar$fb_77_funnel_types_0$]::text[],
  $fb_77_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_77_slot_schema$::jsonb,
  ARRAY[$fb_77_theme_tokens_0$colors$fb_77_theme_tokens_0$, $fb_77_theme_tokens_1$font_heading$fb_77_theme_tokens_1$, $fb_77_theme_tokens_2$font_body$fb_77_theme_tokens_2$]::text[],
  $fb_77_asset_slots${}$fb_77_asset_slots$::jsonb,
  $fb_77_tsx$// __FB_SHIM_START__
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

// File: RegistrationModal.tsx
import { useState } from "react";






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
$fb_77_tsx$,
  $fb_77_default_props${"headline":"Replace this headline","subheadline":"+ access bonus case study details on the next page","cta_label":"","bullets":[],"image_url":""}$fb_77_default_props$::jsonb,
  $fb_77_layout_signature$centered-stack$fb_77_layout_signature$,
  $fb_77_source_type$extracted$fb_77_source_type$,
  $fb_77_source_reference${"file_path":"webinar/insurance-creators-optin.md","heading":"RegistrationModal.tsx","page_name":"Insurance Creators - Opt-In","company":"Insurance Creators"}$fb_77_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_78_slug$webinar-insurance-creators-optin-stickybottombar$fb_78_slug$,
  $fb_78_name$StickyBottomBar$fb_78_name$,
  $fb_78_description$Insurance Creators StickyBottomBar extracted from webinar/insurance-creators-optin.md$fb_78_description$,
  $fb_78_category$cta$fb_78_category$,
  ARRAY[$fb_78_page_types_0$webinar-optin$fb_78_page_types_0$, $fb_78_page_types_1$opt-in$fb_78_page_types_1$, $fb_78_page_types_2$webinar$fb_78_page_types_2$]::text[],
  ARRAY[$fb_78_funnel_types_0$webinar$fb_78_funnel_types_0$]::text[],
  $fb_78_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_78_slot_schema$::jsonb,
  ARRAY[$fb_78_theme_tokens_0$colors$fb_78_theme_tokens_0$, $fb_78_theme_tokens_1$font_heading$fb_78_theme_tokens_1$, $fb_78_theme_tokens_2$font_body$fb_78_theme_tokens_2$]::text[],
  $fb_78_asset_slots${}$fb_78_asset_slots$::jsonb,
  $fb_78_tsx$// __FB_SHIM_START__
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

// File: StickyBottomBar.tsx

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
$fb_78_tsx$,
  $fb_78_default_props${"headline":"Replace this headline","subheadline":"FREE LIVE TRAINING","cta_label":"SAVE MY SEAT","bullets":[],"image_url":""}$fb_78_default_props$::jsonb,
  $fb_78_layout_signature$centered-stack$fb_78_layout_signature$,
  $fb_78_source_type$extracted$fb_78_source_type$,
  $fb_78_source_reference${"file_path":"webinar/insurance-creators-optin.md","heading":"StickyBottomBar.tsx","page_name":"Insurance Creators - Opt-In","company":"Insurance Creators"}$fb_78_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_79_slug$webinar-insurance-creators-optin-trustindicators$fb_79_slug$,
  $fb_79_name$TrustIndicators$fb_79_name$,
  $fb_79_description$Insurance Creators TrustIndicators extracted from webinar/insurance-creators-optin.md$fb_79_description$,
  $fb_79_category$unique$fb_79_category$,
  ARRAY[$fb_79_page_types_0$webinar-optin$fb_79_page_types_0$, $fb_79_page_types_1$opt-in$fb_79_page_types_1$, $fb_79_page_types_2$webinar$fb_79_page_types_2$]::text[],
  ARRAY[$fb_79_funnel_types_0$webinar$fb_79_funnel_types_0$]::text[],
  $fb_79_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_79_slot_schema$::jsonb,
  ARRAY[$fb_79_theme_tokens_0$colors$fb_79_theme_tokens_0$, $fb_79_theme_tokens_1$font_heading$fb_79_theme_tokens_1$, $fb_79_theme_tokens_2$font_body$fb_79_theme_tokens_2$]::text[],
  $fb_79_asset_slots${}$fb_79_asset_slots$::jsonb,
  $fb_79_tsx$// __FB_SHIM_START__
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
$fb_79_tsx$,
  $fb_79_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_79_default_props$::jsonb,
  $fb_79_layout_signature$split-2$fb_79_layout_signature$,
  $fb_79_source_type$extracted$fb_79_source_type$,
  $fb_79_source_reference${"file_path":"webinar/insurance-creators-optin.md","heading":"TrustIndicators.tsx","page_name":"Insurance Creators - Opt-In","company":"Insurance Creators"}$fb_79_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_80_slug$webinar-leveraged-va-optin-benefits$fb_80_slug$,
  $fb_80_name$Benefits$fb_80_name$,
  $fb_80_description$Leveraged VA Benefits extracted from webinar/leveraged-va-optin.md$fb_80_description$,
  $fb_80_category$benefits$fb_80_category$,
  ARRAY[$fb_80_page_types_0$webinar-optin$fb_80_page_types_0$, $fb_80_page_types_1$opt-in$fb_80_page_types_1$, $fb_80_page_types_2$webinar$fb_80_page_types_2$]::text[],
  ARRAY[$fb_80_funnel_types_0$webinar$fb_80_funnel_types_0$]::text[],
  $fb_80_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_80_slot_schema$::jsonb,
  ARRAY[$fb_80_theme_tokens_0$colors$fb_80_theme_tokens_0$, $fb_80_theme_tokens_1$font_heading$fb_80_theme_tokens_1$, $fb_80_theme_tokens_2$font_body$fb_80_theme_tokens_2$]::text[],
  $fb_80_asset_slots${}$fb_80_asset_slots$::jsonb,
  $fb_80_tsx$// __FB_SHIM_START__
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

import { Rocket, ShieldCheck, PiggyBank } from "lucide-react";


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
$fb_80_tsx$,
  $fb_80_default_props${"headline":"Live Virtual Training Reveals...","subheadline":"How the Leveraged VA System can transform your CRE brokerage, giving you more time, more freedom, and more success.","cta_label":"Register and Get the Details","bullets":[],"image_url":""}$fb_80_default_props$::jsonb,
  $fb_80_layout_signature$grid-3$fb_80_layout_signature$,
  $fb_80_source_type$extracted$fb_80_source_type$,
  $fb_80_source_reference${"file_path":"webinar/leveraged-va-optin.md","heading":"Benefits.tsx","page_name":"Leveraged VA - Webinar Opt-In","company":"Leveraged VA"}$fb_80_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_81_slug$webinar-leveraged-va-optin-bonus$fb_81_slug$,
  $fb_81_name$Bonus$fb_81_name$,
  $fb_81_description$Leveraged VA Bonus extracted from webinar/leveraged-va-optin.md$fb_81_description$,
  $fb_81_category$urgency$fb_81_category$,
  ARRAY[$fb_81_page_types_0$webinar-optin$fb_81_page_types_0$, $fb_81_page_types_1$opt-in$fb_81_page_types_1$, $fb_81_page_types_2$webinar$fb_81_page_types_2$]::text[],
  ARRAY[$fb_81_funnel_types_0$webinar$fb_81_funnel_types_0$]::text[],
  $fb_81_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_81_slot_schema$::jsonb,
  ARRAY[$fb_81_theme_tokens_0$colors$fb_81_theme_tokens_0$, $fb_81_theme_tokens_1$font_heading$fb_81_theme_tokens_1$, $fb_81_theme_tokens_2$font_body$fb_81_theme_tokens_2$]::text[],
  $fb_81_asset_slots${}$fb_81_asset_slots$::jsonb,
  $fb_81_tsx$// __FB_SHIM_START__
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

// File: Bonus.tsx

import { Gift, FileText, Users, CheckCircle, Star, Calendar, Clock } from "lucide-react";


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
$fb_81_tsx$,
  $fb_81_default_props${"headline":"Get These FREE Bonuses Worth $500+","subheadline":"Show up live and get instant access to these game-changing resources","cta_label":"Register Your Spot to Unlock Bonuses","bullets":[],"image_url":""}$fb_81_default_props$::jsonb,
  $fb_81_layout_signature$split-2$fb_81_layout_signature$,
  $fb_81_source_type$extracted$fb_81_source_type$,
  $fb_81_source_reference${"file_path":"webinar/leveraged-va-optin.md","heading":"Bonus.tsx","page_name":"Leveraged VA - Webinar Opt-In","company":"Leveraged VA"}$fb_81_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_82_slug$webinar-leveraged-va-optin-hero$fb_82_slug$,
  $fb_82_name$Hero$fb_82_name$,
  $fb_82_description$Leveraged VA Hero extracted from webinar/leveraged-va-optin.md$fb_82_description$,
  $fb_82_category$hero$fb_82_category$,
  ARRAY[$fb_82_page_types_0$webinar-optin$fb_82_page_types_0$, $fb_82_page_types_1$opt-in$fb_82_page_types_1$, $fb_82_page_types_2$webinar$fb_82_page_types_2$]::text[],
  ARRAY[$fb_82_funnel_types_0$webinar$fb_82_funnel_types_0$]::text[],
  $fb_82_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_82_slot_schema$::jsonb,
  ARRAY[$fb_82_theme_tokens_0$colors$fb_82_theme_tokens_0$, $fb_82_theme_tokens_1$font_heading$fb_82_theme_tokens_1$, $fb_82_theme_tokens_2$font_body$fb_82_theme_tokens_2$]::text[],
  $fb_82_asset_slots${}$fb_82_asset_slots$::jsonb,
  $fb_82_tsx$// __FB_SHIM_START__
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

// File: Hero.tsx


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
$fb_82_tsx$,
  $fb_82_default_props${"headline":"Get Back 15+ Hours a Week in 21 Days With Our Proven Method","subheadline":"Discover the exact system top CRE brokers are using to delegate 80% of their workload, scale their business, and reclaim their life.","cta_label":"Save My Seat Now - It's FREE","bullets":[],"image_url":""}$fb_82_default_props$::jsonb,
  $fb_82_layout_signature$centered-stack$fb_82_layout_signature$,
  $fb_82_source_type$extracted$fb_82_source_type$,
  $fb_82_source_reference${"file_path":"webinar/leveraged-va-optin.md","heading":"Hero.tsx","page_name":"Leveraged VA - Webinar Opt-In","company":"Leveraged VA"}$fb_82_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
