INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_8_slug$general-home-page-brrr-guys-home-home$fb_8_slug$,
  $fb_8_name$Home$fb_8_name$,
  $fb_8_description$The BRR Guys Home extracted from general-home-page/brrr-guys-home.md$fb_8_description$,
  $fb_8_category$hero$fb_8_category$,
  ARRAY[$fb_8_page_types_0$home$fb_8_page_types_0$, $fb_8_page_types_1$general-home-page$fb_8_page_types_1$]::text[],
  ARRAY[$fb_8_funnel_types_0$general-home-page$fb_8_funnel_types_0$]::text[],
  $fb_8_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"bullets":{"type":"array","of":"string","min":0,"max":6,"item_max":90}}$fb_8_slot_schema$::jsonb,
  ARRAY[$fb_8_theme_tokens_0$colors$fb_8_theme_tokens_0$, $fb_8_theme_tokens_1$font_heading$fb_8_theme_tokens_1$, $fb_8_theme_tokens_2$font_body$fb_8_theme_tokens_2$]::text[],
  $fb_8_asset_slots${}$fb_8_asset_slots$::jsonb,
  $fb_8_tsx$// __FB_SHIM_START__
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

// File: Home.tsx










import { CheckCircle, TrendingUp, Shield, Zap, Users, Target, DollarSign, Home as HomeIcon, Award, BarChart3, ArrowRight, Building, Wrench, Key, RefreshCw, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";




const Home = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useUtmParams(); // Capture UTM parameters on page load
  usePageTracking(); // Track page view

  return (
    <div className="min-h-screen font-sans bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="BRRRR in 90" className="h-16 md:h-20" />
          <nav className="hidden md:flex items-center gap-2">
            <Button 
              variant="ghost"
              onClick={() => navigate('/calculator')}
              className="font-semibold"
            >
              Calculator
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate('/app')}
              className="font-semibold"
            >
              Download Investor App
            </Button>
            <Button 
              variant="ghost"
              onClick={() => window.open('https://www.skool.com', '_blank')}
              className="font-semibold"
            >
              Join Community
            </Button>
            <Button 
              variant="ghost"
              onClick={() => navigate("/call")}
              className="font-semibold"
            >
              Book a Call
            </Button>
            <Button 
              size="lg"
              onClick={() => navigate("/opt-in")}
              className="font-semibold"
            >
              Watch Free Training
            </Button>
          </nav>
          
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center gap-2">
            <Button 
              size="sm"
              onClick={() => navigate("/opt-in")}
              className="font-semibold text-xs px-3 h-9 whitespace-nowrap"
            >
              Get Started
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      navigate('/calculator');
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Calculator
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      navigate('/app');
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Download Investor App
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      window.open('https://www.skool.com', '_blank');
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Join Community
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      navigate("/call");
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold justify-start text-lg h-14"
                  >
                    Book a Call
                  </Button>
                  <Button 
                    size="lg"
                    onClick={() => {
                      navigate("/opt-in");
                      setMobileMenuOpen(false);
                    }}
                    className="font-semibold text-lg h-14"
                  >
                    Watch Free Training
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-2 border-2 border-dashed border-primary px-4 md:px-6 py-2 md:py-3 rounded-full">
            <span className="text-sm md:text-lg font-semibold text-foreground italic">Calling All Aspiring Real Estate Investors</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-foreground leading-tight px-2">
            Close Your First BRRRR Deal in{" "}
            <span className="text-primary italic">90 Days</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto px-4">
            Build a cash-flowing rental portfolio using the proven BRRRR strategy—while keeping your W-2, without massive capital, and without relocating
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center pt-4">
            <Button 
              size="lg"
              onClick={() => navigate("/opt-in")}
              className="w-full sm:w-auto font-bold text-sm sm:text-base md:text-lg h-11 sm:h-12 md:h-14 px-4 sm:px-6 md:px-10 whitespace-nowrap"
            >
              Watch Free Training Now <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate("/call")}
              className="w-full sm:w-auto font-bold text-sm sm:text-base md:text-lg h-11 sm:h-12 md:h-14 px-4 sm:px-6 md:px-10 border-2 whitespace-nowrap"
            >
              Talk with Our Team
            </Button>
          </div>
        </div>
      </section>

      {/* Live Deal Case Study */}
      <LiveDealCaseStudy />

      {/* Animated Timeline */}
      <AnimatedTimeline />

      {/* Meet The Team */}
      <section className="bg-card py-12 md:py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-16 px-2">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4">Meet Your Mentors</h2>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground">27 years combined, $500M+ transactions, 800+ properties</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-bold text-primary mt-4 md:mt-6">AND YES... WE ARE IN THE TRENCHES WITH YOU</p>
            </div>

            <div className="space-y-8 md:space-y-16">
              {/* James */}
              <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 shadow-xl">
                <div className="grid md:grid-cols-[400px_1fr] gap-0">
                  <div className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 h-64 md:h-auto">
                    <img 
                      src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} 
                      alt="James Jones" 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                  <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center">
                    <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">James Jones</h3>
                    <p className="text-primary font-bold text-lg md:text-xl mb-4 md:mb-6">The Visionary</p>
                    <div className="text-muted-foreground space-y-3 md:space-y-4 text-sm md:text-base lg:text-lg">
                      <p>Managing over $87M in assets and completing $500M+ in transactions. Started in 2004, learned through hustle and persistence.</p>
                      <p>Discovered Section 8's power to create stable income streams. Now the big-picture guy looking for game-changing opportunities.</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Anthony */}
              <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 shadow-xl">
                <div className="grid md:grid-cols-[1fr_400px] gap-0">
                  <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center order-1 md:order-none">
                    <h3 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">Anthony Redmond</h3>
                    <p className="text-primary font-bold text-lg md:text-xl mb-4 md:mb-6">The Hustler</p>
                    <div className="text-muted-foreground space-y-3 md:space-y-4 text-sm md:text-base lg:text-lg">
                      <p>Portfolio of 200+ doors. Started in 2015 with setbacks, drove Uber nights while building his business.</p>
                      <p>First deal led to explosive growth. Built investor network and rental empire through relentless hustle.</p>
                    </div>
                  </div>
                  <div className="relative overflow-hidden bg-gradient-to-br from-muted to-muted/50 order-2 md:order-none h-64 md:h-auto">
                    <img 
                      src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} 
                      alt="Anthony Redmond" 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                    />
                  </div>
                </div>
              </Card>

              {/* Together - Combined Stats */}
              <Card className="p-6 md:p-8 lg:p-16 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground border-2 border-primary">
                <div className="max-w-4xl mx-auto">
                  <h3 className="font-display text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center mb-6 md:mb-8">
                    TOGETHER
                  </h3>
                  
                  <div className="grid sm:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
                    <div className="text-center">
                      <div className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2">27+</div>
                      <p className="text-sm md:text-base lg:text-lg opacity-90">Years Combined Experience</p>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2">$500M+</div>
                      <p className="text-sm md:text-base lg:text-lg opacity-90">Transactions Closed</p>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2">800+</div>
                      <p className="text-sm md:text-base lg:text-lg opacity-90">Properties Owned</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 md:gap-6 pt-6 md:pt-8 border-t border-primary-foreground/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-base md:text-lg mb-1">500+ Units Managed</p>
                        <p className="text-sm md:text-base opacity-90">Active portfolio across multiple markets</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-base md:text-lg mb-1">309 Section 8 Properties</p>
                        <p className="text-sm md:text-base opacity-90">Consistent cash flow strategies</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-base md:text-lg lg:text-xl text-center mt-6 md:mt-8 font-semibold">
                    Now sharing our hard-won knowledge with you
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What We Look For in a Deal */}
      <section className="py-12 md:py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-16 px-2">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4">
                Our Deal <span className="text-primary">Criteria</span>
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground">The exact metrics we use to find winning BRRRR properties</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-start">
              {/* Video on the left */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black mx-auto max-w-md w-full aspect-[9/16]">
                <video 
                  id="property-video"
                  className="w-full h-full object-cover"
                  preload="metadata"
                >
                  <source src="https://example.com/placeholder-video.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Custom Play Button Overlay */}
                <div 
                  id="video-overlay"
                  className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-black/40 group"
                  onClick={() => {
                    const video = document.getElementById('property-video') as HTMLVideoElement;
                    const overlay = document.getElementById('video-overlay');
                    if (video && overlay) {
                      video.play();
                      overlay.style.display = 'none';
                      video.setAttribute('controls', 'true');
                    }
                  }}
                >
                  {/* Title at top */}
                  <div className="absolute top-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-b from-black/80 via-black/50 to-transparent">
                    <h3 className="text-white font-display text-2xl md:text-3xl lg:text-4xl font-bold text-center leading-tight">
                      Property Walkthrough<br />With Anthony
                    </h3>
                  </div>
                  
                  {/* Play button in center */}
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-t-[16px] border-t-transparent border-l-[26px] border-l-primary-foreground border-b-[16px] border-b-transparent ml-2" />
                  </div>
                </div>
              </div>

              {/* Criteria cards on the right */}
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { 
                    icon: DollarSign, 
                    title: "Affordable Entry Point", 
                    desc: "Properties at $60K-$120K", 
                    detail: "Lower prices mean less capital needed and easier refinancing"
                  },
                  { 
                    icon: TrendingUp, 
                    title: "Strong Rent-to-Price Ratio", 
                    desc: "1.2%-1.5% monthly rent", 
                    detail: "Ensures positive cash flow after refinance"
                  },
                  { 
                    icon: Shield, 
                    title: "Landlord-Friendly Laws", 
                    desc: "Quick eviction process", 
                    detail: "Protects your investment and cash flow"
                  },
                  { 
                    icon: Users, 
                    title: "Strong Tenant Demand", 
                    desc: "Consistent renter pool", 
                    detail: "Minimize vacancy and maintain steady income"
                  },
                  { 
                    icon: BarChart3, 
                    title: "Market Appreciation", 
                    desc: "4-6% annually", 
                    detail: "Build equity through market growth"
                  },
                  { 
                    icon: Award, 
                    title: "Economic Growth", 
                    desc: "Expanding job market", 
                    detail: "Major employers create sustainable demand"
                  }
                ].map((item, index) => (
                  <Card key={index} className="p-6 border-2 hover:border-primary hover:shadow-lg transition-all group">
                    <div className="flex flex-col gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:scale-110 transition-all">
                        <item.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-foreground mb-1">{item.title}</h3>
                        <p className="text-primary font-semibold text-sm mb-1">{item.desc}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section 
        className="py-12 md:py-20 lg:py-32 relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-display text-3xl md:text-4xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 px-2">
            The Time is <span className="text-primary">NOW</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto px-4">
            Every quarter you wait costs you a potential deal. Properties available. Lenders ready. Contractors ready.
          </p>
          <Button size="lg" onClick={() => navigate("/call")} className="w-full sm:w-auto font-bold text-sm sm:text-base md:text-lg lg:text-xl h-11 sm:h-12 md:h-14 lg:h-16 px-6 sm:px-8 md:px-10 lg:px-12 whitespace-nowrap">
            Book Your Strategy Session <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ml-2" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

const AnimatedTimeline = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const sectionTop = sectionRef.current.offsetTop;
      const sectionHeight = sectionRef.current.offsetHeight;
      const windowScroll = window.scrollY;
      const windowHeight = window.innerHeight;

      // Start animation later so first card is fully visible
      const scrollStart = sectionTop - windowHeight * 0.5 + 400;
      // End later so final step stays visible longer
      const scrollEnd = sectionTop + sectionHeight - windowHeight * 0.3; // Changed from 0.5 to 0.3
      
      if (windowScroll < scrollStart) {
        setScrollProgress(0);
      } else if (windowScroll > scrollEnd) {
        setScrollProgress(1);
      } else {
        const progress = (windowScroll - scrollStart) / (scrollEnd - scrollStart);
        setScrollProgress(Math.max(0, Math.min(1, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const steps = [
    { days: "Days 1-7", title: "Foundation & Education", icon: Target, items: ["Market mastery", "Weekly coaching calls", "Fundamentals training", "RealSync AI tool"] },
    { days: "Days 7-21", title: "Analysis & Financing", icon: BarChart3, items: ["Analyze properties", "Meet lenders", "Get pre-qualified", "Submit deals"] },
    { days: "Days 21-45", title: "Under Contract", icon: Key, items: ["Make offers", "Get under contract", "Connect contractors", "Close deal"] },
    { days: "Days 45-75", title: "Rehab & Tenants", icon: Wrench, items: ["Complete rehab", "Tenant placement", "Start cash flow"] },
    { days: "Days 75-90", title: "Refinance", icon: RefreshCw, items: ["Submit refinance", "Pull capital out", "Start deal #2"] },
    { days: "Days 90-180", title: "Rinse & Repeat", icon: Building, items: ["Close deal #2", "Add 1-2 per quarter", "Scale to 5-10 properties"] }
  ];

  const getStepProgress = (index: number) => {
    const stepSize = 1 / steps.length;
    const stepStart = index * stepSize;
    const stepEnd = (index + 1) * stepSize;
    
    if (scrollProgress < stepStart) return 0;
    
    // Keep last step highlighted when at the end
    if (index === steps.length - 1 && scrollProgress >= stepEnd - stepSize / 2) {
      return 1;
    }
    
    if (scrollProgress > stepEnd) return 0;
    
    // Peak at the middle of each step
    const stepMiddle = stepStart + (stepSize / 2);
    const distanceFromMiddle = Math.abs(scrollProgress - stepMiddle);
    const normalizedDistance = distanceFromMiddle / (stepSize / 2);
    
    return Math.max(0, 1 - normalizedDistance);
  };

  return (
    <section ref={sectionRef} className="relative min-h-[300vh] py-20 md:py-32 bg-background">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Sticky Left Side - Header */}
              <div className="md:sticky md:top-1/4">
                <h2 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
                  Your <span className="text-primary">90-Day</span> Roadmap
                </h2>
                <p className="text-xl text-muted-foreground mb-6">
                  From zero to cash-flowing rental property in just 3 months
                </p>
                
                {/* Progress Indicator */}
                <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${scrollProgress * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Step {Math.floor(scrollProgress * steps.length) + 1} of {steps.length}
                </p>
              </div>

              {/* Scrolling Right Side - Timeline Content */}
              <div className="relative h-[70vh] overflow-visible">
                <div 
                  ref={contentRef}
                  className="absolute top-0 left-0 right-0 transition-transform duration-500 ease-out"
                  style={{
                    transform: `translateY(calc(35vh - ${scrollProgress * (steps.length - 1) * 16.67}%))`
                  }}
                >
                  <div className="space-y-8 pr-8 pl-2">
                    {steps.map((step, index) => {
                      const progress = getStepProgress(index);
                      const isActive = progress > 0.3;
                      
                      return (
                        <Card 
                          key={index}
                          className="p-6 border-2 transition-all duration-500 relative overflow-visible"
                          style={{
                            borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                            backgroundColor: isActive ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.5)',
                            boxShadow: isActive ? '0 20px 60px -10px hsl(var(--primary) / 0.6), 0 0 0 3px hsl(var(--primary) / 0.2)' : 'none',
                            opacity: isActive ? 1 : 0.4 + (progress * 0.3),
                            transform: `scale(${isActive ? 1.02 : 0.95 + (progress * 0.05)})`,
                            zIndex: isActive ? 10 : 1
                          }}
                        >
                          <div className="flex items-start gap-4">
                            <div 
                              className="w-14 h-14 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300"
                              style={{
                                backgroundColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'
                              }}
                            >
                              <step.icon 
                                className="w-7 h-7" 
                                style={{ color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))' }}
                              />
                            </div>
                            
                            <div className="flex-1">
                              <div 
                                className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                                style={{
                                  backgroundColor: isActive ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted))',
                                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                                }}
                              >
                                {step.days}
                              </div>
                              <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                                {step.title}
                              </h3>
                              <ul className="space-y-2">
                                {step.items.map((item, i) => (
                                  <li key={i} className="flex gap-2 items-start">
                                    <CheckCircle 
                                      className="w-5 h-5 flex-shrink-0 mt-0.5" 
                                      style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                                    />
                                    <span className="text-sm text-muted-foreground">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
$fb_8_tsx$,
  $fb_8_default_props${"headline":"Close Your First BRRRR Deal in 90 Days","subheadline":"Build a cash-flowing rental portfolio using the proven BRRRR strategy—while keeping your W-2, without massive capital, and without relocating","cta_label":"navigate('/calculator')} className=\"font-semibold\" > Calculator","bullets":["Meet Your Mentors 27 years combined, $500M+ transactions, 800+ properties AND YES... WE ARE IN THE TRENCHES WITH YOU James Jones The Visionary Managing over $87M in assets and completing $500M+ in transactions. Started in 2004, learned through hustle and persistence. Discovered Section 8's power to create stable income streams. Now the big-picture guy looking for game-changing opportunities. Anthony Redmond The Hustler Portfolio of 200+ doors. Started in 2015 with setbacks, drove Uber nights while building his business. First deal led to explosive growth. Built investor network and rental empire through relentless hustle. TOGETHER 27+ Years Combined Experience $500M+ Transactions Closed 800+ Properties Owned 500+ Units Managed Active portfolio across multiple markets 309 Section 8 Properties Consistent cash flow strategies Now sharing our hard-won knowledge with you Our Deal Criteria The exact metrics we use to find winning BRRRR properties Your browser does not support the video tag. }} > Property Walkthrough With Anthony , , , , , ].map((item, index) => ( ))} The Time is NOW Every quarter you wait costs you a potential deal. Properties available. Lenders ready. Contractors ready. navigate(\"/call\")} className=\"w-full sm:w-auto font-bold text-sm sm:text-base md:text-lg lg:text-xl h-11 sm:h-12 md:h-14 lg:h-16 px-6 sm:px-8 md:px-10 lg:px-12 whitespace-nowrap\"> Book Your Strategy Session ); }; const AnimatedTimeline = () => else }; window.addEventListener('scroll', handleScroll); handleScroll(); return () => window.removeEventListener('scroll', handleScroll); }, []); const steps = [ , , , , , ]; const getStepProgress = (index: number) => if (scrollProgress > stepEnd) return 0; // Peak at the middle of each step const stepMiddle = stepStart + (stepSize / 2); const distanceFromMiddle = Math.abs(scrollProgress - stepMiddle); const normalizedDistance = distanceFromMiddle / (stepSize / 2); return Math.max(0, 1 - normalizedDistance); }; return ( Your 90-Day Roadmap From zero to cash-flowing rental property in just 3 months Step of"],"image_url":""}$fb_8_default_props$::jsonb,
  $fb_8_layout_signature$grid-3$fb_8_layout_signature$,
  $fb_8_source_type$extracted$fb_8_source_type$,
  $fb_8_source_reference${"file_path":"general-home-page/brrr-guys-home.md","heading":"","page_name":"BRR Guys - Home Page","company":"The BRR Guys"}$fb_8_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_9_slug$general-home-page-origin-studios-home-ctasection$fb_9_slug$,
  $fb_9_name$CTASection$fb_9_name$,
  $fb_9_description$Origin Studios CTASection extracted from general-home-page/origin-studios-home.md$fb_9_description$,
  $fb_9_category$pricing$fb_9_category$,
  ARRAY[$fb_9_page_types_0$home$fb_9_page_types_0$, $fb_9_page_types_1$general-home-page$fb_9_page_types_1$]::text[],
  ARRAY[$fb_9_funnel_types_0$general-home-page$fb_9_funnel_types_0$]::text[],
  $fb_9_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_9_slot_schema$::jsonb,
  ARRAY[$fb_9_theme_tokens_0$colors$fb_9_theme_tokens_0$, $fb_9_theme_tokens_1$font_heading$fb_9_theme_tokens_1$, $fb_9_theme_tokens_2$font_body$fb_9_theme_tokens_2$]::text[],
  $fb_9_asset_slots${}$fb_9_asset_slots$::jsonb,
  $fb_9_tsx$// __FB_SHIM_START__
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

// File: CTASection.tsx
import { useState } from "react";
import { motion } from "framer-motion";





interface CTASectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  primaryCTA?: string;
  secondaryCTA?: string;
  primaryLink?: string;
  secondaryLink?: string;
  useBookingModal?: boolean;
}

export function CTASection({
  title = "READY TO GO?",
  subtitle = "LET'S GET STARTED",
  description = "Our secure online booking portal allows you to book your next podcast with us. Alternatively you can contact us using the options below.",
  primaryCTA = "Book Now",
  secondaryCTA = "Contact Us",
  primaryLink,
  secondaryLink = "/about",
  useBookingModal = true,
}: CTASectionProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-background via-card to-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-primary">{title}</span>
            <br />
            <span className="text-foreground">{subtitle}</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {useBookingModal && !primaryLink ? (
              <Button
                size="lg"
                onClick={() => setIsBookingOpen(true)}
                className="btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg"
              >
                {primaryCTA}
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                className="btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg"
              >
                <Link to={primaryLink || "/pricing"}>{primaryCTA}</Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              className="btn-secondary text-lg px-8 py-6 rounded-lg"
            >
              <Link to={secondaryLink}>{secondaryCTA}</Link>
            </Button>
          </div>
        </motion.div>
      </div>

      {useBookingModal && <BookingModal open={isBookingOpen} onOpenChange={setIsBookingOpen} />}
    </section>
  );
}
$fb_9_tsx$,
  $fb_9_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"setIsBookingOpen(true)} className=\"btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg\" >","bullets":[],"image_url":""}$fb_9_default_props$::jsonb,
  $fb_9_layout_signature$centered-stack$fb_9_layout_signature$,
  $fb_9_source_type$extracted$fb_9_source_type$,
  $fb_9_source_reference${"file_path":"general-home-page/origin-studios-home.md","heading":"","page_name":"Origin Studios - Home Page","company":"Origin Studios"}$fb_9_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_10_slug$general-home-page-origin-studios-home-herosection$fb_10_slug$,
  $fb_10_name$HeroSection$fb_10_name$,
  $fb_10_description$Origin Studios HeroSection extracted from general-home-page/origin-studios-home.md$fb_10_description$,
  $fb_10_category$hero$fb_10_category$,
  ARRAY[$fb_10_page_types_0$home$fb_10_page_types_0$, $fb_10_page_types_1$general-home-page$fb_10_page_types_1$]::text[],
  ARRAY[$fb_10_funnel_types_0$general-home-page$fb_10_funnel_types_0$]::text[],
  $fb_10_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_10_slot_schema$::jsonb,
  ARRAY[$fb_10_theme_tokens_0$colors$fb_10_theme_tokens_0$, $fb_10_theme_tokens_1$font_heading$fb_10_theme_tokens_1$, $fb_10_theme_tokens_2$font_body$fb_10_theme_tokens_2$]::text[],
  $fb_10_asset_slots${}$fb_10_asset_slots$::jsonb,
  $fb_10_tsx$// __FB_SHIM_START__
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

// File: HeroSection.tsx
import { useState } from "react";
import { motion } from "framer-motion";


import { AnimatedHeroBackground } from "./AnimatedHeroBackground";

import { TypewriterText } from "./TypewriterText";
import { VideoEmbed } from "./VideoEmbed";

export function HeroSection() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden -mt-20 pt-20">
      {/* Animated Background */}
      <AnimatedHeroBackground />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay z-10 opacity-50" />

      {/* Content */}
      <div className="relative z-20 container-custom text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="hero-text font-display font-bold mb-6 max-w-5xl mx-auto">
            <span className="text-foreground">Share Your </span>
            <TypewriterText />
            <br />
            <span className="text-foreground">Through the Power of Podcasting</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base md:text-lg text-foreground/80 max-w-2xl mx-auto mb-8 font-medium tracking-wide"
        >
          🎙️ 20+ Years Producing Podcasts <span className="text-primary">⭐ Top Rated Vegas Studio</span>
          <br />
          Thousands of Episodes Shot • Come Try Us Out!
        </motion.p>

        {/* Video embed between subheadline and buttons */}
        <VideoEmbed />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            size="lg"
            onClick={() => setIsBookingOpen(true)}
            className="btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg"
          >
            Book Now
          </Button>
          <Button
            asChild
            size="lg"
            className="btn-secondary text-lg px-8 py-6 rounded-lg"
          >
            <Link to="/about">Contact Us</Link>
          </Button>
        </motion.div>
      </div>

      <BookingModal open={isBookingOpen} onOpenChange={setIsBookingOpen} />
    </section>
  );
}
$fb_10_tsx$,
  $fb_10_default_props${"headline":"Share Your Through the Power of Podcasting","subheadline":"","cta_label":"setIsBookingOpen(true)} className=\"btn-glow bg-primary text-primary-foreground hover:bg-accent text-lg px-8 py-6 rounded-lg\" > Book Now","bullets":[],"image_url":""}$fb_10_default_props$::jsonb,
  $fb_10_layout_signature$centered-stack$fb_10_layout_signature$,
  $fb_10_source_type$extracted$fb_10_source_type$,
  $fb_10_source_reference${"file_path":"general-home-page/origin-studios-home.md","heading":"","page_name":"Origin Studios - Home Page","company":"Origin Studios"}$fb_10_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_11_slug$general-home-page-origin-studios-home-index$fb_11_slug$,
  $fb_11_name$Index$fb_11_name$,
  $fb_11_description$Origin Studios Index extracted from general-home-page/origin-studios-home.md$fb_11_description$,
  $fb_11_category$hero$fb_11_category$,
  ARRAY[$fb_11_page_types_0$home$fb_11_page_types_0$, $fb_11_page_types_1$general-home-page$fb_11_page_types_1$]::text[],
  ARRAY[$fb_11_funnel_types_0$general-home-page$fb_11_funnel_types_0$]::text[],
  $fb_11_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_11_slot_schema$::jsonb,
  ARRAY[$fb_11_theme_tokens_0$colors$fb_11_theme_tokens_0$, $fb_11_theme_tokens_1$font_heading$fb_11_theme_tokens_1$, $fb_11_theme_tokens_2$font_body$fb_11_theme_tokens_2$]::text[],
  $fb_11_asset_slots${}$fb_11_asset_slots$::jsonb,
  $fb_11_tsx$// __FB_SHIM_START__
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
    <Layout>
      <SEO />
      <HeroSection />
      <ShowsCarousel />
      <PricingSection />
      <StudiosSection />
      <CelebritiesSection />
      <GallerySection />
      <FAQSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
$fb_11_tsx$,
  $fb_11_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_11_default_props$::jsonb,
  $fb_11_layout_signature$section$fb_11_layout_signature$,
  $fb_11_source_type$extracted$fb_11_source_type$,
  $fb_11_source_reference${"file_path":"general-home-page/origin-studios-home.md","heading":"","page_name":"Origin Studios - Home Page","company":"Origin Studios"}$fb_11_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_12_slug$general-home-page-origin-studios-home-pricingsection$fb_12_slug$,
  $fb_12_name$PricingSection$fb_12_name$,
  $fb_12_description$Origin Studios PricingSection extracted from general-home-page/origin-studios-home.md$fb_12_description$,
  $fb_12_category$pricing$fb_12_category$,
  ARRAY[$fb_12_page_types_0$home$fb_12_page_types_0$, $fb_12_page_types_1$general-home-page$fb_12_page_types_1$]::text[],
  ARRAY[$fb_12_funnel_types_0$general-home-page$fb_12_funnel_types_0$]::text[],
  $fb_12_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_12_slot_schema$::jsonb,
  ARRAY[$fb_12_theme_tokens_0$colors$fb_12_theme_tokens_0$, $fb_12_theme_tokens_1$font_heading$fb_12_theme_tokens_1$, $fb_12_theme_tokens_2$font_body$fb_12_theme_tokens_2$]::text[],
  $fb_12_asset_slots${}$fb_12_asset_slots$::jsonb,
  $fb_12_tsx$// __FB_SHIM_START__
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

// File: PricingSection.tsx
import { motion } from "framer-motion";
import { Check } from "lucide-react";





const pricingPlans = [
  {
    name: "UNLIMITED",
    price: "$797",
    tagline: "Just Show Up and Press Record",
    features: [
      "Unlimited Monthly Podcasts",
      "Your Choice of Our 2 Standard Studios",
      "Up to 2 Bookings Daily",
      "Schedule Open Spots 48 Hours In Advance up to 1 Hour Before",
    ],
    featured: false,
  },
  {
    name: "FULL SERVICE",
    price: "$997",
    tagline: "Just Show Up, We Do the Rest",
    features: [
      "Everything in UNLIMITED plus:",
      "Our Premium Studio",
      "Real Time Editing",
      "Schedule Up to 6-Months in Advance",
      "We Trim and Upload Your Podcast",
      "Distribution to All Podcast Platforms",
    ],
    featured: true,
  },
  {
    name: "THE TOTAL",
    price: "$1,497",
    tagline: "The Ultimate Setup for Success",
    features: [
      "Everything in FULL SERVICE plus:",
      "Custom Graphics for Show Branding",
      "Priority Scheduling",
      "Show Transcripts",
      "Post Production Editing",
      "Episode Thumbnail Graphics",
      "Short Form Content For Every Episode",
      "We Post Your Shortform Content",
    ],
    featured: false,
  },
];

export function PricingSection() {
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-card via-background to-background relative overflow-hidden">
      <div className="container-custom">
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Our Monthly <span className="text-primary">Memberships</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the plan that fits your podcasting needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={skipAnimation ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={cn(
                "relative rounded-2xl p-8 card-hover",
                plan.featured
                  ? "glass-card glow-cyan border-primary/30"
                  : "bg-card/50 border border-border/50"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-3">
                  <span className={cn(
                    "font-display text-4xl font-bold",
                    plan.featured ? "text-primary" : "text-foreground"
                  )}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground text-sm">{plan.tagline}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full rounded-lg",
                  plan.featured
                    ? "btn-glow bg-primary text-primary-foreground hover:bg-accent"
                    : "btn-secondary"
                )}
              >
                <Link to="/pricing">Learn More</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
$fb_12_tsx$,
  $fb_12_default_props${"headline":"Our Monthly Memberships","subheadline":"Choose the plan that fits your podcasting needs","cta_label":"Learn More","bullets":[],"image_url":""}$fb_12_default_props$::jsonb,
  $fb_12_layout_signature$grid-3$fb_12_layout_signature$,
  $fb_12_source_type$extracted$fb_12_source_type$,
  $fb_12_source_reference${"file_path":"general-home-page/origin-studios-home.md","heading":"","page_name":"Origin Studios - Home Page","company":"Origin Studios"}$fb_12_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
