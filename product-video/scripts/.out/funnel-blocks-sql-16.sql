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
