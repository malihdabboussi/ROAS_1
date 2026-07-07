INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_48_slug$vsl-call-booking-anson-park-call-booking-detail$fb_48_slug$,
  $fb_48_name$Detail$fb_48_name$,
  $fb_48_description$Anson Park Investing Detail extracted from vsl-call-booking/anson-park-call-booking.md$fb_48_description$,
  $fb_48_category$hero$fb_48_category$,
  ARRAY[$fb_48_page_types_0$detail-booking$fb_48_page_types_0$, $fb_48_page_types_1$call-booking$fb_48_page_types_1$, $fb_48_page_types_2$vsl-call-booking$fb_48_page_types_2$]::text[],
  ARRAY[$fb_48_funnel_types_0$vsl-call-booking$fb_48_funnel_types_0$]::text[],
  $fb_48_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"bullets":{"type":"array","of":"string","min":0,"max":6,"item_max":90},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_48_slot_schema$::jsonb,
  ARRAY[$fb_48_theme_tokens_0$colors$fb_48_theme_tokens_0$, $fb_48_theme_tokens_1$font_heading$fb_48_theme_tokens_1$, $fb_48_theme_tokens_2$font_body$fb_48_theme_tokens_2$]::text[],
  $fb_48_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_48_asset_slots$::jsonb,
  $fb_48_tsx$// __FB_SHIM_START__
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

// File: Detail.tsx
import { useEffect, useState } from "react";












import { ArrowRight, TrendingUp, Shield, CheckCircle2, FileText, Percent } from "lucide-react";

















