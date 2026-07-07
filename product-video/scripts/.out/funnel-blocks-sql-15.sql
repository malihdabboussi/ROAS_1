INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_89_slug$webinar-sample-webinar-optin-countdowntimer$fb_89_slug$,
  $fb_89_name$CountdownTimer$fb_89_name$,
  $fb_89_description$Sample Webinar (ROAS) CountdownTimer extracted from webinar/sample-webinar-optin.md$fb_89_description$,
  $fb_89_category$urgency$fb_89_category$,
  ARRAY[$fb_89_page_types_0$webinar-optin$fb_89_page_types_0$, $fb_89_page_types_1$opt-in$fb_89_page_types_1$, $fb_89_page_types_2$webinar$fb_89_page_types_2$]::text[],
  ARRAY[$fb_89_funnel_types_0$webinar$fb_89_funnel_types_0$]::text[],
  $fb_89_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_89_slot_schema$::jsonb,
  ARRAY[$fb_89_theme_tokens_0$colors$fb_89_theme_tokens_0$, $fb_89_theme_tokens_1$font_heading$fb_89_theme_tokens_1$, $fb_89_theme_tokens_2$font_body$fb_89_theme_tokens_2$]::text[],
  $fb_89_asset_slots${}$fb_89_asset_slots$::jsonb,
  $fb_89_tsx$// __FB_SHIM_START__
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
$fb_89_tsx$,
  $fb_89_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_89_default_props$::jsonb,
  $fb_89_layout_signature$section$fb_89_layout_signature$,
  $fb_89_source_type$extracted$fb_89_source_type$,
  $fb_89_source_reference${"file_path":"webinar/sample-webinar-optin.md","heading":"CountdownTimer.tsx","page_name":"Sample Webinar - Opt-In","company":"Sample Webinar (ROAS)"}$fb_89_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_90_slug$webinar-sample-webinar-optin-launch$fb_90_slug$,
  $fb_90_name$Launch$fb_90_name$,
  $fb_90_description$Sample Webinar (ROAS) Launch extracted from webinar/sample-webinar-optin.md$fb_90_description$,
  $fb_90_category$hero$fb_90_category$,
  ARRAY[$fb_90_page_types_0$webinar-optin$fb_90_page_types_0$, $fb_90_page_types_1$opt-in$fb_90_page_types_1$, $fb_90_page_types_2$webinar$fb_90_page_types_2$]::text[],
  ARRAY[$fb_90_funnel_types_0$webinar$fb_90_funnel_types_0$]::text[],
  $fb_90_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_90_slot_schema$::jsonb,
  ARRAY[$fb_90_theme_tokens_0$colors$fb_90_theme_tokens_0$, $fb_90_theme_tokens_1$font_heading$fb_90_theme_tokens_1$, $fb_90_theme_tokens_2$font_body$fb_90_theme_tokens_2$]::text[],
  $fb_90_asset_slots${}$fb_90_asset_slots$::jsonb,
  $fb_90_tsx$// __FB_SHIM_START__
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
import { Check, Lock, Play, ArrowRight, Zap, Target, Users, DollarSign, Clock } from "lucide-react";









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
export default Launch;
$fb_90_tsx$,
  $fb_90_default_props${"headline":"THE CORRECT WAY TO USE WEBINARS TO SELL MORE IN LESS TIME","subheadline":"For Experts, Coaches, Consultants, And Online Service Providers...","cta_label":"setIsModalOpen(true)} className=\"w-full flex items-center justify-center gap-2 text-white font-semibold text-sm md:text-base hover:opacity-90 transition-opacity\"> FREE ONLINE ZOOM TRAINING - REGISTER NOW","bullets":[],"image_url":""}$fb_90_default_props$::jsonb,
  $fb_90_layout_signature$split-2$fb_90_layout_signature$,
  $fb_90_source_type$extracted$fb_90_source_type$,
  $fb_90_source_reference${"file_path":"webinar/sample-webinar-optin.md","heading":"Entry File — Launch.tsx","page_name":"Sample Webinar - Opt-In","company":"Sample Webinar (ROAS)"}$fb_90_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_91_slug$webinar-sample-webinar-optin-logobar$fb_91_slug$,
  $fb_91_name$LogoBar$fb_91_name$,
  $fb_91_description$Sample Webinar (ROAS) LogoBar extracted from webinar/sample-webinar-optin.md$fb_91_description$,
  $fb_91_category$features$fb_91_category$,
  ARRAY[$fb_91_page_types_0$webinar-optin$fb_91_page_types_0$, $fb_91_page_types_1$opt-in$fb_91_page_types_1$, $fb_91_page_types_2$webinar$fb_91_page_types_2$]::text[],
  ARRAY[$fb_91_funnel_types_0$webinar$fb_91_funnel_types_0$]::text[],
  $fb_91_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_91_slot_schema$::jsonb,
  ARRAY[$fb_91_theme_tokens_0$colors$fb_91_theme_tokens_0$, $fb_91_theme_tokens_1$font_heading$fb_91_theme_tokens_1$, $fb_91_theme_tokens_2$font_body$fb_91_theme_tokens_2$]::text[],
  $fb_91_asset_slots${}$fb_91_asset_slots$::jsonb,
  $fb_91_tsx$// __FB_SHIM_START__
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
$fb_91_tsx$,
  $fb_91_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_91_default_props$::jsonb,
  $fb_91_layout_signature$section$fb_91_layout_signature$,
  $fb_91_source_type$extracted$fb_91_source_type$,
  $fb_91_source_reference${"file_path":"webinar/sample-webinar-optin.md","heading":"LogoBar.tsx","page_name":"Sample Webinar - Opt-In","company":"Sample Webinar (ROAS)"}$fb_91_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_92_slug$webinar-sample-webinar-optin-stickybottombar$fb_92_slug$,
  $fb_92_name$StickyBottomBar$fb_92_name$,
  $fb_92_description$Sample Webinar (ROAS) StickyBottomBar extracted from webinar/sample-webinar-optin.md$fb_92_description$,
  $fb_92_category$cta$fb_92_category$,
  ARRAY[$fb_92_page_types_0$webinar-optin$fb_92_page_types_0$, $fb_92_page_types_1$opt-in$fb_92_page_types_1$, $fb_92_page_types_2$webinar$fb_92_page_types_2$]::text[],
  ARRAY[$fb_92_funnel_types_0$webinar$fb_92_funnel_types_0$]::text[],
  $fb_92_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_92_slot_schema$::jsonb,
  ARRAY[$fb_92_theme_tokens_0$colors$fb_92_theme_tokens_0$, $fb_92_theme_tokens_1$font_heading$fb_92_theme_tokens_1$, $fb_92_theme_tokens_2$font_body$fb_92_theme_tokens_2$]::text[],
  $fb_92_asset_slots${}$fb_92_asset_slots$::jsonb,
  $fb_92_tsx$// __FB_SHIM_START__
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
$fb_92_tsx$,
  $fb_92_default_props${"headline":"Replace this headline","subheadline":"FREE LIVE TRAINING","cta_label":"REGISTER NOW","bullets":[],"image_url":""}$fb_92_default_props$::jsonb,
  $fb_92_layout_signature$centered-stack$fb_92_layout_signature$,
  $fb_92_source_type$extracted$fb_92_source_type$,
  $fb_92_source_reference${"file_path":"webinar/sample-webinar-optin.md","heading":"StickyBottomBar.tsx","page_name":"Sample Webinar - Opt-In","company":"Sample Webinar (ROAS)"}$fb_92_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_93_slug$webinar-sample-webinar-optin-trustindicators$fb_93_slug$,
  $fb_93_name$TrustIndicators$fb_93_name$,
  $fb_93_description$Sample Webinar (ROAS) TrustIndicators extracted from webinar/sample-webinar-optin.md$fb_93_description$,
  $fb_93_category$unique$fb_93_category$,
  ARRAY[$fb_93_page_types_0$webinar-optin$fb_93_page_types_0$, $fb_93_page_types_1$opt-in$fb_93_page_types_1$, $fb_93_page_types_2$webinar$fb_93_page_types_2$]::text[],
  ARRAY[$fb_93_funnel_types_0$webinar$fb_93_funnel_types_0$]::text[],
  $fb_93_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_93_slot_schema$::jsonb,
  ARRAY[$fb_93_theme_tokens_0$colors$fb_93_theme_tokens_0$, $fb_93_theme_tokens_1$font_heading$fb_93_theme_tokens_1$, $fb_93_theme_tokens_2$font_body$fb_93_theme_tokens_2$]::text[],
  $fb_93_asset_slots${}$fb_93_asset_slots$::jsonb,
  $fb_93_tsx$// __FB_SHIM_START__
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
$fb_93_tsx$,
  $fb_93_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_93_default_props$::jsonb,
  $fb_93_layout_signature$split-2$fb_93_layout_signature$,
  $fb_93_source_type$extracted$fb_93_source_type$,
  $fb_93_source_reference${"file_path":"webinar/sample-webinar-optin.md","heading":"TrustIndicators.tsx","page_name":"Sample Webinar - Opt-In","company":"Sample Webinar (ROAS)"}$fb_93_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
