INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_35_slug$live-event-battista-event-ticketoptions$fb_35_slug$,
  $fb_35_name$TicketOptions$fb_35_name$,
  $fb_35_description$Battista Academy TicketOptions extracted from live-event/battista-event.md$fb_35_description$,
  $fb_35_category$navigation$fb_35_category$,
  ARRAY[$fb_35_page_types_0$event$fb_35_page_types_0$, $fb_35_page_types_1$landing$fb_35_page_types_1$, $fb_35_page_types_2$live-event$fb_35_page_types_2$]::text[],
  ARRAY[$fb_35_funnel_types_0$live-event$fb_35_funnel_types_0$]::text[],
  $fb_35_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_35_slot_schema$::jsonb,
  ARRAY[$fb_35_theme_tokens_0$colors$fb_35_theme_tokens_0$, $fb_35_theme_tokens_1$font_heading$fb_35_theme_tokens_1$, $fb_35_theme_tokens_2$font_body$fb_35_theme_tokens_2$]::text[],
  $fb_35_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_35_asset_slots$::jsonb,
  $fb_35_tsx$// __FB_SHIM_START__
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



import { Check, Star, Crown, Clock, Users, Loader2 } from "lucide-react";
import { useInView } from 'react-intersection-observer';
import { useState } from 'react';



