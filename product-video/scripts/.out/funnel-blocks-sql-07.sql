INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_42_slug$live-event-standard-plumbing-event-header$fb_42_slug$,
  $fb_42_name$Header$fb_42_name$,
  $fb_42_description$Standard Plumbing Header extracted from live-event/standard-plumbing-event.md$fb_42_description$,
  $fb_42_category$navigation$fb_42_category$,
  ARRAY[$fb_42_page_types_0$event$fb_42_page_types_0$, $fb_42_page_types_1$landing$fb_42_page_types_1$, $fb_42_page_types_2$live-event$fb_42_page_types_2$]::text[],
  ARRAY[$fb_42_funnel_types_0$live-event$fb_42_funnel_types_0$]::text[],
  $fb_42_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_42_slot_schema$::jsonb,
  ARRAY[$fb_42_theme_tokens_0$colors$fb_42_theme_tokens_0$, $fb_42_theme_tokens_1$font_heading$fb_42_theme_tokens_1$, $fb_42_theme_tokens_2$font_body$fb_42_theme_tokens_2$]::text[],
  $fb_42_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_42_asset_slots$::jsonb,
  $fb_42_tsx$// __FB_SHIM_START__
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

// File: Header.tsx



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
$fb_42_tsx$,
  $fb_42_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"SECURE MY SEAT","bullets":[],"image_url":"https://your-form-provider.com/embed.js"}$fb_42_default_props$::jsonb,
  $fb_42_layout_signature$modal$fb_42_layout_signature$,
  $fb_42_source_type$extracted$fb_42_source_type$,
  $fb_42_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"Header.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_42_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_43_slug$live-event-standard-plumbing-event-hero$fb_43_slug$,
  $fb_43_name$Hero$fb_43_name$,
  $fb_43_description$Standard Plumbing Hero extracted from live-event/standard-plumbing-event.md$fb_43_description$,
  $fb_43_category$hero$fb_43_category$,
  ARRAY[$fb_43_page_types_0$event$fb_43_page_types_0$, $fb_43_page_types_1$landing$fb_43_page_types_1$, $fb_43_page_types_2$live-event$fb_43_page_types_2$]::text[],
  ARRAY[$fb_43_funnel_types_0$live-event$fb_43_funnel_types_0$]::text[],
  $fb_43_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_43_slot_schema$::jsonb,
  ARRAY[$fb_43_theme_tokens_0$colors$fb_43_theme_tokens_0$, $fb_43_theme_tokens_1$font_heading$fb_43_theme_tokens_1$, $fb_43_theme_tokens_2$font_body$fb_43_theme_tokens_2$]::text[],
  $fb_43_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_43_asset_slots$::jsonb,
  $fb_43_tsx$// __FB_SHIM_START__
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
export default Hero;
$fb_43_tsx$,
  $fb_43_default_props${"headline":"MASTER HOME SERVICE SALES","subheadline":"JOIN US FOR AN ELITE SALES TRAINING FEBRUARY 10, 2026 | 8AM-5PM","cta_label":"SECURE MY SEAT","bullets":[],"image_url":"https://your-form-provider.com/embed.js"}$fb_43_default_props$::jsonb,
  $fb_43_layout_signature$grid-3$fb_43_layout_signature$,
  $fb_43_source_type$extracted$fb_43_source_type$,
  $fb_43_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"Hero.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_43_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_44_slug$live-event-standard-plumbing-event-index$fb_44_slug$,
  $fb_44_name$Index$fb_44_name$,
  $fb_44_description$Standard Plumbing Index extracted from live-event/standard-plumbing-event.md$fb_44_description$,
  $fb_44_category$hero$fb_44_category$,
  ARRAY[$fb_44_page_types_0$event$fb_44_page_types_0$, $fb_44_page_types_1$landing$fb_44_page_types_1$, $fb_44_page_types_2$live-event$fb_44_page_types_2$]::text[],
  ARRAY[$fb_44_funnel_types_0$live-event$fb_44_funnel_types_0$]::text[],
  $fb_44_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_44_slot_schema$::jsonb,
  ARRAY[$fb_44_theme_tokens_0$colors$fb_44_theme_tokens_0$, $fb_44_theme_tokens_1$font_heading$fb_44_theme_tokens_1$, $fb_44_theme_tokens_2$font_body$fb_44_theme_tokens_2$]::text[],
  $fb_44_asset_slots${}$fb_44_asset_slots$::jsonb,
  $fb_44_tsx$// __FB_SHIM_START__
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
$fb_44_tsx$,
  $fb_44_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_44_default_props$::jsonb,
  $fb_44_layout_signature$section$fb_44_layout_signature$,
  $fb_44_source_type$extracted$fb_44_source_type$,
  $fb_44_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"Entry File — Index.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_44_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_45_slug$live-event-standard-plumbing-event-sponsors$fb_45_slug$,
  $fb_45_name$Sponsors$fb_45_name$,
  $fb_45_description$Standard Plumbing Sponsors extracted from live-event/standard-plumbing-event.md$fb_45_description$,
  $fb_45_category$unique$fb_45_category$,
  ARRAY[$fb_45_page_types_0$event$fb_45_page_types_0$, $fb_45_page_types_1$landing$fb_45_page_types_1$, $fb_45_page_types_2$live-event$fb_45_page_types_2$]::text[],
  ARRAY[$fb_45_funnel_types_0$live-event$fb_45_funnel_types_0$]::text[],
  $fb_45_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_45_slot_schema$::jsonb,
  ARRAY[$fb_45_theme_tokens_0$colors$fb_45_theme_tokens_0$, $fb_45_theme_tokens_1$font_heading$fb_45_theme_tokens_1$, $fb_45_theme_tokens_2$font_body$fb_45_theme_tokens_2$]::text[],
  $fb_45_asset_slots${}$fb_45_asset_slots$::jsonb,
  $fb_45_tsx$// __FB_SHIM_START__
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
$fb_45_tsx$,
  $fb_45_default_props${"headline":"Replace this headline","subheadline":"Event Sponsor","cta_label":"","bullets":[],"image_url":""}$fb_45_default_props$::jsonb,
  $fb_45_layout_signature$centered-stack$fb_45_layout_signature$,
  $fb_45_source_type$extracted$fb_45_source_type$,
  $fb_45_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"Sponsors.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_45_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_46_slug$live-event-standard-plumbing-event-ticketoptions$fb_46_slug$,
  $fb_46_name$TicketOptions$fb_46_name$,
  $fb_46_description$Standard Plumbing TicketOptions extracted from live-event/standard-plumbing-event.md$fb_46_description$,
  $fb_46_category$navigation$fb_46_category$,
  ARRAY[$fb_46_page_types_0$event$fb_46_page_types_0$, $fb_46_page_types_1$landing$fb_46_page_types_1$, $fb_46_page_types_2$live-event$fb_46_page_types_2$]::text[],
  ARRAY[$fb_46_funnel_types_0$live-event$fb_46_funnel_types_0$]::text[],
  $fb_46_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_46_slot_schema$::jsonb,
  ARRAY[$fb_46_theme_tokens_0$colors$fb_46_theme_tokens_0$, $fb_46_theme_tokens_1$font_heading$fb_46_theme_tokens_1$, $fb_46_theme_tokens_2$font_body$fb_46_theme_tokens_2$]::text[],
  $fb_46_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_46_asset_slots$::jsonb,
  $fb_46_tsx$// __FB_SHIM_START__
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

