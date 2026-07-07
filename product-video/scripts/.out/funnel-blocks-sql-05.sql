INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_29_slug$live-event-battista-event-faq$fb_29_slug$,
  $fb_29_name$FAQ$fb_29_name$,
  $fb_29_description$Battista Academy FAQ extracted from live-event/battista-event.md$fb_29_description$,
  $fb_29_category$faq$fb_29_category$,
  ARRAY[$fb_29_page_types_0$event$fb_29_page_types_0$, $fb_29_page_types_1$landing$fb_29_page_types_1$, $fb_29_page_types_2$live-event$fb_29_page_types_2$]::text[],
  ARRAY[$fb_29_funnel_types_0$live-event$fb_29_funnel_types_0$]::text[],
  $fb_29_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_29_slot_schema$::jsonb,
  ARRAY[$fb_29_theme_tokens_0$colors$fb_29_theme_tokens_0$, $fb_29_theme_tokens_1$font_heading$fb_29_theme_tokens_1$, $fb_29_theme_tokens_2$font_body$fb_29_theme_tokens_2$]::text[],
  $fb_29_asset_slots${}$fb_29_asset_slots$::jsonb,
  $fb_29_tsx$// __FB_SHIM_START__
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
$fb_29_tsx$,
  $fb_29_default_props${"headline":"Frequently Asked Questions","subheadline":"Everything you need to know about The Business Domination Seminar","cta_label":"","bullets":[],"image_url":""}$fb_29_default_props$::jsonb,
  $fb_29_layout_signature$centered-stack$fb_29_layout_signature$,
  $fb_29_source_type$extracted$fb_29_source_type$,
  $fb_29_source_reference${"file_path":"live-event/battista-event.md","heading":"FAQ.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_29_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_30_slug$live-event-battista-event-footer$fb_30_slug$,
  $fb_30_name$Footer$fb_30_name$,
  $fb_30_description$Battista Academy Footer extracted from live-event/battista-event.md$fb_30_description$,
  $fb_30_category$navigation$fb_30_category$,
  ARRAY[$fb_30_page_types_0$event$fb_30_page_types_0$, $fb_30_page_types_1$landing$fb_30_page_types_1$, $fb_30_page_types_2$live-event$fb_30_page_types_2$]::text[],
  ARRAY[$fb_30_funnel_types_0$live-event$fb_30_funnel_types_0$]::text[],
  $fb_30_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_30_slot_schema$::jsonb,
  ARRAY[$fb_30_theme_tokens_0$colors$fb_30_theme_tokens_0$, $fb_30_theme_tokens_1$font_heading$fb_30_theme_tokens_1$, $fb_30_theme_tokens_2$font_body$fb_30_theme_tokens_2$]::text[],
  $fb_30_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_30_asset_slots$::jsonb,
  $fb_30_tsx$// __FB_SHIM_START__
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


import { useState } from 'react';


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
$fb_30_tsx$,
  $fb_30_default_props${"headline":"Get in the room with leaders who play all out and learn to DOMINATE as a CEO","subheadline":"A conference to change your company forever, and your entire team is invited...","cta_label":"SECURE TICKET NOW","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_30_default_props$::jsonb,
  $fb_30_layout_signature$centered-stack$fb_30_layout_signature$,
  $fb_30_source_type$extracted$fb_30_source_type$,
  $fb_30_source_reference${"file_path":"live-event/battista-event.md","heading":"Footer.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_30_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_31_slug$live-event-battista-event-header$fb_31_slug$,
  $fb_31_name$Header$fb_31_name$,
  $fb_31_description$Battista Academy Header extracted from live-event/battista-event.md$fb_31_description$,
  $fb_31_category$navigation$fb_31_category$,
  ARRAY[$fb_31_page_types_0$event$fb_31_page_types_0$, $fb_31_page_types_1$landing$fb_31_page_types_1$, $fb_31_page_types_2$live-event$fb_31_page_types_2$]::text[],
  ARRAY[$fb_31_funnel_types_0$live-event$fb_31_funnel_types_0$]::text[],
  $fb_31_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_31_slot_schema$::jsonb,
  ARRAY[$fb_31_theme_tokens_0$colors$fb_31_theme_tokens_0$, $fb_31_theme_tokens_1$font_heading$fb_31_theme_tokens_1$, $fb_31_theme_tokens_2$font_body$fb_31_theme_tokens_2$]::text[],
  $fb_31_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_31_asset_slots$::jsonb,
  $fb_31_tsx$// __FB_SHIM_START__
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
$fb_31_tsx$,
  $fb_31_default_props${"headline":"Replace this headline","subheadline":"🔥 Secure The Best Deal - Early Bird Pricing Ends Soon","cta_label":"SECURE TICKET NOW","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_31_default_props$::jsonb,
  $fb_31_layout_signature$centered-stack$fb_31_layout_signature$,
  $fb_31_source_type$extracted$fb_31_source_type$,
  $fb_31_source_reference${"file_path":"live-event/battista-event.md","heading":"Header.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_31_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_32_slug$live-event-battista-event-hero$fb_32_slug$,
  $fb_32_name$Hero$fb_32_name$,
  $fb_32_description$Battista Academy Hero extracted from live-event/battista-event.md$fb_32_description$,
  $fb_32_category$hero$fb_32_category$,
  ARRAY[$fb_32_page_types_0$event$fb_32_page_types_0$, $fb_32_page_types_1$landing$fb_32_page_types_1$, $fb_32_page_types_2$live-event$fb_32_page_types_2$]::text[],
  ARRAY[$fb_32_funnel_types_0$live-event$fb_32_funnel_types_0$]::text[],
  $fb_32_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_32_slot_schema$::jsonb,
  ARRAY[$fb_32_theme_tokens_0$colors$fb_32_theme_tokens_0$, $fb_32_theme_tokens_1$font_heading$fb_32_theme_tokens_1$, $fb_32_theme_tokens_2$font_body$fb_32_theme_tokens_2$]::text[],
  $fb_32_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_32_asset_slots$::jsonb,
  $fb_32_tsx$// __FB_SHIM_START__
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
export default Hero;
$fb_32_tsx$,
  $fb_32_default_props${"headline":"JOIN US IN SCOTTSDALE JULY 16TH & 17TH","subheadline":"FOR THE #1 BUSINESS DOMINATION SEMINAR OF 2025 IN SCOTTSDALE AZ","cta_label":"SECURE YOUR TICKET NOW","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_32_default_props$::jsonb,
  $fb_32_layout_signature$grid-3$fb_32_layout_signature$,
  $fb_32_source_type$extracted$fb_32_source_type$,
  $fb_32_source_reference${"file_path":"live-event/battista-event.md","heading":"Hero.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_32_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_33_slug$live-event-battista-event-index$fb_33_slug$,
  $fb_33_name$Index$fb_33_name$,
  $fb_33_description$Battista Academy Index extracted from live-event/battista-event.md$fb_33_description$,
  $fb_33_category$hero$fb_33_category$,
  ARRAY[$fb_33_page_types_0$event$fb_33_page_types_0$, $fb_33_page_types_1$landing$fb_33_page_types_1$, $fb_33_page_types_2$live-event$fb_33_page_types_2$]::text[],
  ARRAY[$fb_33_funnel_types_0$live-event$fb_33_funnel_types_0$]::text[],
  $fb_33_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_33_slot_schema$::jsonb,
  ARRAY[$fb_33_theme_tokens_0$colors$fb_33_theme_tokens_0$, $fb_33_theme_tokens_1$font_heading$fb_33_theme_tokens_1$, $fb_33_theme_tokens_2$font_body$fb_33_theme_tokens_2$]::text[],
  $fb_33_asset_slots${}$fb_33_asset_slots$::jsonb,
  $fb_33_tsx$// __FB_SHIM_START__
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
$fb_33_tsx$,
  $fb_33_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_33_default_props$::jsonb,
  $fb_33_layout_signature$section$fb_33_layout_signature$,
  $fb_33_source_type$extracted$fb_33_source_type$,
  $fb_33_source_reference${"file_path":"live-event/battista-event.md","heading":"Entry File — Index.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_33_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_34_slug$live-event-battista-event-speakerlineup$fb_34_slug$,
  $fb_34_name$SpeakerLineup$fb_34_name$,
  $fb_34_description$Battista Academy SpeakerLineup extracted from live-event/battista-event.md$fb_34_description$,
  $fb_34_category$pricing$fb_34_category$,
  ARRAY[$fb_34_page_types_0$event$fb_34_page_types_0$, $fb_34_page_types_1$landing$fb_34_page_types_1$, $fb_34_page_types_2$live-event$fb_34_page_types_2$]::text[],
  ARRAY[$fb_34_funnel_types_0$live-event$fb_34_funnel_types_0$]::text[],
  $fb_34_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_34_slot_schema$::jsonb,
  ARRAY[$fb_34_theme_tokens_0$colors$fb_34_theme_tokens_0$, $fb_34_theme_tokens_1$font_heading$fb_34_theme_tokens_1$, $fb_34_theme_tokens_2$font_body$fb_34_theme_tokens_2$]::text[],
  $fb_34_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_34_asset_slots$::jsonb,
  $fb_34_tsx$// __FB_SHIM_START__
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

// File: SpeakerLineup.tsx


import { useInView } from 'react-intersection-observer';
import { useState } from 'react';


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
$fb_34_tsx$,
  $fb_34_default_props${"headline":"MEET THE SPEAKER LINEUP","subheadline":"Learn how to create the moving company and culture you've always dreamed of while turning your annual income into your monthly income!","cta_label":"SECURE TICKET NOW","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_34_default_props$::jsonb,
  $fb_34_layout_signature$grid-3$fb_34_layout_signature$,
  $fb_34_source_type$extracted$fb_34_source_type$,
  $fb_34_source_reference${"file_path":"live-event/battista-event.md","heading":"SpeakerLineup.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_34_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