const Detail = () => {
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://your-form-provider.com/embed.js";
    script.async = true;
    if (!document.querySelector(`script[src="${script.src}"]`)) {
      document.body.appendChild(script);
    }
  }, []);

  // Progress bar animation for urgency
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 33) {
          clearInterval(interval);
          return 33;
        }
        return prev + 0.5;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownExitIntent) {
        setExitIntentOpen(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitIntent]);

  const scrollToBooking = () => {
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const propertyImages = [
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Anson Park Exterior" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Anson Park Building" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Leasing Center" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Swimming Pool" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Pool Area" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Clubhouse" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Fitness Center" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Courtyard" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Volleyball Court" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Kitchen & Dining Area" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Kitchen & Living Room" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Bedroom" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Bathroom" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Mailroom" },
    { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "Property Sign" },
  ];

  return (
    <main className="min-h-screen">
      <Navigation 
        variant="project"
        onProjectClick={scrollToBooking}
      />
      
      {/* Investment Deck Hero */}
      <section className="relative pt-32 pb-16 bg-gradient-to-b from-primary-dark to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              {/* Urgency Progress Bar */}
              <div className="max-w-2xl mx-auto mb-8 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-serif font-semibold text-foreground">Investment Interest</span>
                  <span className="font-semibold text-accent">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Gathering initial interest
                </p>
              </div>

              <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-primary mb-6 tracking-tight leading-tight">
                Complete Investment Details For<br />Anson Park Apartments
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium mb-6 max-w-3xl mx-auto">
                Explore comprehensive financials, property analysis, and investment terms for this 144-unit multifamily opportunity in Abilene, TX
              </p>
              
              {/* Quick Navigation Links */}
              <div className="mb-8 max-w-4xl mx-auto">
                <p className="text-sm font-semibold text-foreground mb-3">Quick Navigate To:</p>
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  {[
                    { label: "Deal Summary", id: "deal-summary" },
                    { label: "Investment Terms", id: "deal-overview" },
                    { label: "Tax Benefits", id: "tax-benefits" },
                    { label: "Property Gallery", id: "gallery" },
                    { label: "Location", id: "site-map" },
                    { label: "Why Abilene", id: "why-abilene" },
                    { label: "Team", id: "team" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium bg-white/10 hover:bg-accent hover:text-primary-dark text-foreground border border-border hover:border-accent rounded-lg transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button 
                size="lg"
                onClick={scrollToBooking}
                className="bg-accent hover:bg-accent-light text-primary-dark font-bold text-lg px-10 py-6 shadow-xl hover:shadow-2xl rounded-xl hover:scale-105 transition-all duration-300 border-0 mb-4"
              >
                Ready to Go? Lets Chat
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <div className="w-full bg-accent/10 border border-accent/20 rounded-t-2xl px-6 py-3 border-b-0">
              <p className="text-sm font-semibold text-accent text-center">Investment Deck - Click to Toggle Between Slides</p>
            </div>
            
            <Card className="overflow-hidden shadow-2xl border-2 border-border rounded-t-none rounded-b-2xl border-t-0">
              <div className="aspect-video w-full">
                <iframe
                  src="https://www.canva.com/design/DAGzWkDRl1M/oVjqWP4jf_0w4DuOJAPnvw/view?embed"
                  allowFullScreen
                  allow="fullscreen"
                  className="w-full h-full"
                  title="Anson Park Investment Deck"
                />
              </div>
            </Card>
          </div>
        </div>
        
        {/* Accredited Investor Info - Compact */}
        <div className="bg-muted/30 py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold mb-3 text-primary text-center">Accredited Investor Requirements</h3>
                <p className="text-sm text-muted-foreground text-center">
                  This offering is exclusively for accredited investors. You must meet one of the following criteria: <span className="font-semibold text-foreground">Income:</span> $200,000+ annually ($300,000+ jointly) for the last two years, or <span className="font-semibold text-foreground">Net Worth:</span> $1,000,000+ excluding primary residence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="container mx-auto px-4 py-16 space-y-20">
        {/* Deal Summary */}
        <section id="deal-summary" className="max-w-6xl mx-auto scroll-mt-24">
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-block">
              <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight">Deal Summary</h2>
              <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full" />
            </div>
            <p className="text-xl text-muted-foreground font-medium mt-6">
              A compelling investment opportunity with exceptional returns
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 animate-slide-up">
            <Card className="p-12 bg-white border-2 border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                Investment Terms
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Minimum Investment", value: "$100,000" },
                  { label: "Hold Period", value: "5 Years" },
                  { label: "Preferred Return", value: "6%", highlight: true },
                  { label: "Equity Split", value: "70/30" },
                  { label: "Distribution Timing", value: "Quarterly" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className={`font-bold text-2xl ${item.highlight ? 'text-accent' : 'text-foreground'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-12 bg-gradient-to-br from-accent/10 to-accent/20 border-2 border-accent/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-accent/30 rounded-xl">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                Projected Returns
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Total ROI", value: "2.3X" },
                  { label: "Average Annual Return", value: "27%" },
                  { label: "IRR", value: "21%+" },
                  { label: "Cash-on-Cash Return", value: "8-10%" },
                  { label: "Exit Cap Rate", value: "6.5%" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-bold text-2xl text-accent">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>



        {/* Deal Overview */}
        <section id="deal-overview" className="max-w-6xl mx-auto">
          <Card className="p-10 bg-white border-2 border-border shadow-xl">
            <h2 className="font-serif text-4xl font-bold mb-8 text-primary">Deal Overview</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Acquisition Price</div>
                <div className="text-2xl font-bold">$8.5M</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Total Units</div>
                <div className="text-2xl font-bold">144 Units</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Year Built</div>
                <div className="text-2xl font-bold">2006</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Location</div>
                <div className="text-2xl font-bold">Abilene, TX</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Asset Class</div>
                <div className="text-2xl font-bold">B+ / LIHTC</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-sm text-muted-foreground mb-1">Strategy</div>
                <div className="text-2xl font-bold">Long-Term Hold</div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-primary">
                <FileText className="h-5 w-5 text-primary" />
                Qualified Contract Strategy
              </h3>
              <p className="text-muted-foreground mb-4">
                This is a currently stabilized asset with a LURA (Land Use Restriction Agreement) in place restricting income. We are using a <strong>"Qualified Contract"</strong> to exit this program early in the next few years.
              </p>
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/30">
                <p className="font-semibold text-foreground">
                  This will remove all rental restrictions and massively increase the value of the property.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* Tax Benefits & Special Programs */}
        <section id="tax-benefits" className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-10 bg-white border-2 border-border shadow-xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-primary">
                <Percent className="h-5 w-5 text-success" />
                50% Property Tax Reduction
              </h3>
              <p className="text-muted-foreground mb-4">
                We partner with a CHDO (Community Housing Development Organization) to receive a tax abatement for <strong>50% property tax reduction</strong>.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Reinvestment Commitment:</strong> In exchange, we are required to reinvest $5,000 per unit every 3 years for a <strong>$720,000 renovation budget</strong> that continually enhances the property.
                </p>
              </div>
            </Card>

            <Card className="p-10 bg-white border-2 border-border shadow-xl">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-primary">
                <TrendingUp className="h-5 w-5 text-success" />
                Tax Benefits for Investors
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Standard Depreciation</strong> for 144-unit residential asset</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Option to accelerate depreciation</strong> via Cost Segregation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Distributions are passive income</strong> often offset by depreciation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Long-term Capital Gains</strong> on sale</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span><strong>Option for 1031 Exchange</strong> on exit</span>
                </li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Full Property Gallery */}
        <section id="gallery" className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 md:auto-rows-min gap-4">
            {/* Video Reel - First column, spans 2 rows */}
            <div className="md:row-span-2 aspect-[9/16] md:aspect-auto rounded-xl overflow-hidden md:self-stretch">
              <PropertyVideoPlayer />
            </div>
            
            {/* Header above first row of images */}
            <div className="md:col-span-2">
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-primary">Complete Property Gallery</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {propertyImages.slice(0, 2).map((image, index) => (
                  <div key={index} className="aspect-[4/3] overflow-hidden rounded-xl shadow-lg bg-muted">
                    <img 
                      src={image.src} 
                      alt={image.alt}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Remaining images in second row */}
            {propertyImages.slice(2, 4).map((image, index) => (
              <div key={index + 2} className="aspect-[4/3] overflow-hidden rounded-xl shadow-lg bg-muted">
                <img 
                  src={image.src} 
                  alt={image.alt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
            
            {/* Rest of the images in a standard 3-column grid */}
            {propertyImages.slice(4).map((image, index) => (
              <div key={index + 4} className="aspect-[4/3] overflow-hidden rounded-xl shadow-lg bg-muted">
                <img 
                  src={image.src} 
                  alt={image.alt}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
            
            {/* CTA Card */}
            <Card className="aspect-[4/3] p-6 bg-gradient-to-br from-accent/20 to-accent/10 border-2 border-accent/40 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-3 text-primary">Ready to Add This to Your Portfolio?</h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  Let's connect and discuss this opportunity
                </p>
              </div>
              <Button 
                onClick={scrollToBooking}
                size="lg"
                className="bg-accent hover:bg-accent-light text-primary-dark font-bold text-sm md:text-base px-6 py-4 shadow-xl hover:shadow-2xl rounded-xl hover:scale-105 transition-all duration-300 border-0 w-full mt-4"
              >
                Let's Connect
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>
        </section>

        <PropertyMapSection />

        <WhyAbilene onConnect={scrollToBooking} />
        
        <StargateSection />

        <div id="team">
          <TeamSection />
        </div>


        {/* CTA Section with Embedded Calendar */}
        <section id="booking" className="max-w-5xl mx-auto scroll-mt-24 animate-fade-in">
          <div className="p-6 sm:p-10 md:p-16 lg:p-20 text-white shadow-luxury rounded-3xl relative overflow-hidden border-2 border-accent/30" style={{ background: 'linear-gradient(135deg, hsl(200 50% 12%) 0%, hsl(200 45% 20%) 100%)' }}>
            <div className="relative z-10">
              <div className="text-center mb-8 md:mb-10">
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                  Ready to Discuss This Opportunity?
                </h2>
                <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full max-w-md mx-auto" />
              </div>
              <p className="text-base sm:text-lg md:text-xl mb-8 md:mb-10 text-white leading-relaxed text-center max-w-3xl mx-auto px-4">
                Schedule a consultation with our investment team to learn more about becoming a partner on Anson Park. We'll walk you through the complete offering memorandum, pro formas, and answer all your questions.
              </p>
              
              {/* Embedded Calendar */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
                <div className="w-full h-[800px] overflow-auto">
                  <iframe
                    src="https://your-booking-provider.com/embed/YOUR_CALENDAR_ID"
                    className="w-full h-full pointer-events-auto"
                    style={{ minHeight: '800px' }}
                    frameBorder="0"
                    title="Book a Consultation"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <DetailExitIntentDialog open={exitIntentOpen} onOpenChange={setExitIntentOpen} />
    </main>
  );
};

export default Detail;
$fb_48_tsx$,
  $fb_48_default_props${"headline":"Complete Investment Details For Anson Park Apartments","subheadline":"Gathering initial interest","cta_label":"scrollToSection(item.id)} className=\"px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium bg-white/10 hover:bg-accent hover:text-primary-dark text-foreground border border-border hover:border-accent rounded-lg transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md\" >","bullets":["Standard Depreciation for 144-unit residential asset","Option to accelerate depreciation via Cost Segregation","Distributions are passive income often offset by depreciation","Long-term Capital Gains on sale","Option for 1031 Exchange on exit"],"image_url":"${script.src}"}$fb_48_default_props$::jsonb,
  $fb_48_layout_signature$grid-3$fb_48_layout_signature$,
  $fb_48_source_type$extracted$fb_48_source_type$,
  $fb_48_source_reference${"file_path":"vsl-call-booking/anson-park-call-booking.md","heading":"","page_name":"Anson Park - Call Booking","company":"Anson Park Investing"}$fb_48_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_49_slug$vsl-call-booking-anson-park-lead-magnet-infopage$fb_49_slug$,
  $fb_49_name$InfoPage$fb_49_name$,
  $fb_49_description$Anson Park Investing InfoPage extracted from vsl-call-booking/anson-park-lead-magnet.md$fb_49_description$,
  $fb_49_category$hero$fb_49_category$,
  ARRAY[$fb_49_page_types_0$lead-magnet$fb_49_page_types_0$, $fb_49_page_types_1$vsl-call-booking$fb_49_page_types_1$, $fb_49_page_types_2$call-booking$fb_49_page_types_2$]::text[],
  ARRAY[$fb_49_funnel_types_0$vsl-call-booking$fb_49_funnel_types_0$]::text[],
  $fb_49_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_49_slot_schema$::jsonb,
  ARRAY[$fb_49_theme_tokens_0$colors$fb_49_theme_tokens_0$, $fb_49_theme_tokens_1$font_heading$fb_49_theme_tokens_1$, $fb_49_theme_tokens_2$font_body$fb_49_theme_tokens_2$]::text[],
  $fb_49_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_49_asset_slots$::jsonb,
  $fb_49_tsx$// __FB_SHIM_START__
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

// File: Info.tsx
import { useState, useEffect, useRef } from "react";







import { Info, Lock } from "lucide-react";




const InfoPage = () => {
  const [isAccredited, setIsAccredited] = useState(true);
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const [formHighlight, setFormHighlight] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the embed script if it hasn't been loaded yet
    if (!document.querySelector('script[src="https://your-form-provider.com/embed.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://your-form-provider.com/embed.js';
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }

    // Exit intent detection
    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when mouse leaves from top of viewport
      if (e.clientY <= 0 && !hasShownExitIntent) {
        setExitIntentOpen(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitIntent]);

  const scrollToForm = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Trigger gentle highlight animation
      setTimeout(() => {
        setFormHighlight(true);
        setTimeout(() => setFormHighlight(false), 2000);
      }, 500);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-[var(--gradient-subtle)]">
        <Navigation variant="info" onInfoClick={scrollToForm} />
        
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-6xl mx-auto">
            {/* 2-Column Layout */}
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left Column - Headlines & Metrics */}
              <div className="space-y-8">

                <div>
                  <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-6 tracking-tight">
                    Exclusive Access to Anson Park Investment
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    144-unit multifamily property in Abilene, TX with institutional-grade returns for accredited investors
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard 
                    label="Preferred Returns"
                    value="6%"
                    highlight
                  />
                  <MetricCard 
                    label="Projected IRR"
                    value="21%+"
                  />
                  <MetricCard 
                    label="Avg Annual Returns"
                    value="27%"
                    locked
                  />
                  <MetricCard 
                    label="Total ROI (5yr)"
                    value="2.3X"
                    locked
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="aspect-square rounded-lg overflow-hidden">
                      <img 
                        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
                        alt="Anson Park Exterior"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden">
                      <img 
                        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
                        alt="Pool Area"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer">
                      <img 
                        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
                        alt="Courtyard"
                        className="w-full h-full object-cover blur-md"
                      />
                      <div className="absolute inset-0 bg-primary-dark/70 flex flex-col items-center justify-center">
                        <Lock className="h-6 w-6 text-accent mb-1" />
                        <span className="text-xs font-semibold text-white text-center px-2">Submit Form to Unlock</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form */}
              <div className="space-y-6">
                <div 
                  ref={formRef}
                  className={`bg-card border border-border rounded-2xl p-6 shadow-xl transition-all duration-500 ${
                    formHighlight ? 'ring-4 ring-accent/50 shadow-2xl shadow-accent/20 animate-[gentle-highlight_1s_ease-in-out_2]' : ''
                  }`}
                  style={formHighlight ? { animation: 'gentle-highlight 1s ease-in-out 2' } : undefined}
                >
                  <h2 className="font-serif text-2xl font-bold mb-4">Request Full Details</h2>
                  <p className="text-muted-foreground mb-6">
                    Get complete financials, property analysis, and investment memorandum
                  </p>

                  {/* Accredited Investor Toggle */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-accent/20">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="accredited-toggle" className="text-sm font-semibold cursor-pointer">
                          I'm an accredited investor
                        </Label>
                        <Tooltip defaultOpen={false}>
                          <TooltipTrigger asChild>
                            <button 
                              type="button" 
                              className="inline-flex" 
                              aria-label="Accredited investor information"
                              onFocus={(e) => e.currentTarget.blur()}
                              tabIndex={-1}
                            >
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-4 z-[100]" side="bottom" sideOffset={8} align="center">
                            <div className="space-y-3 text-sm">
                              <p className="font-semibold">Option A - Income Test:</p>
                              <p>Earned $200,000 or more per year (or $300,000 jointly with a spouse or spousal equivalent) in each of the last two years, AND reasonably expects to earn the same this year.</p>
                              <p className="font-semibold pt-2">Option B - Net Worth Test:</p>
                              <p>Has a net worth over $1,000,000, excluding the value of their primary residence.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch 
                        id="accredited-toggle"
                        checked={isAccredited}
                        onCheckedChange={setIsAccredited}
                      />
                    </div>
                  </div>

                  {!isAccredited ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        We apologize, but this investment opportunity is only available to accredited investors 
                        as required by SEC regulations.
                      </p>
                    </div>
                  ) : (
                    <div key={isAccredited ? "accredited-form" : "form-hidden"}>
                      <iframe
                        key="accredited-investor-form"
                        src="https://your-form-provider.com/embed/YOUR_FORM_ID"
                        style={{ width: '100%', height: '520px', border: 'none', borderRadius: '8px' }}
                        id="inline-YOUR_FORM_ID"
                        data-layout="{'id':'INLINE'}"
                        data-trigger-type="alwaysShow"
                        data-trigger-value=""
                        data-activation-type="alwaysActivated"
                        data-activation-value=""
                        data-deactivation-type="neverDeactivate"
                        data-deactivation-value=""
                        data-form-name="Capital Raising V1 - Request Info Form"
                        data-height="490"
                        data-layout-iframe-id="YOUR_FORM_ID"
                        data-form-id="YOUR_FORM_ID"
                        title="Capital Raising V1 - Request Info Form"
                      />
                      <p className="text-xs text-muted-foreground text-center mt-4 mb-6 leading-relaxed px-2">
                        By submitting this form, you agree to be contacted by phone, email, SMS, or other forms of communication regarding this investment opportunity. You also agree to our{" "}
                        <a href="/privacy" className="text-accent hover:text-accent-light underline" target="_blank" rel="noopener noreferrer">
                          Privacy Policy
                        </a>
                        {" "}and{" "}
                        <a href="/terms" className="text-accent hover:text-accent-light underline" target="_blank" rel="noopener noreferrer">
                          Terms of Service
                        </a>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
        
        <ExitIntentDialog 
          open={exitIntentOpen}
          onOpenChange={setExitIntentOpen}
        />
      </div>
    </TooltipProvider>
  );
};

export default InfoPage;
$fb_49_tsx$,
  $fb_49_default_props${"headline":"Exclusive Access to Anson Park Investment","subheadline":"144-unit multifamily property in Abilene, TX with institutional-grade returns for accredited investors","cta_label":"e.currentTarget.blur()} tabIndex= >","bullets":[],"image_url":"https://your-form-provider.com/embed.js"}$fb_49_default_props$::jsonb,
  $fb_49_layout_signature$grid-3$fb_49_layout_signature$,
  $fb_49_source_type$extracted$fb_49_source_type$,
  $fb_49_source_reference${"file_path":"vsl-call-booking/anson-park-lead-magnet.md","heading":"","page_name":"Anson Park - Info Request","company":"Anson Park Investing"}$fb_49_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_50_slug$vsl-call-booking-anson-park-pre-call-precall$fb_50_slug$,
  $fb_50_name$PreCall$fb_50_name$,
  $fb_50_description$Anson Park Investing PreCall extracted from vsl-call-booking/anson-park-pre-call.md$fb_50_description$,
  $fb_50_category$navigation$fb_50_category$,
  ARRAY[$fb_50_page_types_0$pre-call$fb_50_page_types_0$, $fb_50_page_types_1$vsl-call-booking$fb_50_page_types_1$, $fb_50_page_types_2$call-booking$fb_50_page_types_2$]::text[],
  ARRAY[$fb_50_funnel_types_0$vsl-call-booking$fb_50_funnel_types_0$]::text[],
  $fb_50_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"bullets":{"type":"array","of":"string","min":0,"max":6,"item_max":90}}$fb_50_slot_schema$::jsonb,
  ARRAY[$fb_50_theme_tokens_0$colors$fb_50_theme_tokens_0$, $fb_50_theme_tokens_1$font_heading$fb_50_theme_tokens_1$, $fb_50_theme_tokens_2$font_body$fb_50_theme_tokens_2$]::text[],
  $fb_50_asset_slots${}$fb_50_asset_slots$::jsonb,
  $fb_50_tsx$// __FB_SHIM_START__
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

// File: PreCall.tsx



import { CheckCircle2, Mail, Calendar, FileText, Users, Instagram, Linkedin } from "lucide-react";





const PreCall = () => {
  return (
    <main className="min-h-screen">
      <Navigation variant="pre-call" />
      
      <div className="container mx-auto px-4 py-32">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/20 rounded-full mb-6">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary mb-4">
              You're All Set!
            </h1>
            <p className="text-xl text-muted-foreground">
              Your consultation is scheduled. Here's what to expect next.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-8 mb-16">
            {/* Step 1 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">1</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <Mail className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Check Your Email</h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-center md:text-left">
                    A calendar invite has been sent to your email address. Look for an invitation that looks like this:
                  </p>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <img 
                      src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} 
                      alt="Calendar Invite Example" 
                      className="w-full rounded-lg shadow-md"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    <strong>Important:</strong> Accept the calendar invite to add it to your schedule and receive the Google Meet link.
                  </p>
                </div>
              </div>
            </Card>

            {/* Step 2 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">2</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <FileText className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Review the Investment Details</h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-center md:text-left">
                    Before the call, we recommend reviewing the key investment details:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Property location and specifications (144 units in Abilene, TX)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Investment terms (6% preferred return, 5-year hold period)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Projected returns (21%+ IRR, 2.3X total ROI)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Tax benefits and LIHTC/Qualified Contract strategy</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">3</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <Calendar className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Prepare Your Questions</h2>
                  </div>
                  <p className="text-muted-foreground mb-4 text-center md:text-left">
                    We'll cover everything in detail, but feel free to prepare any specific questions about:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Investment process and timeline</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Distribution schedule and reporting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Property management and operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>Exit strategy and market outlook</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Step 4 */}
            <Card className="p-8 border-2 border-border hover:shadow-xl transition-all">
              <div className="flex flex-col md:flex-row items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto md:mx-0">
                  <span className="text-2xl font-bold text-accent">4</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-3 mb-3">
                    <Users className="h-6 w-6 text-accent" />
                    <h2 className="text-2xl font-bold text-primary text-center md:text-left">Meet Your Investment Team</h2>
                  </div>
                  <p className="text-muted-foreground mb-6 text-center md:text-left">
                    You'll be speaking with our experienced team who will guide you through this opportunity:
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-2 border-accent/30">
                        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Todd Robinson" className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold text-primary mb-2">Todd Robinson</h3>
                      <div className="flex gap-3 justify-center">
                        <a 
                          href="https://instagram.com/your-handle"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Todd Robinson's Instagram"
                        >
                          <Instagram size={20} />
                        </a>
                        <a 
                          href="https://www.linkedin.com/in/toddnrobinson/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Todd Robinson's LinkedIn"
                        >
                          <Linkedin size={20} />
                        </a>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-2 border-accent/30">
                        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Caleb Hommell" className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold text-primary mb-2">Caleb Hommell</h3>
                      <div className="flex gap-3 justify-center">
                        <a 
                          href="https://instagram.com/your-handle"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Caleb Hommell's Instagram"
                        >
                          <Instagram size={20} />
                        </a>
                        <a 
                          href="https://www.linkedin.com/in/caleb-hommel-4b220421a/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Caleb Hommell's LinkedIn"
                        >
                          <Linkedin size={20} />
                        </a>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-2 border-accent/30">
                        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Christian Osgood" className="w-full h-full object-cover" />
                      </div>
                      <h3 className="font-bold text-primary mb-2">Christian Osgood</h3>
                      <div className="flex gap-3 justify-center">
                        <a 
                          href="https://instagram.com/your-handle"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Christian Osgood's Instagram"
                        >
                          <Instagram size={20} />
                        </a>
                        <a 
                          href="https://www.linkedin.com/in/christian-osgood-10a95b71"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Christian Osgood's LinkedIn"
                        >
                          <Linkedin size={20} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* What to Expect Section */}
          <Card className="p-10 bg-gradient-to-br from-accent/10 to-accent/20 border-2 border-accent/30">
            <h2 className="text-3xl font-bold text-primary mb-6 text-center">What to Expect on the Call</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">Duration:</strong> Approximately 30-45 minutes
              </p>
              <p>
                <strong className="text-foreground">Format:</strong> Video call via Zoom (link in calendar invite)
              </p>
              <p>
                <strong className="text-foreground">Agenda:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Introduction and overview of the Anson Park opportunity</li>
                <li>Detailed walkthrough of financials and projections</li>
                <li>Discussion of the LIHTC program and Qualified Contract strategy</li>
                <li>Q&A session for your specific questions</li>
                <li>Next steps and investment process overview</li>
              </ul>
              <div className="mt-6 p-4 bg-white/50 rounded-lg">
                <p className="text-sm">
                  <strong className="text-foreground">Need to reschedule?</strong> Simply reply to the calendar invite or email us directly. We're flexible and happy to find a time that works for you.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default PreCall;
$fb_50_tsx$,
  $fb_50_default_props${"headline":"You're All Set!","subheadline":"Your consultation is scheduled. Here's what to expect next.","cta_label":"","bullets":["Property location and specifications (144 units in Abilene, TX)","Investment terms (6% preferred return, 5-year hold period)","Projected returns (21%+ IRR, 2.3X total ROI)","Tax benefits and LIHTC/Qualified Contract strategy","Investment process and timeline","Distribution schedule and reporting"],"image_url":""}$fb_50_default_props$::jsonb,
  $fb_50_layout_signature$grid-3$fb_50_layout_signature$,
  $fb_50_source_type$extracted$fb_50_source_type$,
  $fb_50_source_reference${"file_path":"vsl-call-booking/anson-park-pre-call.md","heading":"","page_name":"Anson Park - Pre-Call","company":"Anson Park Investing"}$fb_50_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