const TicketOptions = () => {
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

  const tickets = [
    {
      name: "General Admission",
      icon: <Check className="h-6 w-6" />,
      features: [
        "1 day of elite leadership training led by Joey Battista & Andy Elliott",
        "Lunch included + high-level networking opportunities"
      ],
      gradient: "from-gray-600 to-gray-700",
      buttonText: "GET GA TICKET"
    },
    {
      name: "VIP Experience",
      icon: <Star className="h-6 w-6" />,
      features: [
        "2 full days of front-row access to Joey & Andy's full leadership sessions",
        "Private VIP Lunch + Inner Circle access",
        "Exclusive After-Party with Joey & Andy Elliott"
      ],
      color: '#FF9801',
      popular: true,
      buttonText: "GET VIP TICKET"
    },
    {
      name: "CEO Experience",
      icon: <Crown className="h-6 w-6" />,
      features: [
        "All VIP perks + 1st row CEO Recliner Seating with mini desk",
        "Private mastermind access",
        "Invite-only CEO Strategy Experience"
      ],
      color: '#FF9801',
      buttonText: "GET CEO TICKET"
    }
  ];

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#FF9801' }}>
            TICKET OPTIONS
          </h2>
        </div>
        
        <div ref={ref} className={`grid md:grid-cols-3 gap-8 max-w-6xl mx-auto transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {tickets.map((ticket, index) => (
            <Card key={index} className={`relative overflow-hidden border-2 bg-white ${ticket.popular ? 'scale-105' : ''} hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 group hover:scale-110 hover:border-orange-400`} style={{ borderColor: ticket.popular ? '#FF9801' : '#374151' }}>
              {ticket.popular && (
                <div className="absolute top-0 right-0 text-white px-4 py-1 text-sm font-bold animate-pulse" style={{ backgroundColor: '#FF9801' }}>
                  RECOMMENDED
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`text-white p-4 rounded-full mx-auto w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 ${ticket.gradient ? `bg-gradient-to-r ${ticket.gradient}` : ''}`} style={ticket.color ? { backgroundColor: ticket.color } : {}}>
                  {ticket.icon}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-orange-400 transition-colors duration-300">{ticket.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  {ticket.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#FF9801' }} />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={handleTicketClick}
                      className={`w-full text-white font-bold py-3 hover:opacity-90 hover:scale-105 transition-all duration-300 ${ticket.gradient ? `bg-gradient-to-r ${ticket.gradient}` : ''}`}
                      style={ticket.color ? { backgroundColor: ticket.color } : {}}
                    >
                      {ticket.buttonText}
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </section>
  );
};

export default TicketOptions;
$fb_35_tsx$,
  $fb_35_default_props${"headline":"TICKET OPTIONS","subheadline":"🔥 Secure The Best Deal - Early Bird Pricing Ends Soon","cta_label":"","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_35_default_props$::jsonb,
  $fb_35_layout_signature$grid-3$fb_35_layout_signature$,
  $fb_35_source_type$extracted$fb_35_source_type$,
  $fb_35_source_reference${"file_path":"live-event/battista-event.md","heading":"TicketOptions.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_35_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_36_slug$live-event-battista-event-venuecalendar$fb_36_slug$,
  $fb_36_name$VenueCalendar$fb_36_name$,
  $fb_36_description$Battista Academy VenueCalendar extracted from live-event/battista-event.md$fb_36_description$,
  $fb_36_category$navigation$fb_36_category$,
  ARRAY[$fb_36_page_types_0$event$fb_36_page_types_0$, $fb_36_page_types_1$landing$fb_36_page_types_1$, $fb_36_page_types_2$live-event$fb_36_page_types_2$]::text[],
  ARRAY[$fb_36_funnel_types_0$live-event$fb_36_funnel_types_0$]::text[],
  $fb_36_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_36_slot_schema$::jsonb,
  ARRAY[$fb_36_theme_tokens_0$colors$fb_36_theme_tokens_0$, $fb_36_theme_tokens_1$font_heading$fb_36_theme_tokens_1$, $fb_36_theme_tokens_2$font_body$fb_36_theme_tokens_2$]::text[],
  $fb_36_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_36_asset_slots$::jsonb,
  $fb_36_tsx$// __FB_SHIM_START__
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
import { Pin, Clock, Users, Loader2 } from 'lucide-react';
import { useState } from 'react';



const VenueCalendar = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToTickets = () => {
    const element = document.getElementById('tickets');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTicketClick = () => {
    setIsLoading(true);
    setIsDialogOpen(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#FF9801' }}>
            EVENT SCHEDULE & VENUE
          </h2>
          <p className="text-gray-300 text-xl md:text-2xl max-w-3xl mx-auto">
            Join us for two transformative days at our premier venue in Scottsdale, Arizona
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Main Content - Single Row Layout */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Calendar Section - Compact */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-black mb-2">July 2025</h3>
                </div>
                
                {/* Custom Calendar */}
                <div className="bg-white">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                      <div key={day} className="text-center py-2 text-gray-600 font-semibold text-sm">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before July 1st (July 1st is a Tuesday) */}
                    <div></div>
                    <div></div>
                    
                    {/* July days */}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isEventDay = day === 16 || day === 17;
                      const isGA = day === 16;
                      const isVIP = day === 17;
                      
                      return (
                        <div
                          key={day}
                          className={`
                            aspect-square flex flex-col items-center justify-center text-sm rounded-lg
                            ${isEventDay 
                              ? isGA 
                                ? 'bg-blue-500 text-white font-bold' 
                                : 'bg-orange-500 text-white font-bold'
                              : 'text-gray-700 hover:bg-gray-100'
                            }
                          `}
                        >
                          <span className="text-xs">{day}</span>
                          {isGA && <span className="text-xs font-bold">GA</span>}
                          {isVIP && <span className="text-xs font-bold">VIP</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <div className="flex flex-col space-y-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <button 
                          onClick={handleTicketClick}
                          className="bg-blue-500 text-white px-3 py-2 rounded-full text-sm font-bold hover:bg-blue-600 transition-colors cursor-pointer"
                        >
                          July 16th - GA Tickets
                        </button>
                      </DialogTrigger>
                      <DialogTrigger asChild>
                        <button 
                          onClick={handleTicketClick}
                          className="bg-orange-500 text-white px-3 py-2 rounded-full text-sm font-bold hover:bg-orange-600 transition-colors cursor-pointer"
                        >
                          July 17th - Exclusive VIP and CEO
                        </button>
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
                                  <span style={{ color: '#FF9801' }}>Tickets Remaining</span>
                                  <span style={{ color: '#FF9801' }}>27% Left</span>
                                </div>
                                <Progress value={73} className="h-2" />
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
                </div>
              </div>

            {/* Venue Section - Larger */}
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 border border-gray-600 h-full">
                <div className="rounded-xl overflow-hidden shadow-2xl mb-6">
                  {/* Desktop Image */}
                  <img 
                    src="/placeholder.jpg" 
                    alt="The Elliott Group building - event venue" 
                    className="w-full h-80 object-cover hidden md:block"
                  />
                  {/* Mobile Image */}
                  <img 
                    src="/placeholder.jpg" 
                    alt="The Elliott Group building with map - event venue" 
                    className="w-full h-80 object-cover block md:hidden"
                  />
                </div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  A world-class venue that has hosted countless successful business leaders and entrepreneurs. 
                  Experience two full days of elite training, networking, and breakthrough sessions in this 
                  premium facility designed for excellence.
                </p>
              </div>
            </div>
          </div>
          
          {/* Venue Address - Just title and info box */}
          <div className="text-center">
            <h4 className="text-3xl font-bold mb-6 text-white flex items-center justify-center gap-2">
              <Pin className="w-8 h-8" style={{ color: '#FF9801' }} />
              Event Location
            </h4>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 max-w-lg mx-auto">
              <h5 className="text-2xl font-bold text-white mb-2">Lions Den - Scottsdale, AZ</h5>
              <p className="text-white text-xl font-semibold">
                11010 N Saguaro Blvd #100
              </p>
              <p className="text-orange-100 text-lg">
                Fountain Hills, AZ 85268
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Load the external script for the form */}
      <script src="https://your-form-provider.com/embed.js" />
    </section>
  );
};

export default VenueCalendar;
$fb_36_tsx$,
  $fb_36_default_props${"headline":"EVENT SCHEDULE & VENUE","subheadline":"Join us for two transformative days at our premier venue in Scottsdale, Arizona","cta_label":"July 16th - GA Tickets","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_36_default_props$::jsonb,
  $fb_36_layout_signature$grid-3$fb_36_layout_signature$,
  $fb_36_source_type$extracted$fb_36_source_type$,
  $fb_36_source_reference${"file_path":"live-event/battista-event.md","heading":"VenueCalendar.tsx","page_name":"Battista Academy - Event Page","company":"Battista Academy"}$fb_36_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_37_slug$live-event-standard-plumbing-event-backtotop$fb_37_slug$,
  $fb_37_name$BackToTop$fb_37_name$,
  $fb_37_description$Standard Plumbing BackToTop extracted from live-event/standard-plumbing-event.md$fb_37_description$,
  $fb_37_category$stats$fb_37_category$,
  ARRAY[$fb_37_page_types_0$event$fb_37_page_types_0$, $fb_37_page_types_1$landing$fb_37_page_types_1$, $fb_37_page_types_2$live-event$fb_37_page_types_2$]::text[],
  ARRAY[$fb_37_funnel_types_0$live-event$fb_37_funnel_types_0$]::text[],
  $fb_37_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_37_slot_schema$::jsonb,
  ARRAY[$fb_37_theme_tokens_0$colors$fb_37_theme_tokens_0$, $fb_37_theme_tokens_1$font_heading$fb_37_theme_tokens_1$, $fb_37_theme_tokens_2$font_body$fb_37_theme_tokens_2$]::text[],
  $fb_37_asset_slots${}$fb_37_asset_slots$::jsonb,
  $fb_37_tsx$// __FB_SHIM_START__
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
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 bg-primary hover:bg-primary/90"
        >
          <ChevronUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </>
  );
};

export default BackToTop;
$fb_37_tsx$,
  $fb_37_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_37_default_props$::jsonb,
  $fb_37_layout_signature$sticky-bar$fb_37_layout_signature$,
  $fb_37_source_type$extracted$fb_37_source_type$,
  $fb_37_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"BackToTop.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_37_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_38_slug$live-event-standard-plumbing-event-eventdetails$fb_38_slug$,
  $fb_38_name$EventDetails$fb_38_name$,
  $fb_38_description$Standard Plumbing EventDetails extracted from live-event/standard-plumbing-event.md$fb_38_description$,
  $fb_38_category$pricing$fb_38_category$,
  ARRAY[$fb_38_page_types_0$event$fb_38_page_types_0$, $fb_38_page_types_1$landing$fb_38_page_types_1$, $fb_38_page_types_2$live-event$fb_38_page_types_2$]::text[],
  ARRAY[$fb_38_funnel_types_0$live-event$fb_38_funnel_types_0$]::text[],
  $fb_38_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"bullets":{"type":"array","of":"string","min":0,"max":6,"item_max":90}}$fb_38_slot_schema$::jsonb,
  ARRAY[$fb_38_theme_tokens_0$colors$fb_38_theme_tokens_0$, $fb_38_theme_tokens_1$font_heading$fb_38_theme_tokens_1$, $fb_38_theme_tokens_2$font_body$fb_38_theme_tokens_2$]::text[],
  $fb_38_asset_slots${}$fb_38_asset_slots$::jsonb,
  $fb_38_tsx$// __FB_SHIM_START__
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
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            EVENT DETAILS
          </h2>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 justify-center mb-12">
            <div className="flex flex-col items-center text-center">
              <div className="text-white p-3 rounded-lg bg-primary mb-4">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Location</h3>
                <p className="text-gray-300">Conference Center at Miller Campus</p>
                <p className="text-sm text-gray-400 mt-1">
                  9750 S 300 W, Sandy, UT 84070
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="text-white p-3 rounded-lg bg-primary mb-4">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Event Date & Time</h3>
                <p className="text-gray-300">February 10, 2026</p>
                <p className="text-sm text-gray-400 mt-1">8:00 AM - 5:00 PM</p>
              </div>
            </div>
          </div>
          
          {/* Pre-Event Activities */}
          <div className="space-y-6">
            {/* Shop Tour */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-2xl p-8">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <img 
                    src="/placeholder.jpg" 
                    alt="Any Hour Services Logo" 
                    className="w-40 md:w-48 h-auto"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-block bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">EXCLUSIVE PRE-EVENT</span>
                    <span className="inline-block bg-white text-black text-xs font-bold px-3 py-1 rounded-full">INCLUDED WITH ANY TICKET</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Shop Tour & Training at Any Hour</h3>
                  <p className="text-lg text-gray-300 mb-2">February 9, 2026 | 11:00 AM - 3:00 PM</p>
                  <p className="text-gray-400 mb-4">Orem, UT (~45 min from airport)</p>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Tour one of the largest home service operations in Utah</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Operational walk-through & elite systems training</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Prime rib lunch included</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>See Standard Operating Procedures in action</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Top Golf */}
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Sponsor Logo */}
                <div className="flex-shrink-0 text-center">
                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Sponsored by:</p>
                  <img 
                    src="/placeholder.jpg" 
                    alt="Lokal Media House" 
                    className="h-16 md:h-20 mx-auto"
                  />
                </div>
                {/* Event Details */}
                <div className="flex-1 text-center">
                  <h3 className="text-2xl font-bold text-white mb-3">Pre-Event Networking</h3>
                  <p className="text-xl text-gray-200 mb-2">Top Golf</p>
                  <p className="text-lg text-gray-300">February 9, 2026 | 6:00 PM - 8:00 PM</p>
                  <p className="text-sm text-gray-400 mt-3">Kick off the evening with networking and fun!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventDetails;
$fb_38_tsx$,
  $fb_38_default_props${"headline":"EVENT DETAILS","subheadline":"Conference Center at Miller Campus","cta_label":"","bullets":["• Tour one of the largest home service operations in Utah","• Operational walk-through & elite systems training","• Prime rib lunch included","• See Standard Operating Procedures in action"],"image_url":""}$fb_38_default_props$::jsonb,
  $fb_38_layout_signature$split-2$fb_38_layout_signature$,
  $fb_38_source_type$extracted$fb_38_source_type$,
  $fb_38_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"EventDetails.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_38_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_39_slug$live-event-standard-plumbing-event-eventlearning$fb_39_slug$,
  $fb_39_name$EventLearning$fb_39_name$,
  $fb_39_description$Standard Plumbing EventLearning extracted from live-event/standard-plumbing-event.md$fb_39_description$,
  $fb_39_category$pricing$fb_39_category$,
  ARRAY[$fb_39_page_types_0$event$fb_39_page_types_0$, $fb_39_page_types_1$landing$fb_39_page_types_1$, $fb_39_page_types_2$live-event$fb_39_page_types_2$]::text[],
  ARRAY[$fb_39_funnel_types_0$live-event$fb_39_funnel_types_0$]::text[],
  $fb_39_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_39_slot_schema$::jsonb,
  ARRAY[$fb_39_theme_tokens_0$colors$fb_39_theme_tokens_0$, $fb_39_theme_tokens_1$font_heading$fb_39_theme_tokens_1$, $fb_39_theme_tokens_2$font_body$fb_39_theme_tokens_2$]::text[],
  $fb_39_asset_slots${}$fb_39_asset_slots$::jsonb,
  $fb_39_tsx$// __FB_SHIM_START__
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
      title: "NEPQ Sales Framework:",
      description: "Master Jeremy Miner's revolutionary NEPQ methodology to close more deals with ease and authenticity.",
      icon: TrendingUp
    },
    {
      title: "Advanced Closing Strategies:",
      description: "Learn proven techniques to handle objections, build trust, and close high-ticket sales consistently.", 
      icon: Target
    },
    {
      title: "Sales Psychology Mastery:",
      description: "Understand the buyer's mindset and learn how to influence decisions through emotional intelligence.",
      icon: Users
    },
    {
      title: "Pricing & Value Presentation:",
      description: "Master the art of presenting premium pricing and communicating value that justifies your rates.",
      icon: DollarSign
    },
    {
      title: "Building Sales Systems:",
      description: "Create repeatable sales processes that scale your business and train your team for success.",
      icon: Building
    },
    {
      title: "Customer Retention:",
      description: "Turn one-time customers into lifelong clients who refer others and drive recurring revenue.",
      icon: Lightbulb
    }
  ];

  const eventImages = [
    {
      src: "/placeholder.jpg",
      alt: "Jeremy Miner presenting to engaged audience at sales training summit"
    },
    {
      src: "/placeholder.jpg", 
      alt: "Anthony Vizzari leading Q&A session at business event"
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            WHAT TO EXPECT
          </h2>
          <h3 className="text-2xl md:text-3xl font-bold mb-4 text-black">
            Learn from World-Class Sales Experts
          </h3>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Jeremy Miner, Anthony Vizzari & Jacob Reese deliver actionable sales strategies to close more deals and increase your revenue.
          </p>
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* Mobile: Topics first, Desktop: Images first */}
            <div className="lg:order-1 order-2 space-y-4 h-full flex flex-col">
              {eventImages.map((image, index) => (
                <div key={index} className="rounded-2xl overflow-hidden shadow-2xl flex-1">
                  <img 
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            
            {/* Mobile: Topics above images, Desktop: Topics on right */}
            <div className="lg:order-2 order-1 border-2 border-dashed border-primary rounded-2xl p-4 h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                {learningTopics.map((topic, index) => {
                  const IconComponent = topic.icon;
                  return (
                    <div key={index} className="bg-gray-100 rounded-xl p-4 border border-gray-300 flex flex-col text-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 mx-auto bg-primary">
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        {topic.description}
                      </p>
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
$fb_39_tsx$,
  $fb_39_default_props${"headline":"WHAT TO EXPECT","subheadline":"Jeremy Miner, Anthony Vizzari & Jacob Reese deliver actionable sales strategies to close more deals and increase your revenue.","cta_label":"","bullets":[],"image_url":""}$fb_39_default_props$::jsonb,
  $fb_39_layout_signature$split-2$fb_39_layout_signature$,
  $fb_39_source_type$extracted$fb_39_source_type$,
  $fb_39_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"EventLearning.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_39_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_40_slug$live-event-standard-plumbing-event-faq$fb_40_slug$,
  $fb_40_name$FAQ$fb_40_name$,
  $fb_40_description$Standard Plumbing FAQ extracted from live-event/standard-plumbing-event.md$fb_40_description$,
  $fb_40_category$faq$fb_40_category$,
  ARRAY[$fb_40_page_types_0$event$fb_40_page_types_0$, $fb_40_page_types_1$landing$fb_40_page_types_1$, $fb_40_page_types_2$live-event$fb_40_page_types_2$]::text[],
  ARRAY[$fb_40_funnel_types_0$live-event$fb_40_funnel_types_0$]::text[],
  $fb_40_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_40_slot_schema$::jsonb,
  ARRAY[$fb_40_theme_tokens_0$colors$fb_40_theme_tokens_0$, $fb_40_theme_tokens_1$font_heading$fb_40_theme_tokens_1$, $fb_40_theme_tokens_2$font_body$fb_40_theme_tokens_2$]::text[],
  $fb_40_asset_slots${}$fb_40_asset_slots$::jsonb,
  $fb_40_tsx$// __FB_SHIM_START__
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
      question: "Who is this sales training designed for?",
      answer: "This elite sales training is specifically for Plumbing, HVAC, and Electrical professionals who are serious about mastering sales. Whether you're a technician looking to close more on every call, a sales professional wanting to level up, or a business owner scaling your team's performance, this intensive 1-day training delivers proven techniques to dramatically increase your close rates and revenue."
    },
    {
      question: "What ticket option is right for me?",
      answer: "General Admission includes full event access, event swag, lunch, snacks, coffee and drinks. VIP adds priority seating and access to speaker events. CEO includes everything in VIP plus an intimate dinner with the speakers and enhanced networking opportunities. Choose based on how deep you want to dive into sales mastery and networking."
    },
    {
      question: "What will I learn from Jeremy Miner, Anthony Vizzari, and Jacob Reese?",
      answer: "Master the complete NEPQ sales framework from Jeremy Miner, learn advanced closing psychology from Anthony Vizzari, and implement proven sales systems from Jacob Reese. This is intensive, focused sales training—not surface-level theory. You'll walk away with actionable frameworks, scripts, and psychology techniques to close high-ticket home service sales consistently."
    },
    {
      question: "What's included with my ticket?",
      answer: "All tickets include lunch, snacks, coffee and complementary drinks. General Admission gets you full event access and event swag. VIP adds priority seating and access to speaker events with VIP swag. CEO includes everything in VIP plus an exclusive dinner with the speakers where you can ask questions and network directly with the masters."
    },
    {
      question: "Why is this sales training different?",
      answer: "This isn't a generic business conference or networking event. It's a high-intensity day of deep-dive sales training from Jeremy Miner (creator of NEPQ methodology), Anthony Vizzari (master closer), and Jacob Reese (sales system architect). You'll learn the exact frameworks, scripts, and psychology used to close high-ticket home service sales consistently. Hosted by Standard Plumbing Supply, this is real sales mastery for the trades."
    },
    {
      question: "When and where is the sales training?",
      answer: "February 10, 2026, 8am-5pm at the Conference Center at Miller Campus in Sandy, Utah. This high-intensity sales training features Jeremy Miner, Anthony Vizzari, and Jacob Reese. Hosted by Standard Plumbing Supply."
    },
    {
      question: "How do I secure my spot?",
      answer: "Click any 'SECURE MY SEAT' button on this page to choose your ticket level and reserve your spot. Seats are limited because this is an intensive training environment, not a massive conference. This is for serious home service professionals ready to master sales and dramatically increase their close rates."
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
      <div className="absolute top-20 left-10 w-32 h-32 bg-red-100 rounded-full opacity-30 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-red-200 rounded-full opacity-30 blur-2xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-block mb-4">
            
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-black via-gray-600 to-red-600 bg-clip-text text-transparent leading-tight">
            Frequently Asked
            <br />
            <span className="text-primary">Questions</span>
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about The Home Service Sales Summit
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
                        <Minus className="h-6 w-6 text-red-500 transition-transform duration-200" />
                      ) : (
                        <Plus className="h-6 w-6 text-red-500 transition-transform duration-200 group-hover:scale-110" />
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
$fb_40_tsx$,
  $fb_40_default_props${"headline":"Frequently Asked Questions","subheadline":"Everything you need to know about The Home Service Sales Summit","cta_label":"","bullets":[],"image_url":""}$fb_40_default_props$::jsonb,
  $fb_40_layout_signature$centered-stack$fb_40_layout_signature$,
  $fb_40_source_type$extracted$fb_40_source_type$,
  $fb_40_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"FAQ.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_40_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_41_slug$live-event-standard-plumbing-event-footer$fb_41_slug$,
  $fb_41_name$Footer$fb_41_name$,
  $fb_41_description$Standard Plumbing Footer extracted from live-event/standard-plumbing-event.md$fb_41_description$,
  $fb_41_category$footer$fb_41_category$,
  ARRAY[$fb_41_page_types_0$event$fb_41_page_types_0$, $fb_41_page_types_1$landing$fb_41_page_types_1$, $fb_41_page_types_2$live-event$fb_41_page_types_2$]::text[],
  ARRAY[$fb_41_funnel_types_0$live-event$fb_41_funnel_types_0$]::text[],
  $fb_41_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_41_slot_schema$::jsonb,
  ARRAY[$fb_41_theme_tokens_0$colors$fb_41_theme_tokens_0$, $fb_41_theme_tokens_1$font_heading$fb_41_theme_tokens_1$, $fb_41_theme_tokens_2$font_body$fb_41_theme_tokens_2$]::text[],
  $fb_41_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_41_asset_slots$::jsonb,
  $fb_41_tsx$// __FB_SHIM_START__
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
import TicketModal from './TicketModal';

interface FooterProps {
  scrollToForm?: boolean;
}

const Footer = ({ scrollToForm = false }: FooterProps) => {
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

  return (
    <footer className="bg-black text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-12">
          <img 
            src="/placeholder.jpg" 
            alt="Standard Plumbing Supply" 
            className="h-20 mx-auto mb-8" 
          />
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Don't miss this chance to learn, grow, and 
          <span className="text-primary"> DOMINATE </span>
          your industry!
        </h2>
        
        <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto">
          Join Jeremy Miner, Anthony Vizzari & Jacob Reese for an unforgettable day of elite sales training at the Home Service Sales Summit!
        </p>
        
        <p className="text-2xl font-bold mb-12 text-accent">
          February 10, 2026 - Sandy, UT
        </p>
        
        <Button 
          size="lg" 
          onClick={handleTicketClick} 
          className="bg-primary hover:bg-primary/90 text-white font-bold px-12 py-6 rounded-full text-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          SECURE MY SEAT
        </Button>
        
        {/* Sponsors */}
        <div className="mt-16 pt-12 border-t border-gray-800">
          {/* Event Sponsor */}
          <div className="mb-10">
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-6">Event Sponsor</p>
            <a 
              href="https://www.gosameday.com/standard-plumbing-leads" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white rounded-lg px-6 py-4 inline-block hover:shadow-lg transition-shadow duration-300"
            >
              <img 
                src="/placeholder.svg" 
                alt="Sameday" 
                className="h-10 mx-auto"
              />
            </a>
          </div>
          
          {/* Top Golf Sponsor */}
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider mb-6">Top Golf Sponsor</p>
            <img 
              src="/placeholder.jpg" 
              alt="Lokal Media House" 
              className="h-16 mx-auto"
            />
          </div>
        </div>
        
        {/* White background section */}
        <div className="bg-white py-8 mt-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <a 
                href="/privacy-policy"
                className="text-gray-600 hover:text-gray-800 transition-colors underline text-lg font-semibold"
              >
                Privacy Policy
              </a>
            </div>
            
            {/* Copyright */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-gray-500 text-sm">&copy; 2025 Standard Plumbing. All Rights Reserved.</p>
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
    </footer>
  );
};

export default Footer;
$fb_41_tsx$,
  $fb_41_default_props${"headline":"Don't miss this chance to learn, grow, and DOMINATE your industry!","subheadline":"Join Jeremy Miner, Anthony Vizzari & Jacob Reese for an unforgettable day of elite sales training at the Home Service Sales Summit!","cta_label":"SECURE MY SEAT","bullets":[],"image_url":"https://your-form-provider.com/embed.js"}$fb_41_default_props$::jsonb,
  $fb_41_layout_signature$centered-stack$fb_41_layout_signature$,
  $fb_41_source_type$extracted$fb_41_source_type$,
  $fb_41_source_reference${"file_path":"live-event/standard-plumbing-event.md","heading":"Footer.tsx","page_name":"Standard Plumbing - Event Page","company":"Standard Plumbing"}$fb_41_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