// File: TicketOptions.tsx


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

export default TicketOptions;
$fb_46_tsx$,
  $fb_46_default_props${"headline":"Choose Your Experience","subheadline":"100% CAPACITY REACHED","cta_label":"SECURE MY SEAT","bullets":[],"image_url":"https://your-form-provider.com/embed.js"}$fb_46_default_props$::jsonb,
  $fb_46_layout_signature$grid-3$fb_46_layout_signature$,
  $fb_46_source_type$extracted$fb_46_source_type$,
  $fb_46_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"TicketOptions.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_46_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_47_slug$live-event-standard-plumbing-event-venuecalendar$fb_47_slug$,
  $fb_47_name$VenueCalendar$fb_47_name$,
  $fb_47_description$Standard Plumbing VenueCalendar extracted from live-event/standard-plumbing-event.md$fb_47_description$,
  $fb_47_category$navigation$fb_47_category$,
  ARRAY[$fb_47_page_types_0$event$fb_47_page_types_0$, $fb_47_page_types_1$landing$fb_47_page_types_1$, $fb_47_page_types_2$live-event$fb_47_page_types_2$]::text[],
  ARRAY[$fb_47_funnel_types_0$live-event$fb_47_funnel_types_0$]::text[],
  $fb_47_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_47_slot_schema$::jsonb,
  ARRAY[$fb_47_theme_tokens_0$colors$fb_47_theme_tokens_0$, $fb_47_theme_tokens_1$font_heading$fb_47_theme_tokens_1$, $fb_47_theme_tokens_2$font_body$fb_47_theme_tokens_2$]::text[],
  $fb_47_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_47_asset_slots$::jsonb,
  $fb_47_tsx$// __FB_SHIM_START__
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

// File: VenueCalendar.tsx

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
$fb_47_tsx$,
  $fb_47_default_props${"headline":"EVENT SCHEDULE & VENUE","subheadline":"Join us for a transformative full-day event at the Conference Center at Miller Campus in Sandy, Utah. Start with an exclusive shop tour and Top Golf on Feb 9!","cta_label":"Feb 10 - Event Day (8am-5pm)","bullets":[],"image_url":"https://your-form-provider.com/embed.js"}$fb_47_default_props$::jsonb,
  $fb_47_layout_signature$split-2$fb_47_layout_signature$,
  $fb_47_source_type$extracted$fb_47_source_type$,
  $fb_47_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"VenueCalendar.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_47_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
